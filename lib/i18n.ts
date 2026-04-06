export type Lang = "zh" | "en" | "ja";
// zh = Traditional Chinese (繁體中文)

// Template helper: t("Hello {name}", { name: "Alice" }) → "Hello Alice"
export function tpl(str: string, vars: Record<string, string | number> = {}): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export const translations = {
  // ── Header ──────────────────────────────────────────────────────
  verifyProof: {
    zh: "⛩️ 驗證證明",
    en: "⛩️ Verify Proof",
    ja: "⛩️ 証明を検証",
  },

  // ── Hackathon badge ──────────────────────────────────────────────
  hackathonBadge: {
    zh: "COLOSSEUM FRONTIER HACKATHON 2026 · AGENTIC ECONOMY TRACK",
    en: "COLOSSEUM FRONTIER HACKATHON 2026 · AGENTIC ECONOMY TRACK",
    ja: "COLOSSEUM FRONTIER HACKATHON 2026 · AGENTIC ECONOMY TRACK",
  },

  // ── Hero ──────────────────────────────────────────────────────────
  heroTagline: {
    zh: "Solana 鏈上可驗證 AI DeFi 顧問",
    en: "Onchain-Verifiable AI DeFi Advisor for Solana",
    ja: "SolanaのオンチェーンAI DeFiアドバイザー — SHA-256検証済み",
  },
  heroSubtitle: {
    zh: "4 個專屬 AI 智能體覆蓋安全分析、持倉體檢、DeFi 執行、自主再平衡。每一個 AI 決策有 SHA-256 哈希，永久記錄在 Solana 鏈上，獨立可驗證。",
    en: "Four specialized AI agents cover security analysis, portfolio health, DeFi execution, and autonomous rebalancing. Every decision is SHA-256 hashed and recorded on Solana — independently verifiable.",
    ja: "4つの専門AIエージェントがセキュリティ分析、ポートフォリオ診断、DeFi実行、自律リバランスをカバー。すべてのAI判断はSHA-256ハッシュでSolanaに永久記録され、独立して検証可能。",
  },

  // ── Agents ────────────────────────────────────────────────────────
  agentsTitle: {
    zh: "4 個協作智能體",
    en: "4 Collaborative Agents",
    ja: "4つの協調エージェント",
  },
  agent1Title: { zh: "鏈上安全衛士", en: "Security Guardian", ja: "セキュリティガーディアン" },
  agent1Desc: {
    zh: "GoPlus 5 維度掃描 · 蜜罐檢測 · 增發/凍結權限分析 · 持幣集中度 · AI 倉位建議",
    en: "GoPlus 5-dimension scan · Honeypot detection · Mint/freeze authority · Concentration risk · AI position sizing",
    ja: "GoPlus 5次元スキャン・ハニーポット検出・発行/凍結権限・集中リスク・AIポジション提案",
  },
  agent2Title: { zh: "持倉健康分析", en: "Portfolio Health Scan", ja: "ポートフォリオ診断" },
  agent2Desc: {
    zh: "資產結構評分 · 閒置 USDC 識別 · 高風險代幣預警 · 實時 APY 對比 · 收益機會提示",
    en: "Asset score · Idle USDC detection · High-risk token alerts · Live APY comparison · Yield opportunities",
    ja: "資産スコア・遊休USDC検出・高リスクトークン警告・リアルタイムAPY比較・利回り機会",
  },
  agent3Title: { zh: "自然語言 DeFi 顧問", en: "Natural Language DeFi Advisor", ja: "自然言語DeFiアドバイザー" },
  agent3Desc: {
    zh: "多輪對話記憶 · 主動 APY 變化提醒 · Jupiter Swap · Marinade/Jito 質押 · Kamino 借貸",
    en: "Multi-turn memory · Proactive APY alerts · Jupiter Swap · Marinade/Jito staking · Kamino lending",
    ja: "多ターン記憶・プロアクティブAPY通知・Jupiterスワップ・Marinade/Jitoステーキング・Kaminoレンディング",
  },
  agent4Title: { zh: "自主再平衡 Agent", en: "Autonomous Rebalance Agent", ja: "自律リバランスエージェント" },
  agent4Desc: {
    zh: "無需提問，自主掃描持倉 · 量化年化收益方案 · Before/After 對比 · 每個決策 SHA-256 上鏈",
    en: "No prompting needed — autonomously scans portfolio · Quantifies annual yield gain · Before/After comparison · Every decision SHA-256 onchain",
    ja: "自律的にポートフォリオをスキャン・年利益を定量化・Before/After比較・すべての判断をSHA-256でオンチェーン記録",
  },

  // ── Differentiator ────────────────────────────────────────────────
  diffTitle: { zh: "鏈上可驗證 AI 推理", en: "Onchain-Verifiable AI Reasoning", ja: "オンチェーン検証可能なAI推論" },
  diffDesc: {
    zh: "每次 AI 分析生成 SHA-256 哈希，透過 Solana Memo Program 永久上鏈。任何人可以獨立驗證 AI 的完整推理過程——不是黑箱，是透明的可信 AI。",
    en: "Every AI analysis generates a SHA-256 hash recorded via Solana Memo Program. Anyone can independently verify the complete AI reasoning process — not a black box, but transparent, trustworthy AI.",
    ja: "すべてのAI分析がSHA-256ハッシュを生成し、Solana Memo Programに永久記録。誰でもAIの完全な推論プロセスを独立して検証できます。ブラックボックスではなく、透明なAIです。",
  },

  // ── Stats ────────────────────────────────────────────────────────
  statLabel1: { zh: "GoPlus 安全維度", en: "GoPlus Security Dimensions", ja: "GoPlus セキュリティ次元" },
  statLabel2: { zh: "協作智能體", en: "Collaborative Agents", ja: "協調エージェント" },
  statLabel3: { zh: "最高穩定幣 APY", en: "Top Stablecoin APY", ja: "最高ステーブルコインAPY" },
  statLabel4: { zh: "AI 推理鏈上可驗證", en: "AI Reasoning Onchain", ja: "AI推論オンチェーン検証" },

  // ── Trust signals ────────────────────────────────────────────────
  trust1: { zh: "⛩️ 唯讀 · 不持有資產", en: "⛩️ Read-only · No Custody", ja: "⛩️ 読み取り専用 · 資産管理なし" },
  trust2: { zh: "⛓️ AI 推理鏈上存證", en: "⛓️ AI Reasoning Onchain", ja: "⛓️ AI推論オンチェーン記録" },
  trust3: { zh: "🔰 GoPlus 5 維度安全", en: "🔰 GoPlus 5-Dim Security", ja: "🔰 GoPlus 5次元セキュリティ" },
  trust4: { zh: "🫙 Helius 實時數據", en: "🫙 Helius Real-time Data", ja: "🫙 Heliusリアルタイムデータ" },

  // ── CTA (new) ──────────────────────────────────────────────────────
  ctaFreeLabel: {
    zh: "免費開始 — 無需註冊",
    en: "Try Free — No Signup",
    ja: "無料で始める — 登録不要",
  },
  ctaFreeDesc: {
    zh: "連接 Phantom 錢包，立即獲得 3 次免費安全分析 + AI 顧問",
    en: "Connect Phantom and get 3 free security analyses + AI advisor sessions instantly",
    ja: "Phantomを接続して、無料でセキュリティ分析3回＋AIアドバイザーを即時利用",
  },
  ctaFreeBtn: {
    zh: "👻 連接 Phantom — 免費",
    en: "👻 Connect Phantom — Free",
    ja: "👻 Phantom接続 — 無料",
  },
  ctaSubNote: {
    zh: "升級 Basic $8/月 · Pro $28/月 · 按次 $0.10 USDC",
    en: "Upgrade: Basic $8/mo · Pro $28/mo · Or pay-per-use $0.10 USDC",
    ja: "アップグレード: Basic $8/月 · Pro $28/月 · 従量課金 $0.10 USDC",
  },

  // ── Stripe MPP section (new) ────────────────────────────────────────
  stripeSectionTitle: {
    zh: "🤝 Stripe Machine Payments Protocol 就緒",
    en: "🤝 Stripe Machine Payments Protocol Ready",
    ja: "🤝 Stripe Machine Payments Protocol 対応済み",
  },
  stripeSectionDesc: {
    zh: "Sakura 的 AI 智能體已原生支援 HTTP 402 Payment Required 標準。任何 MCP 客戶端（Claude Desktop、Cursor、VS Code 等）可直接調用 Sakura 的 DeFi 分析 API，每次調用自動支付 USDC——無需帳號、無需訂閱，真正的 Agent-to-Agent 經濟。",
    en: "Sakura AI agents natively implement the HTTP 402 Payment Required standard. Any MCP client (Claude Desktop, Cursor, VS Code, etc.) can call Sakura DeFi analysis APIs with automatic per-call USDC payment — no account, no subscription, pure Agent-to-Agent economy.",
    ja: "Sakura AIエージェントはHTTP 402 Payment Required標準をネイティブ実装。Claude Desktop、Cursor、VS Codeなど任意のMCPクライアントがSakura DeFi分析APIを直接呼び出し、1回ごとにUSDCを自動支払い——アカウント不要、真のAgent-to-Agent経済。",
  },
  stripeFeature1: {
    zh: "🫙 每次 API 調用自動 USDC 微支付",
    en: "🫙 Automatic USDC micro-payment per API call",
    ja: "🫙 API呼び出しごとに自動USDC少額決済",
  },
  stripeFeature2: {
    zh: "⚙️ AI Agent 直接調用，無需人工介入",
    en: "⚙️ AI agents call directly — zero human intervention",
    ja: "⚙️ AIエージェントが直接呼び出し — 人間介入ゼロ",
  },
  stripeFeature3: {
    zh: "🌐 任何 MCP 客戶端均可接入",
    en: "🌐 Any MCP client can connect instantly",
    ja: "🌐 任意のMCPクライアントが即座に接続可能",
  },

  // ── Connect ───────────────────────────────────────────────────────
  connectPhantom: { zh: "👻 連接 Phantom", en: "👻 Connect Phantom", ja: "👻 Phantomを接続" },
  enterAddress: { zh: "🌿 輸入地址", en: "🌿 Enter Address", ja: "🌿 アドレス入力" },
  phantomDetected: {
    zh: "偵測到 Phantom 錢包。Sakura 僅讀取地址用於分析，不會請求任何簽名或轉帳權限。",
    en: "Phantom wallet detected. Sakura only reads your address for analysis — no signing or transfer permissions requested.",
    ja: "Phantomウォレットを検出しました。Sakuraは分析のためにアドレスを読み取るだけで、署名や転送権限は要求しません。",
  },
  connectBtn: { zh: "連接 Phantom · 啟動 AI 顧問", en: "Connect Phantom · Launch AI Advisor", ja: "Phantom接続 · AIアドバイザー起動" },
  connecting: { zh: "連接中...", en: "Connecting...", ja: "接続中..." },
  noPhantom: {
    zh: "未偵測到 Phantom 錢包，請安裝插件或切換至地址輸入模式。",
    en: "Phantom not detected. Install the extension or switch to address input mode.",
    ja: "Phantomが見つかりません。拡張機能をインストールするか、アドレス入力モードに切り替えてください。",
  },
  downloadPhantom: { zh: "👻 下載 Phantom 錢包", en: "👻 Download Phantom", ja: "👻 Phantomをダウンロード" },
  continueWithAddress: { zh: "用地址體驗 →", en: "Continue with address →", ja: "アドレスで続行 →" },
  addressPlaceholder: { zh: "輸入 Solana 錢包地址...", en: "Enter Solana wallet address...", ja: "Solanaウォレットアドレスを入力..." },
  addressHelper: {
    zh: "輸入任意 Solana 錢包地址（唯讀訪問，無需私鑰）",
    en: "Enter any Solana wallet address (read-only, no private key required)",
    ja: "任意のSolanaウォレットアドレスを入力（読み取り専用、秘密鍵不要）",
  },
  start: { zh: "開始 →", en: "Start →", ja: "開始 →" },
  or: { zh: "或", en: "or", ja: "または" },
  demoWallet: { zh: "🧪 使用演示錢包體驗（無需連接）", en: "🧪 Try with demo wallet (no connection)", ja: "🧪 デモウォレットで体験（接続不要）" },
  userCancelled: { zh: "用戶取消了連接", en: "User cancelled connection", ja: "ユーザーが接続をキャンセルしました" },
  invalidAddress: { zh: "無效的 Solana 錢包地址", en: "Invalid Solana wallet address", ja: "無効なSolanaウォレットアドレス" },
  enterAddressError: { zh: "請輸入錢包地址", en: "Please enter a wallet address", ja: "ウォレットアドレスを入力してください" },

  // ── Tabs ──────────────────────────────────────────────────────────
  tabHealth: { zh: "🌸 持倉體檢", en: "🌸 Portfolio", ja: "🌸 診断" },
  tabToken: { zh: "🔰 安全分析", en: "🔰 Security", ja: "🔰 セキュリティ" },
  tabDefi: { zh: "🌿 AI 顧問", en: "🌿 AI Advisor", ja: "🌿 AIアドバイザー" },
  tabAgent: { zh: "⚙️ 自主 Agent", en: "⚙️ Rebalance Agent", ja: "⚙️ 自律エージェント" },

  // ── HealthReport ─────────────────────────────────────────────────
  walletHealthReport: { zh: "錢包體檢報告", en: "Wallet Health Report", ja: "ウォレット診断レポート" },
  connectedWallet: { zh: "已連接錢包", en: "Connected Wallet", ja: "接続済みウォレット" },
  disconnect: { zh: "斷開連接", en: "Disconnect", ja: "切断" },
  totalAssets: { zh: "總資產估值（USD）", en: "Total Assets (USD)", ja: "総資産（USD）" },
  holdingTokens: { zh: "當前持有", en: "Holding", ja: "保有中" },
  tokens: { zh: "個代幣", en: "tokens", ja: "トークン" },
  highRiskTokens: { zh: "高風險代幣", en: "High Risk Tokens", ja: "高リスクトークン" },
  idleYieldOpportunity: { zh: "🪷 發現閒置收益機會", en: "🪷 Idle Yield Opportunity", ja: "🪷 遊休収益機会を発見" },
  solStakingRecommendation: { zh: "🫙 SOL 質押建議", en: "🫙 SOL Staking Recommendation", ja: "🫙 SOLステーキング推奨" },
  viewPlan: { zh: "查看方案 →", en: "View Plan →", ja: "プランを見る →" },
  learnMore: { zh: "了解更多 →", en: "Learn More →", ja: "詳細を見る →" },
  positionDetails: { zh: "持倉明細", en: "Position Details", ja: "ポジション詳細" },
  sortedByValue: { zh: "個代幣，按價值排序", en: "tokens, sorted by value", ja: "トークン（価値順）" },
  noPriceData: { zh: "無價格數據", en: "No price data", ja: "価格データなし" },
  pricing:     { zh: "定價", en: "Pricing", ja: "料金" },
  viewOnSolscan: { zh: "🌸 在 Solscan 查看", en: "🌸 View on Solscan", ja: "🌸 Solscanで確認" },
  rugCheckDetect: { zh: "🔰 RugCheck 檢測", en: "🔰 RugCheck Scan", ja: "🔰 RugCheck検査" },
  aiRecommendations: { zh: "🌿 Sakura AI 建議", en: "🌿 Sakura AI Recommendations", ja: "🌿 Sakura AI 推奨" },
  recommendation: { zh: "建議", en: "Recommendation", ja: "推奨" },
  opportunity: { zh: "機會", en: "Opportunity", ja: "機会" },
  risk: { zh: "風險", en: "Risk", ja: "リスク" },
  good: { zh: "良好", en: "Good", ja: "良好" },
  shareReport: { zh: "🪭 分享我的錢包報告", en: "🪭 Share My Wallet Report", ja: "🪭 ウォレットレポートをシェア" },
  scanning: { zh: "Sakura 正在掃描鏈上數據...", en: "Sakura is scanning onchain data...", ja: "Sakuraがオンチェーンデータをスキャン中..." },
  healthy: { zh: "健康", en: "Healthy", ja: "健全" },
  needsAttention: { zh: "需關注", en: "Needs Attention", ja: "要注意" },
  highRisk: { zh: "高風險", en: "High Risk", ja: "高リスク" },
  assetDistribution: { zh: "資產分布", en: "Asset Distribution", ja: "資産分布" },
  stablecoin: { zh: "穩定幣", en: "Stablecoin", ja: "ステーブルコイン" },
  staking: { zh: "質押", en: "Staking", ja: "ステーキング" },
  native: { zh: "原生", en: "Native", ja: "ネイティブ" },
  unknown: { zh: "未知", en: "Unknown", ja: "不明" },
  crosschain: { zh: "跨鏈", en: "Cross-chain", ja: "クロスチェーン" },
  meme: { zh: "Meme", en: "Meme", ja: "Meme" },

  // ── TokenAnalysis ──────────────────────────────────────────────
  tokenSecurityAnalysis: { zh: "🔰 代幣安全分析", en: "🔰 Token Security Analysis", ja: "🔰 トークンセキュリティ分析" },
  tokenAnalysisSubtitle: {
    zh: "輸入任意 Solana 代幣合約地址，Sakura 立即調用 GoPlus · Jupiter · Helius 三方數據 + Claude AI 給出買入決策",
    en: "Enter any Solana token contract address. Sakura calls GoPlus · Jupiter · Helius + Claude AI for an instant buy/avoid decision.",
    ja: "任意のSolanaトークンコントラクトアドレスを入力。GoPlus・Jupiter・Helius + Claude AIでリアルタイム判断を提供します。",
  },
  tokenAddressPlaceholder: { zh: "輸入代幣合約地址（Mint Address）...", en: "Enter token mint address...", ja: "トークンミントアドレスを入力..." },
  analyzeBtn: { zh: "開始分析 →", en: "Analyze →", ja: "分析開始 →" },
  analyzing: { zh: "掃描中...", en: "Scanning...", ja: "スキャン中..." },
  hotTokens: { zh: "🌺 熱門代幣快速分析：", en: "🌺 Quick Analysis — Hot Tokens:", ja: "🌺 人気トークン クイック分析：" },
  safetyScore: { zh: "安全評分", en: "Safety Score", ja: "安全スコア" },
  contractRisk: { zh: "🛡 合約風險詳情", en: "🛡 Contract Risk Details", ja: "🛡 コントラクトリスク詳細" },
  holderDistribution: { zh: "👥 持幣分布", en: "👥 Holder Distribution", ja: "👥 ホルダー分布" },
  noMintAuth: { zh: "無增發權限，供應量固定", en: "No mint authority, fixed supply", ja: "発行権限なし、供給量固定" },
  noFreezeAuth: { zh: "無凍結權限", en: "No freeze authority", ja: "凍結権限なし" },
  lowDevHoldings: { zh: "創建者持倉比例低", en: "Low creator holdings", ja: "開発者保有率低い" },
  totalHolders: { zh: "持幣地址總數", en: "Total holder addresses", ja: "総ホルダーアドレス数" },
  noMint: { zh: "無", en: "None", ja: "なし" },
  noFreeze: { zh: "無", en: "None", ja: "なし" },
  mintAuth: { zh: "增發權限", en: "Mint Authority", ja: "発行権限" },
  freezeAuth: { zh: "凍結權限", en: "Freeze Authority", ja: "凍結権限" },
  disclaimer: { zh: "以上分析僅供參考，不構成投資建議。加密貨幣投資有風險，請謹慎決策。", en: "Analysis is for reference only and does not constitute investment advice. Crypto investing involves risk.", ja: "本分析は参考情報のみであり、投資アドバイスではありません。暗号資産投資にはリスクが伴います。" },
  writeOnchain: { zh: "⛩️ 寫入 Solana 鏈上", en: "⛩️ Write to Solana", ja: "⛩️ Solanaに記録" },
  writingOnchain: { zh: "提交中...", en: "Submitting...", ja: "送信中..." },
  writtenOnchain: { zh: "已上鏈 ✓", en: "On-chain ✓", ja: "オンチェーン済 ✓" },
  unlockPremium: { zh: "解鎖 0.10 USDC", en: "Unlock 0.10 USDC", ja: "0.10 USDCでロック解除" },
  premiumTitle: { zh: "⛩️ AI 深度分析報告", en: "⛩️ AI Deep Analysis Report", ja: "⛩️ AI詳細分析レポート" },
  premiumSubtitle: {
    zh: "Claude AI 生成完整風險評估 + 倉位建議，透過 x402 鏈上支付解鎖",
    en: "Claude AI generates complete risk assessment + position sizing. Unlocked via x402 onchain payment.",
    ja: "Claude AIが完全なリスク評価とポジションサイジングを生成。x402オンチェーン支払いでアンロック。",
  },

  // ── DefiAssistant ────────────────────────────────────────────────
  defiAssistantTitle: { zh: "💬 DeFi AI 顧問", en: "💬 DeFi AI Advisor", ja: "💬 DeFi AIアドバイザー" },
  defiAssistantSubtitle: {
    zh: "用自然語言告訴我你想做什麼",
    en: "Tell me what you want to do in natural language",
    ja: "自然言語で何をしたいか教えてください",
  },
  messagePlaceholder: { zh: "輸入消息...", en: "Type a message...", ja: "メッセージを入力..." },
  sendBtn: { zh: "發送", en: "Send", ja: "送信" },
  clearHistory: { zh: "清除記錄", en: "Clear History", ja: "履歴を削除" },
  thinking: { zh: "思考中...", en: "Thinking...", ja: "考え中..." },
  agentInitiated: { zh: "⚙️ 主動提醒", en: "⚙️ Proactive Alert", ja: "⚙️ プロアクティブ通知" },

  // ── AgentPanel ───────────────────────────────────────────────────
  agentPanelTitle: { zh: "⚙️ AI 再平衡 Agent", en: "⚙️ AI Rebalance Agent", ja: "⚙️ AIリバランスエージェント" },
  agentPanelSubtitle: {
    zh: "自主分析你的持倉，生成量化收益方案，一鍵執行",
    en: "Autonomously analyzes your portfolio and generates a quantified yield plan — one click to execute.",
    ja: "ポートフォリオを自律的に分析し、定量化された利回りプランを生成。ワンクリックで実行。",
  },
  runAgent: { zh: "▶ 運行 Agent", en: "▶ Run Agent", ja: "▶ エージェント実行" },
  reanalyze: { zh: "重新分析", en: "Re-analyze", ja: "再分析" },
  scanningWallet: { zh: "掃描錢包...", en: "Scanning wallet...", ja: "ウォレットをスキャン中..." },
  analyzingPortfolio: { zh: "AI 分析持倉...", en: "AI analyzing portfolio...", ja: "AIがポートフォリオを分析中..." },
  generatingPlan: { zh: "生成方案...", en: "Generating plan...", ja: "プランを生成中..." },
  currentAllocation: { zh: "當前配置", en: "Current Allocation", ja: "現在の配分" },
  recommendedAllocation: { zh: "推薦配置", en: "Recommended Allocation", ja: "推奨配分" },
  currentAnnualYield: { zh: "當前年化", en: "Current Annual Yield", ja: "現在の年利" },
  projectedYield: { zh: "推薦後年化", en: "Projected Yield", ja: "推奨後の年利" },
  submitOnchain: { zh: "⛩️ 提交方案上鏈", en: "⛩️ Commit Plan Onchain", ja: "⛩️ プランをオンチェーンに送信" },
  submitting: { zh: "提交中...", en: "Submitting...", ja: "送信中..." },
  submitted: { zh: "已上鏈 ✓", en: "On-chain ✓", ja: "オンチェーン済 ✓" },
  execute: { zh: "執行", en: "Execute", ja: "実行" },
  aiReasoningHash: { zh: "⛩️ AI 推理哈希（可驗證）", en: "⛩️ AI Reasoning Hash (Verifiable)", ja: "⛩️ AI推論ハッシュ（検証可能）" },
  deterministicNote: {
    zh: "基於規則引擎生成（無 AI API Key 時的確定性方案）",
    en: "Generated by rule engine (deterministic fallback when no AI API key)",
    ja: "ルールエンジンによる生成（AI APIキーなし時の確定的フォールバック）",
  },

  // ── SwapModal ────────────────────────────────────────────────────
  swapTitle: { zh: "🪐 Jupiter Swap", en: "🪐 Jupiter Swap", ja: "🪐 Jupiter スワップ" },
  pay: { zh: "支付", en: "Pay", ja: "支払い" },
  receive: { zh: "獲得", en: "Receive", ja: "受け取り" },
  priceImpact: { zh: "價格影響", en: "Price Impact", ja: "価格影響" },
  slippageProtection: { zh: "滑點保護", en: "Slippage Protection", ja: "スリッページ保護" },
  platformFee: { zh: "Sakura 平台費", en: "Sakura Platform Fee", ja: "Sakuraプラットフォーム手数料" },
  route: { zh: "路由", en: "Route", ja: "ルート" },
  swapFeeNotice: {
    zh: "Sakura 收取 {pct} 平台費，用於維持 AI 分析和服務運營。交易透過 Jupiter 最優路由執行。",
    en: "Sakura charges a {pct} platform fee to sustain AI analysis and operations. Trades route via Jupiter for best price.",
    ja: "Sakuraは{pct}のプラットフォーム料金を請求します。取引はJupiterを通じて最適ルートで実行されます。",
  },
  confirmSwap: { zh: "確認兌換（Phantom 簽名）", en: "Confirm Swap (Sign with Phantom)", ja: "スワップ確認（Phantom署名）" },
  cancel: { zh: "取消", en: "Cancel", ja: "キャンセル" },
  confirmInPhantom: { zh: "請在 Phantom 中確認交易", en: "Confirm transaction in Phantom", ja: "Phantomで取引を確認してください" },
  checkAndConfirm: { zh: "檢查交易詳情後點擊「確認」", en: "Review the transaction details and click Confirm", ja: "取引詳細を確認して「確認」をクリックしてください" },
  swapSuccess: { zh: "交易成功", en: "Transaction Successful", ja: "取引成功" },
  viewOnSolscanLink: { zh: "在 Solscan 查看交易 →", en: "View on Solscan →", ja: "Solscanで確認 →" },
  done: { zh: "完成", en: "Done", ja: "完了" },
  swapFailed: { zh: "交易失敗", en: "Transaction Failed", ja: "取引失敗" },
  requote: { zh: "重新報價", en: "Requote", ja: "再見積もり" },
  gettingQuote: { zh: "正在獲取最優報價...", en: "Fetching best quote...", ja: "最良見積もり取得中..." },

  // ── StakeModal ────────────────────────────────────────────────────
  marinadeDesc: { zh: "獲得 mSOL，全鏈流動性最好", en: "Receive mSOL — best cross-chain liquidity", ja: "mSOLを受け取る — 最高のクロスチェーン流動性" },
  jitoDesc: { zh: "獲得 jitoSOL，含 MEV 額外獎勵", en: "Receive jitoSOL — includes MEV extra rewards", ja: "jitoSOLを受け取る — MEV追加報酬付き" },
  stake: { zh: "質押", en: "Stake", ja: "ステーク" },
  annualYieldApy: { zh: "年化收益 APY", en: "Annual Yield APY", ja: "年利APY" },
  estimatedAnnualYield: { zh: "預計年收益", en: "Est. Annual Yield", ja: "推定年収益" },
  exchangeRate: { zh: "兌換比例", en: "Exchange Rate", ja: "交換レート" },
  protocol: { zh: "協議", en: "Protocol", ja: "プロトコル" },
  confirmStake: { zh: "確認質押（Phantom 簽名）", en: "Confirm Stake (Sign with Phantom)", ja: "ステーク確認（Phantom署名）" },
  stakeSuccess: { zh: "質押成功！", en: "Staking Successful!", ja: "ステーキング成功！" },
  stakeFailed: { zh: "操作失敗", en: "Operation Failed", ja: "操作失敗" },
  retry: { zh: "重試", en: "Retry", ja: "再試行" },
  gettingStakePreview: { zh: "正在獲取質押預覽...", en: "Fetching staking preview...", ja: "ステーキングプレビュー取得中..." },

  // ── LendModal ────────────────────────────────────────────────────
  kaminoDesc: { zh: "自動複利，Solana 最大借貸協議", en: "Auto-compounding — Solana's largest lending protocol", ja: "自動複利 — Solanaの最大レンディングプロトコル" },
  solendDesc: { zh: "多次審計，Solana 最老牌借貸協議", en: "Multiply audited — Solana's most established protocol", ja: "複数回の監査済み — Solanaの最老舗プロトコル" },
  deposit: { zh: "存入", en: "Deposit", ja: "預け入れ" },
  estimatedMonthly: { zh: "預計每月", en: "Est. Monthly", ja: "推定月次" },
  interestYield: { zh: "利息收益", en: "Interest Yield", ja: "利息収益" },
  depositApy: { zh: "存款 APY", en: "Deposit APY", ja: "預金APY" },
  utilizationRate: { zh: "資金利用率", en: "Utilization Rate", ja: "資金利用率" },
  receiptToken: { zh: "收據代幣", en: "Receipt Token", ja: "領収トークン" },
  confirmDeposit: { zh: "確認存款（Phantom 簽名）", en: "Confirm Deposit (Sign with Phantom)", ja: "預金確認（Phantom署名）" },
  depositSuccess: { zh: "存款成功！", en: "Deposit Successful!", ja: "預金成功！" },
  depositFailed: { zh: "操作失敗", en: "Operation Failed", ja: "操作失敗" },
  gettingRates: { zh: "正在獲取實時利率...", en: "Fetching real-time rates...", ja: "リアルタイムレート取得中..." },

  // ── Share modal ───────────────────────────────────────────────────
  shareTitle: { zh: "🪭 分享你的錢包報告", en: "🪭 Share Your Wallet Report", ja: "🪭 ウォレットレポートをシェア" },
  shareHint: { zh: "複製下方內容，分享到 X / Twitter / Telegram", en: "Copy the text below and share on X / Twitter / Telegram", ja: "下のテキストをコピーしてX / Twitter / Telegramでシェア" },
  copied: { zh: "🌸 已複製！", en: "🌸 Copied!", ja: "🌸 コピーしました！" },
  copyText: { zh: "🌿 複製文字", en: "🌿 Copy Text", ja: "🌿 テキストをコピー" },
  close: { zh: "關閉", en: "Close", ja: "閉じる" },

  // ── Footer ────────────────────────────────────────────────────────
  footerText: {
    zh: "Sakura · Colosseum Frontier Hackathon 2026 · Agentic Economy Track · Built on Solana",
    en: "Sakura · Colosseum Frontier Hackathon 2026 · Agentic Economy Track · Built on Solana",
    ja: "Sakura · Colosseum Frontier Hackathon 2026 · Agentic Economy Track · Built on Solana",
  },

  // ── Protocols ecosystem ────────────────────────────────────────────
  integratedProtocols: { zh: "集成協議", en: "Integrated Protocols", ja: "統合プロトコル" },

  // ── Day/Night toggle ──────────────────────────────────────────────
  dayMode:       { zh: "白天", en: "Day",   ja: "昼" },
  nightMode:     { zh: "黑夜", en: "Night", ja: "夜" },
  switchToDay:   { zh: "切換白天模式", en: "Switch to Day",   ja: "昼モードへ" },
  switchToNight: { zh: "切換黑夜模式", en: "Switch to Night", ja: "夜モードへ" },

  // ── Agent Panel — Strategy Selector ──────────────────────────────
  strategyYieldName:    { zh: "收益最大化",  en: "Yield Maximizer",    ja: "利回り最大化" },
  strategyYieldDesc:    { zh: "Stake + Lend + LP 全倉出擊，追求最高年化", en: "Full Stake + Lend + LP deployment for maximum APY", ja: "Stake・Lend・LP全力投入で最高年利を目指す" },
  strategyDefName:      { zh: "防禦模式",    en: "Defensive Mode",     ja: "ディフェンシブモード" },
  strategyDefDesc:      { zh: "70% 穩定幣 + Marinade mSOL，波動最小化", en: "70% stablecoins + Marinade mSOL to minimize volatility", ja: "70%ステーブルコイン + mSOLでボラティリティを最小化" },
  strategySmartName:    { zh: "聰明錢跟隨",  en: "Smart Money Follow", ja: "スマートマネー追随" },
  strategySmartDesc:    { zh: "根據 KOL/Whale 24h 共識信號動態調倉",   en: "Dynamic rebalancing driven by KOL & whale 24h consensus", ja: "KOL・Whale 24時間合意シグナルに基づいて動的調整" },
  strategyCompareLabel: { zh: "比較並選擇策略 · 點擊卡片選中後執行 Agent", en: "Compare & select a strategy · click a card to pick", ja: "戦略を比較・選択 · カードをクリックして選ぶ" },
  strategySelected:     { zh: "✓ 已選擇",   en: "✓ Selected",         ja: "✓ 選択済み" },
  strategyThirtyDay:    { zh: "30日實測",    en: "30d Live",           ja: "30日実績" },
  strategyExecuteWith:  { zh: "▶ 用此策略執行", en: "▶ Execute with this", ja: "▶ この戦略で実行" },
  strategyClickSelect:  { zh: "點擊選擇",    en: "Click to Select",    ja: "クリックして選択" },
  viewBacktest:         { zh: "▼ 查看 30 日回測走勢圖", en: "▼ View 30-day backtest chart", ja: "▼ 30日バックテストグラフ" },
  hideBacktest:         { zh: "▲ 收起回測圖表",         en: "▲ Hide backtest chart",       ja: "▲ バックテストを閉じる" },
  agentFreeRemaining:   { zh: "🆓 {n}/3 次免費剩餘",    en: "🆓 {n}/3 free runs left",     ja: "🆓 {n}/3 無料残り" },
  agentFreeExhausted:   { zh: "💰 免費次數已用完 · $0.10 USDC/次", en: "💰 Free quota used · $0.10 USDC/run", ja: "💰 無料枠終了 · $0.10 USDC/回" },

  // ── Agent Panel — On-Chain Mandate ───────────────────────────────
  mandateTitle:       { zh: "⚙️ 設置投資規則（可選）", en: "⚙️ Investment Rules (Optional)", ja: "⚙️ 投資ルール設定（任意）" },
  mandateSignedTitle: { zh: "⛩️ 投資規則已簽名上鏈", en: "⛩️ Investment Rules Signed Onchain", ja: "⛩️ 投資ルール署名済み" },
  mandateEdit:        { zh: "編輯規則",    en: "Edit Rules",    ja: "ルール編集" },
  mandateCollapse:    { zh: "收起",        en: "Collapse",      ja: "閉じる" },
  mandateMaxStake:    { zh: "最大質押比例", en: "Max Stake %",   ja: "最大ステーク率" },
  mandateSingleCap:   { zh: "單協議上限",  en: "Per-Protocol Cap", ja: "1プロトコル上限" },
  mandateAllowed:     { zh: "允許協議",    en: "Allowed Protocols", ja: "許可プロトコル" },
  mandateSignBtn:     { zh: "👻 用 Phantom 簽名此規則", en: "👻 Sign with Phantom", ja: "👻 Phantomで署名" },
  mandateSigning:     { zh: "等待 Phantom 簽名...",      en: "Waiting for Phantom...", ja: "Phantom署名待ち..." },
  mandateNote:        { zh: "規則將由你的錢包私鑰簽名，寫入鏈上 Memo。AI 只能在此範圍內操作。", en: "Your investment rules are signed by your wallet and stored on-chain. The AI will only act within these boundaries.", ja: "投資ルールはウォレット署名でオンチェーンMemoに記録されます。AIはこの範囲内でのみ動作します。" },
  mandateSignedNote:  { zh: "最大質押 {maxStakePct}% · 單協議上限 {maxSingleProtocolPct}% · 已用 Phantom 簽名", en: "Max stake {maxStakePct}% · Per-protocol cap {maxSingleProtocolPct}% · Signed by Phantom", ja: "最大ステーク {maxStakePct}% · 1プロトコル上限 {maxSingleProtocolPct}% · Phantom署名済み" },

  // ── Agent Panel — Guardian Conditions ───────────────────────────
  guardianTitle:          { zh: "🔰 Guardian 自動條件", en: "🔰 Guardian Watchlist", ja: "🔰 Guardian自動監視" },
  guardianSetup:          { zh: "設置 ▼", en: "Configure ▼", ja: "設定 ▼" },
  guardianCollapse:       { zh: "收起 ▲", en: "Collapse ▲", ja: "閉じる ▲" },
  guardianActive:         { zh: "{n} 個活躍", en: "{n} active", ja: "{n}件アクティブ" },
  guardianActiveSection:  { zh: "活躍條件", en: "Active Conditions", ja: "アクティブ条件" },
  guardianAddSection:     { zh: "新增條件", en: "Add Condition", ja: "条件を追加" },
  guardianAddBtn:         { zh: "✚ 新增條件", en: "✚ Add Condition", ja: "✚ 条件を追加" },
  guardianProcessing:     { zh: "處理中…", en: "Processing…", ja: "処理中…" },
  guardianFooterNote:     { zh: "Guardian 每小時自動評估條件，觸發時通過 AI 顧問通知", en: "Guardian checks your conditions every hour and alerts you through the AI Advisor", ja: "Guardianは1時間ごとに条件を評価し、AIアドバイザーを通じて通知します" },
  guardianThreshold:      { zh: "閾值（預設 {default}）", en: "Threshold (default {default})", ja: "閾値（デフォルト {default}）" },
  guardianNotifyAI:       { zh: "📤 通知 AI", en: "📤 Notify AI", ja: "📤 AIに通知" },
  guardianDeleted:        { zh: "條件已刪除", en: "Condition removed", ja: "条件を削除しました" },
  guardianNoWallet:       { zh: "請先連接錢包", en: "Please connect your wallet first", ja: "ウォレットを接続してください" },
  guardianInvalidVal:     { zh: "請輸入有效的數值", en: "Please enter a valid number", ja: "有効な数値を入力してください" },
  guardianNetErr:         { zh: "網絡錯誤，請重試", en: "Network error — please try again", ja: "ネットワークエラーが発生しました。再試行してください" },
  guardianAddFail:        { zh: "新增失敗，請重試", en: "Failed to add condition — please try again", ja: "追加に失敗しました。再試行してください" },
  guardianAddedMsg:       { zh: "✅ 條件已新增：{label}", en: "✅ Condition added: {label}", ja: "✅ 条件を追加しました：{label}" },
  guardianSentToAI:       { zh: "📤 已發送到 AI 顧問：{label}", en: "📤 Sent to AI Advisor: {label}", ja: "📤 AIアドバイザーに送信しました：{label}" },
  guardianSendFail:       { zh: "發送失敗", en: "Send failed", ja: "送信に失敗しました" },
  // Condition template labels
  condSOLFall:    { zh: "SOL 價格跌破",   en: "SOL Falls Below",        ja: "SOL下落アラート" },
  condSOLFallDesc:{ zh: "SOL 跌破 $150 時提醒", en: "Alert when SOL drops below $150", ja: "SOLが$150を下回ったら通知" },
  condSOLRise:    { zh: "SOL 價格突破",   en: "SOL Breaks Above",       ja: "SOL上昇アラート" },
  condSOLRiseDesc:{ zh: "SOL 突破 $200 時提醒", en: "Alert when SOL rises above $200", ja: "SOLが$200を超えたら通知" },
  condUSDCAPY:    { zh: "USDC APY 上升",  en: "USDC APY Rises",         ja: "USDC APY上昇" },
  condUSDCAPYDesc:{ zh: "Kamino APY 超過 8% 時準備存款", en: "Prepare to deposit when Kamino APY exceeds 8%", ja: "Kamino APYが8%を超えたら入金準備" },
  condStakeAPY:   { zh: "質押 APY 下降",  en: "Staking APY Falls",      ja: "ステーキングAPY低下" },
  condStakeAPYDesc:{ zh: "Marinade APY 低於 6% 時提醒", en: "Alert when Marinade APY falls below 6%", ja: "Marinade APYが6%を下回ったら通知" },
  condHealth:     { zh: "健康系數警告",   en: "Health Factor Warning",  ja: "ヘルスファクター警告" },
  condHealthDesc: { zh: "借貸健康系數低於 1.5 時緊急提醒", en: "Urgent alert when lending health factor drops below 1.5", ja: "健全性係数が1.5を下回った場合に緊急通知" },
  condSmartMoney: { zh: "聰明錢買入信號", en: "Smart Money Buy Signal",  ja: "スマートマネー買いシグナル" },
  condSmartMoneyDesc: { zh: "2個或以上聰明錢同時買入時提醒", en: "Alert when 2 or more smart wallets buy simultaneously", ja: "2つ以上のスマートウォレットが同時に購入したら通知" },
  actionAlert:        { zh: "📢 提醒",    en: "📢 Alert",          ja: "📢 アラート" },
  actionPrepareStake: { zh: "🔒 準備質押", en: "🔒 Prepare to Stake", ja: "🔒 ステーク準備" },
  actionPrepareLend:  { zh: "💰 準備存款", en: "💰 Prepare to Deposit", ja: "💰 入金準備" },
  actionPrepareSwap:  { zh: "🔄 準備兌換", en: "🔄 Prepare to Swap",  ja: "🔄 スワップ準備" },
  // Additional keys for GuardianConditionsPanel
  aiConfidence:         { zh: "AI 置信度", en: "AI Confidence", ja: "AI信頼度" },
  loadingConditions:    { zh: "載入條件中...", en: "Loading conditions...", ja: "条件を読み込み中..." },
  delete:               { zh: "刪除", en: "Delete", ja: "削除" },
  guardianCreditExhausted: { zh: "免費額度不足，請升級訂閱", en: "Free quota exhausted — please upgrade your plan", ja: "無料枠が終了しました。プランのアップグレードが必要です" },
  guardianAlertMsg:     { zh: "⚠️ Guardian Alert — 條件觸發：{label}（當前值已達閾值）→ 請檢查您的倉位，需要調整嗎？", en: "⚠️ Guardian Alert — Condition triggered: {label} (threshold reached) → Check your positions. Want to rebalance?", ja: "⚠️ Guardian Alert — 条件が発動しました：{label}（閾値に達しました）→ ポジションを確認してください。調整しますか？" },
  guardianConditionRemoved: { zh: "🗑️ Guardian 條件已移除：{label}。如需重新設置可返回 Agent Tab。", en: "🗑️ Guardian condition removed: {label}. You can re-add it from the Agent tab.", ja: "🗑️ Guardian条件を削除しました：{label}。再設定はAgentタブから行えます。" },
  guardianNotifyTitle:  { zh: "發送此條件通知到 AI 顧問聊天", en: "Send this condition alert to AI Advisor chat", ja: "この条件アラートをAIアドバイザーに送信" },
} as const;

export type TranslationKey = keyof typeof translations;
