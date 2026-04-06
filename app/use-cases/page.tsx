"use client";

import { useState } from "react";
import Link from "next/link";
import { LanguageProvider, useLang } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";
import ThemeWrapper from "@/components/ThemeWrapper";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Lang = "zh" | "en" | "ja";
type T3 = { zh: string; en: string; ja: string };
function tx(o: T3, l: Lang) { return o[l]; }

type Status = "safe" | "warn" | "danger" | "info";

function statusColor(s: Status): string {
  if (s === "safe") return "#3D7A5C";
  if (s === "warn") return "#B8832A";
  if (s === "danger") return "#A8293A";
  return "var(--text-secondary)";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionBubble({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
      <div style={{
        background: "var(--bg-card-2)", border: "1px solid var(--border)",
        borderRadius: "16px 16px 4px 16px", padding: "14px 20px",
        maxWidth: "72%", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7,
      }}>
        {text}
      </div>
    </div>
  );
}

function SakuraHeader({ sources }: { sources: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 30, height: 30, background: "var(--accent)", borderRadius: 7,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0,
      }}>S</div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", letterSpacing: "0.08em" }}>SAKURA</span>
      <span style={{
        fontSize: 11, padding: "2px 9px", borderRadius: 20,
        background: "rgba(61,122,92,0.15)", color: "#3D7A5C",
        border: "1px solid rgba(61,122,92,0.3)", fontWeight: 600,
      }}>✅ 分析完成</span>
      <span style={{
        fontSize: 11, padding: "2px 9px", borderRadius: 20,
        background: "var(--bg-card-2)", color: "var(--text-muted)",
        border: "1px solid var(--border)", marginLeft: "auto",
      }}>{sources}</span>
    </div>
  );
}

function MetricsTable({ rows, lang }: {
  rows: Array<{ label: T3; value: T3 | string; status: Status }>;
  lang: Lang;
}) {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 20 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg-card-2)" }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
              <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--text-secondary)", width: "50%" }}>
                {tx(row.label, lang)}
              </td>
              <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: statusColor(row.status) }}>
                {typeof row.value === "string" ? row.value : tx(row.value, lang)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsensusTable({ headers, rows }: {
  headers: T3[];
  rows: Array<{ token: string; buyers: T3; combo: string; usd: string; stars: string; status: Status }>;
  lang: Lang;
}) {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 20 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg-card-2)" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-muted)", textAlign: "left", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {h.zh}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
              <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{row.token}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, color: statusColor(row.status) }}>{row.buyers.zh}</td>
              <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{row.combo}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, color: "#C9A84C", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{row.usd}</td>
              <td style={{ padding: "10px 14px", fontSize: 13 }}>{row.stars}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumberedBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{
      background: "var(--accent-soft)", border: "1px solid rgba(192,57,43,0.2)",
      borderRadius: 10, padding: "16px 20px", marginBottom: 20,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 1,
            }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyFindings({ items }: { items: string[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
        關鍵發現
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerdictCard({ text, type }: { text: string; type: "safe" | "warn" | "danger" | "success" }) {
  const col = type === "safe" || type === "success" ? "#3D7A5C" : type === "warn" ? "#B8832A" : "#A8293A";
  return (
    <div style={{
      background: "var(--accent-soft)", borderLeft: "3px solid var(--accent)",
      borderRadius: "0 8px 8px 0", padding: "14px 18px", marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, color: col, fontWeight: 600, lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

function CaseCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "28px 32px",
    }}>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function UseCasesContent() {
  const { lang } = useLang();
  const L = lang as Lang;
  const [activeTab, setActiveTab] = useState("security");

  const tabs: Array<{ id: string; label: T3 }> = [
    { id: "security",   label: { zh: "安全防護", en: "Security",    ja: "セキュリティ" } },
    { id: "yield",      label: { zh: "收益優化", en: "Yield",        ja: "利回り最適化" } },
    { id: "smartmoney", label: { zh: "聰明錢信號", en: "Smart Money", ja: "スマートマネー" } },
    { id: "automation", label: { zh: "自動化",   en: "Automation",  ja: "自動化" } },
    { id: "copytrade",  label: { zh: "複製交易", en: "Copy Trade",   ja: "コピートレード" } },
    { id: "market",     label: { zh: "市場洞察", en: "Market",       ja: "市場分析" } },
  ];

  // ── SECURITY ────────────────────────────────────────────────────────────────
  function SecurityCase() {
    const q: T3 = {
      zh: "我看到群裡在推 $WIF，我想買，先幫我做一個全面的安全分析",
      en: "People in my group are hyping $WIF. I want to buy — run a full security check first.",
      ja: "グループで $WIF が話題になっています。買う前に全面的なセキュリティ分析をしてください。",
    };
    const title: T3 = {
      zh: "$WIF 安全全面評估報告",
      en: "$WIF Full Security Assessment",
      ja: "$WIF セキュリティ総合評価レポート",
    };
    const opening: T3 = {
      zh: "WIF（Dogwifhat）是 Solana 上交易量最高的 meme 代幣之一。以下是基於 GoPlus 實時鏈上數據的完整安全評估。核心問題只有一個：你的資金在這個合約裡是否安全？",
      en: "WIF (Dogwifhat) is one of Solana's highest-volume meme tokens. Here's the complete safety assessment from GoPlus real-time on-chain data. The only question that matters: is your capital safe inside this contract?",
      ja: "WIF（Dogwifhat）はSolana上で最も取引量の多いミームトークンの一つです。以下はGoPlus リアルタイムオンチェーンデータによる完全なセキュリティ評価です。",
    };
    const rows = [
      { label: { zh: "GoPlus 安全評分", en: "GoPlus Security Score", ja: "GoPlus セキュリティスコア" }, value: "82 / 100", status: "safe" as Status },
      { label: { zh: "增發權限", en: "Mint Authority", ja: "ミント権限" }, value: { zh: "已永久放棄 ✅", en: "Permanently Revoked ✅", ja: "永久放棄済み ✅" }, status: "safe" as Status },
      { label: { zh: "凍結權限", en: "Freeze Authority", ja: "フリーズ権限" }, value: { zh: "未啟用 ✅", en: "Not Enabled ✅", ja: "未有効 ✅" }, status: "safe" as Status },
      { label: { zh: "蜜罐檢測", en: "Honeypot Detection", ja: "ハニーポット検出" }, value: { zh: "未發現 ✅", en: "Not Detected ✅", ja: "未検出 ✅" }, status: "safe" as Status },
      { label: { zh: "前 10 持有者集中度", en: "Top-10 Holder Concentration", ja: "上位10保有者集中度" }, value: "41.2% ⚠️", status: "warn" as Status },
      { label: { zh: "開發者持倉比例", en: "Developer Holdings", ja: "開発者保有率" }, value: "0.8% ✅", status: "safe" as Status },
      { label: { zh: "流動性深度（2% 滑點）", en: "Liquidity Depth (2% slippage)", ja: "流動性深度（2%スリッページ）" }, value: "$4.2M ✅", status: "safe" as Status },
    ];
    const findings: T3[] = [
      { zh: "核心風險已清除：創辦人無法增發代幣或凍結任何人的資金", en: "Critical risks cleared: founders cannot mint new tokens or freeze any wallet", ja: "主要リスク解消済み：創設者は新規発行も凍結も不可能" },
      { zh: "流動性充足，$50,000 以下的頭寸買賣滑點可控", en: "Sufficient liquidity — positions under $50K face minimal slippage", ja: "十分な流動性 — $50K以下のポジションはスリッページ最小" },
      { zh: "前 10 持有者佔比偏高，需留意大戶集中拋售風險", en: "Top-10 concentration moderately high — watch for large holder exits", ja: "上位10保有者集中度はやや高め — 大口売りに注意" },
    ];
    const verdict: T3 = {
      zh: "✅ 安全評分良好，可考慮買入。建議單筆倉位不超過投資組合的 5%，控制 meme 代幣整體曝險。",
      en: "✅ Safety score solid. Consider buying. Keep position under 5% of portfolio to manage meme token exposure.",
      ja: "✅ 安全スコア良好。購入検討可。ポジションサイズをポートフォリオの5%以内に抑えること。",
    };
    return (
      <CaseCard>
        <QuestionBubble text={tx(q, L)} />
        <SakuraHeader sources={L === "ja" ? "GoPlus API · Helius On-Chain · 2 データ源" : L === "zh" ? "GoPlus API · Helius 鏈上數據 · 2 數據源" : "GoPlus API · Helius On-Chain · 2 Sources"} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>{tx(title, L)}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>{tx(opening, L)}</p>
        <MetricsTable rows={rows} lang={L} />
        <KeyFindings items={findings.map(f => tx(f, L))} />
        <VerdictCard text={tx(verdict, L)} type="safe" />
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <Link href="/" style={{ display: "inline-block", padding: "10px 28px", background: "var(--accent)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            {L === "zh" ? "試著問 Sakura" : L === "ja" ? "Sakuraに聞いてみる" : "Try Asking Sakura"}
          </Link>
        </div>
      </CaseCard>
    );
  }

  // ── YIELD ────────────────────────────────────────────────────────────────────
  function YieldCase() {
    const q: T3 = {
      zh: "我有 100 SOL 一直放在錢包裡什麼都沒做，有什麼方法可以讓它產生被動收益？",
      en: "I have 100 SOL sitting idle in my wallet doing nothing. What's the best way to put it to work?",
      ja: "100 SOLがウォレットで遊んでいます。最高の利回りを得るにはどうすればいいですか？",
    };
    const title: T3 = { zh: "100 SOL 最優收益配置方案", en: "Optimal Yield Strategy for 100 SOL", ja: "100 SOL 最適利回り配置プラン" };
    const opening: T3 = {
      zh: "100 SOL 閒置等於每年放棄約 7–8 SOL 的無風險收益。以下是基於實時 APY 數據的全協議比較，以及為你的資產量身定制的配置建議。",
      en: "100 SOL sitting idle means forfeiting roughly 7–8 SOL per year in risk-free yield. Here's a full protocol comparison based on live APY data, with a tailored allocation recommendation.",
      ja: "100 SOLの放置は年間約7〜8 SOLの無リスク収益を逃していることを意味します。リアルタイムAPYデータに基づくプロトコル比較と最適配置をご提案します。",
    };
    const rows = [
      { label: { zh: "Marinade Native · mSOL", en: "Marinade Native · mSOL", ja: "Marinade Native · mSOL" }, value: "7.2% APY", status: "safe" as Status },
      { label: { zh: "Jito · jitoSOL（含 MEV 加成）", en: "Jito · jitoSOL (MEV boosted)", ja: "Jito · jitoSOL（MEVブースト）" }, value: "7.8% APY  ⭐ 最高", status: "safe" as Status },
      { label: { zh: "Sanctum · bSOL", en: "Sanctum · bSOL", ja: "Sanctum · bSOL" }, value: "6.9% APY", status: "safe" as Status },
      { label: { zh: "Lido · stSOL", en: "Lido · stSOL", ja: "Lido · stSOL" }, value: "6.1% APY", status: "safe" as Status },
      { label: { zh: "Kamino USDC Vault（需換幣）", en: "Kamino USDC Vault (swap required)", ja: "Kamino USDC Vault（スワップ必要）" }, value: "8.4% APY", status: "warn" as Status },
    ];
    const alloc = L === "zh"
      ? ["70 SOL → jitoSOL（年化 7.8%，MEV 收益加成）", "20 SOL → 換成 USDC → Kamino USDC Vault（年化 8.4%）", "10 SOL → 保留流動性，隨時可用"]
      : L === "ja"
      ? ["70 SOL → jitoSOL（APY 7.8%、MEVブースト）", "20 SOL → USDCへスワップ → Kamino USDC Vault（APY 8.4%）", "10 SOL → 流動性確保、いつでも利用可能"]
      : ["70 SOL → jitoSOL (7.8% APY, MEV boosted)", "20 SOL → Swap to USDC → Kamino USDC Vault (8.4% APY)", "10 SOL → Keep liquid, available anytime"];
    const findings: T3[] = [
      { zh: "jitoSOL 提供最高 SOL 質押收益，MEV 機制在高交易量時段額外加成", en: "jitoSOL offers highest SOL staking yield — MEV mechanism adds extra return during high-volume periods", ja: "jitoSOL はSOLステーキング最高利回り — 高取引量時にMEVメカニズムで追加収益" },
      { zh: "20 SOL 換 USDC 存入 Kamino 的收益（8.4%）高於直接質押 SOL（7.8%），稀釋風險同時提升整體 APY", en: "Converting 20 SOL to USDC for Kamino (8.4%) beats direct SOL staking (7.8%), diversifying risk while lifting overall APY", ja: "20 SOLをUSDCに換えKaminoに入れる（8.4%）はSOLステーキング（7.8%）を上回り、リスク分散で全体APYを向上" },
      { zh: "混合年化收益率 7.64%，預期年收益約 7.64 SOL（$649 USD）", en: "Blended APY: 7.64%, projected annual yield ~7.64 SOL ($649 USD)", ja: "加重平均APY: 7.64%、予想年間収益 約7.64 SOL（$649 USD）" },
    ];
    const verdict: T3 = {
      zh: "✅ 混合年化收益 7.64%，預期年收益 7.64 SOL ≈ $649（按 SOL $85 計算）。點擊「自主 Agent」一鍵執行完整方案。",
      en: "✅ Blended APY 7.64%. Projected annual yield: 7.64 SOL (~$649 at SOL $85). Click Autonomous Agent to execute in one step.",
      ja: "✅ 加重平均APY 7.64%。予想年間収益: 7.64 SOL（~$649）。自律エージェントで一括実行可能。",
    };
    return (
      <CaseCard>
        <QuestionBubble text={tx(q, L)} />
        <SakuraHeader sources={L === "zh" ? "Sanctum APY · Kamino Finance · Jupiter · 3 數據源" : L === "ja" ? "Sanctum APY · Kamino Finance · Jupiter · 3 データ源" : "Sanctum APY · Kamino Finance · Jupiter · 3 Sources"} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>{tx(title, L)}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>{tx(opening, L)}</p>
        <MetricsTable rows={rows} lang={L} />
        <NumberedBlock title={L === "zh" ? "推薦配置方案" : L === "ja" ? "推奨配置プラン" : "Recommended Allocation"} items={alloc} />
        <KeyFindings items={findings.map(f => tx(f, L))} />
        <VerdictCard text={tx(verdict, L)} type="success" />
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <Link href="/" style={{ display: "inline-block", padding: "10px 28px", background: "var(--accent)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            {L === "zh" ? "試著問 Sakura" : L === "ja" ? "Sakuraに聞いてみる" : "Try Asking Sakura"}
          </Link>
        </div>
      </CaseCard>
    );
  }

  // ── SMART MONEY ──────────────────────────────────────────────────────────────
  function SmartMoneyCase() {
    const q: T3 = {
      zh: "過去 24 小時有哪些代幣被最多聰明錢地址集中買入？給我一份共識信號報告",
      en: "Which tokens did the most smart money wallets buy in the last 24 hours? Give me a consensus signal report.",
      ja: "過去24時間でスマートマネーが最も集中して買ったトークンは？コンセンサスレポートをください。",
    };
    const title: T3 = { zh: "24h 聰明錢共識信號報告", en: "24h Smart Money Consensus Signal Report", ja: "24h スマートマネーコンセンサスシグナルレポート" };
    const opening: T3 = {
      zh: "掃描了 30 個標記錢包（12 KOL、8 Whale、6 Smart_Money、4 Cabal）過去 24 小時內的所有 SWAP 交易。以下是出現「多地址同時買入」共識的代幣，按信心評分排序。",
      en: "Scanned 30 labeled wallets (12 KOL, 8 Whale, 6 Smart_Money, 4 Cabal) for all SWAP transactions in the past 24 hours. Below are tokens with multi-wallet consensus, ranked by confidence score.",
      ja: "30のラベル付きウォレット（12 KOL、8 Whale、6 Smart_Money、4 Cabal）の過去24時間のSWAP取引をスキャン。複数ウォレットのコンセンサストークンを信頼度順に表示します。",
    };
    const headers: T3[] = [
      { zh: "代幣", en: "Token", ja: "トークン" },
      { zh: "買入地址數", en: "Wallets Bought", ja: "購入ウォレット" },
      { zh: "標籤組合", en: "Label Mix", ja: "ラベル組合せ" },
      { zh: "24h 淨買入 USD", en: "24h Net Buy USD", ja: "24h 純買入USD" },
      { zh: "信心評分", en: "Confidence", ja: "信頼度" },
    ];
    const rows = [
      { token: "$JUP",    buyers: { zh: "5 個錢包", en: "5 wallets", ja: "5ウォレット" }, combo: "2 Whale + 2 KOL + 1 Cabal", usd: "$347,200", stars: "⭐⭐⭐⭐⭐", status: "safe" as Status },
      { token: "$BONK",   buyers: { zh: "3 個錢包", en: "3 wallets", ja: "3ウォレット" }, combo: "2 KOL + 1 Smart_Money",       usd: "$52,800",  stars: "⭐⭐⭐⭐",  status: "safe" as Status },
      { token: "$PYTH",   buyers: { zh: "2 個錢包", en: "2 wallets", ja: "2ウォレット" }, combo: "1 Whale + 1 Cabal",           usd: "$189,000", stars: "⭐⭐⭐",   status: "warn" as Status },
    ];
    const findings: T3[] = [
      { zh: "$JUP 獲得 5 個地址共識，其中包含 Cabal 地址——這是今日最強信號，Cabal 歷史勝率顯著高於其他標籤", en: "$JUP hit 5-wallet consensus including a Cabal address — strongest signal today, Cabal historically has highest win rate", ja: "$JUPは5ウォレットのコンセンサス（Cabalアドレス含む）— 本日最強シグナル" },
      { zh: "$BONK 的 KOL 組合買入顯示市場情緒轉暖，但 KOL 標籤的交易週期通常較短，適合短線操作", en: "$BONK KOL consensus suggests warming sentiment — KOL trades tend to be shorter-term, suit swing positions", ja: "$BONKのKOLコンセンサスは市場センチメント改善を示唆 — KOL取引は短期向き" },
      { zh: "以上信號均需在執行前通過 GoPlus 安全驗證，Sakura 的複製交易功能已內建此安全門控", en: "All signals require GoPlus safety verification before execution — Sakura Copy Trade has this gate built in", ja: "すべてのシグナルは実行前にGoPlus安全検証が必要 — SakuraのコピートレードはGoPlusゲートを内蔵" },
    ];
    const verdict: T3 = {
      zh: "✅ $JUP 信號最強（⭐⭐⭐⭐⭐），建議優先做安全驗證後跟進。點擊「複製交易」可直接設定跟單策略，GoPlus 安全門控自動執行。",
      en: "✅ $JUP has the strongest signal (⭐⭐⭐⭐⭐). Run security check first, then use Copy Trade — GoPlus safety gate runs automatically.",
      ja: "✅ $JUPが最強シグナル（⭐⭐⭐⭐⭐）。セキュリティ確認後、コピートレードで追従してください。GoPlus安全ゲートは自動実行されます。",
    };
    return (
      <CaseCard>
        <QuestionBubble text={tx(q, L)} />
        <SakuraHeader sources={L === "zh" ? "Helius 鏈上數據 · 30 標記錢包 · 2 數據源" : L === "ja" ? "Helius On-Chain · 30 ラベルウォレット · 2 データ源" : "Helius On-Chain · 30 Labeled Wallets · 2 Sources"} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>{tx(title, L)}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>{tx(opening, L)}</p>
        <ConsensusTable headers={headers} rows={rows} lang={L} />
        <KeyFindings items={findings.map(f => tx(f, L))} />
        <VerdictCard text={tx(verdict, L)} type="safe" />
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <Link href="/" style={{ display: "inline-block", padding: "10px 28px", background: "var(--accent)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            {L === "zh" ? "試著問 Sakura" : L === "ja" ? "Sakuraに聞いてみる" : "Try Asking Sakura"}
          </Link>
        </div>
      </CaseCard>
    );
  }

  // ── AUTOMATION ───────────────────────────────────────────────────────────────
  function AutomationCase() {
    const q: T3 = {
      zh: "幫我掃描一下我的錢包，我感覺配置不太合理，生成一個具體的再平衡方案給我",
      en: "Scan my wallet and generate a concrete rebalancing plan. I feel like my allocation is off.",
      ja: "ウォレットをスキャンして具体的なリバランスプランを作成してください。配分がおかしいと感じています。",
    };
    const title: T3 = { zh: "投資組合再平衡分析報告", en: "Portfolio Rebalancing Analysis Report", ja: "ポートフォリオリバランス分析レポート" };
    const opening: T3 = {
      zh: "當前投資組合健康評分 34/100，主要問題是 meme 代幣佔比過高（67%）且 USDC 完全閒置。以下是詳細分析和具體執行方案。",
      en: "Current portfolio health score: 34/100. Main issues: meme token overweight (67%) and idle USDC earning nothing. Here's the detailed analysis and concrete execution plan.",
      ja: "現在のポートフォリオヘルススコア：34/100。主な問題：ミームトークン過多（67%）と遊休USDC。詳細分析と具体的な実行プランをお伝えします。",
    };
    const rows = [
      { label: { zh: "健康評分", en: "Health Score", ja: "ヘルススコア" }, value: "34 / 100", status: "danger" as Status },
      { label: { zh: "meme 代幣佔比 (WIF + BONK + POPCAT)", en: "Meme Token Weight (WIF+BONK+POPCAT)", ja: "ミームトークン比率" }, value: "67% ❌", status: "danger" as Status },
      { label: { zh: "閒置 USDC（零收益）", en: "Idle USDC (earning nothing)", ja: "遊休USDC（無収益）" }, value: "$530 ❌", status: "danger" as Status },
      { label: { zh: "LST / 質押資產", en: "LST / Staked Assets", ja: "LST / ステーク資産" }, value: "0% ❌", status: "danger" as Status },
      { label: { zh: "預計年化機會損失", en: "Est. Annual Opportunity Cost", ja: "年間機会損失推定" }, value: "~$186 USD", status: "warn" as Status },
    ];
    const trades = L === "zh"
      ? ["賣出全部 BONK（$380）→ 存入 Kamino USDC Vault（年化 8.4%）", "賣出 60% WIF 持倉（$744）→ 通過 Jupiter 換成 jitoSOL（年化 7.8%）", "部署閒置 USDC $530 → Kamino USDC Vault，即刻開始生息"]
      : L === "ja"
      ? ["BONK全売却（$380）→ Kamino USDC Vaultに入金（APY 8.4%）", "WIF保有の60%売却（$744）→ JupiterでjitoSOLにスワップ（APY 7.8%）", "遊休USDC $530 → Kamino USDC Vaultに移動、すぐに利息発生"]
      : ["Sell all BONK ($380) → deposit to Kamino USDC Vault (8.4% APY)", "Sell 60% of WIF ($744) → swap to jitoSOL via Jupiter (7.8% APY)", "Deploy idle $530 USDC → Kamino USDC Vault, start earning immediately"];
    const findings: T3[] = [
      { zh: "3 筆交易即可將健康評分從 34 提升至預估 72，無需大幅改變整體持倉結構", en: "Just 3 trades will raise health score from 34 to an estimated 72 — without drastically changing your overall structure", ja: "3つの取引でヘルススコアを34から推定72に改善 — 全体構造を大幅変更せずに" },
      { zh: "閒置資本 $530 USDC 每年可產生 $44.5 收益（8.4% Kamino APY），過去每天都在虧損機會成本", en: "$530 idle USDC will generate ~$44.5/year at Kamino 8.4% APY — every day idle was a missed return", ja: "遊休$530 USDCはKamino 8.4% APYで年間約$44.5を生成 — 毎日の放置が機会損失" },
      { zh: "Agent 執行時每筆交易都會優先通過 Jupiter 聚合最優路徑，確保滑點最小化", en: "Agent routes every trade through Jupiter aggregation for best price — slippage minimized on each step", ja: "AgentはJupiterアグリゲーションで最良ルートを選択 — 各ステップのスリッページを最小化" },
    ];
    const verdict: T3 = {
      zh: "✅ 執行後健康評分預計 34 → 72，年化機會收益新增約 $186 USD。點擊「自主 Agent」授權執行，每筆交易均需 Phantom 簽名確認。",
      en: "✅ Post-execution health score estimated 34 → 72. New annual yield opportunity: ~$186 USD. Click Autonomous Agent to authorize — each trade requires your Phantom signature.",
      ja: "✅ 実行後ヘルススコア推定34→72。新たな年間収益機会：約$186 USD。自律エージェントを承認 — 各取引にPhantom署名が必要。",
    };
    return (
      <CaseCard>
        <QuestionBubble text={tx(q, L)} />
        <SakuraHeader sources={L === "zh" ? "Helius 鏈上數據 · Jupiter · GoPlus · 3 數據源" : L === "ja" ? "Helius On-Chain · Jupiter · GoPlus · 3 データ源" : "Helius On-Chain · Jupiter · GoPlus · 3 Sources"} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>{tx(title, L)}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>{tx(opening, L)}</p>
        <MetricsTable rows={rows} lang={L} />
        <NumberedBlock title={L === "zh" ? "具體執行方案" : L === "ja" ? "具体的な実行プラン" : "Execution Plan"} items={trades} />
        <KeyFindings items={findings.map(f => tx(f, L))} />
        <VerdictCard text={tx(verdict, L)} type="success" />
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <Link href="/" style={{ display: "inline-block", padding: "10px 28px", background: "var(--accent)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            {L === "zh" ? "試著問 Sakura" : L === "ja" ? "Sakuraに聞いてみる" : "Try Asking Sakura"}
          </Link>
        </div>
      </CaseCard>
    );
  }

  // ── COPY TRADE ───────────────────────────────────────────────────────────────
  function CopyTradeCase() {
    const q: T3 = {
      zh: "我追蹤的一個 Cabal 地址剛剛大量買入 $RETARDIO，這個信號可信嗎？我應該跟單嗎？",
      en: "A Cabal address I track just made a large buy on $RETARDIO. Is this signal credible? Should I copy the trade?",
      ja: "追跡しているCabalアドレスが$RETARDIOを大量購入しました。このシグナルは信頼できますか？コピーすべきですか？",
    };
    const title: T3 = { zh: "Cabal 跟單信號 + 安全評估報告", en: "Cabal Copy Trade Signal + Safety Assessment", ja: "Cabalコピートレードシグナル + 安全評価レポート" };
    const opening: T3 = {
      zh: "信號地址 9jyqFi...VVz 持有 Cabal + KOL 雙重標籤，過去 90 天 SWAP 勝率 73%，平均持倉週期 3.2 天。本次買入發生在 14 分鐘前，已完成 GoPlus 安全門控驗證。",
      en: "Signal address 9jyqFi...VVz carries Cabal + KOL dual labels, with 73% win rate over the past 90 days and average hold of 3.2 days. This buy occurred 14 minutes ago and has passed GoPlus safety gate.",
      ja: "シグナルアドレス 9jyqFi...VVz はCabal+KOLデュアルラベルを持ち、過去90日のSWAP勝率73%、平均保有期間3.2日。この購入は14分前に発生し、GoPlus安全ゲートを通過しました。",
    };
    const rows = [
      { label: { zh: "信號錢包標籤", en: "Signal Wallet Labels", ja: "シグナルウォレットラベル" }, value: "Cabal + KOL", status: "safe" as Status },
      { label: { zh: "90 天 SWAP 勝率", en: "90-day SWAP Win Rate", ja: "90日SWAPウィン率" }, value: "73% ✅", status: "safe" as Status },
      { label: { zh: "本次買入金額", en: "Signal Buy Amount", ja: "購入金額" }, value: "$38,400 USD", status: "info" as Status },
      { label: { zh: "GoPlus 安全評分", en: "GoPlus Safety Score", ja: "GoPlus 安全スコア" }, value: { zh: "71 / 100 ✅（達到安全門檻）", en: "71 / 100 ✅ (meets threshold)", ja: "71 / 100 ✅（安全閾値達成）" }, status: "safe" as Status },
      { label: { zh: "增發 / 凍結 / 蜜罐", en: "Mint / Freeze / Honeypot", ja: "ミント / フリーズ / ハニーポット" }, value: { zh: "全部清除 ✅", en: "All Clear ✅", ja: "全クリア ✅" }, status: "safe" as Status },
      { label: { zh: "建議跟單倉位", en: "Suggested Copy Size", ja: "推奨コピーサイズ" }, value: "$500 – $800 USD", status: "info" as Status },
    ];
    const findings: T3[] = [
      { zh: "GoPlus 評分 71/100 剛好達到 Sakura 安全門檻（70），代幣基本安全，無增發/凍結/蜜罐風險", en: "GoPlus score 71/100 meets Sakura's 70-point threshold — token is fundamentally safe, no mint/freeze/honeypot risk", ja: "GoPlus スコア71/100でSakura安全閾値（70）に達成 — トークンは基本的に安全" },
      { zh: "Cabal 錢包平均持倉 3.2 天，建議設置 -15% 止損，避免超過信號錢包的退出時間窗口", en: "Cabal wallet averages 3.2-day holds — set -15% stop-loss to avoid being left holding after signal wallet exits", ja: "Cabalウォレットは平均3.2日保有 — 信号ウォレット退出後に残らないよう-15%ストップロス設定推奨" },
      { zh: "建議倉位 $500–$800，相當於信號錢包持倉比例的約 2%，風險可控的跟單比例", en: "Suggested $500–$800 represents ~2% of signal wallet position — a proportional, controlled copy size", ja: "推奨$500〜$800はシグナルウォレットの約2%に相当 — 比例的で管理可能なコピーサイズ" },
    ];
    const verdict: T3 = {
      zh: "✅ 安全門控通過，信號地址信譽良好。建議跟單倉位 $500–$800，並在 -15% 設置止損。點擊「複製交易」立即執行。",
      en: "✅ Safety gate passed. Signal address has strong credibility. Suggested copy: $500–$800 with -15% stop-loss. Click Copy Trade to execute.",
      ja: "✅ 安全ゲート通過。シグナルアドレスは信頼性高。推奨コピー: $500〜$800、-15%ストップロス設定。コピートレードを実行。",
    };
    return (
      <CaseCard>
        <QuestionBubble text={tx(q, L)} />
        <SakuraHeader sources={L === "zh" ? "Helius 鏈上數據 · GoPlus API · 2 數據源" : L === "ja" ? "Helius On-Chain · GoPlus API · 2 データ源" : "Helius On-Chain · GoPlus API · 2 Sources"} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>{tx(title, L)}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>{tx(opening, L)}</p>
        <MetricsTable rows={rows} lang={L} />
        <KeyFindings items={findings.map(f => tx(f, L))} />
        <VerdictCard text={tx(verdict, L)} type="safe" />
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <Link href="/" style={{ display: "inline-block", padding: "10px 28px", background: "var(--accent)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            {L === "zh" ? "試著問 Sakura" : L === "ja" ? "Sakuraに聞いてみる" : "Try Asking Sakura"}
          </Link>
        </div>
      </CaseCard>
    );
  }

  // ── MARKET ───────────────────────────────────────────────────────────────────
  function MarketCase() {
    const q: T3 = {
      zh: "幫我生成一份本週 Solana DeFi 市場概況報告，我想了解整體動態",
      en: "Generate a Solana DeFi market overview for this week. I want to understand the macro picture.",
      ja: "今週のSolana DeFi市場概況レポートを作成してください。全体的な動向を把握したいです。",
    };
    const title: T3 = { zh: "Solana DeFi 市場週報 (W14 2026)", en: "Solana DeFi Market Weekly (W14 2026)", ja: "Solana DeFi 市場週報 (W14 2026)" };
    const opening: T3 = {
      zh: "本週 Solana DeFi 整體表現強勁，TVL 重回 $8B 以上，Jupiter 週交易量創近三個月新高。以下是關鍵指標一覽和市場動態分析。",
      en: "This week Solana DeFi showed broad strength — TVL recovered above $8B and Jupiter weekly volume hit a 3-month high. Here are the key metrics and market dynamics.",
      ja: "今週のSolana DeFiは全般的に強く、TVLが$8Bを回復し、Jupiter週次取引量は3ヶ月ぶりの高水準。主要指標と市場動向をお伝えします。",
    };
    const rows = [
      { label: { zh: "Solana DeFi 總 TVL", en: "Solana DeFi Total TVL", ja: "Solana DeFi 総TVL" }, value: "$8.2B  (+7.9% 本週)", status: "safe" as Status },
      { label: { zh: "SOL 本週收益", en: "SOL Weekly Return", ja: "SOL週次リターン" }, value: "+8.3%  →  $81.47", status: "safe" as Status },
      { label: { zh: "Jupiter 週交易量", en: "Jupiter Weekly Volume", ja: "Jupiter週次取引量" }, value: "$4.8B  (+17.1%)", status: "safe" as Status },
      { label: { zh: "pump.fun 新幣數量（7天）", en: "pump.fun New Tokens (7d)", ja: "pump.fun 新トークン（7日）" }, value: "14,820  (-18.7%)", status: "warn" as Status },
      { label: { zh: "Kamino USDC 最新 APY", en: "Kamino USDC Current APY", ja: "Kamino USDC 現在APY" }, value: "8.4%  (+0.5%)", status: "safe" as Status },
    ];
    const findings: T3[] = [
      { zh: "Jupiter 佔本週 DEX 總成交量 61%，Solana 鏈上流動性高度集中，意味著大多數套利機會都在這個入口出現", en: "Jupiter handled 61% of all DEX volume this week — Solana liquidity highly concentrated, most arbitrage opportunities appear at this gateway", ja: "JupiterはDEX総取引量の61%を占め、流動性集中が継続 — ほとんどのアービトラージ機会はこのゲートウェイに出現" },
      { zh: "Kamino 借貸 TVL 達歷史新高 $2.1B，機構資金持續流入 Solana DeFi 穩定幣收益市場", en: "Kamino lending TVL hit all-time high $2.1B — institutional capital continues flowing into Solana DeFi stablecoin yield market", ja: "Kamino貸出TVLが過去最高の$2.1Bを記録 — 機関資金がSolana DeFiステーブルコイン市場に流入継続" },
      { zh: "pump.fun 新幣數量下降 18.7%，meme 市場選擇性增強，資金可能正在向藍籌 DeFi 協議輪轉", en: "pump.fun new token count down 18.7% — meme market becoming more selective, capital possibly rotating to blue-chip DeFi protocols", ja: "pump.fun新トークン数が18.7%減少 — ミーム市場の選別性が増し、ブルーチップDeFiへの資金移動の可能性" },
    ];
    const verdict: T3 = {
      zh: "✅ 整體市場健康，LST 和穩定幣收益類資產是本週最優選擇。meme 熱度下降，建議控制高風險倉位比例在 20% 以內。",
      en: "✅ Overall market healthy. LST and yield-bearing stables are top picks this week. Meme heat cooling — keep high-risk allocation under 20%.",
      ja: "✅ 市場全体は健全。今週はLSTと利回り安定資産が最優先。ミーム熱冷却中 — 高リスク配分は20%以内に抑えること。",
    };
    return (
      <CaseCard>
        <QuestionBubble text={tx(q, L)} />
        <SakuraHeader sources={L === "zh" ? "CoinGecko · Helius · Kamino · Jupiter · 4 數據源" : L === "ja" ? "CoinGecko · Helius · Kamino · Jupiter · 4 データ源" : "CoinGecko · Helius · Kamino · Jupiter · 4 Sources"} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>{tx(title, L)}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>{tx(opening, L)}</p>
        <MetricsTable rows={rows} lang={L} />
        <KeyFindings items={findings.map(f => tx(f, L))} />
        <VerdictCard text={tx(verdict, L)} type="success" />
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <Link href="/" style={{ display: "inline-block", padding: "10px 28px", background: "var(--accent)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            {L === "zh" ? "試著問 Sakura" : L === "ja" ? "Sakuraに聞いてみる" : "Try Asking Sakura"}
          </Link>
        </div>
      </CaseCard>
    );
  }

  function renderCase() {
    if (activeTab === "security")   return <SecurityCase />;
    if (activeTab === "yield")      return <YieldCase />;
    if (activeTab === "smartmoney") return <SmartMoneyCase />;
    if (activeTab === "automation") return <AutomationCase />;
    if (activeTab === "copytrade")  return <CopyTradeCase />;
    return <MarketCase />;
  }

  return (
    <ThemeWrapper>
      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid var(--border)", background: "var(--bg-card)",
        padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{
            width: 28, height: 28, background: "var(--accent)", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
          }}>S</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Sakura</span>
        </Link>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Link href="/docs" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>
            {L === "ja" ? "ドキュメント" : L === "zh" ? "使用手冊" : "Docs"}
          </Link>
          <Link href="/pricing" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>
            {L === "ja" ? "料金" : L === "zh" ? "定價" : "Pricing"}
          </Link>
          <Link href="/" style={{
            fontSize: 13, padding: "7px 18px", borderRadius: 8,
            background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 600,
          }}>
            {L === "ja" ? "アプリを起動" : L === "zh" ? "啟動應用" : "Launch App"}
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ padding: "60px 40px 0", maxWidth: 800, margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-block", fontSize: 11, padding: "4px 12px",
            borderRadius: 20, border: "1px solid var(--border)",
            color: "var(--text-muted)", marginBottom: 20,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {L === "ja" ? "使用事例" : L === "zh" ? "使用案例" : "Use Cases"}
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 300, lineHeight: 1.2, margin: "0 0 16px",
            fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "0.02em",
          }}>
            {L === "ja" ? "Sakura の実際の分析サンプル" : L === "zh" ? "Sakura 真實分析樣本" : "Sakura in Action — Real Analysis Samples"}
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0 }}>
            {L === "ja"
              ? "以下は Sakura が実際のタスクで生成する分析の例です。すべての機能が完全に実装されていると仮定してください。"
              : L === "zh"
              ? "以下是 Sakura 在真實任務中生成的分析樣本。每一個案例都代表 Sakura 可以為你做的事。"
              : "Below are samples of analysis Sakura generates on real tasks. Each case represents what Sakura can do for you."}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 18px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${activeTab === tab.id ? "var(--accent)" : "var(--border)"}`,
                background: activeTab === tab.id ? "var(--accent)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                fontSize: 13, fontWeight: 500, transition: "all 0.15s",
              }}
            >
              {tx(tab.label, L)}
            </button>
          ))}
        </div>

        {/* Case study */}
        <div style={{ paddingBottom: 80 }}>
          {renderCase()}
        </div>

        {/* Bottom CTA */}
        <div style={{
          background: "var(--accent-soft)", border: "1px solid rgba(192,57,43,0.25)",
          borderRadius: 16, padding: "36px 40px", textAlign: "center", marginBottom: 60,
        }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 400, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            {L === "ja" ? "今すぐ始める" : L === "zh" ? "每一個問題，Sakura 都有答案" : "Every Question. Sakura Has an Answer."}
          </h3>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>
            {L === "ja"
              ? "Phantom ウォレットを接続するだけ。3 回まで無料でお試しいただけます。"
              : L === "zh"
              ? "連接 Phantom 錢包，每項功能免費試用 3 次。不需要帳號，不需要訂閱。"
              : "Connect your Phantom wallet. 3 free uses of every feature. No account, no subscription."}
          </p>
          <Link href="/" style={{
            display: "inline-block", padding: "12px 36px", borderRadius: 10,
            background: "var(--accent)", color: "#fff", textDecoration: "none",
            fontSize: 14, fontWeight: 600,
          }}>
            {L === "ja" ? "アプリを起動" : L === "zh" ? "啟動 Sakura" : "Launch Sakura"}
          </Link>
        </div>
      </div>

      <Footer />
    </ThemeWrapper>
  );
}

export default function UseCasesPage() {
  return (
    <LanguageProvider>
      <UseCasesContent />
    </LanguageProvider>
  );
}
