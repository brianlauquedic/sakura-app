import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";
import { getConnection } from "@/lib/rpc";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const RPC_URL =
  process.env.HELIUS_RPC_URL ??
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY ?? ""}`;

// Max memo payload length (Solana memo program limit is 566 bytes for a single tx)
const MAX_MEMO_BYTES = 560;

function getPlatformKeypair(): Keypair | null {
  const raw = process.env.SAKURA_AGENT_PRIVATE_KEY;
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let memoPayload: string;
  try {
    const body = await req.json();
    // [SECURITY FIX M-1] INTERNAL_API_SECRET is now MANDATORY.
    // Without it, anyone can call this endpoint and drain platform SOL via memo writes.
    const configuredSecret = process.env.INTERNAL_API_SECRET;
    if (!configuredSecret) {
      console.error("[agent/memo] INTERNAL_API_SECRET not configured — endpoint disabled for safety");
      return NextResponse.json({ error: "endpoint_not_configured" }, { status: 503 });
    }
    const provided = req.headers.get("x-internal-secret");
    if (provided !== configuredSecret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    memoPayload = (body.message ?? body.memoPayload) as string;
    if (!memoPayload || typeof memoPayload !== "string") {
      return NextResponse.json({ error: "memoPayload required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  // [SECURITY FIX] Truncate to byte-safe length to prevent oversized tx
  // Also strip trailing U+FFFD from multi-byte UTF-8 boundary splits
  const encoded = new TextEncoder().encode(memoPayload);
  const safeMemo = encoded.length > MAX_MEMO_BYTES
    ? new TextDecoder().decode(encoded.slice(0, MAX_MEMO_BYTES)).replace(/\uFFFD+$/, "")
    : memoPayload;

  const keypair = getPlatformKeypair();
  if (!keypair) {
    // No platform key configured — fall back to client-side Phantom signing
    return NextResponse.json(
      { error: "no_platform_key", message: "SAKURA_AGENT_PRIVATE_KEY not configured" },
      { status: 501 }
    );
  }

  try {
    // Module 16: multi-RPC failover — auto-selects healthiest endpoint
    const connection = await getConnection("confirmed");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: keypair.publicKey,
    }).add(
      new TransactionInstruction({
        keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(safeMemo, "utf-8"),
      })
    );

    tx.sign(keypair);
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return NextResponse.json({
      txSignature: signature,
      explorerUrl: `https://solscan.io/tx/${signature}`,
      memoPayload: safeMemo,
    });
  } catch (e: unknown) {
    // [SECURITY FIX] Never expose raw error messages — log server-side only
    const msg = e instanceof Error ? e.message : "transaction failed";
    console.error("[agent/memo] tx error:", msg);
    return NextResponse.json({ error: "memo_write_failed" }, { status: 500 });
  }
}
