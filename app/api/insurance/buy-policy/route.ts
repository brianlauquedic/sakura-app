/**
 * POST /api/insurance/buy-policy
 *
 * Builds an unsigned v0 transaction for the Sakura Mutual `buy_policy`
 * instruction. The client (MutualPool.tsx) deserializes and signs via the
 * wallet provider (Phantom / OKX).
 *
 * Server-side responsibility:
 *   1. Derive the Poseidon commitment hash
 *        Poseidon(position_account, user_wallet, nonce)
 *      using the exact same field-encoding the circuit expects. This keeps
 *      the nonce private on the server and returns it back to the client
 *      so they can store it for future ZK rescue claims.
 *   2. Compute premium = coverage_cap * premium_bps / 10000 (one month).
 *   3. Compute minimum required stake = premium * min_stake_multiplier / 100.
 *   4. Build the `buy_policy` instruction via `buildBuyPolicyIx`.
 *   5. Compile it as a v0 message and return base64.
 *
 * Request body:
 *   {
 *     wallet: string,              // user pubkey (signer + fee-payer)
 *     poolAdmin?: string,          // defaults to INSURANCE_ADMIN env
 *     coverageCapUsdc: number,     // whole USDC units
 *     stakeUsdc?: number,          // whole USDC units (defaults to min required)
 *     obligationAddress?: string,  // Kamino obligation pubkey to bind (default: wallet for demo)
 *     nonceHex?: string,           // 32-byte hex nonce (defaults to random)
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     txBase64: string,            // unsigned v0 tx
 *     commitmentHash: string,      // 0x-prefixed hex (matches Policy.commitment_hash)
 *     nonce: string,               // decimal; SAVE THIS — required for later rescue claims
 *     premiumMicroUsdc: string,
 *     stakeMicroUsdc: string,
 *     coverageCapMicroUsdc: string,
 *     policyPda: string,
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getDevnetConnection } from "@/lib/rpc";
import {
  buildBuyPolicyIx,
  derivePolicyPDA,
  fetchPool,
  USDC_MINT_DEVNET,
} from "@/lib/insurance-pool";
import { computePolicyCommitment } from "@/lib/zk-proof";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POOL_ADMIN_B58 =
  process.env.NEXT_PUBLIC_INSURANCE_ADMIN?.trim() ||
  process.env.INSURANCE_ADMIN?.trim() ||
  "2iCWnS1J8WYZn4reo9YD76qZiiZ39t2c1oGM3dyYwHNg";

/** Pubkey → 31-byte big-int in the same convention as the circuit. */
function pubkeyToField31(pk: PublicKey): bigint {
  const bytes = pk.toBytes(); // 32 BE
  // Use first 31 bytes to stay safely under the BN254 modulus.
  let v = 0n;
  for (let i = 0; i < 31; i++) v = (v << 8n) | BigInt(bytes[i]);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const walletStr = String(body.wallet ?? "").trim();
    if (!walletStr) return err(400, "wallet required");

    let user: PublicKey;
    try {
      user = new PublicKey(walletStr);
    } catch {
      return err(400, `invalid wallet pubkey: ${walletStr}`);
    }

    let admin: PublicKey;
    try {
      admin = new PublicKey(body.poolAdmin ?? POOL_ADMIN_B58);
    } catch {
      return err(400, "invalid poolAdmin");
    }

    const coverageCapUsdc = Number(body.coverageCapUsdc);
    if (!Number.isFinite(coverageCapUsdc) || coverageCapUsdc <= 0) {
      return err(400, "coverageCapUsdc must be a positive number");
    }

    const conn = await getDevnetConnection("confirmed");
    const { state: pool } = await fetchPool(conn, admin);
    if (!pool) return err(400, "pool not initialized");
    if (pool.paused) return err(400, "pool is paused");

    // Price formulas (micro-USDC):
    //   premium = coverage_cap * premium_bps / 10_000  (one month)
    //   stake_min = premium * min_stake_multiplier / 100
    const coverageCapMicro = BigInt(Math.round(coverageCapUsdc * 1_000_000));
    if (coverageCapMicro > pool.maxCoveragePerUserUsdc) {
      return err(
        400,
        `coverageCapUsdc exceeds pool maximum of ${Number(pool.maxCoveragePerUserUsdc) / 1e6}`
      );
    }

    const premiumMicro =
      (coverageCapMicro * BigInt(pool.premiumBps)) / 10_000n;
    const stakeMinMicro =
      (premiumMicro * BigInt(pool.minStakeMultiplier)) / 100n;

    const stakeMicro =
      body.stakeUsdc != null
        ? BigInt(Math.round(Number(body.stakeUsdc) * 1_000_000))
        : stakeMinMicro;

    if (stakeMicro < stakeMinMicro) {
      return err(
        400,
        `stakeUsdc must be at least ${Number(stakeMinMicro) / 1e6} (>= ${pool.minStakeMultiplier / 100}× premium)`
      );
    }

    // Commitment — Poseidon(position_account, user_wallet, nonce)
    let obligation: PublicKey;
    try {
      obligation = body.obligationAddress
        ? new PublicKey(body.obligationAddress)
        : user; // demo default: bind to own wallet
    } catch {
      return err(400, "invalid obligationAddress");
    }

    // Random 16-byte nonce by default, so repeated buys don't collide.
    const nonceBig =
      body.nonceHex && typeof body.nonceHex === "string"
        ? BigInt("0x" + body.nonceHex.replace(/^0x/i, ""))
        : BigInt("0x" + crypto.randomBytes(16).toString("hex"));

    const commitment = await computePolicyCommitment(
      pubkeyToField31(obligation),
      pubkeyToField31(user),
      nonceBig
    );
    const commitmentBuffer = Buffer.from(commitment.bytesBE32);

    // User's USDC ATA (funds transfer source for premium + stake)
    const userUsdcAta = getAssociatedTokenAddressSync(
      pool.usdcMint,
      user,
      false
    );

    // Build instruction
    const buyIx = buildBuyPolicyIx({
      poolAdmin: admin,
      user,
      userUsdcAta,
      platformTreasury: pool.platformTreasury,
      premiumMicroUsdc: premiumMicro,
      coverageCapMicroUsdc: coverageCapMicro,
      stakeMicroUsdc: stakeMicro,
      commitmentHash: commitmentBuffer,
    });

    // Compose a v0 tx with compute budget
    const cuLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 300_000,
    });
    const cuPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 25_000,
    });

    const latest = await conn.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: user,
      recentBlockhash: latest.blockhash,
      instructions: [cuLimitIx, cuPriceIx, buyIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    const txBase64 = Buffer.from(tx.serialize()).toString("base64");

    const [policyPda] = derivePolicyPDA(user);

    return NextResponse.json({
      ok: true,
      txBase64,
      commitmentHash: commitment.hex,
      nonce: nonceBig.toString(),
      premiumMicroUsdc: premiumMicro.toString(),
      stakeMicroUsdc: stakeMicro.toString(),
      coverageCapMicroUsdc: coverageCapMicro.toString(),
      policyPda: policyPda.toBase58(),
      usdcMint: pool.usdcMint.toBase58(),
      userUsdcAta: userUsdcAta.toBase58(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(500, msg);
  }
}

function err(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
