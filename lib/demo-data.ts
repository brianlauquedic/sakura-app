/**
 * Demo Mode — Preset data for ?demo=true
 *
 * Returns visually compelling, realistic-looking data for each feature.
 * Used for hackathon demo recordings. Never affects real users.
 * All text supports three languages: zh (繁體中文), en (English), ja (日本語).
 */

export type Lang = "zh" | "en" | "ja";

/** Pick text for current language, fallback to zh */
function pick(texts: Record<Lang, string>, lang: Lang): string {
  return texts[lang] ?? texts.zh;
}

// ── Nonce Guardian Demo ───────────────────────────────────────────────────────

const NONCE_RISK_SIGNALS = [
  {
    type: "foreign_authority" as const,
    severity: "critical" as const,
    description: {
      zh: "Nonce 帳戶 7xKXtg...gAsU 的控制權不屬於您的錢包。攻擊者可隨時用此 Nonce 執行預簽名惡意交易，無需您的知情或同意。這是 2026 年 4 月 Drift $285M 攻擊的相同手法。",
      en: "Nonce account 7xKXtg...gAsU is controlled by a foreign authority — not your wallet. An attacker can execute pre-signed malicious transactions at any time without your knowledge. This is the same technique used in the April 2026 Drift $285M exploit.",
      ja: "Nonce アカウント 7xKXtg...gAsU の制御権があなたのウォレットに属していません。攻撃者はこの Nonce を使って、あなたの知らないうちに事前署名された悪意ある取引をいつでも実行できます。これは 2026 年 4 月の Drift $285M 攻撃と同じ手法です。",
    },
    address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  },
  {
    type: "fresh_account" as const,
    severity: "high" as const,
    description: {
      zh: "Nonce 帳戶 9pQzLb...wXm 的授權地址是一個 3 天前才創建的新錢包，擁有 0.05 SOL gas 費用，具有典型的一次性攻擊者地址特徵。",
      en: "Nonce account 9pQzLb...wXm is authorized by a wallet created just 3 days ago with 0.05 SOL for gas — a typical disposable attacker address pattern.",
      ja: "Nonce アカウント 9pQzLb...wXm の認可アドレスは 3 日前に作成された新しいウォレットで、0.05 SOL のガス代を持つ典型的な使い捨て攻撃者アドレスの特徴があります。",
    },
    address: "9pQzLbTcE4vYqRdUoGnWsHjK3mVpQAZnjh12Rqp8wXm",
  },
];

const NONCE_AI_ANALYSIS = {
  zh: `🚨 **高危警報：偵測到 1 個 CRITICAL 風險、1 個 HIGH 風險**

**CRITICAL — 外部控制的 Nonce 帳戶**
帳戶 \`7xKXtg...gAsU\` 的 authority 為 \`Hacker9q...V5w\`，**不屬於您的錢包**。這意味著攻擊者現在就可以使用這個 Nonce 帳戶執行任意預簽名交易，包括轉走您帳戶中的所有資產，且該交易永遠有效、不會過期。

**這與 2026 年 4 月 Drift 協議 $285M 攻擊手法完全一致。**

**HIGH — 可疑的新創授權地址**
另一個 Nonce 帳戶的 authority 是一個僅 3 天前創建的新錢包，持有少量 SOL（攻擊 gas 費）。這是典型的一次性攻擊者地址特徵。

**立即行動建議：**
1. 將您的 SOL 和 SPL 代幣轉移到全新的錢包地址
2. 撤銷 \`7xKXtg...gAsU\` 的 Nonce 帳戶授權
3. 在轉移完成前，不要進行任何交易簽名

風險評分：**94/100（極高危）**`,

  en: `🚨 **High-Risk Alert: 1 CRITICAL and 1 HIGH risk detected**

**CRITICAL — Foreign-Controlled Nonce Account**
Account \`7xKXtg...gAsU\` has authority \`Hacker9q...V5w\`, which is **not your wallet**. This means an attacker can use this Nonce account to execute any pre-signed transaction at any time — including draining all assets from your wallet. The transaction never expires.

**This is the exact same technique used in the April 2026 Drift protocol $285M exploit.**

**HIGH — Suspicious Newly-Created Authority**
Another Nonce account's authority is a wallet created only 3 days ago, holding a small amount of SOL (gas for the attack). This is a textbook disposable attacker address.

**Immediate Actions:**
1. Transfer all SOL and SPL tokens to a brand-new wallet address
2. Revoke the Nonce account authorization for \`7xKXtg...gAsU\`
3. Do not sign any transactions until the transfer is complete

Risk Score: **94/100 (Extreme)**`,

  ja: `🚨 **高危険警報：CRITICAL リスク 1 件、HIGH リスク 1 件を検出**

**CRITICAL — 外部制御の Nonce アカウント**
アカウント \`7xKXtg...gAsU\` の authority は \`Hacker9q...V5w\` で、**あなたのウォレットではありません**。攻撃者はこの Nonce アカウントを使って、あなたのウォレットの全資産を含む任意の事前署名取引をいつでも実行できます。この取引は期限切れになりません。

**これは 2026 年 4 月の Drift プロトコル $285M 攻撃と全く同じ手法です。**

**HIGH — 不審な新規作成された認可アドレス**
別の Nonce アカウントの authority は、わずか 3 日前に作成され、少額の SOL（攻撃用ガス代）を保持するウォレットです。典型的な使い捨て攻撃者アドレスのパターンです。

**即時対応：**
1. すべての SOL と SPL トークンを新しいウォレットアドレスに転送
2. \`7xKXtg...gAsU\` の Nonce アカウント認可を取り消す
3. 転送完了まで一切の取引署名を行わない

リスクスコア：**94/100（極めて危険）**`,
};

export function getDemoNonceResult(lang: Lang = "zh") {
  return {
    accounts: [
      {
        address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        authority: "Hacker9qLzYmXkRdJmFGzNLvqBmHg4gJXe3K1mQ7pV5w",
        nonce: "AZnjh12Rqp9wXmK8vP2LbTcE4qYsDfUoGnWsHjK3mVpQ",
        lamports: 1447680,
        isOwned: false,
      },
      {
        address: "3mFgHjK9pQzXnWsLbTcE2vYqRdUoGnWsHjK3mVpQAZ",
        authority: "Goc5kAMb9NTXjobxzZogAWaHwajmQjw7CdmATWJN1mQh",
        nonce: "BmNjK23Sqp8wXmL9vP3LbTcF5qZsDgVpHnWtIkL4nWqR",
        lamports: 1447680,
        isOwned: true,
      },
      {
        address: "9pQzLbTcE4vYqRdUoGnWsHjK3mVpQAZnjh12Rqp8wXm",
        authority: "FreshWa11etCreated3DaysAgo8xKjP2mQ5vZnLbTcE4",
        nonce: "CnOkL34Trq9xYnM0wQ4McUdG6rAuEhWqJoXuJlM5oXrS",
        lamports: 1447680,
        isOwned: false,
      },
    ],
    riskSignals: NONCE_RISK_SIGNALS.map(s => ({
      ...s,
      description: pick(s.description, lang),
    })),
    scannedAt: Date.now(),
    aiAnalysis: pick(NONCE_AI_ANALYSIS, lang),
  };
}

// Keep backward-compatible export (zh default)
export const DEMO_NONCE_RESULT = getDemoNonceResult("zh");

// ── Ghost Run Demo ────────────────────────────────────────────────────────────

export const DEMO_GHOST_STRATEGY = "質押 2 SOL 到 Jito，把 150 USDC 存入 Kamino，然後把 50 USDC 存入 Jupiter Lend";

const GHOST_AI_JITO_SOLO = {
  zh: `✅ **策略分析：單步操作，預期年化收益 $14.89**\n\n**Jito Stake（1 SOL → 0.9923 JitoSOL）**\nAPY 8.92%（含 MEV 收益分成），預期年化收益 $14.89。JitoSOL 為液態質押代幣，可繼續用於 DeFi 借貸或流動性挖礦，不影響質押收益。\n\n總 Gas 費用：0.000025 SOL（$0.0039），極低成本。`,
  en: `✅ **Strategy Analysis: Single-step operation, estimated annual yield $14.89**\n\n**Jito Stake (1 SOL → 0.9923 JitoSOL)**\nAPY 8.92% (including MEV revenue sharing), estimated annual yield $14.89. JitoSOL is a liquid staking token — you can continue using it in DeFi lending or liquidity mining without sacrificing staking rewards.\n\nTotal Gas: 0.000025 SOL ($0.0039), extremely low cost.`,
  ja: `✅ **戦略分析：1ステップ操作、予想年間収益 $14.89**\n\n**Jito Stake（1 SOL → 0.9923 JitoSOL）**\nAPY 8.92%（MEV 収益分配を含む）、予想年間収益 $14.89。JitoSOL はリキッドステーキングトークンで、ステーキング報酬を犠牲にせず DeFi レンディングや流動性マイニングに利用可能です。\n\n合計ガス代：0.000025 SOL（$0.0039）、極めて低コスト。`,
};

const GHOST_AI_KAMINO = {
  zh: `✅ **策略分析：穩健收益存款，預期年化收益 $4.08**\n\n**Kamino Lend（50 USDC → 49.96 kUSDC）**\nAPY 8.15%，預期年化收益 $4.08。Kamino 主市場 USDC 池 utilization rate 74%，收益穩定。無清算風險（純存款操作）。\n\n總 Gas 費用：0.000025 SOL（$0.0039），極低成本。`,
  en: `✅ **Strategy Analysis: Stable yield deposit, estimated annual yield $4.08**\n\n**Kamino Lend (50 USDC → 49.96 kUSDC)**\nAPY 8.15%, estimated annual yield $4.08. Kamino Main Market USDC pool utilization rate 74%, stable returns. No liquidation risk (deposit-only operation).\n\nTotal Gas: 0.000025 SOL ($0.0039), extremely low cost.`,
  ja: `✅ **戦略分析：安定した利回りの預金、予想年間収益 $4.08**\n\n**Kamino Lend（50 USDC → 49.96 kUSDC）**\nAPY 8.15%、予想年間収益 $4.08。Kamino メインマーケット USDC プール利用率 74%、安定した収益。清算リスクなし（預金専用操作）。\n\n合計ガス代：0.000025 SOL（$0.0039）、極めて低コスト。`,
};

const GHOST_AI_JITO = {
  zh: `✅ **策略分析：雙步操作，預期年化收益 $36.07**\n\n**第一步 — Jito Stake（2 SOL → 1.9847 JitoSOL）**\nAPY 8.92%（含 MEV 收益分成），預期年化收益 $27.92。Jito 是 Solana 最大的 MEV 質押協議，TVL $2.1B。\n\n**第二步 — Kamino Lend（100 USDC → 99.91 kUSDC）**\nAPY 8.15%，預期年化收益 $8.15。兩步操作無資金衝突，可按順序執行。\n\n總 Gas 費用：0.000050 SOL（$0.0078），極低成本。\n預計年化總收益：**$36.07 USD**`,
  en: `✅ **Strategy Analysis: Two-step operation, estimated annual yield $36.07**\n\n**Step 1 — Jito Stake (2 SOL → 1.9847 JitoSOL)**\nAPY 8.92% (including MEV revenue sharing), estimated annual yield $27.92. Jito is Solana's largest MEV staking protocol with $2.1B TVL.\n\n**Step 2 — Kamino Lend (100 USDC → 99.91 kUSDC)**\nAPY 8.15%, estimated annual yield $8.15. Both steps have no fund conflicts and can be executed sequentially.\n\nTotal Gas: 0.000050 SOL ($0.0078), extremely low cost.\nEstimated total annual yield: **$36.07 USD**`,
  ja: `✅ **戦略分析：2ステップ操作、予想年間収益 $36.07**\n\n**ステップ 1 — Jito Stake（2 SOL → 1.9847 JitoSOL）**\nAPY 8.92%（MEV 収益分配を含む）、予想年間収益 $27.92。Jito は Solana 最大の MEV ステーキングプロトコルで、TVL $2.1B。\n\n**ステップ 2 — Kamino Lend（100 USDC → 99.91 kUSDC）**\nAPY 8.15%、予想年間収益 $8.15。2ステップ間に資金の競合はなく、順次実行可能。\n\n合計ガス代：0.000050 SOL（$0.0078）、極めて低コスト。\n予想年間総収益：**$36.07 USD**`,
};

const GHOST_AI_FULL = {
  zh: `✅ **策略分析：三步均可安全執行，預期年化收益 $50.17**

**第一步 — Jito Stake（2 SOL → 1.9847 JitoSOL）**
APY 8.92%（含 MEV 收益分成），預期年化收益 $27.92。Jito 是 Solana 最大的 MEV 質押協議，TVL $2.1B。JitoSOL 可繼續用於 DeFi 操作。

**第二步 — Kamino Lend（150 USDC → 149.87 kUSDC）**
APY 8.15%，預期年化收益 $12.23。Kamino 主市場 USDC 池 utilization rate 74%，收益穩定。

**第三步 — Jupiter Lend（50 USDC → 49.95 jlUSDC）**
APY 9.12%（含激勵獎勵），預期年化收益 $4.56。Jupiter Lend Earn 池，與 Kamino 分散放貸可分攤單協議風險。

**三步無資金衝突，可按順序執行。**
總 Gas 費用：0.000075 SOL（$0.0117），極低成本。
預計年化總收益：**$50.17 USD**`,

  en: `✅ **Strategy Analysis: All three steps safe to execute, estimated annual yield $50.17**

**Step 1 — Jito Stake (2 SOL → 1.9847 JitoSOL)**
APY 8.92% (including MEV revenue sharing), estimated annual yield $27.92. Jito is Solana's largest MEV staking protocol with $2.1B TVL. JitoSOL can continue to be used in DeFi operations.

**Step 2 — Kamino Lend (150 USDC → 149.87 kUSDC)**
APY 8.15%, estimated annual yield $12.23. Kamino Main Market USDC pool utilization rate 74%, stable returns.

**Step 3 — Jupiter Lend (50 USDC → 49.95 jlUSDC)**
APY 9.12% (including incentive rewards), estimated annual yield $4.56. Jupiter Lend Earn pool — splitting lending between Kamino and Jupiter diversifies single-protocol risk.

**All three steps have no fund conflicts — safe to execute sequentially.**
Total Gas: 0.000075 SOL ($0.0117), extremely low cost.
Estimated total annual yield: **$50.17 USD**`,

  ja: `✅ **戦略分析：3ステップすべて安全に実行可能、予想年間収益 $50.17**

**ステップ 1 — Jito Stake（2 SOL → 1.9847 JitoSOL）**
APY 8.92%（MEV 収益分配を含む）、予想年間収益 $27.92。Jito は Solana 最大の MEV ステーキングプロトコルで、TVL $2.1B。JitoSOL は DeFi 操作に引き続き利用可能。

**ステップ 2 — Kamino Lend（150 USDC → 149.87 kUSDC）**
APY 8.15%、予想年間収益 $12.23。Kamino メインマーケット USDC プール利用率 74%、安定した収益。

**ステップ 3 — Jupiter Lend（50 USDC → 49.95 jlUSDC）**
APY 9.12%（インセンティブ報酬を含む）、予想年間収益 $4.56。Jupiter Lend Earn プール — Kamino との分散貸出により単一プロトコルリスクを軽減。

**3ステップ間に資金の競合なし — 順次安全に実行可能。**
合計ガス代：0.000075 SOL（$0.0117）、極めて低コスト。
予想年間総収益：**$50.17 USD**`,
};

const GHOST_DESC = {
  stake_1sol_jito: { zh: "質押 1 SOL 到 Jito", en: "Stake 1 SOL on Jito", ja: "1 SOL を Jito にステーク" },
  lend_usdc_kamino_50: { zh: "存入 50 USDC 到 Kamino", en: "Deposit 50 USDC to Kamino", ja: "50 USDC を Kamino に預入" },
  stake_sol_jito: { zh: "質押 2 SOL 到 Jito", en: "Stake 2 SOL on Jito", ja: "2 SOL を Jito にステーク" },
  lend_usdc_kamino_100: { zh: "存入 100 USDC 到 Kamino", en: "Deposit 100 USDC to Kamino", ja: "100 USDC を Kamino に預入" },
  stake_2sol_jito: { zh: "質押 2 SOL 到 Jito", en: "Stake 2 SOL on Jito", ja: "2 SOL を Jito にステーク" },
  lend_usdc_kamino_150: { zh: "存入 150 USDC 到 Kamino", en: "Deposit 150 USDC to Kamino", ja: "150 USDC を Kamino に預入" },
  lend_usdc_jupiter_50: { zh: "存入 50 USDC 到 Jupiter Lend", en: "Deposit 50 USDC to Jupiter Lend", ja: "50 USDC を Jupiter Lend に預入" },
};

export function getDemoGhostResultJitoSolo(lang: Lang = "zh") {
  return {
    steps: [{ type: "stake" as const, inputToken: "SOL", inputAmount: 1, outputToken: "JitoSOL", description: pick(GHOST_DESC.stake_1sol_jito, lang) }],
    result: {
      steps: [{
        step: { type: "stake" as const, inputToken: "SOL", inputAmount: 1, outputToken: "JitoSOL", protocol: "Jito", description: pick(GHOST_DESC.stake_1sol_jito, lang) },
        success: true, outputAmount: 0.9923, gasSol: 0.000025, estimatedApy: 8.92, annualUsdYield: 14.89,
        pdaSeedDescription: "Jito stake pool PDA: [stake_pool, validator_list, reserve_stake]",
      }],
      totalGasSol: 0.000025, canExecute: true, warnings: [], priorityFeeUsed: 12500, conditionalOrder: null,
    },
    aiAnalysis: pick(GHOST_AI_JITO_SOLO, lang),
  };
}

export function getDemoGhostResultKamino(lang: Lang = "zh") {
  return {
    steps: [{ type: "lend" as const, inputToken: "USDC", inputAmount: 50, outputToken: "kUSDC", description: pick(GHOST_DESC.lend_usdc_kamino_50, lang) }],
    result: {
      steps: [{
        step: { type: "lend" as const, inputToken: "USDC", inputAmount: 50, outputToken: "kUSDC", protocol: "Kamino", description: pick(GHOST_DESC.lend_usdc_kamino_50, lang) },
        success: true, outputAmount: 49.96, gasSol: 0.000025, estimatedApy: 8.15, annualUsdYield: 4.08,
        pdaSeedDescription: "Kamino obligation PDA: [lending_market, owner, seed1, seed2]",
      }],
      totalGasSol: 0.000025, canExecute: true, warnings: [], priorityFeeUsed: 12500, conditionalOrder: null,
    },
    aiAnalysis: pick(GHOST_AI_KAMINO, lang),
  };
}

export function getDemoGhostResultJito(lang: Lang = "zh") {
  return {
    steps: [
      { type: "stake" as const, inputToken: "SOL", inputAmount: 2, outputToken: "JitoSOL", description: pick(GHOST_DESC.stake_sol_jito, lang) },
      { type: "lend" as const, inputToken: "USDC", inputAmount: 100, outputToken: "kUSDC", description: pick(GHOST_DESC.lend_usdc_kamino_100, lang) },
    ],
    result: {
      steps: [
        {
          step: { type: "stake" as const, inputToken: "SOL", inputAmount: 2, outputToken: "JitoSOL", protocol: "Jito", description: pick(GHOST_DESC.stake_sol_jito, lang) },
          success: true, outputAmount: 1.9847, gasSol: 0.000025, estimatedApy: 8.92, annualUsdYield: 27.92,
          pdaSeedDescription: "Jito stake pool PDA: [stake_pool, validator_list, reserve_stake]",
        },
        {
          step: { type: "lend" as const, inputToken: "USDC", inputAmount: 100, outputToken: "kUSDC", protocol: "Kamino", description: pick(GHOST_DESC.lend_usdc_kamino_100, lang) },
          success: true, outputAmount: 99.91, gasSol: 0.000025, estimatedApy: 8.15, annualUsdYield: 8.15,
          pdaSeedDescription: "Kamino obligation PDA: [lending_market, owner, seed1, seed2]",
        },
      ],
      totalGasSol: 0.000050, canExecute: true, warnings: [], priorityFeeUsed: 12500, conditionalOrder: null,
    },
    aiAnalysis: pick(GHOST_AI_JITO, lang),
  };
}

export function getDemoGhostResult(lang: Lang = "zh") {
  return {
    steps: [
      { type: "stake" as const, inputToken: "SOL", inputAmount: 2, outputToken: "JitoSOL", description: pick(GHOST_DESC.stake_2sol_jito, lang) },
      { type: "lend" as const, inputToken: "USDC", inputAmount: 150, outputToken: "kUSDC", description: pick(GHOST_DESC.lend_usdc_kamino_150, lang) },
      { type: "lend" as const, inputToken: "USDC", inputAmount: 50, outputToken: "jlUSDC", description: pick(GHOST_DESC.lend_usdc_jupiter_50, lang) },
    ],
    result: {
      steps: [
        {
          step: { type: "stake" as const, inputToken: "SOL", inputAmount: 2, outputToken: "JitoSOL", protocol: "Jito", description: pick(GHOST_DESC.stake_2sol_jito, lang) },
          success: true, outputAmount: 1.9847, gasSol: 0.000025, estimatedApy: 8.92, annualUsdYield: 27.92,
          pdaSeedDescription: "Jito stake pool PDA: [stake_pool, validator_list, reserve_stake]",
        },
        {
          step: { type: "lend" as const, inputToken: "USDC", inputAmount: 150, outputToken: "kUSDC", protocol: "Kamino", description: pick(GHOST_DESC.lend_usdc_kamino_150, lang) },
          success: true, outputAmount: 149.87, gasSol: 0.000025, estimatedApy: 8.15, annualUsdYield: 12.23,
          pdaSeedDescription: "Kamino obligation PDA: [lending_market, owner, seed1, seed2]",
        },
        {
          step: { type: "lend" as const, inputToken: "USDC", inputAmount: 50, outputToken: "jlUSDC", protocol: "Jupiter", description: pick(GHOST_DESC.lend_usdc_jupiter_50, lang) },
          success: true, outputAmount: 49.95, gasSol: 0.000025, estimatedApy: 9.12, annualUsdYield: 4.56,
          pdaSeedDescription: "Jupiter Lend position NFT mint + vault PDA",
        },
      ],
      totalGasSol: 0.000075, canExecute: true, warnings: [], priorityFeeUsed: 12500, conditionalOrder: null,
    },
    aiAnalysis: pick(GHOST_AI_FULL, lang),
  };
}

// Keep backward-compatible static exports (zh default)
export const DEMO_GHOST_RESULT_JITO_SOLO = getDemoGhostResultJitoSolo("zh");
export const DEMO_GHOST_RESULT_KAMINO = getDemoGhostResultKamino("zh");
export const DEMO_GHOST_RESULT_JITO = getDemoGhostResultJito("zh");
export const DEMO_GHOST_RESULT = getDemoGhostResult("zh");

// ── Liquidation Shield Demo ───────────────────────────────────────────────────

const SHIELD_AI_ANALYSIS = {
  zh: `🚨 **緊急警報：Kamino 倉位健康因子 1.03，距清算僅 3% 空間**

**高危倉位（Kamino Main Market）**
- 抵押品：8,420.50 USDC（SOL 計價）
- 未償債務：5,180.20 USDC
- 當前健康因子：**1.03**（清算閾值 1.00）
- 清算觸發價格：SOL **$148.20**（當前 $156.40，下跌空間僅 **5.2%**）

**市場風險評估**
當前 SOL 價格波動率（24h）為 ±8.3%，意味著在正常市場條件下，此倉位有高概率在未來 24 小時內觸發清算。一旦清算，損失金額約為 $518-$776（10%-15% 清算罰款）。

**Sakura AI 救援方案**
還款 **$812.40 USDC**，健康因子將恢復至 **1.42**，創造安全緩衝。
操作成本：$8.12（1% 平台費）+ $0.004 Gas
節省清算損失：**$509-$764 USDC**

**救援授權已設置 $1,000 USDC 上限，在預授權範圍內，點擊執行救援即可。**`,

  en: `🚨 **Urgent Alert: Kamino position health factor 1.03, only 3% from liquidation**

**At-Risk Position (Kamino Main Market)**
- Collateral: $8,420.50 (SOL-denominated)
- Outstanding Debt: $5,180.20 USDC
- Current Health Factor: **1.03** (liquidation threshold 1.00)
- Liquidation Trigger Price: SOL **$148.20** (current $156.40, only **5.2%** downside)

**Market Risk Assessment**
Current SOL 24h price volatility is ±8.3%, meaning this position has a high probability of liquidation within 24 hours under normal market conditions. If liquidated, losses would be approximately $518-$776 (10%-15% liquidation penalty).

**Sakura AI Rescue Plan**
Repay **$812.40 USDC** to restore health factor to **1.42**, creating a safe buffer.
Cost: $8.12 (1% platform fee) + $0.004 Gas
Savings vs. liquidation: **$509-$764 USDC**

**Rescue authorization is set at $1,000 USDC limit — click Execute Rescue to proceed.**`,

  ja: `🚨 **緊急警報：Kamino ポジション健全性指標 1.03、清算まであと 3% のみ**

**高危険ポジション（Kamino メインマーケット）**
- 担保：$8,420.50（SOL 建て）
- 未返済債務：$5,180.20 USDC
- 現在の健全性指標：**1.03**（清算閾値 1.00）
- 清算トリガー価格：SOL **$148.20**（現在 $156.40、下落余地わずか **5.2%**）

**マーケットリスク評価**
現在の SOL 24h 価格ボラティリティは ±8.3% で、通常の市場条件下でこのポジションは 24 時間以内に清算される高い確率があります。清算された場合、約 $518-$776（10%-15% の清算ペナルティ）の損失が発生します。

**Sakura AI レスキュープラン**
**$812.40 USDC** を返済して健全性指標を **1.42** に回復し、安全バッファーを確保。
コスト：$8.12（1% プラットフォーム手数料）+ $0.004 ガス代
清算回避による節約：**$509-$764 USDC**

**レスキュー認可は $1,000 USDC 上限に設定済み — レスキュー実行をクリックしてください。**`,
};

export function getDemoShieldResult(lang: Lang = "zh") {
  return {
    positions: [
      {
        protocol: "kamino" as const,
        collateralUsd: 8420.50,
        debtUsd: 5180.20,
        healthFactor: 1.03,
        liquidationThreshold: 0.80,
        collateralToken: "SOL",
        debtToken: "USDC",
        accountAddress: "KmNo7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJos",
        marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
        rescueAmountUsdc: 812.40,
        postRescueHealthFactor: 1.42,
        liquidationPrice: 148.20,
      },
      {
        protocol: "jupiter" as const,
        collateralUsd: 3200.00,
        debtUsd: 820.00,
        healthFactor: 2.81,
        liquidationThreshold: 0.80,
        collateralToken: "JitoSOL",
        debtToken: "USDC",
        accountAddress: "JuPLVuqjxW3cNq6E7pTYfLhJt2MkLqZB9HxqGmRn5kAb",
        rescueAmountUsdc: 0,
        postRescueHealthFactor: 2.81,
        liquidationPrice: 42.10,
      },
    ],
    atRisk: [
      {
        protocol: "kamino" as const,
        collateralUsd: 8420.50,
        debtUsd: 5180.20,
        healthFactor: 1.03,
        liquidationThreshold: 0.80,
        collateralToken: "SOL",
        debtToken: "USDC",
        accountAddress: "KmNo7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJos",
        marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
        rescueAmountUsdc: 812.40,
        postRescueHealthFactor: 1.42,
        liquidationPrice: 148.20,
      },
    ],
    safest: {
      protocol: "jupiter" as const,
      collateralUsd: 3200.00,
      debtUsd: 820.00,
      healthFactor: 2.81,
      liquidationThreshold: 0.80,
      collateralToken: "JitoSOL",
      debtToken: "USDC",
      accountAddress: "JuPLVuqjxW3cNq6E7pTYfLhJt2MkLqZB9HxqGmRn5kAb",
      rescueAmountUsdc: 0,
      postRescueHealthFactor: 2.81,
      liquidationPrice: 42.10,
    },
    scannedAt: Date.now(),
    solPrice: 156.40,
    portfolioRiskScore: 78,
    portfolioRiskLabel: lang === "en" ? "High Risk" : lang === "ja" ? "高リスク" : "高風險",
    portfolioRiskColor: "red" as const,
    atRiskRatioPct: 72.5,
    totalRescueNeededUsdc: 812.40,
    impliedLiquidationProb: 0.7248,
    config: {
      approvedUsdc: 1000,
      triggerThreshold: 1.05,
      targetHealthFactor: 1.4,
    },
    rescueSimulations: [
      {
        position: {
          protocol: "kamino" as const,
          collateralUsd: 8420.50,
          debtUsd: 5180.20,
          healthFactor: 1.03,
          liquidationThreshold: 0.80,
          collateralToken: "SOL",
          debtToken: "USDC",
          accountAddress: "KmNo7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJos",
          rescueAmountUsdc: 812.40,
          postRescueHealthFactor: 1.42,
          liquidationPrice: 148.20,
        },
        rescueUsdc: 812.40,
        postRescueHealth: 1.42,
        gasSol: 0.000025,
        withinMandate: true,
        success: true,
      },
    ],
    aiAnalysis: pick(SHIELD_AI_ANALYSIS, lang),
    mintWarnings: undefined,
  };
}

// Keep backward-compatible export (zh default)
export const DEMO_SHIELD_RESULT = getDemoShieldResult("zh");
