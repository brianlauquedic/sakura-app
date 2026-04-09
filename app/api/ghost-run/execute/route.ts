/**
 * Ghost Run — Execute API
 *
 * POST /api/ghost-run/execute
 * Body: { steps: StrategyStep[], wallet: string }
 *
 * Executes confirmed strategy steps via SAK + Jupiter.
 * Ghost Run charges 0.3% platform fee (platformFeeBps: 30) on every swap
 * via Jupiter's native integrator fee — embedded in the transaction, zero friction.
 * Writes on-chain execution proof via Solana Memo Program.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSigningAgent } from "@/lib/agent";
import type { StrategyStep } from "@/lib/ghost-run";

export const maxDuration = 120;

const SAKURA_FEE_WALLET = process.env.SAKURA_FEE_WALLET ?? "";
const PLATFORM_FEE_BPS = 30; // 0.3% — competitive vs Phantom (0.85%)

export async function POST(req: NextRequest) {
  let body: { steps?: StrategyStep[]; wallet?: string } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const { steps, wallet } = body;
  if (!steps?.length || !wallet) {
    return NextResponse.json({ error: "Missing steps or wallet" }, { status: 400 });
  }

  const agent = createSigningAgent();
  if (!agent) {
    return NextResponse.json({ error: "Agent not configured (SAKURA_AGENT_PRIVATE_KEY missing)" }, { status: 500 });
  }

  const signatures: string[] = [];
  const errors: string[] = [];

  for (const step of steps) {
    try {
      let sig: string | undefined;

      if (step.type === "stake" && step.outputToken === "mSOL") {
        // Marinade liquid stake via Jupiter
        const result = await (agent as unknown as {
          stakeWithJup: (amount: number) => Promise<string>
        }).stakeWithJup(step.inputAmount);
        sig = result;
      } else if (step.type === "stake" && step.outputToken === "jitoSOL") {
        // Jito liquid stake via Jupiter
        const result = await (agent as unknown as {
          stakeWithJup: (amount: number, validator?: string) => Promise<string>
        }).stakeWithJup(step.inputAmount, "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn");
        sig = result;
      } else if (step.type === "lend") {
        const result = await (agent as unknown as {
          lendAsset: (assetMint: string, amount: number) => Promise<string>
        }).lendAsset(
          step.inputToken === "USDC"
            ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
            : "So11111111111111111111111111111111111111112",
          step.inputAmount
        );
        sig = result;
      } else if (step.type === "swap") {
        const { Connection, PublicKey, VersionedTransaction } = await import("@solana/web3.js");
        const { RPC_URL } = await import("@/lib/agent");
        const conn = new Connection(RPC_URL, "confirmed");
        const { TOKEN_MINTS, TOKEN_DECIMALS } = await import("@/lib/ghost-run");

        const inputMint = TOKEN_MINTS[step.inputToken] ?? step.inputToken;
        const outputMint = TOKEN_MINTS[step.outputToken] ?? step.outputToken;
        const inDecimals = TOKEN_DECIMALS[step.inputToken] ?? 9;
        const inputLamports = Math.round(step.inputAmount * Math.pow(10, inDecimals));

        // Get Jupiter quote
        const quoteRes = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputLamports}&slippageBps=50`
        );
        if (!quoteRes.ok) throw new Error("Jupiter quote failed");
        const quote = await quoteRes.json();

        // Compute feeAccount = Sakura fee wallet's ATA for output token
        // Jupiter will collect 0.3% of output amount into this account
        let feeAccount: string | undefined;
        if (SAKURA_FEE_WALLET) {
          try {
            const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
            feeAccount = getAssociatedTokenAddressSync(
              new PublicKey(outputMint),
              new PublicKey(SAKURA_FEE_WALLET)
            ).toString();
          } catch { /* skip fee if ATA computation fails */ }
        }

        // Get swap transaction — inject 0.3% platform fee
        const swapBody: Record<string, unknown> = {
          quoteResponse: quote,
          userPublicKey: wallet,
          wrapAndUnwrapSol: true,
        };

        if (feeAccount && SAKURA_FEE_WALLET) {
          swapBody.platformFeeBps = PLATFORM_FEE_BPS; // 0.3%
          swapBody.feeAccount = feeAccount;
        }

        const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(swapBody),
        });
        if (!swapRes.ok) throw new Error("Jupiter swap build failed");
        const { swapTransaction } = await swapRes.json();

        const txBuf = Buffer.from(swapTransaction, "base64");
        const tx = VersionedTransaction.deserialize(txBuf);
        sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
        await conn.confirmTransaction(sig, "confirmed");
      }

      if (sig) signatures.push(sig);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${step.type} ${step.inputToken}→${step.outputToken}: ${msg}`);
    }
  }

  // Write on-chain execution proof via Memo Program
  let memoSig: string | null = null;
  if (signatures.length > 0) {
    try {
      const proofText = JSON.stringify({
        event: "sakura_ghost_run_executed",
        wallet: wallet.slice(0, 8),
        steps: steps.length,
        platformFeeBps: PLATFORM_FEE_BPS,
        signatures: signatures.map(s => s.slice(0, 12)),
        ts: new Date().toISOString(),
      });

      const memoRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/agent/memo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: proofText }),
      }).catch(() => null);

      if (memoRes?.ok) {
        const memoData = await memoRes.json();
        memoSig = memoData.signature ?? null;
      }
    } catch { /* memo is optional */ }
  }

  return NextResponse.json({
    success: errors.length === 0,
    signatures,
    memoSig,
    platformFee: `${PLATFORM_FEE_BPS / 100}% collected to Sakura fee wallet`,
    errors,
  });
}
