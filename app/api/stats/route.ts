/**
 * Sakura — Usage Stats API
 *
 * GET /api/stats?key=STATS_KEY
 *
 * Returns unique wallet counts per feature.
 * Protected by STATS_API_KEY env var — only you and hackathon judges see this.
 * If STATS_API_KEY is not set, endpoint is disabled.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUsageStats } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const STATS_KEY = process.env.STATS_API_KEY;

  // If no key configured, disable endpoint
  if (!STATS_KEY) {
    return NextResponse.json({ error: "Stats not configured" }, { status: 404 });
  }

  // Verify key
  const provided = req.nextUrl.searchParams.get("key");
  if (provided !== STATS_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getUsageStats();

  return NextResponse.json({
    project: "Sakura v2",
    updated: new Date().toISOString(),
    users: {
      total:  stats.total,
      nonce_guardian:      stats.nonce,
      ghost_run:           stats.ghost,
      liquidation_shield:  stats.shield,
    },
    note: "Unique Solana wallet addresses. Each wallet counted once per feature.",
  });
}
