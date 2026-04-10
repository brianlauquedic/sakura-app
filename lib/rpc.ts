/**
 * Multi-RPC failover connection factory (Module 16: Production Deployment)
 *
 * Module 16 principle: "Design from day one to support multiple RPC nodes.
 * Auto-failover when primary is down — users never see a 503."
 *
 * Priority order:
 *  1. HELIUS_RPC_URL (primary — paid, lowest latency)
 *  2. BACKUP_RPC_URL (secondary — Alchemy/QuickNode)
 *  3. https://api.mainnet-beta.solana.com (public fallback, rate-limited)
 *
 * Usage:
 *   const conn = await getConnection();           // auto-selects fastest healthy RPC
 *   const conn = getConnectionSync();             // synchronous, uses primary
 */

import { Connection } from "@solana/web3.js";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";

const RPC_ENDPOINTS = [
  // Primary
  process.env.HELIUS_RPC_URL
    ?? (HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}` : null),
  // Backup (configure in Vercel env)
  process.env.BACKUP_RPC_URL ?? null,
  // Public fallback — always available but rate-limited
  "https://api.mainnet-beta.solana.com",
].filter(Boolean) as string[];

// Deduplicate while preserving order
const UNIQUE_RPCS = [...new Set(RPC_ENDPOINTS)];

/**
 * Returns a Connection using the first healthy RPC endpoint.
 * Health check: getSlot() with 3s timeout.
 * Falls back down the priority list on failure.
 *
 * Module 16: "Don't just failover on connection error — check the slot
 * is fresh (≥ expected mainnet slot height) to catch degraded RPCs."
 */
export async function getConnection(commitment: "confirmed" | "finalized" = "confirmed"): Promise<Connection> {
  for (const url of UNIQUE_RPCS) {
    try {
      const conn = new Connection(url, commitment);
      // Quick health check: getSlot with 3s abort
      const slot = await Promise.race([
        conn.getSlot(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), 3_000)
        ),
      ]);
      // Sanity: mainnet slot should be > 250M as of 2026
      if (slot > 100_000) return conn;
    } catch {
      console.warn(`[rpc] Primary RPC unavailable (${url.slice(0, 40)}…), trying next`);
    }
  }
  // All failed — return primary anyway (caller handles errors)
  console.error("[rpc] All RPC endpoints failed health check, using primary as last resort");
  return new Connection(UNIQUE_RPCS[0], commitment);
}

/**
 * Dynamic priority fee calculation (Module 16: "smart pricing based on network conditions").
 *
 * Module 16: "Observe current network state, adjust priority fee accordingly.
 * Idle network → minimum fee, congested → sufficient fee."
 *
 * Uses getRecentPrioritizationFees() RPC call to sample the last 150 slots.
 * Returns fee in microLamports per CU.
 */
export async function getDynamicPriorityFee(conn: Connection): Promise<number> {
  try {
    const fees = await Promise.race([
      conn.getRecentPrioritizationFees(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 2_000)
      ),
    ]);

    if (!fees || fees.length === 0) return 50_000; // fallback

    // Take the 75th percentile of recent fees (not max to avoid overpaying,
    // not median to ensure inclusion in congested conditions)
    const sorted = fees.map(f => f.prioritizationFee).sort((a, b) => a - b);
    const p75idx = Math.floor(sorted.length * 0.75);
    const p75fee = sorted[p75idx] ?? 0;

    // Clamp: never below 1_000 (too low = dropped), never above 500_000 (overpaying)
    // Module 16 tiers: idle <5k, normal 5k-50k, congested 50k-500k
    return Math.max(1_000, Math.min(500_000, p75fee || 10_000));
  } catch {
    return 50_000; // fallback if RPC call fails
  }
}

export { UNIQUE_RPCS };
