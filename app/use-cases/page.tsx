"use client";

import Link from "next/link";
import Footer from "@/components/Footer";

const USE_CASES = [
  {
    id: "uc-nonce",
    feature: "🛡️ Nonce Guardian",
    featureColor: "#FF4444",
    badge: "DURABLE NONCE GUARDIAN",
    cases: [
      {
        title: "我的錢包有被 Durable Nonce 攻擊的風險嗎？",
        persona: "DeFi 重度用戶",
        context:
          "2026 年 4 月 1 日，Drift 協議遭受 $2.85 億美元攻擊，攻擊者利用 Durable Nonce 的「永久有效簽名」特性，在 nonce 賬戶 authority 被劫持後的數月後才提交已預先簽名的惡意交易。許多用戶不知道自己錢包中存在高風險 nonce 賬戶。",
        outcome:
          "用戶輸入錢包地址，Nonce Guardian 在 3 秒內掃描所有關聯 nonce 賬戶，發現 1 個 authority 非本人控制的高風險帳戶。Claude AI 生成中文報告，精確指出風險來源。SHA-256 報告哈希永久記錄在 Solana 鏈上——用戶有不可篡改的安全審計記錄。",
        tag: "安全審計",
      },
      {
        title: "機構資產安全合規：定期 Nonce 風險審計",
        persona: "加密資產機構 / DAO 財庫管理",
        context:
          "機構帳戶通常持有多個 Durable Nonce 賬戶用於離線批量交易簽名。合規要求定期進行安全審計並保存可驗證的審計記錄。",
        outcome:
          "每週掃描一次，支付 $1 USDC 生成 AI 安全報告，報告的 SHA-256 哈希上鏈存證。累積的鏈上 tx signatures 構成完整的合規審計鏈，可供外部審計師在 Solscan 獨立驗證。",
        tag: "合規存證",
      },
    ],
  },
  {
    id: "uc-ghost",
    feature: "👻 Ghost Run",
    featureColor: "#7C6FFF",
    badge: "GHOST RUN",
    cases: [
      {
        title: "在不損失資金的前提下，了解複雜 DeFi 策略的精確結果",
        persona: "中階 DeFi 用戶",
        context:
          "用戶想同時完成：將 5 SOL 質押到 Marinade 賺取 mSOL，並將 100 USDC 存入 Kamino 賺取借貸利息。但不確定精確能收到多少 mSOL、gas 費用是多少、兩步之間是否有衝突。",
        outcome:
          "輸入自然語言描述後，Ghost Run 在 2 秒內完成幽靈執行：「您將收到 4.992 mSOL（APY 7.2% = 年化 +$21.3）；Kamino 存款將獲 kUSDC 收益憑證（APY 8.1% = 年化 +$8.1）；總 gas：0.000048 SOL；兩步無衝突，可安全執行。」確認後 SAK 一鍵執行，執行費 0.3%。",
        tag: "收益優化",
      },
      {
        title: "跨協議套利策略預驗——避免因 slippage 或路由失敗損失資金",
        persona: "進階 DeFi 交易員",
        context:
          "交易員設計了複雜的多步套利路徑：Jupiter 換倉 → Jito 質押 → Kamino 借貸循環。每步操作都有 slippage 風險與時序依賴，真實執行前無從得知精確盈利。",
        outcome:
          "Ghost Run 依序幽靈執行三步策略，返回每步精確 token delta 與累計 gas 消耗，並標記步驟 2→3 存在 slippage 衝突（kUSDC 收益憑證不可直接用於步驟 3 的借貸抵押）。用戶在不損失一分錢的情況下發現策略缺陷並調整。",
        tag: "風險前置",
      },
    ],
  },
  {
    id: "uc-shield",
    feature: "⚡ Liquidation Shield",
    featureColor: "#FF9F0A",
    badge: "LIQUIDATION SHIELD",
    cases: [
      {
        title: "行情急跌時，AI 在清算前自動救援 Kamino 倉位",
        persona: "Kamino 借貸用戶",
        context:
          "用戶在 Kamino 以 10 SOL 作抵押借出 $800 USDC，健康因子維持在 1.35。某個週末 SOL 突然下跌 20%，健康因子在 2 小時內從 1.35 跌至 1.03，逼近清算線（HF < 1.0），若被清算將損失約 $80–$160（5–10% 清算罰款）。",
        outcome:
          "Liquidation Shield 觸發預設閾值（HF < 1.05）。simulateTransaction 預演：還款 $600 USDC 可將 HF 恢復至 1.42。SPL Token Approve 確認授權範圍內（用戶預授權最多 $1000 USDC）。SAK lendAsset() 在 400ms 內完成還款。收取 1% 服務費（$6 USDC），相較 $80–$160 清算損失節省 92%。",
        tag: "清算防護",
      },
      {
        title: "跨協議倉位統一監控——Kamino + MarginFi 同時保護",
        persona: "多協議 DeFi 用戶",
        context:
          "進階用戶同時在 Kamino 和 MarginFi 持有借貸倉位，分散風險。但管理兩個協議的健康因子需要不斷切換介面，且兩者沒有統一的警報機制。",
        outcome:
          "Liquidation Shield 同時監控兩個協議的所有倉位，統一顯示健康因子儀表板。用戶一次設定預授權上限，AI 根據優先級（健康因子最低者優先）自動分配救援資源。Memo Program 為每個協議的救援操作分別寫入審計記錄，可逐筆追溯。",
        tag: "跨協議管理",
      },
      {
        title: "預授權上限保護：確保 AI 絕不超出您的授權範圍",
        persona: "謹慎型 DeFi 用戶",
        context:
          "用戶擔心授權 AI 自動執行交易會失控——如果 AI 判斷錯誤，可能動用超出預期的資金執行不必要的操作。",
        outcome:
          "SPL Token Approve 在 token program 層面設定硬性上限（例：最多 $500 USDC）。這是 Solana token program 強制執行的合約級約束，而非 Sakura 的軟性承諾——即使 Sakura 服務端出現任何問題，超出授權的轉帳在鏈上層面就會被拒絕。用戶在 Solscan 可查看授權記錄與所有執行記錄的完整鏈上審計鏈。",
        tag: "安全授權",
      },
    ],
  },
];

export default function UseCasesPage() {
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
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", fontFamily: "var(--font-mono)" }}>
              USE CASES
            </span>
          </div>
          <h1 style={{
            fontSize: 32, fontWeight: 300, letterSpacing: "0.06em",
            fontFamily: "var(--font-heading)", marginBottom: 12,
          }}>
            Sakura 使用案例
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.9, maxWidth: 580 }}>
            真實場景下，Nonce Guardian、Ghost Run、Liquidation Shield 如何保護 Solana 用戶的鏈上資產。
            每個案例基於 Solana 主網真實發生的事件與普遍的 DeFi 使用模式。
          </p>
        </div>

        {/* Use case sections */}
        {USE_CASES.map((section, si) => (
          <section key={section.id} id={section.id} style={{ marginBottom: 64 }}>
            {/* Feature header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${section.featureColor}18`,
                border: `1px solid ${section.featureColor}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>
                {section.feature.slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 11, color: section.featureColor, letterSpacing: "0.12em", fontFamily: "var(--font-mono)", marginBottom: 2 }}>
                  {section.badge}
                </div>
                <div style={{ fontSize: 18, fontWeight: 300, fontFamily: "var(--font-heading)", letterSpacing: "0.05em" }}>
                  {section.feature}
                </div>
              </div>
            </div>

            {/* Cases */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {section.cases.map((c, ci) => (
                <div key={ci} style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderLeft: `3px solid ${section.featureColor}`,
                  borderRadius: 10, padding: "22px 24px",
                }}>
                  {/* Tag + Title */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{
                      fontSize: 10, color: section.featureColor,
                      background: `${section.featureColor}14`,
                      border: `1px solid ${section.featureColor}30`,
                      borderRadius: 4, padding: "2px 8px",
                      letterSpacing: "0.08em", fontFamily: "var(--font-mono)",
                    }}>
                      {c.tag}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                      {c.persona}
                    </span>
                  </div>
                  <h3 style={{
                    fontSize: 15, fontWeight: 500, color: "var(--text-primary)",
                    letterSpacing: "0.03em", marginBottom: 14, lineHeight: 1.5,
                  }}>
                    {c.title}
                  </h3>

                  {/* Context + Outcome */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{
                      background: "var(--bg-base)", borderRadius: 8, padding: "14px 16px",
                    }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                        情境
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.85 }}>
                        {c.context}
                      </div>
                    </div>
                    <div style={{
                      background: `${section.featureColor}08`,
                      border: `1px solid ${section.featureColor}20`,
                      borderRadius: 8, padding: "14px 16px",
                    }}>
                      <div style={{ fontSize: 10, color: section.featureColor, letterSpacing: "0.1em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                        Sakura 的解決方案
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.85 }}>
                        {c.outcome}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {si < USE_CASES.length - 1 && (
              <div style={{ borderBottom: "1px solid var(--border)", marginTop: 48 }} />
            )}
          </section>
        ))}

        {/* CTA */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderTop: "2px solid var(--accent)", borderRadius: 10,
          padding: "28px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 400, color: "var(--text-primary)", marginBottom: 8, fontFamily: "var(--font-heading)", letterSpacing: "0.05em" }}>
            立即體驗三大功能
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.7 }}>
            掃描、模擬、監控均完全免費——僅在執行時收取費用
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{
              display: "inline-block",
              background: "var(--accent)", color: "#fff",
              borderRadius: 8, padding: "10px 24px",
              fontSize: 13, fontWeight: 500, textDecoration: "none",
              letterSpacing: "0.06em",
            }}>
              👻 連接 Phantom →
            </Link>
            <Link href="/" style={{
              display: "inline-block",
              background: "#1a1a2e", color: "#fff",
              border: "1px solid #4a4aff",
              borderRadius: 8, padding: "10px 24px",
              fontSize: 13, fontWeight: 500, textDecoration: "none",
              letterSpacing: "0.06em",
            }}>
              ◈ Connect OKX →
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
