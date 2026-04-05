/**
 * Smart Money Signal Reconstruction — 30天鏈上聰明錢信號
 *
 * 原理：對 30 個標記聰明錢錢包（KOL/Whale/Smart_Money/Cabal）查詢
 *       過去 30 天的 SWAP 記錄，計算每天淨買入 SOL 的錢包比例
 *       → solBias (0~1) → 作為 smart_money 策略的分配信號。
 *
 * 這是「GMGN風格聰明錢信號」的真實鏈上等效替代：
 * GMGN 無歷史信號 API，但我們的 30 個標記地址 = 相同數據源。
 *
 * GET /api/backtest/smart-signals
 * 返回：{ signals: [{dateS, solBias, buyCount, sellCount, totalActive}],
 *         dataSource: "helius_realtime"|"demo", walletCount, generatedAt }
 * 緩存：6小時（鏈上歷史不會快速變化）
 */

import { NextResponse } from "next/server";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";

// ── Types ─────────────────────────────────────────────────────────

interface HeliusTx {
  signature: string;
  timestamp: number; // unix seconds
  type: string;
  feePayer: string;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number; // lamports
  }>;
}

export interface DaySignal {
  dateS: number;       // unix seconds — 當天 00:00 UTC
  solBias: number;     // 0.0–1.0 — 當天淨買入 SOL 的錢包比例
  buyCount: number;
  sellCount: number;
  totalActive: number;
}

// ── 30 個標記錢包（與 smart-money/route.ts 同步）────────────────
const LABELED_WALLETS: string[] = [
  "9jyqFiLnruggwNn4EQwBNFXwpbLM9hrA4hV59ytyAVVz",
  "DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm",
  "C3nLTNMK6Ao1s3J1CQhv8GbT3NoMmifWoi9PGEcYd9hP",
  "8tP391aDbKKpQS7eKnCEfnJ8Cmek6jatEe2LFkdJ2PRP",
  "2btYi2pqVgtgzLqeAXE122FPhN2xBJMQpE1V9CMNv4EH",
  "5tzFkiKscXHK5ZXCGbfy7mQfK3NaXNGFoqwfRzTDFBhV",
  "HXRicMzuHsmDuGULgVSBdBfn3xhEjUm7BVEMP5eTQVxx",
  "Ae1W8RXnWbXPBgU52EZqCkBnJdNr1VKV2oJkTK6fFkHY",
  "BGq4iuvTHBHYE8gJFzMnYBxiZS64FvxbCkCrCdMKCeJR",
  "9vNBe3M7QnN9YmCi5Q4gXpDzJhY3o74RaX1FdHtKxBSy",
  "GThUX1Atko4tqhN2NaiTazWSeFWMoAE1hBHJJ4XJhPMt",
  "BNSwdmtKrKN9MvqBqnPQejT3x6E2VBtdSiELGefUvRTH",
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  "CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq",
  "J27ma1MPBRvmPJxLqBqQGNECMXDm1skxAMpL3WeRzGrM",
  "2xNweLHLqrbx4zo1wKRntv4ST7CZUjEiN544zoeA8cjo",
  "JDKJSkxMZ9iNHBMHkAjE4Y3emvjQomBW3jL1ZmF7FVAJ",
  "AHLwq66Cg3CuDJTFtwjPfwjJhB7JLMB64nFnB3oHyMW",
  "FWznbcNXWquhrqkNBvmLJBN6ZNi1UPan9TRVDBsqDRHf",
  "6kTGPRFESTSuTtBMtxHHbvnA7raxJMmYb3UE6fHDGN7A",
  "3AXhpJJkJJEFUC2C1GWpMb3EL3fz6QdvFBF1C2RCkWBB",
  "7ZBE9JqM8UUDkNm7JVnMmf2h2V7xMaXmyS1vDv4ZoRV9",
  "FBTjSBF9dpGAuvMpFBhpd8ZAr9sYMMRhm6JpJjuRhFPP",
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "3XFMsNi28sE99aX4BCpkKXjx7Bxuuz3pJNXeGhwn5vR3",
  "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5",
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
  "HmRGnNRMGznFw6VJ8LCeChQ9wjt2E5hCEbpBSBSE7UBY",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
];

// ── Helpers ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

/** 一天的 key（YYYY-MM-DD UTC）*/
function toDayKey(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

/** 取一天的 00:00 UTC unix seconds */
function dayFloorSec(unixSec: number): number {
  return unixSec - (unixSec % 86400);
}

// ── 取單個錢包的每日 SOL 淨方向 ──────────────────────────────────

interface WalletDayActivity {
  dayKey: string;
  isBuying: boolean; // true = 淨買入 SOL
}

async function fetchWalletDayActivity(
  address: string,
  cutoffSec: number
): Promise<WalletDayActivity[]> {
  if (!HELIUS_API_KEY) return [];
  try {
    const url =
      `https://api.helius.xyz/v0/addresses/${address}/transactions` +
      `?api-key=${HELIUS_API_KEY}&type=SWAP&limit=100`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const txs = (await res.json()) as HeliusTx[];

    // 按日累加淨 SOL（lamports → SOL）
    const dayNetSol = new Map<string, number>();

    for (const tx of txs) {
      if (tx.timestamp < cutoffSec) break; // 已排序，越後越舊
      const dayKey = toDayKey(tx.timestamp);
      const solIn = (tx.nativeTransfers ?? [])
        .filter((t) => t.toUserAccount === address)
        .reduce((s, t) => s + t.amount, 0) / 1e9;
      const solOut = (tx.nativeTransfers ?? [])
        .filter((t) => t.fromUserAccount === address)
        .reduce((s, t) => s + t.amount, 0) / 1e9;
      const net = solIn - solOut;
      dayNetSol.set(dayKey, (dayNetSol.get(dayKey) ?? 0) + net);
    }

    const MIN_SOL = 0.05; // 過濾手續費噪聲
    return [...dayNetSol.entries()]
      .filter(([, net]) => Math.abs(net) > MIN_SOL)
      .map(([dayKey, net]) => ({ dayKey, isBuying: net > 0 }));
  } catch {
    return [];
  }
}

// ── Demo 信號（無 HELIUS_API_KEY 時）─────────────────────────────

function generateDemoSignals(): DaySignal[] {
  // 模擬30天「恐慌→盤整→反轉→牛市→降溫」週期
  const biasCurve = [
    0.35, 0.30, 0.28, 0.32, 0.40, // 天0-4：熊市恐慌
    0.45, 0.48, 0.42, 0.38, 0.44, // 天5-9：盤整
    0.50, 0.55, 0.52, 0.58, 0.62, // 天10-14：轉折
    0.65, 0.68, 0.72, 0.70, 0.68, // 天15-19：牛市
    0.75, 0.78, 0.72, 0.68, 0.65, // 天20-24：高峰
    0.60, 0.58, 0.55, 0.52, 0.50, // 天25-29：降溫
  ];

  const now = Math.floor(Date.now() / 1000);
  return biasCurve.map((bias, i) => {
    const dayStartS = dayFloorSec(now - (29 - i) * 86400);
    const totalActive = Math.round(12 + Math.random() * 10);
    const buyCount = Math.round(bias * totalActive);
    return {
      dateS: dayStartS,
      solBias: parseFloat(bias.toFixed(3)),
      buyCount,
      sellCount: totalActive - buyCount,
      totalActive,
    };
  });
}

// ── GET handler ───────────────────────────────────────────────────

export async function GET() {
  // Demo fallback when no Helius key
  if (!HELIUS_API_KEY) {
    return NextResponse.json(
      {
        signals: generateDemoSignals(),
        dataSource: "demo",
        walletCount: LABELED_WALLETS.length,
        generatedAt: Math.floor(Date.now() / 1000),
      },
      { headers: { "Cache-Control": "public, max-age=21600" } }
    );
  }

  try {
    const cutoffSec = Math.floor(Date.now() / 1000) - 30 * 86400;

    // 並行請求所有 30 個錢包（Promise.allSettled — 失敗靜默忽略）
    const results = await Promise.allSettled(
      LABELED_WALLETS.map((addr) => fetchWalletDayActivity(addr, cutoffSec))
    );

    // 聚合：dayKey → { buys, sells }
    const dayMap = new Map<string, { buys: number; sells: number }>();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const { dayKey, isBuying } of result.value) {
        const entry = dayMap.get(dayKey) ?? { buys: 0, sells: 0 };
        if (isBuying) entry.buys++;
        else entry.sells++;
        dayMap.set(dayKey, entry);
      }
    }

    // 生成 30 天信號陣列（最舊 → 最新）
    const now = Math.floor(Date.now() / 1000);
    const signals: DaySignal[] = [];

    for (let d = 29; d >= 0; d--) {
      const dayS = dayFloorSec(now - d * 86400);
      const dayKey = toDayKey(dayS);
      const entry = dayMap.get(dayKey) ?? { buys: 0, sells: 0 };
      const totalActive = entry.buys + entry.sells;

      signals.push({
        dateS: dayS,
        solBias: totalActive > 0
          ? parseFloat((entry.buys / totalActive).toFixed(3))
          : 0.5, // 無活動 → 中性
        buyCount: entry.buys,
        sellCount: entry.sells,
        totalActive,
      });
    }

    return NextResponse.json(
      {
        signals,
        dataSource: "helius_realtime",
        walletCount: LABELED_WALLETS.length,
        generatedAt: Math.floor(Date.now() / 1000),
      },
      { headers: { "Cache-Control": "public, max-age=21600, stale-while-revalidate=3600" } }
    );
  } catch (err) {
    console.error("[smart-signals]", err);
    return NextResponse.json({ error: "signal_fetch_failed" }, { status: 502 });
  }
}
