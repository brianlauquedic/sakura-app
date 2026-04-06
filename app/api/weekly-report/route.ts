// app/api/weekly-report/route.ts

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const revalidate = 3600;

const UA = "Mozilla/5.0 (compatible; SakuraBot/1.0)";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NarrativeSection {
  opening: string;
  hotSector: string;
  capitalFlow: string;
  verdict: string;
  findings: string[];   // 5 items
  catalysts: string[];  // 3 items
}

export interface ReportProtocol {
  name: string;
  slug: string;
  tvlFmt: string;
  tvlRaw: number;
  change7d: number;
  category: string;
  logoUrl: string;
}

export interface DexShare {
  name: string;
  vol7dFmt: string;
  vol7dRaw: number;
  share: number;
  color: string;
}

export interface WeeklyReport {
  issue: number;
  issueDate: string;
  weekKey: string;
  // metrics
  solPrice: string | null;
  solChange: string | null;
  solanaTvl: string | null;
  tvlChange7d: string | null;
  dexVol7d: string | null;
  fees7d: string | null;
  tpsTotal: string | null;
  tpsUser: string | null;
  tpsPeak: string | null;
  tpsUserPeak: string | null;
  clusterNodes: string | null;
  // analysis
  hotSector: {
    name: string;
    nameZh: string;
    nameJa: string;
    emoji: string;
    momentum: string;
    topProtocol: string;
    rationale: string;
  };
  protocols: ReportProtocol[];
  dexShare: DexShare[];
  dexTotal7d: string | null;
  tvlHistory: Array<{ date: string; tvl: number }>;
  fearGreed: { score: number; label: string; labelEn: string; color: string };
  lst: Record<string, { apy: string; tvl: string } | null>;
  lending: Record<string, string | null>;
  narrative: { zh: NarrativeSection; en: NarrativeSection; ja: NarrativeSection } | null;
  updatedAt: string;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

interface NarrativeBundle {
  zh: NarrativeSection;
  en: NarrativeSection;
  ja: NarrativeSection;
}

const narrativeCache = new Map<string, { bundle: NarrativeBundle; ts: number }>();

// ─── Sector metadata ──────────────────────────────────────────────────────────

const SECTOR_META: Record<string, { zh: string; ja: string; emoji: string }> = {
  "Liquid Staking": { zh: "流動質押", ja: "流動ステーキング", emoji: "🪙" },
  "Dexes":          { zh: "DEX 交易", ja: "DEX取引",          emoji: "📈" },
  "Lending":        { zh: "借貸",     ja: "レンディング",      emoji: "🏦" },
  "Derivatives":    { zh: "衍生品",   ja: "デリバティブ",      emoji: "⚡" },
  "Yield":          { zh: "收益聚合", ja: "利回り集約",        emoji: "💎" },
  "CDP":            { zh: "超額抵押借貸", ja: "CDP",           emoji: "🔐" },
  "Bridge":         { zh: "跨鏈橋",   ja: "ブリッジ",          emoji: "🌉" },
  "RWA":            { zh: "現實資產", ja: "リアルワールドアセット", emoji: "🏛️" },
};

const DEX_COLORS = ["#C9A84C", "#3D7A5C", "#4A7EB5", "#8B5CF6", "#A8293A", "#6B7280"];

// ─── Helper functions ─────────────────────────────────────────────────────────

function getWeekKey(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, …
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function getIssueNumber(): number {
  const genesis = new Date("2026-04-06T00:00:00Z");
  const monday = new Date(getWeekKey() + "T00:00:00Z");
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksDiff = Math.floor((monday.getTime() - genesis.getTime()) / msPerWeek);
  return Math.max(1, weeksDiff + 1);
}

function getIssueDateStr(): string {
  const weekKey = getWeekKey();
  const d = new Date(weekKey + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function get<T = unknown>(url: string, ms = 10000): Promise<T | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
    });
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

async function rpc(method: string, params: unknown[] = [], ms = 10000): Promise<unknown> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    const d = (await res.json()) as { result?: unknown };
    return d?.result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function getLogoUrl(name: string, slug?: string): string {
  const KNOWN: Record<string, string> = {
    Jupiter: "jupiter",
    Kamino: "kamino",
    Raydium: "raydium",
    Jito: "jito",
    Marinade: "marinade",
    Meteora: "meteora",
    Orca: "orca",
    Drift: "drift",
    MarginFi: "marginfi",
    Marginfi: "marginfi",
    Sanctum: "sanctum",
    Lifinity: "lifinity",
    Mango: "mango-markets",
    Phoenix: "phoenix",
  };
  const s = KNOWN[name] ?? slug ?? name.toLowerCase().replace(/[\s.]/g, "-");
  return `https://icons.llamao.fi/icons/protocols/${s}?w=48&h=48`;
}

function detectHotSector(protocols: ReportProtocol[]): WeeklyReport["hotSector"] {
  // Group protocols by category
  const categoryMap = new Map<
    string,
    { totalTvl: number; totalChange: number; count: number; protocols: ReportProtocol[] }
  >();

  for (const p of protocols) {
    if (!p.category) continue;
    const existing = categoryMap.get(p.category) ?? {
      totalTvl: 0,
      totalChange: 0,
      count: 0,
      protocols: [],
    };
    existing.totalTvl += p.tvlRaw;
    existing.totalChange += p.change7d;
    existing.count += 1;
    existing.protocols.push(p);
    categoryMap.set(p.category, existing);
  }

  // Filter categories with totalTvl >= $50M, compute avgChange7d
  type CatEntry = {
    name: string;
    totalTvl: number;
    avgChange: number;
    protocols: ReportProtocol[];
  };
  const candidates: CatEntry[] = [];
  for (const [name, data] of categoryMap.entries()) {
    if (data.totalTvl < 50_000_000) continue;
    candidates.push({
      name,
      totalTvl: data.totalTvl,
      avgChange: data.count > 0 ? data.totalChange / data.count : 0,
      protocols: data.protocols,
    });
  }

  // Sort descending by avgChange
  candidates.sort((a, b) => b.avgChange - a.avgChange);

  const top = candidates[0] ?? {
    name: "Dexes",
    totalTvl: 0,
    avgChange: 0,
    protocols: [],
  };

  const meta = SECTOR_META[top.name] ?? { zh: top.name, ja: top.name, emoji: "📊" };

  // Top protocol by TVL in category
  const topProto = top.protocols.sort((a, b) => b.tvlRaw - a.tvlRaw)[0];
  const topProtocolName = topProto?.name ?? "Unknown";

  const rationale = `${top.name} leads this week with ${fmtPct(top.avgChange)} average 7-day TVL momentum, driven by ${topProtocolName} at ${topProto ? fmtUsd(topProto.tvlRaw) : "N/A"} in locked value.`;

  return {
    name: top.name,
    nameZh: meta.zh,
    nameJa: meta.ja,
    emoji: meta.emoji,
    momentum: fmtPct(top.avgChange),
    topProtocol: topProtocolName,
    rationale,
  };
}

async function generateNarrative(
  report: Omit<WeeklyReport, "narrative">
): Promise<NarrativeBundle | null> {
  try {
    const dataCtx = `
WEEK: Issue #${report.issue} — ${report.issueDate}
SOL PRICE: ${report.solPrice ?? "N/A"} (24h: ${report.solChange ?? "N/A"})
SOLANA TVL: ${report.solanaTvl ?? "N/A"} (7d change: ${report.tvlChange7d ?? "N/A"})
DEX VOLUME (7d): ${report.dexVol7d ?? "N/A"}
PROTOCOL FEES (7d): ${report.fees7d ?? "N/A"}
TPS (avg/peak): ${report.tpsTotal ?? "N/A"} / ${report.tpsPeak ?? "N/A"} (user: ${report.tpsUser ?? "N/A"} / ${report.tpsUserPeak ?? "N/A"})
VALIDATOR NODES: ${report.clusterNodes ?? "N/A"}

HOT SECTOR: ${report.hotSector.name} ${report.hotSector.emoji} (${report.hotSector.momentum})
TOP PROTOCOL: ${report.hotSector.topProtocol}

TOP PROTOCOLS BY TVL:
${report.protocols
  .slice(0, 8)
  .map((p) => `  ${p.name} (${p.category}): ${p.tvlFmt} | 7d: ${fmtPct(p.change7d)}`)
  .join("\n")}

DEX MARKET SHARE (7d vol):
${report.dexShare.map((d) => `  ${d.name}: ${d.vol7dFmt} (${(d.share * 100).toFixed(1)}%)`).join("\n")}

FEAR/GREED INDEX: ${report.fearGreed.score}/100 — ${report.fearGreed.labelEn}

LST YIELDS:
${Object.entries(report.lst)
  .map(([k, v]) => `  ${k}: APY=${v?.apy ?? "N/A"}, TVL=${v?.tvl ?? "N/A"}`)
  .join("\n")}

LENDING RATES (Kamino):
${Object.entries(report.lending)
  .map(([k, v]) => `  ${k}: ${v ?? "N/A"}`)
  .join("\n")}
`.trim();

    const prompt = `You are the lead analyst for Solana Ecosystem Weekly, a Bloomberg/CoinDesk-tier crypto publication.
Write this week's report in the exact style of Meltem Demirors: macro-first, direct, zero hedging, analytical.

ABSOLUTE STYLE RULES — every single rule must be followed:
1. First sentence in every section: direct declarative statement. Never start with "This week", "本週", "今週", "In this issue".
2. Data supports arguments — data is never the grammatical subject of a sentence ("DEX volume was X" → bad; "X in volume says traders are not leaving" → good).
3. BANNED phrases: "it's worth noting", "importantly", "in conclusion", "as we can see", "the data shows", "notably", "interestingly", "it is clear".
4. Short punchy sentences (5-10 words) alternate with occasional longer analytical ones — creates rhythm.
5. Every section must include one observation that challenges the obvious interpretation of the data.
6. Verdict: must be analytically useful and actionable, not a summary of what was already said.
7. Catalysts: 3 specific upcoming events/trends grounded in the actual Solana ecosystem — no generic statements.
8. Write as if you have capital deployed here and this analysis informs your own positions.
9. For Chinese (zh): use traditional Chinese (繁體中文), financial media register, not tech documentation.
10. For Japanese (ja): use formal financial media Japanese, concise sentences.

LIVE DATA THIS WEEK:
${dataCtx}

Return ONLY valid JSON (no markdown code fences, no text before or after the JSON):
{
  "zh": {
    "opening": "2-3 sentences. Direct market thesis. First sentence starts with the conclusion, not the context.",
    "hotSector": "3-4 sentences deep dive. Why capital is here. Whether it's sustainable.",
    "capitalFlow": "2-3 sentences. Specific protocol winners/losers. Where deployment is moving.",
    "verdict": "2-3 sentences. Actionable analytical call. Tell a sophisticated DeFi participant something useful.",
    "findings": ["5 distinct sharp insights, each 1 sentence, not restatements of numbers"],
    "catalysts": ["3 specific upcoming events/trends to watch this week or next"]
  },
  "en": { "opening": "...", "hotSector": "...", "capitalFlow": "...", "verdict": "...", "findings": ["...x5"], "catalysts": ["...x3"] },
  "ja": { "opening": "...", "hotSector": "...", "capitalFlow": "...", "verdict": "...", "findings": ["...x5"], "catalysts": ["...x3"] }
}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]) as {
      zh: NarrativeSection;
      en: NarrativeSection;
      ja: NarrativeSection;
    };

    // Validate structure
    for (const lang of ["zh", "en", "ja"] as const) {
      const s = parsed[lang];
      if (
        !s ||
        typeof s.opening !== "string" ||
        typeof s.hotSector !== "string" ||
        typeof s.capitalFlow !== "string" ||
        typeof s.verdict !== "string" ||
        !Array.isArray(s.findings) ||
        !Array.isArray(s.catalysts)
      ) {
        return null;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildFallback(report: Omit<WeeklyReport, "narrative">): NarrativeBundle {
  const sol = report.solPrice ?? "N/A";
  const solChg = report.solChange ?? "N/A";
  const tvl = report.solanaTvl ?? "N/A";
  const tvlChg = report.tvlChange7d ?? "N/A";
  const dex = report.dexVol7d ?? "N/A";
  const fees = report.fees7d ?? "N/A";
  const sector = report.hotSector;
  const topProto = report.protocols[0];
  const secondProto = report.protocols[1];
  const fearLabel = report.fearGreed.labelEn;
  const fearScore = report.fearGreed.score;

  const zh: NarrativeSection = {
    opening: `SOL 本週報收 ${sol}，7 日鏈上 TVL 達 ${tvl}（${tvlChg}），資金動向比價格更能說明生態健康度。市場情緒指數落在 ${fearScore}（${report.fearGreed.label}），這個數字提示的是機會，不是風險。DEX 週交易量 ${dex}，協議費收入 ${fees}，顯示鏈上真實需求並未消退。`,
    hotSector: `${sector.name}（${sector.nameZh}）以 ${sector.momentum} 的 7 日動能領跑本週所有板塊。${sector.topProtocol} 是這波資金流入的核心承載者。單一板塊主導不代表生態集中化——它代表資本正在尋找最高確定性的收益著陸點。這類趨勢通常持續 2-3 週後才出現板塊輪動。`,
    capitalFlow: `${topProto ? `${topProto.name} 以 ${topProto.tvlFmt} 的 TVL 穩居龍頭，7 日變化 ${fmtPct(topProto.change7d)}。` : ""}${secondProto ? `${secondProto.name}（${secondProto.tvlFmt}）緊隨其後，變化幅度 ${fmtPct(secondProto.change7d)}。` : ""}資金輪動中的落後者反而值得關注——低估值往往是下一波動力的起點。`,
    verdict: `在 ${tvl} TVL 的支撐下，Solana DeFi 進入結構性而非週期性成長階段。聰明資金此刻在做的事：加倉 ${sector.topProtocol}，做空對生態過度悲觀的敘事。下週關注 TPS 能否突破 ${report.tpsPeak ?? "現有峰值"}，這是網路需求最誠實的指標。`,
    findings: [
      `${sol} 的 SOL 價格背後，鏈上活躍度比市值更值得跟蹤`,
      `${sector.name} 板塊正在吸收跨鏈遷移資金，不只是本地存量再分配`,
      `${report.clusterNodes ? `${report.clusterNodes} 個驗證節點的分布意味著網路去中心化程度持續改善` : "驗證節點數量的穩定增長是網路韌性的底層保障"}`,
      `DEX 市佔率向頭部集中是效率優化的結果，不是壟斷風險`,
      `借貸市場利率${report.lending["kamino_usdc_supply"] ? `（USDC 供應年化 ${report.lending["kamino_usdc_supply"]}）` : ""}反映的是真實槓桿需求，而非投機泡沫`,
    ],
    catalysts: [
      `${sector.topProtocol} 若發布新產品或治理提案，將引發板塊資金二次集中`,
      `SOL 質押收益率變化直接影響 LST 競爭格局，本週值得密切監控`,
      `跨鏈橋資金流量是外部資本進入 Solana 的先行指標，需持續追蹤`,
    ],
  };

  const en: NarrativeSection = {
    opening: `SOL holds at ${sol} with ${solChg} in the past 24 hours — the price is almost irrelevant next to ${tvl} in TVL (${tvlChg} over 7 days). Fear/greed sits at ${fearScore}: ${fearLabel}. That reading, paired with ${dex} in DEX volume and ${fees} in protocol fees, tells you the ecosystem is running, not coasting.`,
    hotSector: `${sector.name} ${sector.emoji} is the week's conviction trade at ${sector.momentum} average 7-day momentum. ${sector.topProtocol} is where the marginal dollar is landing. Counter-thesis worth holding: outsized sector performance sometimes signals peak rotation, not peak growth — check whether TVL gains are accompanied by real fee generation or just liquidity migration.`,
    capitalFlow: `${topProto ? `${topProto.name} commands ${topProto.tvlFmt} in TVL, moving ${fmtPct(topProto.change7d)} over 7 days — the clear liquidity anchor. ` : ""}${secondProto ? `${secondProto.name} at ${secondProto.tvlFmt} (${fmtPct(secondProto.change7d)}) holds the second slot. ` : ""}Capital rotating out of mid-tier protocols isn't leaving the ecosystem; it's concentrating into higher-conviction deployments.`,
    verdict: `${tvl} in ecosystem TVL is not a ceiling — it's a base. Sophisticated participants should be watching fee-to-TVL ratios rather than absolute numbers: protocols extracting value proportional to their locked capital are the ones worth building positions around. ${sector.topProtocol} clears that bar this week.`,
    findings: [
      `${sol} SOL price understates ecosystem momentum when TVL trends diverge from token price`,
      `${sector.name} momentum at ${sector.momentum} suggests institutional reallocation, not retail speculation`,
      `${report.clusterNodes ? `${report.clusterNodes} validator nodes represents structural decentralization most L1s cannot match` : "Validator node growth is the most underreported indicator of network health"}`,
      `DEX volume concentration is a feature, not a bug — efficient price discovery beats distributed illiquidity`,
      `LST competition is compressing yields toward fair value, which is ultimately healthy for capital formation`,
    ],
    catalysts: [
      `${sector.topProtocol} governance or product announcement would trigger a second wave of TVL inflows into ${sector.name}`,
      `SOL staking yield compression will reshape LST competitive dynamics — watch for protocol responses this week`,
      `Cross-chain bridge inflows are the leading indicator for external capital entering Solana — track Wormhole and deBridge volume`,
    ],
  };

  const ja: NarrativeSection = {
    opening: `SOL は ${sol} で推移し、エコシステム TVL は ${tvl}（7 日変化: ${tvlChg}）に達している。価格よりもオンチェーン資金フローが生態系の健全性を示す指標として機能する。DEX 週次取引量 ${dex}、プロトコル手数料 ${fees} は実需の存在を裏付けている。`,
    hotSector: `${sector.name}（${sector.nameJa}）は今週 ${sector.momentum} の 7 日モメンタムで全セクターをリードした。${sector.topProtocol} への資金集中がその中心にある。単一セクターの優位性は必ずしも過熱を意味しない — 資本効率の最大化を求める機関投資家の行動パターンと整合している。`,
    capitalFlow: `${topProto ? `${topProto.name} は ${topProto.tvlFmt} の TVL で首位を維持し、7 日変化率は ${fmtPct(topProto.change7d)} となっている。` : ""}${secondProto ? `${secondProto.name}（${secondProto.tvlFmt}、${fmtPct(secondProto.change7d)}）が後を追う。` : ""}中堅プロトコルからの資金移動はエコシステム離脱ではなく、上位プロトコルへの選別的集中を示している。`,
    verdict: `${tvl} の TVL 水準は Solana DeFi の構造的成長期への移行を示唆している。${sector.topProtocol} を中心とする ${sector.name} セクターへのポジション構築は今週の合理的な戦術となる。TPS ピーク値 ${report.tpsPeak ?? "の推移"} がネットワーク需要の最も信頼性の高い先行指標として機能する。`,
    findings: [
      `${sol} の SOL 価格水準よりもオンチェーン TVL トレンドの方が中期見通しを反映している`,
      `${sector.name} の ${sector.momentum} モメンタムは機関投資家のリアロケーションと整合的な動きを示す`,
      `${report.clusterNodes ? `バリデータノード数 ${report.clusterNodes} は分散化指標として他の L1 に対する優位性を示す` : "バリデータノードの増加は最も過小評価されているネットワーク健全性指標の一つである"}`,
      `DEX 取引量の集中化は市場効率化の結果であり、中央集権リスクとは区別して分析すべきである`,
      `LST 競争による利回り収束は長期的に健全な資本形成環境をもたらす`,
    ],
    catalysts: [
      `${sector.topProtocol} によるガバナンス提案または新製品発表は ${sector.name} セクターへの追加資金流入を誘発する可能性がある`,
      `SOL ステーキング利回りの変動は LST 競争構造を直接変化させるため、今週の動向を注視する必要がある`,
      `クロスチェーンブリッジへの資金流入は Solana への外部資本流入の先行指標として機能する`,
    ],
  };

  return { zh, en, ja };
}

// ─── Main GET handler ─────────────────────────────────────────────────────────

export async function GET() {
  const weekKey = getWeekKey();
  const issue = getIssueNumber();
  const issueDate = getIssueDateStr();

  type PoolRow = {
    project: string;
    symbol: string;
    tvlUsd: number;
    apy: number;
    chain: string;
  };

  type LlamaProtocol = {
    name: string;
    slug: string;
    tvl: number;
    change_7d?: number;
    category?: string;
    chains?: string[];
  };

  type LlamaDexProtocol = {
    name: string;
    slug?: string;
    total7d?: number;
    displayName?: string;
  };

  type LlamaDexOverview = {
    total7d?: number;
    protocols?: LlamaDexProtocol[];
  };

  type LlamaChain = { name: string; tvl: number };

  type LlamaHistoryPoint = { date: number; tvl: number };

  type PerformanceSample = {
    numTransactions: number;
    numNonVoteTransactions: number;
    samplePeriodSecs: number;
  };

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [
    solPriceRaw,
    solChangeRaw,
    llamaChains,
    llamaDexRaw,
    llamaFeesRaw,
    llamaProtocolsRaw,
    tvlHistoryRaw,
    tpsRaw,
    clusterNodesRaw,
    yieldsRaw,
    individualTvls,
  ] = await Promise.all([
    get<{ coins?: { "coingecko:solana"?: { price?: number } } }>(
      "https://coins.llama.fi/prices/current/coingecko:solana?searchWidth=4h"
    ),
    get<{ coins?: { "coingecko:solana"?: number } }>(
      `https://coins.llama.fi/percentage/coingecko:solana?timestamp=${Math.floor(Date.now() / 1000)}&lookForward=false&period=24h`
    ),
    get<LlamaChain[]>("https://api.llama.fi/v2/chains"),
    get<LlamaDexOverview>(
      "https://api.llama.fi/overview/dexs/solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume"
    ),
    get<{ total7d?: number }>(
      "https://api.llama.fi/overview/fees/solana?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyFees"
    ),
    get<LlamaProtocol[]>("https://api.llama.fi/protocols", 15000),
    get<LlamaHistoryPoint[]>("https://api.llama.fi/v2/historicalChainTvl/Solana", 12000),
    rpc("getRecentPerformanceSamples", [60]),
    rpc("getClusterNodes"),
    get<{ data?: PoolRow[] }>("https://yields.llama.fi/pools", 12000),
    Promise.all([
      get<number>("https://api.llama.fi/tvl/kamino"),
      get<number>("https://api.llama.fi/tvl/jito"),
      get<number>("https://api.llama.fi/tvl/raydium"),
      get<number>("https://api.llama.fi/tvl/marinade"),
      get<number>("https://api.llama.fi/tvl/meteora"),
      get<number>("https://api.llama.fi/tvl/orca"),
      get<number>("https://api.llama.fi/tvl/drift"),
      get<number>("https://api.llama.fi/tvl/jupiter"),
    ]),
  ]);

  // ── SOL price ──────────────────────────────────────────────────────────────
  let solUsd: number | null = null;
  let solChange24h: number | null = null;
  try {
    solUsd = solPriceRaw?.coins?.["coingecko:solana"]?.price ?? null;
    solChange24h = solChangeRaw?.coins?.["coingecko:solana"] ?? null;
  } catch { /* ignore */ }

  // ── Solana TVL ─────────────────────────────────────────────────────────────
  let solanaTvlRaw: number | null = null;
  try {
    solanaTvlRaw = llamaChains?.find((c) => c.name === "Solana")?.tvl ?? null;
  } catch { /* ignore */ }

  // ── DEX volume ─────────────────────────────────────────────────────────────
  let dexVol7dRaw: number | null = null;
  let dexProtos: LlamaDexProtocol[] = [];
  try {
    dexVol7dRaw = llamaDexRaw?.total7d ?? null;
    dexProtos = llamaDexRaw?.protocols ?? [];
  } catch { /* ignore */ }

  // ── Protocol fees ──────────────────────────────────────────────────────────
  let fees7dRaw: number | null = null;
  try {
    fees7dRaw = llamaFeesRaw?.total7d ?? null;
  } catch { /* ignore */ }

  // ── Top protocols list ────────────────────────────────────────────────────
  let protocols: ReportProtocol[] = [];
  try {
    const all = llamaProtocolsRaw ?? [];
    const solana = all.filter(
      (p) => p.chains?.includes("Solana") && typeof p.tvl === "number" && p.tvl > 0
    );
    solana.sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0));
    protocols = solana.slice(0, 12).map((p) => ({
      name: p.name,
      slug: p.slug,
      tvlFmt: fmtUsd(p.tvl),
      tvlRaw: p.tvl,
      change7d: p.change_7d ?? 0,
      category: p.category ?? "Other",
      logoUrl: getLogoUrl(p.name, p.slug),
    }));
  } catch { /* ignore */ }

  // ── TVL history ────────────────────────────────────────────────────────────
  let tvlHistory: Array<{ date: string; tvl: number }> = [];
  let tvlChange7dRaw: number | null = null;
  try {
    const hist = tvlHistoryRaw ?? [];
    const slice = hist.slice(-30);
    tvlHistory = slice.map((p) => ({
      date: new Date(p.date * 1000).toISOString().slice(0, 10),
      tvl: p.tvl,
    }));
    if (slice.length >= 7) {
      const latest = slice[slice.length - 1].tvl;
      const prev7 = slice[slice.length - 7].tvl;
      if (prev7 > 0) {
        tvlChange7dRaw = ((latest - prev7) / prev7) * 100;
      }
    }
  } catch { /* ignore */ }

  // ── DEX share ──────────────────────────────────────────────────────────────
  let dexShare: DexShare[] = [];
  try {
    const sorted = [...dexProtos]
      .filter((p) => typeof p.total7d === "number" && (p.total7d ?? 0) > 0)
      .sort((a, b) => (b.total7d ?? 0) - (a.total7d ?? 0));
    const top5 = sorted.slice(0, 5);
    const total = sorted.reduce((acc, p) => acc + (p.total7d ?? 0), 0);
    dexShare = top5.map((p, i) => ({
      name: p.displayName ?? p.name,
      vol7dFmt: fmtUsd(p.total7d ?? 0),
      vol7dRaw: p.total7d ?? 0,
      share: total > 0 ? (p.total7d ?? 0) / total : 0,
      color: DEX_COLORS[i] ?? DEX_COLORS[DEX_COLORS.length - 1],
    }));
  } catch { /* ignore */ }

  // ── TPS ────────────────────────────────────────────────────────────────────
  let tpsTotal: number | null = null;
  let tpsUser: number | null = null;
  let tpsPeak: number | null = null;
  let tpsUserPeak: number | null = null;
  try {
    const samples = tpsRaw as PerformanceSample[] | null;
    if (samples?.length) {
      const totals = samples.map((s) => s.numTransactions / s.samplePeriodSecs);
      const users = samples.map((s) => s.numNonVoteTransactions / s.samplePeriodSecs);
      tpsTotal = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
      tpsUser = Math.round(users.reduce((a, b) => a + b, 0) / users.length);
      tpsPeak = Math.round(Math.max(...totals));
      tpsUserPeak = Math.round(Math.max(...users));
    }
  } catch { /* ignore */ }

  // ── Cluster nodes ──────────────────────────────────────────────────────────
  let clusterNodes: number | null = null;
  try {
    const nodes = clusterNodesRaw as unknown[] | null;
    clusterNodes = nodes?.length ?? null;
  } catch { /* ignore */ }

  // ── LST yields ────────────────────────────────────────────────────────────
  const lstMap: Record<string, { apy: string; tvl: string } | null> = {};
  try {
    const pools = yieldsRaw?.data ?? [];
    const solana = pools.filter((p) => p.chain === "Solana");
    const lstTargets: Array<[string, string]> = [
      ["marinade-liquid-staking", "mSOL"],
      ["jito-liquid-staking", "jitoSOL"],
      ["jupiter-staked-sol", "JUPSOL"],
      ["binance-staked-sol", "BNSOL"],
      ["phantom-sol", "PSOL"],
    ];
    for (const [proj, key] of lstTargets) {
      const pool = solana.find((p) => p.project === proj);
      lstMap[key] = pool
        ? { apy: `${pool.apy.toFixed(2)}%`, tvl: fmtUsd(pool.tvlUsd) }
        : null;
    }
  } catch { /* ignore */ }

  // ── Kamino lending rates ──────────────────────────────────────────────────
  const lendMap: Record<string, string | null> = {};
  try {
    const pools = yieldsRaw?.data ?? [];
    const kamino = pools.filter(
      (p) => p.project === "kamino-lend" && p.chain === "Solana"
    );
    for (const asset of ["USDC", "SOL", "USDT"]) {
      const pool = kamino.find((p) => p.symbol === asset);
      lendMap[`kamino_${asset.toLowerCase()}_supply`] = pool
        ? `${pool.apy.toFixed(2)}%`
        : null;
    }
  } catch { /* ignore */ }

  // ── Individual TVLs (for individual protocol display) ─────────────────────
  const [
    kaminoTvl,
    jitoTvl,
    raydiumTvl,
    marinadeTvl,
    meteoraTvl,
    orcaTvl,
    driftTvl,
    jupiterTvl,
  ] = individualTvls.map((v) => (typeof v === "number" ? v : null));

  // If top protocols list is sparse, augment with known individual TVLs
  if (protocols.length < 8) {
    const known: Array<{ name: string; slug: string; tvl: number | null; category: string }> = [
      { name: "Kamino", slug: "kamino", tvl: kaminoTvl, category: "Lending" },
      { name: "Jito", slug: "jito", tvl: jitoTvl, category: "Liquid Staking" },
      { name: "Raydium", slug: "raydium", tvl: raydiumTvl, category: "Dexes" },
      { name: "Marinade", slug: "marinade", tvl: marinadeTvl, category: "Liquid Staking" },
      { name: "Meteora", slug: "meteora", tvl: meteoraTvl, category: "Dexes" },
      { name: "Orca", slug: "orca", tvl: orcaTvl, category: "Dexes" },
      { name: "Drift", slug: "drift", tvl: driftTvl, category: "Derivatives" },
      { name: "Jupiter", slug: "jupiter", tvl: jupiterTvl, category: "Dexes" },
    ];
    for (const k of known) {
      if (k.tvl !== null && !protocols.some((p) => p.slug === k.slug)) {
        protocols.push({
          name: k.name,
          slug: k.slug,
          tvlFmt: fmtUsd(k.tvl),
          tvlRaw: k.tvl,
          change7d: 0,
          category: k.category,
          logoUrl: getLogoUrl(k.name, k.slug),
        });
      }
    }
    protocols.sort((a, b) => b.tvlRaw - a.tvlRaw);
  }

  // ── Fear / Greed ──────────────────────────────────────────────────────────
  let fgScore = 50;
  if (solChange24h !== null) {
    fgScore += Math.max(-15, Math.min(15, solChange24h * 3));
  }
  if (tvlChange7dRaw !== null) {
    fgScore += Math.max(-10, Math.min(10, tvlChange7dRaw * 2));
  }
  fgScore = Math.max(10, Math.min(90, Math.round(fgScore)));

  type FearGreedLevel = {
    label: string;
    labelEn: string;
    color: string;
  };
  const FG_LEVELS: Array<{ min: number } & FearGreedLevel> = [
    { min: 75, label: "極度貪婪", labelEn: "Extreme Greed", color: "#16a34a" },
    { min: 60, label: "貪婪",     labelEn: "Greed",          color: "#65a30d" },
    { min: 45, label: "中性",     labelEn: "Neutral",        color: "#ca8a04" },
    { min: 30, label: "恐懼",     labelEn: "Fear",           color: "#ea580c" },
    { min: 0,  label: "極度恐懼", labelEn: "Extreme Fear",   color: "#dc2626" },
  ];
  const fgLevel = FG_LEVELS.find((l) => fgScore >= l.min) ?? FG_LEVELS[FG_LEVELS.length - 1];
  const fearGreed = {
    score: fgScore,
    label: fgLevel.label,
    labelEn: fgLevel.labelEn,
    color: fgLevel.color,
  };

  // ── Hot sector ────────────────────────────────────────────────────────────
  const hotSector = detectHotSector(protocols);

  // ── Assemble report base ──────────────────────────────────────────────────
  const reportBase: Omit<WeeklyReport, "narrative"> = {
    issue,
    issueDate,
    weekKey,
    solPrice: solUsd !== null ? `$${solUsd.toFixed(2)}` : null,
    solChange: solChange24h !== null ? fmtPct(solChange24h) : null,
    solanaTvl: solanaTvlRaw !== null ? fmtUsd(solanaTvlRaw) : null,
    tvlChange7d: tvlChange7dRaw !== null ? fmtPct(tvlChange7dRaw) : null,
    dexVol7d: dexVol7dRaw !== null ? fmtUsd(dexVol7dRaw) : null,
    fees7d: fees7dRaw !== null ? fmtUsd(fees7dRaw) : null,
    tpsTotal: tpsTotal !== null ? tpsTotal.toLocaleString() : null,
    tpsUser: tpsUser !== null ? tpsUser.toLocaleString() : null,
    tpsPeak: tpsPeak !== null ? tpsPeak.toLocaleString() : null,
    tpsUserPeak: tpsUserPeak !== null ? tpsUserPeak.toLocaleString() : null,
    clusterNodes: clusterNodes !== null ? clusterNodes.toLocaleString() : null,
    hotSector,
    protocols,
    dexShare,
    dexTotal7d: dexVol7dRaw !== null ? fmtUsd(dexVol7dRaw) : null,
    tvlHistory,
    fearGreed,
    lst: lstMap,
    lending: lendMap,
    updatedAt: new Date().toISOString(),
  };

  // ── Narrative (cached) ────────────────────────────────────────────────────
  const NOW = Date.now();
  const MS_24H = 24 * 60 * 60 * 1000;
  const cached = narrativeCache.get(weekKey);

  let narrative: NarrativeBundle | null = null;
  if (cached && NOW - cached.ts < MS_24H) {
    narrative = cached.bundle;
  } else {
    narrative = await generateNarrative(reportBase);
    if (!narrative) {
      narrative = buildFallback(reportBase);
    }
    narrativeCache.set(weekKey, { bundle: narrative, ts: NOW });
  }

  const report: WeeklyReport = { ...reportBase, narrative };
  return NextResponse.json(report);
}
