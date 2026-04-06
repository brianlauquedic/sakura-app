import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 300; // cache 5 min

const UA = "Mozilla/5.0 (compatible; SakuraBot/1.0)";

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": UA } });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function GET() {
  const [solPriceData, llamaChains, llamaDexSolana, llamaFees, voteAccounts] = await Promise.allSettled([
    // 1. SOL price + 24h change — DeFiLlama coins API (same infra as TVL, reliable)
    (async () => {
      try {
        const [priceRes, changeRes] = await Promise.all([
          fetchWithTimeout("https://coins.llama.fi/prices/current/coingecko:solana?searchWidth=4h", 6000),
          fetchWithTimeout(`https://coins.llama.fi/percentage/coingecko:solana?timestamp=${Math.floor(Date.now()/1000)}&lookForward=false&period=24h`, 6000),
        ]);
        const priceData = await priceRes.json();
        const changeData = await changeRes.json();
        const price = priceData?.coins?.["coingecko:solana"]?.price ?? null;
        const change = changeData?.coins?.["coingecko:solana"] ?? null;
        return price ? { price, change } : null;
      } catch { return null; }
    })(),

    // 2. DeFiLlama — all chains TVL (filter Solana)
    fetchWithTimeout("https://api.llama.fi/v2/chains").then(r => r.json()),

    // 3. DeFiLlama — Solana DEX overview (all protocols, get total7d)
    fetchWithTimeout(
      "https://api.llama.fi/overview/dexs/solana?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyVolume"
    ).then(r => r.json()),

    // 4. DeFiLlama — Solana protocol fees (7d)
    fetchWithTimeout(
      "https://api.llama.fi/overview/fees/solana?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyFees"
    ).then(r => r.json()),

    // 5. Solana validator count — try two public RPCs
    (async () => {
      const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getVoteAccounts", params: [{ commitment: "confirmed" }] });
      const headers = { "Content-Type": "application/json" };
      const rpcs = [
        "https://solana-mainnet.g.alchemy.com/v2/demo",
        "https://rpc.ankr.com/solana",
        "https://api.mainnet-beta.solana.com",
      ];
      for (const rpc of rpcs) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 8000);
          const r = await fetch(rpc, { method: "POST", headers, body, signal: controller.signal });
          clearTimeout(id);
          const d = await r.json();
          if (d?.result?.current) return d;
        } catch { /* try next */ }
      }
      return null;
    })(),
  ]);

  // ── Parse SOL price ──
  let solUsd: number | null = null;
  let solChange24h: number | null = null;
  if (solPriceData.status === "fulfilled" && solPriceData.value?.price) {
    solUsd = solPriceData.value.price;
    solChange24h = solPriceData.value.change ?? null;
  }

  // ── Parse Solana TVL from DeFiLlama chains ──
  let solanaTvl: number | null = null;
  if (llamaChains.status === "fulfilled" && Array.isArray(llamaChains.value)) {
    const sol = (llamaChains.value as Array<{ name: string; tvl: number }>).find(
      c => c.name === "Solana"
    );
    solanaTvl = sol?.tvl ?? null;
  }

  // ── Parse Solana DEX total 7d volume ──
  let dexVol7d: number | null = null;
  if (llamaDexSolana.status === "fulfilled" && llamaDexSolana.value) {
    const d = llamaDexSolana.value as { total7d?: number; total24h?: number };
    dexVol7d = d.total7d ?? (d.total24h ? d.total24h * 7 : null);
  }

  // ── Parse Solana protocol fees 7d ──
  let fees7d: number | null = null;
  if (llamaFees.status === "fulfilled" && llamaFees.value) {
    const d = llamaFees.value as { total7d?: number };
    fees7d = d.total7d ?? null;
  }

  // ── Validator count from getVoteAccounts ──
  let validatorCount: number | null = null;
  const rpcResult = voteAccounts.status === "fulfilled" ? voteAccounts.value : null;
  if (rpcResult?.result?.current) {
    validatorCount =
      (rpcResult.result.current as unknown[]).length +
      ((rpcResult.result.delinquent as unknown[] | undefined)?.length ?? 0);
  }

  // ── Format helpers ──
  function fmtUsd(n: number): string {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }
  function fmtPct(n: number): string {
    return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  }

  return NextResponse.json({
    solanaTvl:   solanaTvl      ? fmtUsd(solanaTvl)      : null,
    solPrice:    solUsd         ? `$${solUsd.toFixed(2)}` : null,
    solChange:   solChange24h   ? fmtPct(solChange24h)    : null,
    dexVol7d:    dexVol7d       ? fmtUsd(dexVol7d)        : null,
    fees7d:      fees7d         ? fmtUsd(fees7d)          : null,
    validators:  validatorCount ? validatorCount.toLocaleString() : null,
    updatedAt:   new Date().toISOString(),
  });
}
