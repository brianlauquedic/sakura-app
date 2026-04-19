import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { checkAndMarkUsed } from "@/lib/redis";
import { getConnection } from "@/lib/rpc";

// ── Payment config ───────────────────────────────────────────────
const HELIUS_API_KEY  = process.env.HELIUS_API_KEY ?? "";
const HELIUS_RPC      = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const SAKURA_FEE_WALLET = process.env.SAKURA_FEE_WALLET ?? "";
const USDC_MINT        = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const MCP_CALL_FEE     = 1_000_000; // 1.00 USDC (6 decimals) per tool call

// In-memory fallback for replay protection (used when Redis is not configured).
// Redis mode: distributed across all Vercel instances via checkAndMarkUsed().
const usedSigs = new Set<string>();

let _mcpFeeAta = "";
function getSakuraFeeAta(): string {
  if (_mcpFeeAta) return _mcpFeeAta;
  if (!SAKURA_FEE_WALLET) return "";
  try {
    _mcpFeeAta = getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      new PublicKey(SAKURA_FEE_WALLET)
    ).toString();
  } catch { /* env var missing at build time */ }
  return _mcpFeeAta;
}

async function verifyMCPPayment(
  txSig: string,
  requiredAmount: number,
  callerWallet?: string   // [SECURITY FIX M-1] Sender verification
): Promise<boolean> {
  if (!SAKURA_FEE_WALLET) return true; // demo mode: no fee wallet configured
  try {
    // Module 16: multi-RPC failover for payment verification
    const conn = await getConnection("confirmed");
    const tx = await conn.getParsedTransaction(txSig, { maxSupportedTransactionVersion: 0 });
    if (!tx) return false;
    for (const ix of tx.transaction.message.instructions) {
      if ("parsed" in ix && ix.parsed?.type === "transferChecked") {
        const info = ix.parsed.info;
        if (
          info?.mint === USDC_MINT &&
          info?.destination === getSakuraFeeAta() &&
          Number(info?.tokenAmount?.amount ?? 0) >= requiredAmount
        ) {
          // [SECURITY FIX M-1] Verify sender matches the caller's wallet.
          // Without this check, any user could share a valid txSig and let
          // others call MCP tools for free using the same payment transaction.
          if (callerWallet && info?.authority && info.authority !== callerWallet) {
            return false; // Payment sent by a different wallet — not valid for this caller
          }
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ── MCP Tool Definitions (v0.3 — Agentic Consumer Protocol) ──────────
//
// v0.3 pivots Sakura from mutual insurance to the Intent-Execution
// Protocol: users sign NL intents, AI agents execute within mathematically
// enforced bounds (Groth16 + Pyth oracle + SPL approve cap). MCP tools
// expose read-only views of Protocol / Intent / ActionRecord state plus
// preview helpers for intent commitment + witness construction.
//
// NONE of these tools sign transactions. Signing lives client-side so the
// user's private witness (max_amount, max_usd_value, bitmaps, nonce)
// never leaves the browser.
const TOOLS = [
  {
    name: "sakura_intent_protocol_status",
    description:
      "Read the on-chain IntentProtocol state (v0.3, Agentic Consumer Protocol) plus the caller's active Intent and most recent ActionRecords if any. Returns: program id, protocol admin, fee vault, total intents signed, total actions executed, pause flag — and if `wallet` is passed, the user's intent commitment, expiry, active flag, actions-executed count, and up to 10 recent ActionRecord summaries.",
    inputSchema: {
      type: "object",
      properties: {
        wallet: {
          type: "string",
          description:
            "Optional Solana wallet address (base58). If provided, returns the Intent PDA state + recent ActionRecords for this user.",
        },
      },
      required: [],
    },
  },
  {
    name: "sakura_compute_intent_commitment",
    description:
      "Compute the 32-byte intent_commitment (2-layer Poseidon tree over 7 leaves) that the user will sign via `sign_intent`. This matches the circuit constraint C1 in circuits/src/intent_proof.circom. The client should verify the returned hex against its own local computation before signing — the MCP server is a convenience, not a source of truth. Inputs are kept private: the server never stores them.",
    inputSchema: {
      type: "object",
      properties: {
        intent_text: { type: "string", description: "Natural-language intent text" },
        wallet: { type: "string", description: "User wallet base58" },
        nonce: { type: "string", description: "u64 decimal string" },
        max_amount_micro: { type: "string", description: "u64 decimal string — per-action token cap" },
        max_usd_value_micro: { type: "string", description: "u64 decimal string — per-action USD cap" },
        allowed_protocols_bitmap: { type: "number", description: "u32 bitmap" },
        allowed_action_types_bitmap: { type: "number", description: "u32 bitmap" },
      },
      required: [
        "intent_text",
        "wallet",
        "nonce",
        "max_amount_micro",
        "max_usd_value_micro",
        "allowed_protocols_bitmap",
        "allowed_action_types_bitmap",
      ],
    },
  },
  {
    name: "sakura_check_action_bounds",
    description:
      "Pre-flight check: does a proposed action satisfy circuit constraints C2–C5? Returns per-constraint pass/fail with numeric details. Use this BEFORE generating a Groth16 proof to avoid wasting ~10s on a witness that will be rejected. Does NOT hit RPC — pure arithmetic check against the caller's locally-held intent bounds.",
    inputSchema: {
      type: "object",
      properties: {
        action_type: { type: "number" },
        action_amount_micro: { type: "string" },
        action_target_index: { type: "number" },
        oracle_price_usd_micro: { type: "string" },
        max_amount_micro: { type: "string" },
        max_usd_value_micro: { type: "string" },
        allowed_protocols_bitmap: { type: "number" },
        allowed_action_types_bitmap: { type: "number" },
      },
      required: [
        "action_type",
        "action_amount_micro",
        "action_target_index",
        "oracle_price_usd_micro",
        "max_amount_micro",
        "max_usd_value_micro",
        "allowed_protocols_bitmap",
        "allowed_action_types_bitmap",
      ],
    },
  },
];

// ── GET: MCP server manifest / tools list ────────────────────────
export async function GET() {
  return NextResponse.json({
    name: "sakura-mcp",
    version: "3.0.0",
    description: "Sakura — Shielded Lending on Solana with on-chain Groth16 pairing verification",
    tools: TOOLS,
  });
}

// ── POST: MCP JSON-RPC 2.0 handler ──────────────────────────────
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonrpcError(null, -32700, "Parse error");
  }

  const rpc = body as { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };

  if (rpc.jsonrpc !== "2.0") {
    return jsonrpcError(rpc.id ?? null, -32600, "Invalid Request: jsonrpc must be '2.0'");
  }

  const id = rpc.id ?? null;

  // tools/list
  if (rpc.method === "tools/list") {
    return jsonrpcResult(id, { tools: TOOLS });
  }

  // tools/call
  if (rpc.method === "tools/call") {
    const params = rpc.params as { name?: string; arguments?: Record<string, unknown> };
    if (!params?.name) {
      return jsonrpcError(id, -32602, "Invalid params: missing tool name");
    }

    // x402 payment gate — $1.00 USDC per tool call
    const paymentSig = req.headers.get("x-payment") ?? req.headers.get("X-PAYMENT");
    if (!paymentSig) {
      return NextResponse.json(
        { jsonrpc: "2.0", id, error: { code: -32001, message: "Payment required: 1.00 USDC per tool call" } },
        {
          status: 402,
          headers: {
            "X-Payment-Required": "true",
            "X-Payment-Amount": "1.00",
            "X-Payment-Currency": "USDC",
            "X-Payment-Recipient": SAKURA_FEE_WALLET || "not-configured",
            "X-Payment-Network": "solana-mainnet",
          },
        }
      );
    }

    // Replay protection — Redis (distributed) or in-memory fallback
    // checkAndMarkUsed returns false if key was already seen
    const isFirstUse = await checkAndMarkUsed(`mcp:sig:${paymentSig}`, usedSigs);
    if (!isFirstUse) {
      return jsonrpcError(id, -32001, "Payment already used — send a new transaction");
    }
    // Extract caller wallet from tool arguments for sender verification (M-1 fix)
    const callerWallet = typeof params.arguments?.wallet === "string"
      ? params.arguments.wallet
      : undefined;
    const paymentValid = await verifyMCPPayment(paymentSig, MCP_CALL_FEE, callerWallet);
    if (!paymentValid) {
      return jsonrpcError(id, -32001, "Payment verification failed. Send 1.00 USDC from your wallet to Sakura fee wallet.");
    }

    try {
      const result = await callTool(params.name, params.arguments ?? {});
      return jsonrpcResult(id, {
        content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }],
      });
    } catch (err: unknown) {
      // [SECURITY FIX N-2] Never expose raw error messages — err.message can
      // contain Helius RPC URLs (with API key) or Anthropic error details.
      console.error("[mcp] tool execution error:", err instanceof Error ? err.message : err);
      return jsonrpcError(id, -32603, "Tool execution failed. Please try again.");
    }
  }

  return jsonrpcError(id, -32601, `Method not found: ${rpc.method}`);
}

// ── Tool dispatch ────────────────────────────────────────────────
async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === "sakura_intent_protocol_status") {
    return await callIntentProtocolStatus(args);
  }
  if (name === "sakura_compute_intent_commitment") {
    return await callComputeIntentCommitment(args);
  }
  if (name === "sakura_check_action_bounds") {
    return callCheckActionBounds(args);
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ─────────────────────────────────────────────────────────────────
// Tool implementations
// ─────────────────────────────────────────────────────────────────

async function callIntentProtocolStatus(
  args: Record<string, unknown>
): Promise<unknown> {
  const {
    SAKURA_INSURANCE_PROGRAM_ID,
    fetchProtocol,
    fetchIntent,
  } = await import("@/lib/insurance-pool");

  const wallet = typeof args.wallet === "string" ? args.wallet : "";
  const conn = await getConnection("confirmed");

  // Admin key is derived from env (deployed-protocol admin). For the
  // demo we use the Solana CLI key holder the user already registered;
  // if not configured, we return program metadata only.
  const adminEnv = process.env.SAKURA_PROTOCOL_ADMIN;
  if (!adminEnv) {
    return {
      program_id: SAKURA_INSURANCE_PROGRAM_ID.toBase58(),
      note: "SAKURA_PROTOCOL_ADMIN env var not set — returning program id only.",
    };
  }
  const admin = new PublicKey(adminEnv);
  const { pda: protocolPda, state: protocol } = await fetchProtocol(conn, admin);

  const out: Record<string, unknown> = {
    program_id: SAKURA_INSURANCE_PROGRAM_ID.toBase58(),
    protocol_pda: protocolPda.toBase58(),
    admin: admin.toBase58(),
    protocol_state: protocol
      ? {
          total_intents_signed: protocol.totalIntentsSigned.toString(),
          total_actions_executed: protocol.totalActionsExecuted.toString(),
          paused: protocol.paused,
          execution_fee_bps: protocol.executionFeeBps,
          platform_fee_bps: protocol.platformFeeBps,
          usdc_mint: protocol.usdcMint.toBase58(),
          fee_vault: protocol.feeVault.toBase58(),
        }
      : null,
  };

  if (wallet && wallet.length >= 32) {
    try {
      const user = new PublicKey(wallet);
      const { pda: intentPda, state: intent } = await fetchIntent(conn, user);
      out.user = {
        wallet: user.toBase58(),
        intent_pda: intentPda.toBase58(),
        intent_state: intent
          ? {
              intent_commitment_hex:
                "0x" + Buffer.from(intent.intentCommitment).toString("hex"),
              signed_at: intent.signedAt.toString(),
              expires_at: intent.expiresAt.toString(),
              actions_executed: intent.actionsExecuted.toString(),
              is_active: intent.isActive,
            }
          : null,
      };
    } catch {
      out.user_error = "invalid wallet pubkey";
    }
  }

  return out;
}

async function callComputeIntentCommitment(
  args: Record<string, unknown>
): Promise<unknown> {
  const { computeIntentCommitment, pubkeyToFieldBytes } = await import(
    "@/lib/zk-proof"
  );
  const { buildPoseidon } = await import("circomlibjs");

  const walletPk = new PublicKey(String(args.wallet));
  const walletField = pubkeyToFieldBytes(walletPk.toBytes());

  // intent_text_hash = Poseidon(first 31-byte big-endian slice of utf8 bytes)
  // Long texts: split into 31-byte chunks and fold with Poseidon(3).
  const poseidon = await buildPoseidon();
  const textBytes = Buffer.from(String(args.intent_text), "utf8");
  let acc = 0n;
  for (let i = 0; i < textBytes.length; i += 31) {
    const chunk = textBytes.subarray(i, Math.min(i + 31, textBytes.length));
    let v = 0n;
    for (let j = 0; j < chunk.length; j++) v = (v << 8n) | BigInt(chunk[j]);
    const h = poseidon([acc, v, BigInt(i)]);
    acc = BigInt(poseidon.F.toString(h));
  }
  const intentTextHash = acc;

  const nonce = BigInt(String(args.nonce));
  const maxAmount = BigInt(String(args.max_amount_micro));
  const maxUsd = BigInt(String(args.max_usd_value_micro));
  const allowedProtocols = BigInt(Number(args.allowed_protocols_bitmap));
  const allowedActionTypes = BigInt(Number(args.allowed_action_types_bitmap));

  const { hex, decimal } = await computeIntentCommitment(
    intentTextHash,
    walletField,
    nonce,
    maxAmount,
    maxUsd,
    allowedProtocols,
    allowedActionTypes
  );

  return {
    intent_commitment_hex: hex,
    intent_commitment_decimal: decimal,
    intent_text_hash_decimal: intentTextHash.toString(),
    note:
      "Verify client-side before signing. The 32-byte hex is what sign_intent " +
      "writes to the Intent PDA.",
  };
}

function callCheckActionBounds(args: Record<string, unknown>): unknown {
  const actionType = Number(args.action_type);
  const actionAmount = BigInt(String(args.action_amount_micro));
  const targetIndex = Number(args.action_target_index);
  const priceMicro = BigInt(String(args.oracle_price_usd_micro));
  const maxAmount = BigInt(String(args.max_amount_micro));
  const maxUsd = BigInt(String(args.max_usd_value_micro));
  const allowedProtocols = BigInt(Number(args.allowed_protocols_bitmap));
  const allowedActionTypes = BigInt(Number(args.allowed_action_types_bitmap));

  const c2_amount_cap = actionAmount <= maxAmount;
  const c3_protocol_bit =
    ((allowedProtocols >> BigInt(targetIndex)) & 1n) === 1n;
  const c4_action_type_bit =
    ((allowedActionTypes >> BigInt(actionType)) & 1n) === 1n;
  const lhs = actionAmount * priceMicro;
  const rhs = maxUsd * 1_000_000n;
  const c5_usd_cap = lhs <= rhs;

  const all_pass =
    c2_amount_cap && c3_protocol_bit && c4_action_type_bit && c5_usd_cap;

  return {
    all_pass,
    checks: {
      c2_amount_cap: {
        pass: c2_amount_cap,
        action_amount: actionAmount.toString(),
        max_amount: maxAmount.toString(),
      },
      c3_protocol_bit: {
        pass: c3_protocol_bit,
        target_index: targetIndex,
        allowed_protocols_bitmap: allowedProtocols.toString(2),
      },
      c4_action_type_bit: {
        pass: c4_action_type_bit,
        action_type: actionType,
        allowed_action_types_bitmap: allowedActionTypes.toString(2),
      },
      c5_usd_cap: {
        pass: c5_usd_cap,
        lhs: lhs.toString(),
        rhs: rhs.toString(),
      },
    },
    advice: all_pass
      ? "Safe to generate Groth16 proof."
      : "Reject this action — at least one circuit constraint would fail.",
  };
}

// ── JSON-RPC helpers ─────────────────────────────────────────────
function jsonrpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonrpcError(id: unknown, code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status: code === -32700 || code === -32600 ? 400 : 200 }
  );
}
