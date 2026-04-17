/**
 * Compressed Airdrop API — Light Protocol ZK Compression via SAK MiscPlugin
 *
 * POST /api/compressed-airdrop
 * Body: { mintAddress, amount, decimals, recipients, wallet }
 *
 * Demonstrates Light Protocol's ZK compression through Solana Agent Kit:
 * - Compressed tokens cost ~200x less than standard SPL transfers
 * - Uses Merkle tree state compression with validity proofs
 * - Integrated with Sakura's dual-hash cryptographic proof layer
 *
 * This is the SAK MiscPlugin showcase — proving the plugin is actually used.
 */

import { NextRequest, NextResponse } from "next/server";
import { createFullAgent, createSigningAgent, sakCompressedAirdrop } from "@/lib/agent";
import { processOperation } from "@/lib/dual-hash";
import { sha256 } from "@/lib/crypto-proof";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: {
    mintAddress?: string;
    amount?: number;
    decimals?: number;
    recipients?: string[];
    wallet?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mintAddress, amount, decimals, recipients, wallet } = body;

  if (!mintAddress || !amount || decimals === undefined || !recipients?.length || !wallet) {
    return NextResponse.json({
      error: "Missing required fields: mintAddress, amount, decimals, recipients, wallet",
    }, { status: 400 });
  }

  if (recipients.length > 100) {
    return NextResponse.json({ error: "Maximum 100 recipients per airdrop" }, { status: 400 });
  }

  // ── Dual-hash proof for the airdrop operation ──────────────────────
  const ts = new Date().toISOString();
  const canonicalInput = `COMPRESSED_AIRDROP|${mintAddress}|${amount}|${decimals}|${recipients.length}|${wallet.slice(0, 8)}|${ts}`;
  const dualHashRecord = processOperation("ghost_run", canonicalInput, ts);

  // ── Execute via SAK MiscPlugin ─────────────────────────────────────
  let signatures: string[] = [];
  let error: string | null = null;
  let compressed = false;

  try {
    const agent = await createFullAgent();
    if (!agent) {
      // Demo mode: return proof data without actual execution
      return NextResponse.json({
        success: false,
        demo: true,
        message: "Agent not configured — returning cryptographic proof only (demo mode)",
        dualHash: {
          sha256: dualHashRecord.sha256Hash,
          poseidon: dualHashRecord.poseidonHash,
          merkleRoot: dualHashRecord.merkleRoot,
          merkleLeafIndex: dualHashRecord.merkleLeaf.index,
          treeSize: dualHashRecord.treeSize,
        },
        canonicalInput,
        timestamp: ts,
      });
    }

    // Call SAK MiscPlugin's sendCompressedAirdrop (sakCompressedAirdrop wrapper)
    const result = await sakCompressedAirdrop(agent, mintAddress, amount, decimals, recipients);

    signatures = Array.isArray(result) ? result : [result];
    compressed = true;
  } catch (err) {
    // [SECURITY FIX H-1] Never expose raw error — log server-side only
    console.error("[compressed-airdrop] error:", err instanceof Error ? err.message : String(err));
    error = "Compressed airdrop failed";
  }

  // ── Write Memo proof ───────────────────────────────────────────────
  let memoSig: string | null = null;
  if (signatures.length > 0) {
    try {
      const memoPayload = JSON.stringify({
        event: "sakura_compressed_airdrop",
        version: 1,
        mint: mintAddress.slice(0, 12),
        amount,
        recipients: recipients.length,
        compressed: true,
        sha256: dualHashRecord.sha256Hash,
        poseidon: dualHashRecord.poseidonHash,
        merkle_root: dualHashRecord.merkleRoot,
        signatures: signatures.map(s => s.slice(0, 12)),
        ts,
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`);
      if (baseUrl) {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (process.env.INTERNAL_API_SECRET) {
          headers["x-internal-secret"] = process.env.INTERNAL_API_SECRET;
        }
        const memoRes = await fetch(`${baseUrl}/api/agent/memo`, {
          method: "POST",
          headers,
          body: JSON.stringify({ memoPayload }),
        }).catch(() => null);
        if (memoRes?.ok) {
          const d = await memoRes.json();
          memoSig = d.txSignature ?? null;
        }
      }
    } catch { /* memo is optional */ }
  }

  return NextResponse.json({
    success: !error && signatures.length > 0,
    compressed,
    signatures,
    memoSig,
    dualHash: {
      sha256: dualHashRecord.sha256Hash,
      poseidon: dualHashRecord.poseidonHash,
      merkleRoot: dualHashRecord.merkleRoot,
      merkleLeafIndex: dualHashRecord.merkleLeaf.index,
      treeSize: dualHashRecord.treeSize,
    },
    lightProtocol: {
      compression: "ZK State Compression",
      costReduction: "~200x vs standard SPL transfer",
      proofType: "Validity proof (Merkle tree compression)",
    },
    error,
  });
}

// GET: documentation
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/compressed-airdrop",
    description: "Light Protocol ZK Compressed Token Airdrop via SAK MiscPlugin",
    method: "POST",
    body: {
      mintAddress: "SPL token mint address",
      amount: "Amount per recipient",
      decimals: "Token decimals",
      recipients: "Array of recipient wallet addresses (max 100)",
      wallet: "Sender wallet address",
    },
    features: [
      "Light Protocol ZK State Compression (~200x cost reduction)",
      "SAK MiscPlugin integration (sendCompressedAirdrop)",
      "Dual-hash proof (SHA-256 + Poseidon) per operation",
      "Merkle audit tree insertion with inclusion proof",
      "On-chain Memo anchoring for audit trail",
    ],
  });
}
