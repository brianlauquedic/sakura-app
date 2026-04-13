/**
 * Run Store — stores Ghost Run simulation results for shareable report pages.
 * Uses Upstash Redis if configured (7-day TTL), falls back to in-memory Map.
 */
import { getRedisClient } from "./redis";
import crypto from "crypto";

export interface StoredRun {
  id: string;
  strategy: string;
  walletShort: string; // first 8 chars of wallet address only
  steps: unknown[];
  result: unknown;
  aiAnalysis: string | null;
  commitmentId: string | null;
  commitmentMemoSig: string | null;
  lang: string;
  ts: number; // unix ms
}

const RUN_TTL_SECONDS = 7 * 24 * 3600; // 7 days

// In-memory fallback (dev / no Redis)
const _memStore = new Map<string, StoredRun>();

export async function storeRun(data: Omit<StoredRun, "id">): Promise<string> {
  const id = crypto.randomBytes(5).toString("hex"); // 10-char hex ID
  const run: StoredRun = { ...data, id };
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(`sakura:run:${id}`, JSON.stringify(run), { ex: RUN_TTL_SECONDS });
    } catch {
      _memStore.set(id, run);
    }
  } else {
    _memStore.set(id, run);
    // Evict old entries if over 500 (memory safety)
    if (_memStore.size > 500) {
      const oldest = _memStore.keys().next().value;
      if (oldest) _memStore.delete(oldest);
    }
  }
  return id;
}

export async function getRun(id: string): Promise<StoredRun | null> {
  if (!id || !/^[a-f0-9]{10}$/.test(id)) return null;
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get<string>(`sakura:run:${id}`);
      if (raw) return typeof raw === "string" ? JSON.parse(raw) : raw as StoredRun;
    } catch { /* fall through */ }
  }
  return _memStore.get(id) ?? null;
}
