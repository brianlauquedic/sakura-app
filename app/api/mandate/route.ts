/**
 * Sakura Mandate API — On-chain PDA Management
 *
 * GET  /api/mandate?wallet=<pubkey>  → Read mandate state from chain
 * POST /api/mandate                  → Build create/update/close mandate tx
 *
 * This endpoint interacts with the Sakura Mandate Anchor program.
 * PDAs store rescue authorization parameters on-chain, replacing the
 * off-chain Memo-only approach with verifiable on-chain state.
 */
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "@/lib/rpc";
import {
  fetchMandate,
  buildCreateMandateIx,
  buildCloseMandateIx,
  buildUpdateMandateIx,
  usdcToMicro,
  formatMandateState,
  SAKURA_MANDATE_PROGRAM_ID,
} from "@/lib/mandate-program";

// ── GET: Read mandate PDA state ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const conn = await getConnection("confirmed");
    const walletPubkey = new PublicKey(wallet);
    const { pda, state } = await fetchMandate(conn, walletPubkey);

    if (!state) {
      return NextResponse.json({
        exists: false,
        pda: pda.toString(),
        programId: SAKURA_MANDATE_PROGRAM_ID.toString(),
        message: "No active rescue mandate found. Create one to enable Liquidation Shield.",
      });
    }

    return NextResponse.json({
      exists: true,
      pda: pda.toString(),
      programId: SAKURA_MANDATE_PROGRAM_ID.toString(),
      mandate: formatMandateState(state),
    });
  } catch (err) {
    console.error("[mandate/GET] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to read mandate state" }, { status: 500 });
  }
}

// ── POST: Build mandate transaction ─────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    action?: "create" | "update" | "close";
    wallet?: string;
    agent?: string;
    maxUsdc?: number;
    triggerHf?: number; // e.g., 1.5
  } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const { action, wallet } = body;

  if (!action || !wallet || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return NextResponse.json({ error: "Missing action or invalid wallet" }, { status: 400 });
  }

  try {
    const walletPubkey = new PublicKey(wallet);
    const conn = await getConnection("confirmed");
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");

    let ix;

    if (action === "create") {
      if (!body.agent || !body.maxUsdc || !body.triggerHf) {
        return NextResponse.json({ error: "create requires agent, maxUsdc, triggerHf" }, { status: 400 });
      }
      if (body.maxUsdc <= 0 || body.maxUsdc > 1_000_000) {
        return NextResponse.json({ error: "maxUsdc must be between 0 and 1,000,000" }, { status: 400 });
      }
      const triggerHfBps = Math.round(body.triggerHf * 100);
      if (triggerHfBps < 101 || triggerHfBps > 300) {
        return NextResponse.json({ error: "triggerHf must be between 1.01 and 3.00" }, { status: 400 });
      }

      const agentPubkey = new PublicKey(body.agent);
      ix = buildCreateMandateIx(
        walletPubkey,
        agentPubkey,
        usdcToMicro(body.maxUsdc),
        triggerHfBps,
      );
    } else if (action === "update") {
      ix = buildUpdateMandateIx(
        walletPubkey,
        body.maxUsdc != null ? usdcToMicro(body.maxUsdc) : undefined,
        body.triggerHf != null ? Math.round(body.triggerHf * 100) : undefined,
      );
    } else if (action === "close") {
      ix = buildCloseMandateIx(walletPubkey);
    } else {
      return NextResponse.json({ error: "action must be create, update, or close" }, { status: 400 });
    }

    // Build transaction for frontend wallet signing
    const { Transaction } = await import("@solana/web3.js");
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: walletPubkey,
    }).add(ix);

    const serializedTx = Buffer.from(
      tx.serialize({ requireAllSignatures: false })
    ).toString("base64");

    return NextResponse.json({
      action,
      serializedTx,
      blockhash,
      lastValidBlockHeight,
      programId: SAKURA_MANDATE_PROGRAM_ID.toString(),
    });
  } catch (err) {
    console.error("[mandate/POST] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to build mandate transaction" }, { status: 500 });
  }
}
