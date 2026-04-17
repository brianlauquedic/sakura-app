/**
 * GET /api/insurance/status?user=<pubkey>
 *
 * Returns the current Sakura Mutual pool state and (optionally) the
 * caller's policy state. Polled every 15s by `components/MutualPool.tsx`.
 *
 * Response:
 *   {
 *     programId: string,
 *     poolAdmin: string,
 *     pool: PoolView | null,     // null if pool not initialized
 *     policy: PolicyView | null, // null if user has no policy
 *   }
 *
 * Both views are JSON-friendly: bigints are converted to Number (micro-USDC
 * divided to USDC units where it makes sense), PublicKeys to base58 strings.
 */
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "@/lib/rpc";
import {
  SAKURA_INSURANCE_PROGRAM_ID,
  fetchPool,
  fetchPolicy,
  type PoolState,
  type PolicyState,
} from "@/lib/insurance-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POOL_ADMIN_B58 =
  process.env.NEXT_PUBLIC_INSURANCE_ADMIN?.trim() ||
  process.env.INSURANCE_ADMIN?.trim() ||
  "2iCWnS1J8WYZn4reo9YD76qZiiZ39t2c1oGM3dyYwHNg";

function microToUsd(n: bigint): number {
  return Number(n) / 1_000_000;
}

function poolView(state: PoolState) {
  return {
    admin: state.admin.toBase58(),
    adminAgent: state.adminAgent.toBase58(),
    platformTreasury: state.platformTreasury.toBase58(),
    usdcMint: state.usdcMint.toBase58(),
    usdcVault: state.usdcVault.toBase58(),
    totalStakesUsdc: microToUsd(state.totalStakes),
    coverageOutstandingUsdc: microToUsd(state.coverageOutstanding),
    totalClaimsPaidUsdc: microToUsd(state.totalClaimsPaid),
    premiumBps: state.premiumBps,
    platformFeeBps: state.platformFeeBps,
    minStakeMultiplier: state.minStakeMultiplier,
    maxCoveragePerUserUsdc: microToUsd(state.maxCoveragePerUserUsdc),
    waitingPeriodSec: Number(state.waitingPeriodSec),
    paused: state.paused,
  };
}

function policyView(state: PolicyState) {
  const totalCoverage = microToUsd(state.coverageCapUsdc);
  const claimed = microToUsd(state.totalClaimed);
  return {
    user: state.user.toBase58(),
    coverageCapUsdc: totalCoverage,
    premiumPaidUsdc: microToUsd(state.premiumPaidMicro),
    stakeUsdc: microToUsd(state.stakeUsdc),
    paidThrough: new Date(Number(state.paidThroughUnix) * 1000).toISOString(),
    boughtAt: new Date(Number(state.boughtAtUnix) * 1000).toISOString(),
    totalClaimedUsdc: claimed,
    remainingCoverageUsdc: Math.max(0, totalCoverage - claimed),
    rescueCount: Number(state.rescueCount),
    commitmentHash: "0x" + state.commitmentHash.toString("hex"),
    isActive: state.isActive,
  };
}

export async function GET(req: NextRequest) {
  try {
    const userParam = req.nextUrl.searchParams.get("user");
    const adminParam = req.nextUrl.searchParams.get("admin") ?? POOL_ADMIN_B58;

    let admin: PublicKey;
    try {
      admin = new PublicKey(adminParam);
    } catch {
      return NextResponse.json(
        { error: `Invalid pool admin pubkey: ${adminParam}` },
        { status: 400 }
      );
    }

    const conn = await getConnection("confirmed");
    const { state: pool } = await fetchPool(conn, admin);

    let policy: PolicyState | null = null;
    if (userParam) {
      try {
        const user = new PublicKey(userParam);
        const r = await fetchPolicy(conn, user);
        policy = r.state;
      } catch {
        // Invalid user pubkey — swallow, return pool-only.
      }
    }

    return NextResponse.json({
      programId: SAKURA_INSURANCE_PROGRAM_ID.toBase58(),
      poolAdmin: admin.toBase58(),
      pool: pool ? poolView(pool) : null,
      policy: policy ? policyView(policy) : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
