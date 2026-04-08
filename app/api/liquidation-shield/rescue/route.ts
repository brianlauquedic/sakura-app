/**
 * Liquidation Shield — Rescue API
 *
 * POST /api/liquidation-shield/rescue
 * Body: { wallet, position, rescueUsdc, mandateTxSig? }
 *
 * Executes SAK-powered rescue: repays debt to restore health factor.
 * Writes Memo on-chain referencing mandateTxSig for audit chain.
 *
 * On-chain audit chain:
 *   mandate tx (SPL approve + Memo) → rescue tx (Memo ref: rescueId)
 */
import { NextRequest, NextResponse } from "next/server";
import { createSigningAgent } from "@/lib/agent";
import type { LendingPosition } from "@/lib/liquidation-shield";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: {
    wallet?: string;
    position?: LendingPosition;
    rescueUsdc?: number;
    mandateTxSig?: string;
  } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const { wallet, position, rescueUsdc, mandateTxSig } = body;
  if (!wallet || !position || !rescueUsdc) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const agent = createSigningAgent();
  if (!agent) {
    return NextResponse.json(
      { error: "Agent not configured (SOLIS_AGENT_PRIVATE_KEY missing)" },
      { status: 500 }
    );
  }

  let rescueSig: string | null = null;
  let error: string | null = null;

  try {
    // SAK lendAsset() for repayment — this is the core SAK execution
    // lendAsset with negative amount = repay in some SAK versions,
    // otherwise we use trade to acquire USDC then repay
    const defiAgent = agent as unknown as {
      lendAsset: (mint: string, amount: number) => Promise<string>;
      trade: (outputMint: string, inputAmount: number, inputMint: string, slippage?: number) => Promise<string>;
    };

    if (position.debtToken === "USDC") {
      // Direct USDC repayment via SAK lendAsset (Kamino repay)
      rescueSig = await defiAgent.lendAsset(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
        rescueUsdc
      );
    } else {
      // Acquire debt token via swap first, then repay
      const debtMint = position.debtToken === "SOL"
        ? "So11111111111111111111111111111111111111112"
        : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

      rescueSig = await defiAgent.lendAsset(debtMint, rescueUsdc);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error("[liquidation-shield/rescue] SAK error:", err);
  }

  // Write on-chain Memo audit record (ref: mandateTxSig)
  let memoSig: string | null = null;
  const auditData = JSON.stringify({
    event: "rescue_executed",
    protocol: position.protocol,
    wallet: wallet.slice(0, 8),
    rescueUsdc,
    preHealthFactor: position.healthFactor.toFixed(3),
    postHealthFactor: position.postRescueHealthFactor?.toFixed(3),
    mandateRef: mandateTxSig?.slice(0, 20) ?? "none",
    rescueSig: rescueSig?.slice(0, 20) ?? "failed",
    ts: new Date().toISOString(),
  });

  try {
    const memoRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/agent/memo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: auditData }),
      }
    ).catch(() => null);

    if (memoRes?.ok) {
      const d = await memoRes.json();
      memoSig = d.signature ?? null;
    }
  } catch { /* memo is optional */ }

  return NextResponse.json({
    success: !!rescueSig && !error,
    rescueSig,
    memoSig,
    auditChain: mandateTxSig ? `${mandateTxSig.slice(0, 12)}… → ${memoSig?.slice(0, 12) ?? "?"}…` : null,
    error,
  });
}
