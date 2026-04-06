import { NextRequest, NextResponse } from "next/server";
import { isValidSolanaAddress } from "@/lib/rate-limit";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// ── GoPlus Security ──────────────────────────────────────────────
async function getGoPlus(mint: string) {
  try {
    const res = await fetchWithTimeout(
      `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${mint}`,
      { headers: { "Content-Type": "application/json" } },
      8000
    );
    const data = await res.json();
    return data?.result?.[mint.toLowerCase()] ?? data?.result?.[mint] ?? null;
  } catch {
    return null;
  }
}

// ── Jupiter Price ────────────────────────────────────────────────
async function getJupiterPrice(mint: string) {
  try {
    const res = await fetchWithTimeout(
      `https://api.jup.ag/price/v2?ids=${mint}&showExtraInfo=true`,
      {},
      6000
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[mint] ?? null;
  } catch {
    return null;
  }
}

// ── DexScreener Price (fallback) ─────────────────────────────────
async function getDexScreenerPrice(mint: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      {},
      6000
    );
    if (!res.ok) return null;
    const data = await res.json() as { pairs?: Array<{ priceUsd?: string; liquidity?: { usd?: number } }> };
    // Pick the most liquid pair
    const pairs = (data?.pairs ?? [])
      .filter(p => p.priceUsd && parseFloat(p.priceUsd) > 0)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    const best = pairs[0];
    return best?.priceUsd ? parseFloat(best.priceUsd) : null;
  } catch {
    return null;
  }
}

// ── Pump.fun Bonding Curve Data ──────────────────────────────────
async function getPumpFunData(mint: string): Promise<{ price: number | null; name?: string; symbol?: string; imageUri?: string } | null> {
  try {
    const res = await fetchWithTimeout(`https://frontend-api.pump.fun/coins/${mint}`, {}, 5000);
    if (!res.ok) return null;
    const d = await res.json() as {
      name?: string; symbol?: string; image_uri?: string;
      usd_market_cap?: number; virtual_sol_reserves?: number;
      virtual_token_reserves?: number; complete?: boolean;
    };
    // If token has graduated from bonding curve, DexScreener has better data
    if (d.complete) return { price: null, name: d.name, symbol: d.symbol, imageUri: d.image_uri };
    // Bonding curve price: sol_reserves / token_reserves * SOL_price
    // virtual_sol_reserves is in lamports (1e9), virtual_token_reserves in micro-tokens (1e6)
    let price: number | null = null;
    if (d.usd_market_cap && d.virtual_token_reserves && d.virtual_token_reserves > 0) {
      // 1B total supply, market cap approach
      price = d.usd_market_cap / 1_000_000_000;
    }
    return { price, name: d.name, symbol: d.symbol, imageUri: d.image_uri };
  } catch { return null; }
}

// ── Jupiter Token Metadata ───────────────────────────────────────
async function getJupiterTokenInfo(mint: string) {
  try {
    const res = await fetchWithTimeout(`https://tokens.jup.ag/token/${mint}`, {}, 6000);
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  } catch {
    return null;
  }
}

// ── Helius Token Metadata (DAS) ──────────────────────────────────
async function getHeliusMetadata(mint: string) {
  try {
    const res = await fetchWithTimeout(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getAsset",
        params: { id: mint },
      }),
    }, 6000);
    const data = await res.json();
    return data?.result ?? null;
  } catch {
    return null;
  }
}

type Lang = "zh" | "en" | "ja";

// ── Security Score Calculator ────────────────────────────────────
function calcSecurityScore(gp: Record<string, string> | null, lang: Lang = "en"): {
  score: number;
  risks: string[];
  positives: string[];
} {
  const L = {
    noData: { zh: "無法獲取安全數據", en: "Unable to fetch security data", ja: "セキュリティデータを取得できません" },
    mintRisk: { zh: "🔴 合約含增發權限（Mintable）— 可無限增發代幣", en: "🔴 Mintable contract — unlimited token issuance possible", ja: "🔴 発行権限あり（Mintable）— 無制限のトークン増刷が可能" },
    noMint: { zh: "✅ 無增發權限，供應量固定", en: "✅ No mint authority — fixed supply", ja: "✅ 発行権限なし、供給量固定" },
    freezeRisk: { zh: "🔴 合約含凍結權限（Freezable）— 可凍結用戶賬戶", en: "🔴 Freezable contract — accounts can be frozen", ja: "🔴 凍結権限あり（Freezable）— ユーザーアカウントを凍結可能" },
    noFreeze: { zh: "✅ 無凍結權限", en: "✅ No freeze authority", ja: "✅ 凍結権限なし" },
    holderConc: (pct: string) => ({
      zh: `🔴 前10持幣地址占 ${pct}%，高度集中`,
      en: `🔴 Top-10 holders own ${pct}% — highly concentrated`,
      ja: `🔴 上位10アドレスが${pct}%保有 — 高度に集中`
    }),
    holderMid: (pct: string) => ({
      zh: `⚠️ 前10持幣地址占 ${pct}%，較為集中`,
      en: `⚠️ Top-10 holders own ${pct}% — moderately concentrated`,
      ja: `⚠️ 上位10アドレスが${pct}%保有 — やや集中`
    }),
    holderOk: (pct: string) => ({
      zh: `✅ 前10持幣分散（${pct}%）`,
      en: `✅ Top-10 holders well distributed (${pct}%)`,
      ja: `✅ 上位10アドレスの保有分散良好（${pct}%）`
    }),
    creatorHigh: (pct: string) => ({
      zh: `🔴 創建者持倉 ${pct}%，拋壓風險高`,
      en: `🔴 Creator holds ${pct}% — high sell pressure risk`,
      ja: `🔴 開発者保有${pct}% — 売り圧力リスクが高い`
    }),
    creatorMid: (pct: string) => ({
      zh: `⚠️ 創建者持倉 ${pct}%`,
      en: `⚠️ Creator holds ${pct}%`,
      ja: `⚠️ 開発者保有${pct}%`
    }),
    creatorLow: { zh: "✅ 創建者持倉比例低", en: "✅ Low developer holdings", ja: "✅ 開発者保有率が低い" },
    honeypot: { zh: "🚨 檢測到 Honeypot（蜜罐騙局）— 無法賣出", en: "🚨 Honeypot detected — unable to sell", ja: "🚨 ハニーポット検出 — 売却不可" },
  };

  if (!gp) return { score: 50, risks: [L.noData[lang]], positives: [] };

  let score = 100;
  const risks: string[] = [];
  const positives: string[] = [];

  if (gp.mintable === "1") { score -= 25; risks.push(L.mintRisk[lang]); }
  else { positives.push(L.noMint[lang]); }

  if (gp.freezable === "1") { score -= 20; risks.push(L.freezeRisk[lang]); }
  else { positives.push(L.noFreeze[lang]); }

  const topHolderPct = parseFloat(gp.top10_holder_percent ?? "0") * 100;
  if (topHolderPct > 80) { score -= 25; risks.push(L.holderConc(topHolderPct.toFixed(1))[lang]); }
  else if (topHolderPct > 50) { score -= 10; risks.push(L.holderMid(topHolderPct.toFixed(1))[lang]); }
  else if (topHolderPct > 0) { positives.push(L.holderOk(topHolderPct.toFixed(1))[lang]); }

  const creatorPct = parseFloat(gp.creator_percentage ?? "0") * 100;
  if (creatorPct > 20) { score -= 15; risks.push(L.creatorHigh(creatorPct.toFixed(1))[lang]); }
  else if (creatorPct > 5) { risks.push(L.creatorMid(creatorPct.toFixed(1))[lang]); }
  else if (creatorPct >= 0) { positives.push(L.creatorLow[lang]); }

  if (gp.is_honeypot === "1") { score -= 40; risks.push(L.honeypot[lang]); }

  score = Math.max(0, Math.min(100, score));
  return { score, risks, positives };
}

// ── Decision Generator ───────────────────────────────────────────
function generateDecision(
  secScore: number,
  price: number | null,
  walletRiskyPct: number,
  lang: Lang = "en",
): {
  verdict: "buy" | "caution" | "avoid";
  label: string;
  reason: string;
  suggestion: string;
} {
  if (secScore < 40) {
    return {
      verdict: "avoid",
      label: lang === "zh" ? "建議迴避" : lang === "ja" ? "回避推奨" : "Avoid",
      reason: lang === "zh" ? "安全評分過低，存在嚴重合約風險" : lang === "ja" ? "安全スコアが低すぎます。深刻な契約リスクがあります" : "Security score too low — serious contract risks detected",
      suggestion: lang === "zh" ? "該代幣具有高風險合約特徵，不建議買入。" : lang === "ja" ? "このトークンは高リスクな契約特性を持っています。購入は推奨しません。" : "This token has high-risk contract characteristics. Not recommended for purchase.",
    };
  }

  if (secScore < 65) {
    const suggZh = `如果決定買入，建議倉位控制在總資產的 3-5%，並設置 -30% 止損。`;
    const suggEn = `If buying, limit position to 3–5% of total assets and set a −30% stop-loss.`;
    const suggJa = `購入する場合は、総資産の3〜5%以内に抑え、−30%のストップロスを設定してください。`;
    return {
      verdict: "caution",
      label: lang === "zh" ? "謹慎考慮" : lang === "ja" ? "慎重に検討" : "Proceed with Caution",
      reason: lang === "zh" ? "存在潛在風險信號，需謹慎" : lang === "ja" ? "潜在的なリスクシグナルがあります。慎重に" : "Potential risk signals detected — proceed carefully",
      suggestion: lang === "zh" ? suggZh : lang === "ja" ? suggJa : suggEn,
    };
  }

  // High score
  let suggestion: string;
  if (walletRiskyPct > 60) {
    suggestion = lang === "zh"
      ? `⚠️ 你的錢包中 Meme/未知代幣已占 ${walletRiskyPct.toFixed(0)}%，風險已過度集中。建議最多投入總資產的 3%。`
      : lang === "ja"
      ? `⚠️ Meme/未知トークンがウォレットの${walletRiskyPct.toFixed(0)}%を占め、リスクが集中しています。最大3%の投入を推奨します。`
      : `⚠️ Meme/unknown tokens already make up ${walletRiskyPct.toFixed(0)}% of your wallet. Keep this position under 3% of total assets.`;
  } else if (walletRiskyPct > 30) {
    suggestion = lang === "zh"
      ? `你的錢包風險代幣占 ${walletRiskyPct.toFixed(0)}%，建議倉位控制在 5-8%。`
      : lang === "ja"
      ? `ウォレットのリスクトークンが${walletRiskyPct.toFixed(0)}%あります。ポジションは5〜8%以内に抑えてください。`
      : `Risky tokens make up ${walletRiskyPct.toFixed(0)}% of your wallet. Limit this position to 5–8%.`;
  } else {
    suggestion = lang === "zh"
      ? "建議倉位不超過總資產的 10%。"
      : lang === "ja"
      ? "ポジションは総資産の10%以内に抑えることをお勧めします。"
      : "Keep position size under 10% of total assets.";
  }

  return {
    verdict: "buy",
    label: lang === "zh" ? "可以考慮" : lang === "ja" ? "検討の余地あり" : "Worth Considering",
    reason: lang === "zh" ? "安全評分良好，合約風險較低" : lang === "ja" ? "安全スコアが良好、契約リスクが低い" : "Good security score — low contract risk",
    suggestion,
  };
}

// ── Main Handler ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  const wallet = req.nextUrl.searchParams.get("wallet");
  const rawLang = req.nextUrl.searchParams.get("lang") ?? "en";
  const lang: Lang = (rawLang === "zh" || rawLang === "ja") ? rawLang : "en";

  if (!mint) return NextResponse.json({ error: "Missing mint address" }, { status: 400 });
  if (!isValidSolanaAddress(mint)) return NextResponse.json({ error: "Invalid mint address" }, { status: 400 });
  if (wallet && !isValidSolanaAddress(wallet)) return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });

  // Parallel fetch
  const isPumpFun = mint.endsWith("pump");
  const [gp, jupPrice, jupToken, heliusMeta, pumpData] = await Promise.all([
    getGoPlus(mint),
    getJupiterPrice(mint),
    getJupiterTokenInfo(mint),
    getHeliusMetadata(mint),
    isPumpFun ? getPumpFunData(mint) : Promise.resolve(null),
  ]);

  // Token name/symbol
  const name =
    jupToken?.name ??
    heliusMeta?.content?.metadata?.name ??
    heliusMeta?.token_info?.symbol ??
    pumpData?.name ??
    "Unknown Token";
  const symbol =
    jupToken?.symbol ??
    heliusMeta?.content?.metadata?.symbol ??
    pumpData?.symbol ??
    mint.slice(0, 6) + "...";
  const logoURI = jupToken?.logoURI ?? pumpData?.imageUri ?? null;

  // Price — Jupiter first, DexScreener fallback, Pump.fun bonding curve last
  let price: number | null = jupPrice?.price ? parseFloat(jupPrice.price) : null;
  if (price === null) price = await getDexScreenerPrice(mint);
  if (price === null && isPumpFun) price = pumpData?.price ?? null;

  // Security
  const { score: secScore, risks, positives } = calcSecurityScore(gp, lang);

  // Holder info
  const holderCount = gp?.holder_count ? parseInt(gp.holder_count) : null;
  const top10Pct = gp?.top10_holder_percent
    ? (parseFloat(gp.top10_holder_percent) * 100).toFixed(1)
    : null;

  // Wallet risky % (for position advice)
  let walletRiskyPct = 0;
  if (wallet) {
    try {
      const wRes = await fetch(
        `${req.nextUrl.origin}/api/wallet?address=${wallet}`
      );
      const wData = await wRes.json();
      if (wData?.totalUSD > 0) {
        const riskyUSD = wData.tokens
          .filter((t: { type: string; usdValue: number | null }) =>
            t.type === "meme" || t.type === "unknown"
          )
          .reduce((s: number, t: { usdValue: number | null }) => s + (t.usdValue ?? 0), 0);
        walletRiskyPct = (riskyUSD / wData.totalUSD) * 100;
      }
    } catch { /* ignore */ }
  }

  const decision = generateDecision(secScore, price, walletRiskyPct, lang);

  return NextResponse.json({
    mint,
    name,
    symbol,
    logoURI,
    price,
    securityScore: secScore,
    risks,
    positives,
    holderCount,
    top10HolderPct: top10Pct,
    mintable: gp?.mintable === "1",
    freezable: gp?.freezable === "1",
    isHoneypot: gp?.is_honeypot === "1",
    decision,
    walletRiskyPct,
  });
}
