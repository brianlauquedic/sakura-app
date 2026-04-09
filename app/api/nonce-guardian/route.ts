import { NextRequest, NextResponse } from "next/server";
import { scanNonceAccounts } from "@/lib/nonce-scanner";
import { Connection, PublicKey } from "@solana/web3.js";
import Anthropic from "@anthropic-ai/sdk";

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY ?? ""}`;
const SAKURA_FEE_WALLET = process.env.SAKURA_FEE_WALLET ?? "";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const AI_REPORT_FEE_USDC = 0.5; // $0.50 per AI analysis report
const AI_REPORT_FEE_MICRO = 500_000; // 0.50 USDC in micro-USDC (6 decimals)

export const maxDuration = 60;

// Verify x402 USDC payment on-chain
async function verifyPayment(txSig: string): Promise<boolean> {
  if (!SAKURA_FEE_WALLET) return true; // demo mode: skip if no fee wallet configured
  try {
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    const conn = new Connection(HELIUS_RPC, "confirmed");
    const feeWalletAta = getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      new PublicKey(SAKURA_FEE_WALLET)
    ).toString();

    const tx = await conn.getParsedTransaction(txSig, { maxSupportedTransactionVersion: 0 });
    if (!tx) return false;

    for (const ix of tx.transaction.message.instructions) {
      if ("parsed" in ix && ix.parsed?.type === "transferChecked") {
        const info = ix.parsed.info;
        if (
          info?.mint === USDC_MINT &&
          info?.destination === feeWalletAta &&
          Number(info?.tokenAmount?.amount ?? 0) >= AI_REPORT_FEE_MICRO
        ) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const result = await scanNonceAccounts(wallet, HELIUS_RPC);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[nonce-guardian] scan error:", err);
    return NextResponse.json({ error: `Scan failed: ${msg}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { wallet?: string } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const wallet = body.wallet;
  if (!wallet || wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // ── Scan (always free) ────────────────────────────────────────────
  let scanResult;
  try {
    scanResult = await scanNonceAccounts(wallet, HELIUS_RPC);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[nonce-guardian] scan error:", err);
    return NextResponse.json({ error: `Scan failed: ${msg}` }, { status: 500 });
  }

  // ── x402 Gate — AI report costs $0.50 USDC ───────────────────────
  const paymentSig = req.headers.get("x-payment") ?? req.headers.get("X-PAYMENT");

  if (!paymentSig && SAKURA_FEE_WALLET) {
    // Return 402 with payment challenge — scan result included so UI can show it
    return NextResponse.json(
      {
        // Payment challenge
        recipient: SAKURA_FEE_WALLET,
        amount: AI_REPORT_FEE_USDC,
        currency: "USDC" as const,
        network: "solana-mainnet" as const,
        description: "Sakura Nonce Guardian — AI Security Analysis Report",
        // Include free scan data so UI can show basic results while prompting for payment
        scanResult,
      },
      {
        status: 402,
        headers: {
          "X-Payment-Required":  "true",
          "X-Payment-Amount":    String(AI_REPORT_FEE_USDC),
          "X-Payment-Currency":  "USDC",
          "X-Payment-Recipient": SAKURA_FEE_WALLET,
          "X-Payment-Network":   "solana-mainnet",
        },
      }
    );
  }

  // Verify payment if x-payment header present
  if (paymentSig && SAKURA_FEE_WALLET) {
    const valid = await verifyPayment(paymentSig);
    if (!valid) {
      return NextResponse.json(
        { error: "Payment verification failed — send 0.50 USDC to Sakura fee wallet" },
        { status: 402 }
      );
    }
  }

  // ── AI analysis (paid) ────────────────────────────────────────────
  const { accounts, riskSignals } = scanResult;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ...scanResult, aiAnalysis: null });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a Solana security expert. Analyze these Durable Nonce accounts for wallet ${wallet.slice(0, 8)}...

Nonce Accounts Found: ${accounts.length}
${accounts.map(a => `- Address: ${a.address.slice(0, 12)}..., Authority: ${a.authority.slice(0, 12)}..., Owned by user: ${a.isOwned}`).join("\n")}

Risk Signals Detected: ${riskSignals.length}
${riskSignals.map(r => `- [${r.severity.toUpperCase()}] ${r.type}: ${r.description}`).join("\n")}

Background: On April 1, 2026, a $285M exploit used Durable Nonces — pre-signed transactions that never expire, invisible to standard wallets. If a malicious nonce account exists where the authority is NOT the user's wallet, an attacker can submit pre-signed transactions at any time.

Provide a concise security assessment in Chinese (Traditional):
1. Overall risk level (低/中/高/極高)
2. What the specific findings mean for this wallet
3. Immediate action items (if any)
4. Max 200 words.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const aiAnalysis = message.content[0].type === "text" ? message.content[0].text : null;
    return NextResponse.json({ ...scanResult, aiAnalysis });
  } catch (err) {
    console.error("[nonce-guardian] AI analysis error:", err);
    return NextResponse.json({ ...scanResult, aiAnalysis: null });
  }
}
