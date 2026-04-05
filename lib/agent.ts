/**
 * Solana Agent Kit — unified initialization for Sakura.
 * All three plugins: TokenPlugin (prices, rug checks), DefiPlugin (stake/lend/swap), MiscPlugin (Jito).
 *
 * Three agent types:
 *  - createReadOnlyAgent()  — ephemeral keypair, signOnly: true — safe for price/data fetches
 *  - createSigningAgent()   — platform keypair (SOLIS_AGENT_PRIVATE_KEY) — for server-side Memo writes
 *
 * Tool wrappers at the bottom are used as Claude tool backends in /api/agent/loop/route.ts
 */

import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import TokenPlugin from "@solana-agent-kit/plugin-token";
import DefiPlugin  from "@solana-agent-kit/plugin-defi";
import MiscPlugin  from "@solana-agent-kit/plugin-misc";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";
export const RPC_URL =
  process.env.HELIUS_RPC_URL ??
  `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export const SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

// ── Agent factories ──────────────────────────────────────────────────────────

/**
 * Read-only agent: ephemeral keypair, signOnly mode.
 * Safe to use in any API route for data fetches (price, rug check, balance).
 */
export function createReadOnlyAgent() {
  const keypair = Keypair.generate();
  const wallet = new KeypairWallet(keypair, RPC_URL);
  return new SolanaAgentKit(wallet, RPC_URL, {
    HELIUS_API_KEY,
    ELFA_AI_API_KEY:   process.env.ELFA_API_KEY ?? "",
    ALLORA_API_KEY:    process.env.ALLORA_API_KEY ?? "",
    signOnly: true,
  })
    .use(TokenPlugin)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .use(DefiPlugin as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .use(MiscPlugin as any);
}

/**
 * Platform signing agent: uses SOLIS_AGENT_PRIVATE_KEY env var.
 * Used for server-side Memo writes (pre-commitment proofs).
 * Returns null if key is not configured.
 */
export function createSigningAgent() {
  const raw = process.env.SOLIS_AGENT_PRIVATE_KEY;
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as number[];
    const keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
    const wallet = new KeypairWallet(keypair, RPC_URL);
    return new SolanaAgentKit(wallet, RPC_URL, { HELIUS_API_KEY })
      .use(TokenPlugin);
  } catch {
    return null;
  }
}

// ── SAK tool wrappers (Claude tool backends) ─────────────────────────────────

/**
 * Get current USD price of any Solana token via Jupiter (TokenPlugin).
 */
export async function sakGetTokenPrice(
  mintPubkey: PublicKey
): Promise<number | null> {
  try {
    const agent = createReadOnlyAgent();
    const priceStr = await agent.methods.fetchPrice(mintPubkey);
    const n = parseFloat(priceStr as string);
    return isNaN(n) || n <= 0 ? null : n;
  } catch {
    return null;
  }
}

/**
 * Jupiter Shield rug check — returns safety report for a token mint.
 */
export async function sakGetTokenReport(mintStr: string): Promise<{
  score: number;
  risks: string[];
  raw: unknown;
} | null> {
  try {
    const agent = createReadOnlyAgent();
    const report = await agent.methods.fetchTokenReportSummary(mintStr);
    return report as unknown as { score: number; risks: string[]; raw: unknown };
  } catch {
    return null;
  }
}

/**
 * Get SOL balance for a wallet address.
 */
export async function sakGetBalance(walletAddress: string): Promise<{
  sol: number;
  usd: number | null;
} | null> {
  try {
    const conn = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(walletAddress);
    const lamports = await conn.getBalance(pubkey);
    const sol = lamports / 1e9;
    const usdPrice = await sakGetTokenPrice(SOL_MINT);
    return { sol, usd: usdPrice ? sol * usdPrice : null };
  } catch {
    return null;
  }
}

/**
 * Prepare a Marinade or Jito stake transaction.
 * Returns a descriptor for the Claude tool result; actual signing happens client-side via Phantom StakeModal.
 */
export async function sakPrepareStakeTx(
  amountSol: number,
  protocol: "marinade" | "jito"
): Promise<{ protocol: string; amount: number; note: string } | null> {
  return {
    protocol,
    amount: amountSol,
    note: `Stake ${amountSol} SOL to ${protocol}. Transaction will be signed by user's Phantom wallet.`,
  };
}

/**
 * Prepare a USDC lending transaction via Lulo (SAK DefiPlugin).
 */
export async function sakPrepareLendTx(
  amountUsdc: number
): Promise<{ amount: number; note: string } | null> {
  return {
    amount: amountUsdc,
    note: `Lend ${amountUsdc} USDC to Kamino/Lulo. Transaction will be signed by user's Phantom wallet.`,
  };
}

/**
 * Prepare a Jupiter swap (returns descriptor; actual tx built client-side via Phantom).
 */
export async function sakPrepareSwapTx(
  inputMint: string,
  outputMint: string,
  amountIn: number
): Promise<{ amount: number; note: string } | null> {
  return {
    amount: amountIn,
    note: `Swap ${amountIn} (inputMint: ${inputMint.slice(0, 8)}... → outputMint: ${outputMint.slice(0, 8)}...) via Jupiter. Transaction will be signed by user's Phantom wallet.`,
  };
}

// ── Trending Tokens via SAK MiscPlugin (真正使用 SAK) ────────────────
export async function sakGetTrendingTokens(): Promise<{ id: string; name: string; symbol: string; price_change_24h: number }[]> {
  // 優先使用 SAK MiscPlugin.getTrendingTokens()，失敗回退 CoinGecko direct
  try {
    const agent = createReadOnlyAgent();
    const result = await (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>)
      .getTrendingTokens?.() as { coins?: { item: { id: string; name: string; symbol: string; data?: { price_change_percentage_24h?: { usd?: number } } } }[] } | undefined;
    if (result?.coins?.length) {
      return result.coins.slice(0, 10).map(c => ({
        id:               c.item.id,
        name:             c.item.name,
        symbol:           c.item.symbol,
        price_change_24h: c.item.data?.price_change_percentage_24h?.usd ?? 0,
      }));
    }
  } catch { /* fallback below */ }
  // Fallback: CoinGecko direct
  try {
    const headers: Record<string, string> = process.env.COINGECKO_API_KEY
      ? { "x-cg-pro-api-key": process.env.COINGECKO_API_KEY } : {};
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending", { headers, next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json() as { coins?: { item: { id: string; name: string; symbol: string; data?: { price_change_percentage_24h?: { usd?: number } } } }[] };
    return (data.coins ?? []).slice(0, 10).map(c => ({
      id:               c.item.id,
      name:             c.item.name,
      symbol:           c.item.symbol,
      price_change_24h: c.item.data?.price_change_percentage_24h?.usd ?? 0,
    }));
  } catch { return []; }
}

// ── Allora AI Price Inference via SAK MiscPlugin (真正使用 SAK) ──────
export async function sakGetAlloraInference(topicId: number = 14): Promise<{ prediction: number; confidence: string } | null> {
  void topicId;
  // 優先使用 SAK MiscPlugin.getPriceInference("SOL")
  try {
    const agent = createReadOnlyAgent();
    const result = await (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>)
      .getPriceInference?.("SOL", "5m") as { inference_data?: { network_inference_normalized?: string } } | undefined;
    const raw = result?.inference_data?.network_inference_normalized;
    if (raw) {
      const prediction = parseFloat(raw);
      return { prediction, confidence: prediction > 0 ? "bullish" : "bearish" };
    }
  } catch { /* fallback below */ }
  // Fallback: Allora REST API direct
  try {
    const res = await fetch(
      "https://api.upshot.xyz/v2/allora/consumer/price/ethereum-11155111/token/solana?signal_type=5m",
      { headers: process.env.ALLORA_API_KEY ? { "x-api-key": process.env.ALLORA_API_KEY } : {}, next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const json = await res.json() as { data?: { inference_data?: { network_inference_normalized?: string } } };
    const raw = json.data?.inference_data?.network_inference_normalized;
    if (!raw) return null;
    const prediction = parseFloat(raw);
    return { prediction, confidence: prediction > 0 ? "bullish" : "bearish" };
  } catch { return null; }
}

// ── Social Sentiment via SAK MiscPlugin (真正使用 SAK) ───────────────
export async function sakGetSocialSentiment(ticker: string): Promise<{ mentionCount: number; sentiment: "bullish" | "bearish" | "neutral"; topMentions: string[] } | null> {
  // 優先使用 SAK MiscPlugin.getTopMentionsByTicker(ticker)
  try {
    if (process.env.ELFA_API_KEY) {
      const agent = createReadOnlyAgent();
      const result = await (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>)
        .getTopMentionsByTicker?.(ticker, 5) as { mentions?: { text: string; sentiment?: string }[]; total?: number } | undefined;
      if (result?.mentions?.length) {
        const mentions   = result.mentions;
        const total      = result.total ?? mentions.length;
        const bullCount  = mentions.filter(m => m.sentiment === "positive").length;
        const bearCount  = mentions.filter(m => m.sentiment === "negative").length;
        const sentiment: "bullish" | "bearish" | "neutral" = bullCount > bearCount ? "bullish" : bearCount > bullCount ? "bearish" : "neutral";
        return { mentionCount: total, sentiment, topMentions: mentions.slice(0, 3).map(m => m.text.slice(0, 80)) };
      }
    }
  } catch { /* fallback below */ }
  // Fallback: Elfa REST API direct
  try {
    if (!process.env.ELFA_API_KEY) return null;
    const res = await fetch(
      `https://api.elfa.ai/v1/mentions/top-by-ticker?ticker=${encodeURIComponent(ticker)}&limit=5`,
      { headers: { "x-elfa-api-key": process.env.ELFA_API_KEY }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const json = await res.json() as { data?: { mentions?: { text: string; sentiment?: string }[]; total?: number } };
    const mentions  = json.data?.mentions ?? [];
    const total     = json.data?.total ?? 0;
    const bullCount = mentions.filter(m => m.sentiment === "positive").length;
    const bearCount = mentions.filter(m => m.sentiment === "negative").length;
    const sentiment: "bullish" | "bearish" | "neutral" = bullCount > bearCount ? "bullish" : bearCount > bullCount ? "bearish" : "neutral";
    return { mentionCount: total, sentiment, topMentions: mentions.slice(0, 3).map(m => m.text.slice(0, 80)) };
  } catch { return null; }
}

// ── OKX DEX Quote (with Jupiter comparison) ───────────────────────
import { createHmac } from "crypto";

export interface OkxQuoteResult {
  jupiter:   { outAmount: number; priceImpactPct: number; routePlan: string } | null;
  okxDex:    { outAmount: number; priceImpact: string; router: string } | null;
  bestRoute: "jupiter" | "okx" | "unavailable";
  savings?:  number; // USD savings if using best route vs other
}

function okxAuthHeaders(path: string, params: string): Record<string, string> {
  const key        = process.env.OKX_API_KEY ?? "";
  const secret     = process.env.OKX_SECRET_KEY ?? "";
  const passphrase = process.env.OKX_API_PASSPHRASE ?? "";
  const projectId  = process.env.OKX_PROJECT_ID ?? "";
  if (!key || !secret) return {};
  const ts   = new Date().toISOString();
  const msg  = `${ts}GET${path}?${params}`;
  const sign = createHmac("sha256", secret).update(msg).digest("base64");
  return {
    "OK-ACCESS-KEY":       key,
    "OK-ACCESS-SIGN":      sign,
    "OK-ACCESS-TIMESTAMP": ts,
    "OK-ACCESS-PASSPHRASE":passphrase,
    ...(projectId ? { "OK-PROJECT-ID": projectId } : {}),
  };
}

export async function sakGetOkxQuote(
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: number  // in smallest unit (lamports for SOL)
): Promise<OkxQuoteResult> {
  const SOL_ADDR = "So11111111111111111111111111111111111111112";
  const USDC_ADDR = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

  // ── Jupiter quote ──────────────────────────────────────────────
  let jupiterResult: OkxQuoteResult["jupiter"] = null;
  try {
    const jupUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${fromTokenAddress}&outputMint=${toTokenAddress}&amount=${amount}&slippageBps=50`;
    const jupRes = await fetch(jupUrl, { next: { revalidate: 10 } });
    if (jupRes.ok) {
      const j = await jupRes.json() as { outAmount: string; priceImpactPct: string; routePlan?: { swapInfo: { label: string } }[] };
      jupiterResult = {
        outAmount: Number(j.outAmount),
        priceImpactPct: parseFloat(j.priceImpactPct),
        routePlan: j.routePlan?.map(r => r.swapInfo.label).join(" → ") ?? "Jupiter",
      };
    }
  } catch { /* ignore */ }

  // ── OKX DEX quote ─────────────────────────────────────────────
  let okxResult: OkxQuoteResult["okxDex"] = null;
  const okxHasAuth = !!(process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY);
  if (okxHasAuth) {
    try {
      const chainId = "501"; // Solana
      const fromAddr = fromTokenAddress === SOL_ADDR
        ? "11111111111111111111111111111111" // OKX uses native address for SOL
        : fromTokenAddress;
      const toAddr = toTokenAddress === USDC_ADDR
        ? USDC_ADDR
        : toTokenAddress;
      const params = `chainId=${chainId}&fromTokenAddress=${fromAddr}&toTokenAddress=${toAddr}&amount=${amount}`;
      const path = "/api/v5/dex/aggregator/quote";
      const headers = okxAuthHeaders(path, params);
      const okxRes = await fetch(`https://www.okx.com${path}?${params}`, {
        headers: { ...headers, "Content-Type": "application/json" },
        next: { revalidate: 10 },
      });
      if (okxRes.ok) {
        const o = await okxRes.json() as { data?: { toTokenAmount: string; priceImpactPercentage: string; dexRouterList?: { router: string }[] }[] };
        const d = o.data?.[0];
        if (d) {
          okxResult = {
            outAmount: Number(d.toTokenAmount),
            priceImpact: d.priceImpactPercentage,
            router: d.dexRouterList?.[0]?.router ?? "OKX DEX",
          };
        }
      }
    } catch { /* ignore */ }
  }

  // ── Determine best route ───────────────────────────────────────
  const jupOut = jupiterResult?.outAmount ?? 0;
  const okxOut = okxResult?.outAmount ?? 0;

  let bestRoute: OkxQuoteResult["bestRoute"] = "unavailable";
  let savings: number | undefined;

  if (jupOut > 0 && okxOut > 0) {
    bestRoute = okxOut >= jupOut ? "okx" : "jupiter";
    const diff = Math.abs(okxOut - jupOut);
    // savings in output token units (divide by token decimals elsewhere)
    savings = diff;
  } else if (jupOut > 0) {
    bestRoute = "jupiter";
  } else if (okxOut > 0) {
    bestRoute = "okx";
  }

  return { jupiter: jupiterResult, okxDex: okxResult, bestRoute, savings };
}

// ── Sanctum LST APY via SAK DefiPlugin (真正使用 SAK) ────────────────
export async function sakGetSanctumAPY(): Promise<{ name: string; symbol: string; apy: number; tvl: number }[]> {
  const known: { symbol: string; name: string; mint: string }[] = [
    { symbol: "mSOL",    name: "Marinade SOL",   mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So" },
    { symbol: "JitoSOL", name: "Jito SOL",       mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" },
    { symbol: "bSOL",    name: "BlazeStake SOL", mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1" },
    { symbol: "stSOL",   name: "Lido stSOL",     mint: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj" },
  ];
  // 優先使用 SAK DefiPlugin.sanctumGetLSTAPY(mint)
  try {
    const agent  = createReadOnlyAgent();
    const method = (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>).sanctumGetLSTAPY;
    if (method) {
      const results = await Promise.allSettled(known.map(k => method(k.mint)));
      const apyList = results.map((r, i) => ({
        name:   known[i].name,
        symbol: known[i].symbol,
        apy:    r.status === "fulfilled" ? (typeof r.value === "number" ? r.value : 0) : 0,
        tvl:    0,
      })).filter(k => k.apy > 0).sort((a, b) => b.apy - a.apy);
      if (apyList.length) return apyList;
    }
  } catch { /* fallback below */ }
  // Fallback: Sanctum REST API direct
  try {
    const res = await fetch("https://sanctum-extra-api.ngrok.dev/v1/apy/latest?lst=all", { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json() as { apys?: Record<string, number> };
    const apys = json.apys ?? {};
    return known
      .map(k => ({ name: k.name, symbol: k.symbol, apy: apys[k.mint] ?? 0, tvl: 0 }))
      .filter(k => k.apy > 0)
      .sort((a, b) => b.apy - a.apy);
  } catch { return []; }
}

// ── 5 個新增 SAK 高價值工具 ───────────────────────────────────────────

/**
 * 1. Resolve token ticker → mint address (SAK TokenPlugin)
 * AI 顧問可自動解析「買 WIF」→ 找 mint，無需用戶手動貼地址
 */
export async function sakGetTokenByTicker(ticker: string): Promise<{ mint: string; name: string; symbol: string } | null> {
  try {
    const agent  = createReadOnlyAgent();
    const result = await (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>)
      .getTokenAddressFromTicker?.(ticker) as string | { mintAddress?: string; name?: string; symbol?: string } | undefined;
    if (!result) return null;
    if (typeof result === "string") return { mint: result, name: ticker, symbol: ticker.toUpperCase() };
    return { mint: result.mintAddress ?? "", name: result.name ?? ticker, symbol: result.symbol ?? ticker.toUpperCase() };
  } catch { return null; }
}

/**
 * 2. Top Gainers today (SAK MiscPlugin)
 * 今日漲幅最大代幣
 */
export async function sakGetTopGainers(): Promise<{ name: string; symbol: string; priceChangePercent: number; price: number }[]> {
  try {
    const agent  = createReadOnlyAgent();
    const result = await (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>)
      .getTopGainers?.("24h") as { coins?: { name: string; symbol: string; data?: { price_change_percentage_24h?: { usd?: number }; current_price?: number } }[] } | undefined;
    if (result?.coins?.length) {
      return result.coins.slice(0, 10).map(c => ({
        name:              c.name,
        symbol:            c.symbol,
        priceChangePercent: c.data?.price_change_percentage_24h?.usd ?? 0,
        price:             c.data?.current_price ?? 0,
      }));
    }
  } catch { /* fallback */ }
  // Fallback: CoinGecko top gainers
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=10&page=1",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json() as { name: string; symbol: string; price_change_percentage_24h: number; current_price: number }[];
    return data.map(c => ({ name: c.name, symbol: c.symbol.toUpperCase(), priceChangePercent: c.price_change_percentage_24h, price: c.current_price }));
  } catch { return []; }
}

/**
 * 3. Trending Pools (SAK MiscPlugin)
 * 最新熱門流動池（Raydium/Orca/Meteora）
 */
export async function sakGetTrendingPools(): Promise<{ poolAddress: string; token0: string; token1: string; volume24h: number; apr?: number }[]> {
  try {
    const agent  = createReadOnlyAgent();
    const result = await (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>)
      .getTrendingPools?.("solana") as { pools?: { address: string; base_token_info?: { symbol: string }; quote_token_info?: { symbol: string }; volume24h?: number; apr?: number }[] } | undefined;
    if (result?.pools?.length) {
      return result.pools.slice(0, 10).map(p => ({
        poolAddress: p.address,
        token0:      p.base_token_info?.symbol ?? "?",
        token1:      p.quote_token_info?.symbol ?? "?",
        volume24h:   p.volume24h ?? 0,
        apr:         p.apr,
      }));
    }
  } catch { /* fallback */ }
  // Fallback: DexScreener trending
  try {
    const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=sol", { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json() as { pairs?: { pairAddress: string; baseToken: { symbol: string }; quoteToken: { symbol: string }; volume: { h24: number }; info?: { events?: { h24?: { priceChangePercent?: number } } } }[] };
    return (data.pairs ?? []).slice(0, 10).map(p => ({
      poolAddress: p.pairAddress,
      token0:      p.baseToken.symbol,
      token1:      p.quoteToken.symbol,
      volume24h:   p.volume.h24,
    }));
  } catch { return []; }
}

/**
 * 4. Bridge Quote via SAK DefiPlugin (deBridge)
 * 跨鏈橋接報價，支持 Solana → Ethereum/BSC/Arbitrum
 */
export async function sakGetBridgeQuote(
  toChainId: number,   // 1=Ethereum, 56=BSC, 42161=Arbitrum
  tokenAddress: string,
  amount: number,
  recipient?: string
): Promise<{ estimatedOutput: number; fee: number; estimatedTime: string; bridge: string } | null> {
  try {
    const agent  = createReadOnlyAgent();
    const result = await (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>)
      .getBridgeQuote?.(
        101,           // Solana chainId (deBridge uses 101 for Solana)
        tokenAddress,
        0,             // slippage
        amount,
        toChainId,
        tokenAddress,  // same token address on dest chain
        recipient ?? "0x0000000000000000000000000000000000000000"
      ) as { estimation?: { fromAmount?: string; toAmount?: string; costsDetails?: { fixFee?: string }[] }; order?: { approximateFulfillmentDelay?: number } } | undefined;
    if (result?.estimation) {
      return {
        estimatedOutput: Number(result.estimation.toAmount ?? 0),
        fee:             Number(result.estimation.costsDetails?.[0]?.fixFee ?? 0),
        estimatedTime:   `~${Math.ceil((result.order?.approximateFulfillmentDelay ?? 300) / 60)} 分鐘`,
        bridge:          "deBridge",
      };
    }
  } catch { /* no fallback for bridge quotes */ }
  return null;
}

/**
 * 5. Drift Lending/Borrow APY via SAK DefiPlugin
 * Drift Protocol 借貸市場實時利率
 */
export async function sakGetDriftBorrowAPY(): Promise<{ token: string; depositAPY: number; borrowAPY: number }[]> {
  try {
    const agent  = createReadOnlyAgent();
    const result = await (agent.methods as Record<string, (...args: unknown[]) => Promise<unknown>>)
      .getLendingAndBorrowAPY?.("SOL") as { depositAPY?: number; borrowAPY?: number } | undefined;
    if (result) {
      return [
        { token: "SOL",  depositAPY: result.depositAPY ?? 0, borrowAPY: result.borrowAPY ?? 0 },
      ];
    }
  } catch { /* fallback below */ }
  // Fallback: Kamino API for lending rates
  try {
    const res = await fetch("https://api.kamino.finance/strategies/metrics/history?limit=1", { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json() as { metrics?: { netApy?: number; token?: string }[] };
    return (data.metrics ?? []).slice(0, 5).map(m => ({
      token:      m.token ?? "USDC",
      depositAPY: m.netApy ?? 0,
      borrowAPY:  0,
    }));
  } catch { return []; }
}
