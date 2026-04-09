"use client";

import Link from "next/link";
import Footer from "@/components/Footer";

const SECTIONS = [
  {
    id: "nonce-guardian",
    badge: "DURABLE NONCE GUARDIAN",
    badgeColor: "#FF4444",
    title: "🛡️ Nonce Guardian",
    subtitle: "主動式 Durable Nonce 安全審計",
    intro:
      "Nonce Guardian 是業界首個專為 Solana Durable Nonce 攻擊向量設計的主動安全協議。2026 年 4 月 1 日 $2.85 億 Drift 攻擊利用的正是 Durable Nonce 的永久有效性，使攻擊者可在任意時間提交預先簽名的交易。Nonce Guardian 以攻擊者所用的相同 RPC 原語反守為攻。",
    steps: [
      {
        step: "1",
        title: "連接錢包或輸入地址",
        desc: "無需創建帳號。輸入任意 Solana 公鑰地址即可立即開始掃描——唯讀存取，不請求任何簽名或轉帳授權。",
      },
      {
        step: "2",
        title: "免費鏈上掃描",
        desc: "後端以 getProgramAccounts(SystemProgram, { filters: [{ dataSize: 80 }, { memcmp: { offset: 8, bytes: walletAddress } }] }) 掃描所有關聯 Durable Nonce 賬戶。每個 80-byte nonce 結構體的 offset 8 解析出 authority pubkey，與您的地址比對。",
      },
      {
        step: "3",
        title: "支付 $1.00 USDC 解鎖 AI 報告",
        desc: "基礎掃描結果立即展示。如需完整 AI 風險分析，透過 x402 協議（HTTP 402 Payment Required）支付 $1.00 USDC。支付在 Phantom 錢包內完成，Sakura 不持有您的資產。",
      },
      {
        step: "4",
        title: "SHA-256 鏈上存證",
        desc: "Claude Sonnet 生成完整中文風險報告後，報告內容的 SHA-256 哈希透過 Solana Memo Program 永久上鏈。任何人持 tx signature 可在 Solscan 獨立驗證 AI 報告的真實性與完整性。",
      },
    ],
    risks: [
      { level: "🚨 極高風險", color: "#FF4444", desc: "Authority 非本人控制——nonce 賬戶已被劫持，存在永久有效簽名交易可被提交的風險" },
      { level: "⚠️ 高風險", color: "#FF8C00", desc: "發現多個高權限 nonce 賬戶但 authority 一致——攻擊面廣" },
      { level: "⚡ 中風險", color: "#FFD700", desc: "Nonce 賬戶存在但未被積極監控" },
      { level: "✓ 低風險", color: "#34C759", desc: "未發現 Durable Nonce 賬戶或 authority 完全由本人控制" },
    ],
  },
  {
    id: "ghost-run",
    badge: "GHOST RUN — STRATEGY SIMULATOR",
    badgeColor: "#7C6FFF",
    title: "👻 Ghost Run",
    subtitle: "多步 DeFi 策略幽靈執行引擎",
    intro:
      "Ghost Run 是全球首個利用 Solana 原生 simulateTransaction 對多步跨協議 DeFi 策略進行完整預執行的產品。在您授權任何一筆交易前，Ghost Run 已在真實鏈上狀態下完整演練整個策略，返回精確 token delta、gas 消耗、衝突檢測，讓「所見即所得」成為 DeFi 執行的新標準。",
    steps: [
      {
        step: "1",
        title: "自然語言輸入策略",
        desc: "以中文、英文或日文描述您的 DeFi 計劃。例：「質押 3 SOL 到 Marinade，同時把 50 USDC 存入 Kamino 賺取利息」。無需了解任何合約地址或 ABI。",
      },
      {
        step: "2",
        title: "Claude AI 解析與交易構建",
        desc: "Claude Sonnet 解析自然語言，識別協議（Marinade / Kamino / Jito / Jupiter）、操作類型與金額。系統以 @solana/web3.js 直接構建未簽名交易——不依賴 SAK，因 SAK 不暴露未簽名交易構建介面。",
      },
      {
        step: "3",
        title: "simulateTransaction 幽靈執行",
        desc: "每筆構建好的交易以 connection.simulateTransaction(tx, { sigVerify: false }) 在真實主網狀態下執行。返回精確 token delta（例：您將收到 2.994 mSOL）、lamport 消耗、執行日誌及任何潛在錯誤。",
      },
      {
        step: "4",
        title: "確認後 SAK 一鍵上鏈",
        desc: "預覽結果滿意後點擊「確認執行」。SAK stakeWithJup() / lendAsset() 真正執行交易並廣播至主網。執行憑證透過 Solana Memo Program 永久上鏈。執行費 0.3%（較 Phantom 低 65%），僅在執行時收取。",
      },
    ],
    risks: [],
  },
  {
    id: "liquidation-shield",
    badge: "LIQUIDATION SHIELD — ACTIVE MONITORING",
    badgeColor: "#FF4444",
    title: "⚡ Liquidation Shield",
    subtitle: "跨協議 AI 清算救援協議",
    intro:
      "Solana 借貸市場 TVL 超過 $40 億。劇烈行情下，Kamino / MarginFi / Solend 倉位健康因子可在數秒內從安全區間跌破 1.0，觸發全額清算——損失通常達抵押品的 5–10%。Liquidation Shield 是業界首個跨協議、有預授權硬性上限的 AI 主動救援協議。",
    steps: [
      {
        step: "1",
        title: "設定救援參數",
        desc: "輸入「最大救援金額（USDC）」與「觸發健康因子閾值」。系統以 SPL Token Approve 指令在 token program 層面硬性鎖定授權上限——AI 絕無可能超出您設定的金額執行任何操作，這是 token program 強制執行的硬約束，非軟約束。",
      },
      {
        step: "2",
        title: "掃描借貸倉位",
        desc: "getProgramAccounts 掃描 Kamino / MarginFi / Solend 的借貸倉位健康因子（Health Factor）。掃描完全免費。健康因子 < 1.05（可自定義）時進入救援模式。",
      },
      {
        step: "3",
        title: "simulateTransaction 精確預演",
        desc: "@solana/web3.js 構建還款交易，simulateTransaction 精確計算：還款後健康因子恢復值、所需 USDC 金額、gas 消耗。所有數字精確到小數點後三位，基於真實鏈上狀態。",
      },
      {
        step: "4",
        title: "SAK 自動執行救援",
        desc: "在預授權範圍內，SAK lendAsset() 執行還款，將健康因子恢復至安全區間。Solana Memo Program 寫入完整審計鏈：rescue mandate tx（含 rescueId）→ execution tx（引用 rescueId）。救援成功後收取 1% 服務費——遠低於清算損失的 5–10%。",
      },
    ],
    risks: [],
  },
];

export default function DocsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 24px 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <Link href="/" style={{
            fontSize: 12, color: "var(--text-muted)", textDecoration: "none",
            letterSpacing: "0.08em", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24,
          }}>
            ← 返回首頁
          </Link>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--accent-soft)", border: "1px solid var(--accent-mid)",
            borderRadius: 20, padding: "4px 14px", marginBottom: 20, display: "block",
          }}>
            <span style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", fontFamily: "var(--font-mono)" }}>
              DOCUMENTATION
            </span>
          </div>
          <h1 style={{
            fontSize: 32, fontWeight: 300, letterSpacing: "0.06em",
            fontFamily: "var(--font-heading)", marginBottom: 12,
          }}>
            Sakura 使用手冊
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.9, maxWidth: 580 }}>
            三個 Solana 原生 AI 協議的完整操作指南：Nonce Guardian、Ghost Run、Liquidation Shield。
            每個功能均圍繞 Solana 獨有的技術能力構建——無鏈上等效競品。
          </p>
        </div>

        {/* TOC */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "20px 24px", marginBottom: 48,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.12em", marginBottom: 14, fontFamily: "var(--font-mono)" }}>
            目錄
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{
                fontSize: 13, color: "var(--accent)", textDecoration: "none", letterSpacing: "0.03em",
              }}>
                {s.title} — {s.subtitle}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map((s, si) => (
          <section key={s.id} id={s.id} style={{ marginBottom: 64 }}>
            {/* Section header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: `${s.badgeColor}14`, border: `1px solid ${s.badgeColor}40`,
                borderRadius: 20, padding: "4px 12px", marginBottom: 14,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.badgeColor, display: "inline-block" }} />
                <span style={{ fontSize: 10, color: s.badgeColor, letterSpacing: "0.12em", fontFamily: "var(--font-mono)" }}>
                  {s.badge}
                </span>
              </div>
              <h2 style={{
                fontSize: 24, fontWeight: 300, fontFamily: "var(--font-heading)",
                letterSpacing: "0.06em", marginBottom: 6,
              }}>
                {s.title}
              </h2>
              <div style={{ fontSize: 13, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 14 }}>
                {s.subtitle}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.9, maxWidth: 640 }}>
                {s.intro}
              </p>
            </div>

            {/* Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              {s.steps.map((step) => (
                <div key={step.step} style={{
                  background: "var(--bg-card)", padding: "18px 22px",
                  display: "flex", gap: 16, alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: `${s.badgeColor}18`, border: `1px solid ${s.badgeColor}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: s.badgeColor,
                    fontFamily: "var(--font-mono)",
                  }}>
                    {step.step}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6, letterSpacing: "0.03em" }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.85 }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Risk levels (Nonce Guardian only) */}
            {s.risks.length > 0 && (
              <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "18px 22px",
              }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 14, fontFamily: "var(--font-mono)" }}>
                  風險等級說明
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {s.risks.map(r => (
                    <div key={r.level} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, color: r.color, fontWeight: 600, minWidth: 90, flexShrink: 0 }}>{r.level}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {si < SECTIONS.length - 1 && (
              <div style={{ borderBottom: "1px solid var(--border)", marginTop: 48 }} />
            )}
          </section>
        ))}

        {/* Fee summary */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderTop: "2px solid var(--gold)", borderRadius: 10, padding: "24px 28px",
          marginBottom: 48,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.12em", marginBottom: 16, fontFamily: "var(--font-mono)" }}>
            費用總覽
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {[
              { feature: "🛡️ Nonce Guardian", free: "掃描免費", paid: "AI 報告 $1.00 USDC（x402）" },
              { feature: "👻 Ghost Run", free: "模擬免費", paid: "執行費 0.3%（Jupiter Platform Fee）" },
              { feature: "⚡ Liquidation Shield", free: "監控免費", paid: "救援成功費 1%（SPL Transfer）" },
            ].map(f => (
              <div key={f.feature} style={{ background: "var(--bg-base)", padding: "16px 18px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>{f.feature}</div>
                <div style={{ fontSize: 11, color: "var(--green)", marginBottom: 4 }}>✓ {f.free}</div>
                <div style={{ fontSize: 11, color: "var(--gold)" }}>★ {f.paid}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
          有問題？聯繫我們：
          <a href="https://x.com/sakuraaijp" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--accent)", marginLeft: 6, textDecoration: "none" }}>
            𝕏 @sakuraaijp
          </a>
        </div>
      </div>
      <Footer />
    </main>
  );
}
