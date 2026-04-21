/**
 * Shared Sakura MCP tool definitions.
 *
 * Two routes call into this module:
 *   • /api/mcp          — legacy JSON-RPC 2.0 over POST (backward compat)
 *   • /api/mcp/stream   — spec-compliant MCP via `mcp-handler`
 *                          (StreamableHTTP + SSE, consumable by Claude Desktop,
 *                           MCP Inspector, and any @modelcontextprotocol/sdk
 *                           client — matches the convention at
 *                           github.com/solana-foundation/solana-mcp-official)
 *
 * Tool surface is identical on both endpoints; the stream endpoint exposes
 * tools under the Solana Foundation Title_Case naming convention
 * (`Sakura_Intent_Protocol__Status`), and the legacy endpoint uses the
 * original snake_case names (`sakura_intent_protocol_status`).
 */

import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { getConnection } from "./rpc";

// ─────────────────────────────────────────────────────────────────
// Tool handler implementations
// ─────────────────────────────────────────────────────────────────

export async function intentProtocolStatus(
  args: { wallet?: string } = {}
): Promise<Record<string, unknown>> {
  const { SAKURA_INSURANCE_PROGRAM_ID, fetchProtocol, fetchIntent } =
    await import("./insurance-pool");

  const wallet = typeof args.wallet === "string" ? args.wallet : "";
  const conn = await getConnection("confirmed");

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

export async function computeIntentCommitment(args: {
  wallet: string;
  intent_text: string;
  nonce: string | number;
  max_amount_micro: string | number;
  max_usd_value_micro: string | number;
  allowed_protocols_bitmap: number;
  allowed_action_types_bitmap: number;
}): Promise<Record<string, unknown>> {
  const { computeIntentCommitment: compute, pubkeyToFieldBytes } =
    await import("./zk-proof");
  const { buildPoseidon } = await import("circomlibjs");

  const walletPk = new PublicKey(String(args.wallet));
  const walletField = pubkeyToFieldBytes(walletPk.toBytes());

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

  const { hex, decimal } = await compute(
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

export function checkActionBounds(args: {
  action_type: number;
  action_amount_micro: string | number;
  action_target_index: number;
  oracle_price_usd_micro: string | number;
  max_amount_micro: string | number;
  max_usd_value_micro: string | number;
  allowed_protocols_bitmap: number;
  allowed_action_types_bitmap: number;
}): Record<string, unknown> {
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

// ─────────────────────────────────────────────────────────────────
// Zod parameter schemas (used by the spec-compliant /stream endpoint)
// ─────────────────────────────────────────────────────────────────

export const intentProtocolStatusParams = {
  wallet: z
    .string()
    .optional()
    .describe(
      "Optional Solana wallet address (base58). If provided, returns the Intent PDA state + recent ActionRecords for this user."
    ),
};

export const computeIntentCommitmentParams = {
  wallet: z.string().describe("User's Solana wallet public key (base58)."),
  intent_text: z.string().describe("Natural-language intent text (arbitrary length — chunked into 31-byte Poseidon folds)."),
  nonce: z.union([z.string(), z.number()]).describe("Per-user monotonic nonce (u64, as decimal string)."),
  max_amount_micro: z.union([z.string(), z.number()]).describe("Token unit cap in micro-units (u64, decimal string)."),
  max_usd_value_micro: z.union([z.string(), z.number()]).describe("USD notional cap in micro-USD (u64, decimal string)."),
  allowed_protocols_bitmap: z.number().describe("Bitmap of allowed DeFi protocols (u32)."),
  allowed_action_types_bitmap: z.number().describe("Bitmap of allowed action types (u32)."),
};

export const checkActionBoundsParams = {
  action_type: z.number().describe("Action type index (0..31)."),
  action_amount_micro: z.union([z.string(), z.number()]).describe("Proposed action amount in token micro-units."),
  action_target_index: z.number().describe("Protocol index (0..31) of the target DeFi protocol."),
  oracle_price_usd_micro: z.union([z.string(), z.number()]).describe("Pyth price × 10^6 (USD micro-units per token unit)."),
  max_amount_micro: z.union([z.string(), z.number()]).describe("From signed intent: max_amount_micro."),
  max_usd_value_micro: z.union([z.string(), z.number()]).describe("From signed intent: max_usd_value_micro."),
  allowed_protocols_bitmap: z.number().describe("From signed intent: allowed_protocols_bitmap."),
  allowed_action_types_bitmap: z.number().describe("From signed intent: allowed_action_types_bitmap."),
};

// ─────────────────────────────────────────────────────────────────
// Tool metadata (shared between both endpoints)
// ─────────────────────────────────────────────────────────────────

export const SAKURA_TOOL_DESCRIPTIONS = {
  intentProtocolStatus:
    "Read the on-chain IntentProtocol state (v0.3, Agentic Consumer Protocol) plus the caller's active Intent and most recent ActionRecords if any. Returns program id, protocol admin, fee vault, total intents signed, total actions executed, pause flag — and if `wallet` is passed, the user's intent commitment, expiry, active flag, actions-executed count.",
  computeIntentCommitment:
    "Compute the 32-byte intent_commitment (2-layer Poseidon tree over 7 leaves) that the user will sign via `sign_intent`. Matches circuit constraint C1 in circuits/src/intent_proof.circom. Client should verify the returned hex against its own local computation before signing — the MCP server is a convenience, not a source of truth. Inputs are kept private: the server never stores them.",
  checkActionBounds:
    "Circuit constraint pre-flight (C2 amount cap / C3 protocol bit / C4 action-type bit / C5 USD cap). Pass the signed intent bounds and a proposed action; returns `all_pass` plus per-constraint diagnostics. If `all_pass === false`, the Groth16 prover will fail on the same action — avoid wasting prover cycles.",
} as const;
