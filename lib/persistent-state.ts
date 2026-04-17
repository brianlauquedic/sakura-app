/**
 * Persistent State Manager — Redis-backed state for serverless environments
 *
 * In Vercel serverless, each function invocation may be a new process.
 * Without persistence, walletStates and auditTree reset on every cold start.
 *
 * This module provides:
 *   1. Redis-backed cumulative tracking (wallet execution states)
 *   2. Redis-backed Merkle root anchoring (root history)
 *   3. Graceful fallback to in-memory when Redis is not configured
 *
 * Redis keys:
 *   sakura:wallet:{address}  → WalletExecutionState JSON
 *   sakura:merkle:roots      → List of anchored Merkle roots
 *   sakura:merkle:leafcount  → Current leaf count
 *   sakura:ops:total         → Total operation count
 */

import { getRedisClient } from "./redis";

// ══════════════════════════════════════════════════════════════════
// Wallet Execution State (Redis-backed cumulative tracking)
// ══════════════════════════════════════════════════════════════════

interface PersistedWalletState {
  totalExecuted: number;
  operationCount: number;
  lastIndex: number;
  lastTimestamp: string;
  lastNullifier: string;
}

/**
 * Load wallet execution state from Redis.
 * Returns null if not found or Redis unavailable.
 */
export async function loadWalletState(walletAddress: string): Promise<PersistedWalletState | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const data = await redis.get<PersistedWalletState>(`sakura:wallet:${walletAddress}`);
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Save wallet execution state to Redis.
 * TTL: 30 days (cleanup stale wallets automatically).
 */
export async function saveWalletState(walletAddress: string, state: PersistedWalletState): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    await redis.set(`sakura:wallet:${walletAddress}`, state, { ex: 30 * 24 * 60 * 60 });
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// Merkle Root Anchoring (Redis-backed history)
// ══════════════════════════════════════════════════════════════════

interface AnchoredRoot {
  root: string;
  leafCount: number;
  memoSig: string;
  timestamp: string;
}

/**
 * Record a Merkle root anchor in Redis.
 */
export async function recordMerkleRootAnchor(anchor: AnchoredRoot): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    await redis.lpush("sakura:merkle:roots", JSON.stringify(anchor));
    await redis.set("sakura:merkle:leafcount", anchor.leafCount);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all anchored Merkle roots (most recent first).
 */
export async function getAnchoredRoots(limit: number = 50): Promise<AnchoredRoot[]> {
  const redis = getRedisClient();
  if (!redis) return [];
  try {
    const raw = await redis.lrange("sakura:merkle:roots", 0, limit - 1);
    return raw.map((r: any) => typeof r === "string" ? JSON.parse(r) : r);
  } catch {
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════
// Global Operation Counter
// ══════════════════════════════════════════════════════════════════

/**
 * Increment and return the global operation counter.
 * Used as a monotonically increasing index for cumulative tracking.
 */
export async function getNextOperationIndex(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return Date.now(); // fallback: timestamp-based index
  try {
    return await redis.incr("sakura:ops:total");
  } catch {
    return Date.now();
  }
}

/**
 * Get current operation stats from Redis.
 */
export async function getOperationStats(): Promise<{
  totalOperations: number;
  merkleLeafCount: number;
  anchoredRoots: number;
  persistent: boolean;
}> {
  const redis = getRedisClient();
  if (!redis) {
    return {
      totalOperations: 0,
      merkleLeafCount: 0,
      anchoredRoots: 0,
      persistent: false,
    };
  }
  try {
    const [total, leafCount, rootCount] = await Promise.all([
      redis.get<number>("sakura:ops:total"),
      redis.get<number>("sakura:merkle:leafcount"),
      redis.llen("sakura:merkle:roots"),
    ]);
    return {
      totalOperations: total ?? 0,
      merkleLeafCount: leafCount ?? 0,
      anchoredRoots: rootCount ?? 0,
      persistent: true,
    };
  } catch {
    return {
      totalOperations: 0,
      merkleLeafCount: 0,
      anchoredRoots: 0,
      persistent: false,
    };
  }
}
