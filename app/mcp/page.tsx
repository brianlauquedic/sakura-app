"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LanguageContext";

type Lang = "zh" | "en" | "ja";

const CONTENT: Record<Lang, {
  back: string;
  badge: string;
  title: string;
  tagline: string;
  subtitle: string;
  introTitle: string;
  introBody: string;
  toolsTitle: string;
  tools: Array<{ name: string; badge: string; badgeColor: string; desc: string; endpoint: string }>;
  quickstartTitle: string;
  steps: Array<{ step: string; title: string; desc: string }>;
  codeTitle: string;
  feeTitle: string;
  fees: Array<{ label: string; value: string }>;
  whyTitle: string;
  whyBody: string;
  contact: string;
  contactHandle: string;
}> = {
  zh: {
    back: "← 返回首頁",
    badge: "🤖 MCP AGENT API · AGENTIC ECONOMY · SOLANA",
    title: "Sakura MCP Agent API",
    tagline: "HTTP 定義信息交換。x402 定義價值交換。",
    subtitle: "任何 MCP 客戶端——Claude Desktop、Cursor、VS Code、或任意自主 AI Agent——均可直接調用 Sakura 三大 Solana DeFi 安全協議。每次調用以鏈上 USDC 原子結算，$1.00 per request，無帳號、無訂閱、無 OAuth、無人工審批門控。",
    introTitle: "為什麼是 x402？",
    introBody: "互聯網誕生時，HTTP 定義了機器間的信息交換協議。Agentic Economy 時代，AI Agent 需要在不依賴人類干預的情況下自主調用服務、自主完成支付。傳統的訂閱制、OAuth 授權流程、人工審批門控——這些機制是為人類設計的，不是為機器設計的。x402（HTTP 402 Payment Required）是 Stripe Machine Payments Protocol 的鏈上原生實現：一個 API 調用、一筆鏈上 USDC 支付、一個原子確認。沒有中間方，沒有帳號系統，沒有等待。Sakura 是 Solana DeFi 安全領域第一個在生產環境落地 x402 的項目。",
    toolsTitle: "三個可調用工具",
    tools: [
      {
        name: "nonce_scan",
        badge: "TOOL I · NONCE GUARDIAN",
        badgeColor: "#FF4444",
        desc: "掃描指定 Solana 錢包的所有 Durable Nonce 賬戶，解析 80 位元組 nonce 結構體的 authority pubkey，標記 authority 異常信號，生成 Claude Sonnet AI 風險報告，並將報告 SHA-256 哈希透過 Memo Program 永久刻入 Solana 主網。",
        endpoint: "tool: nonce_scan · param: wallet_address (string)",
      },
      {
        name: "ghost_simulate",
        badge: "TOOL II · GHOST RUN",
        badgeColor: "#7C6FFF",
        desc: "接收自然語言 DeFi 策略描述，Claude AI 解析意圖並構建完整交易序列，simulateTransaction 在真實主網狀態下幽靈執行全程，返回精確 token delta、APY 估算、gas 消耗、衝突檢測。確認前零資本風險。",
        endpoint: "tool: ghost_simulate · param: strategy (string)",
      },
      {
        name: "shield_monitor",
        badge: "TOOL III · LIQUIDATION SHIELD",
        badgeColor: "#FF9F0A",
        desc: "掃描指定錢包在 Kamino、MarginFi 的借貸倉位健康因子，計算清算觸發價格，模擬救援還款效果，生成 AI 風險分析與建議行動。結合 SPL Token Approve 預授權可實現全自動清算救援。",
        endpoint: "tool: shield_monitor · param: wallet_address (string)",
      },
    ],
    quickstartTitle: "四步接入",
    steps: [
      { step: "1", title: "準備 Solana 錢包與 USDC", desc: "確保你的調用錢包持有足夠 USDC（每次調用 $1.00）。Phantom 或任何 Solana 錢包均可。無需創建帳號或完成 KYC。" },
      { step: "2", title: "發送 $1.00 USDC 至 Sakura Fee Wallet", desc: "每次工具調用前，從你的錢包向 Sakura Fee Wallet 發送 $1.00 USDC（SPL Token Transfer）。保留 tx signature——這是你的支付憑證。" },
      { step: "3", title: "在請求 Header 附上支付憑證", desc: "在 MCP JSON-RPC 請求中附上 header：x-payment: <tx_signature>。Sakura 後端會實時驗證鏈上支付記錄，確認金額、收款方、付款方均正確。防重放保護：每個 tx signature 只可使用一次。" },
      { step: "4", title: "接收結果 · AI 分析 · 鏈上存證", desc: "工具調用返回完整 AI 分析報告。Nonce Guardian 和 Shield Monitor 的 AI 報告 SHA-256 哈希同步寫入 Solana Memo Program，提供不可篡改的鏈上審計記錄——這是 Verifiable Compute 的直接實現。" },
    ],
    codeTitle: "示例代碼",
    feeTitle: "費用結構",
    fees: [
      { label: "每次工具調用", value: "$1.00 USDC（鏈上原子結算）" },
      { label: "支付方式", value: "SPL Token Transfer → Sakura Fee Wallet" },
      { label: "計費時機", value: "調用前支付，驗證後執行" },
      { label: "退款政策", value: "鏈上支付不可逆，請確認工具參數後再支付" },
      { label: "適用客戶端", value: "Claude Desktop · Cursor · VS Code · 任意 MCP 客戶端 · 自主 AI Agent" },
    ],
    whyTitle: "為什麼這對 Agentic Economy 重要",
    whyBody: "傳統 API 經濟依賴人類完成帳號注冊、訂閱付費、OAuth 授權——每一步都需要人類介入。當 AI Agent 成為主要的 API 消費者，這個模型失效了。x402 讓 AI Agent 像人類刷卡一樣自主完成支付：一個 HTTP 頭、一筆鏈上轉帳、一個即時確認。Sakura 的每一個工具調用結果都附帶 Verifiable Compute 憑證——SHA-256 哈希永久刻入 Solana 主網，任何人可在 Solscan 獨立核驗 AI 的完整推理路徑。這是 AI 透明度在技術層面能達到的最高標準。",
    contact: "開發者支持、接入諮詢：",
    contactHandle: "𝕏 @sakuraaijp",
  },
  en: {
    back: "← Back to Home",
    badge: "🤖 MCP AGENT API · AGENTIC ECONOMY · SOLANA",
    title: "Sakura MCP Agent API",
    tagline: "HTTP defined information exchange. x402 defines value exchange.",
    subtitle: "Any MCP client — Claude Desktop, Cursor, VS Code, or any autonomous AI agent — can call Sakura's three Solana DeFi security protocols directly. Every call settles atomically in on-chain USDC at $1.00 per request. No account. No subscription. No OAuth. No human approval gate.",
    introTitle: "Why x402?",
    introBody: "When the internet was born, HTTP defined how machines exchange information. In the Agentic Economy era, AI agents need to call services and complete payments autonomously — without waiting for human intervention. Traditional subscriptions, OAuth flows, and manual approval gates are designed for humans, not machines. x402 (HTTP 402 Payment Required) is the on-chain native implementation of Stripe's Machine Payments Protocol: one API call, one on-chain USDC payment, one atomic confirmation. No intermediary. No account system. No waiting. Sakura is the first project in the Solana DeFi security domain to deploy x402 in a production environment.",
    toolsTitle: "Three Available Tools",
    tools: [
      {
        name: "nonce_scan",
        badge: "TOOL I · NONCE GUARDIAN",
        badgeColor: "#FF4444",
        desc: "Scans all Durable Nonce accounts for a given Solana wallet, parses the 80-byte nonce struct's authority pubkey, flags authority anomalies, generates a Claude Sonnet AI risk report, and permanently inscribes the report's SHA-256 hash on Solana mainnet via Memo Program.",
        endpoint: "tool: nonce_scan · param: wallet_address (string)",
      },
      {
        name: "ghost_simulate",
        badge: "TOOL II · GHOST RUN",
        badgeColor: "#7C6FFF",
        desc: "Accepts a natural-language DeFi strategy description. Claude AI parses intent and builds a full transaction sequence. simulateTransaction ghost-executes against live mainnet state, returning exact token deltas, APY estimates, gas costs, and conflict detection. Zero capital at risk before confirmation.",
        endpoint: "tool: ghost_simulate · param: strategy (string)",
      },
      {
        name: "shield_monitor",
        badge: "TOOL III · LIQUIDATION SHIELD",
        badgeColor: "#FF9F0A",
        desc: "Scans lending position health factors for a wallet across Kamino and MarginFi, calculates liquidation trigger prices, simulates rescue repayment outcomes, and generates AI risk analysis with recommended actions. Combined with SPL Token Approve pre-authorization, enables fully autonomous liquidation rescue.",
        endpoint: "tool: shield_monitor · param: wallet_address (string)",
      },
    ],
    quickstartTitle: "Four Steps to Integrate",
    steps: [
      { step: "1", title: "Prepare a Solana wallet with USDC", desc: "Ensure your calling wallet holds sufficient USDC ($1.00 per call). Phantom or any Solana wallet works. No account creation or KYC required." },
      { step: "2", title: "Send $1.00 USDC to Sakura Fee Wallet", desc: "Before each tool call, transfer $1.00 USDC (SPL Token Transfer) from your wallet to the Sakura Fee Wallet. Save the tx signature — this is your payment proof." },
      { step: "3", title: "Include payment proof in request header", desc: "Include the header x-payment: <tx_signature> in your MCP JSON-RPC request. Sakura's backend verifies the on-chain payment in real time, confirming amount, recipient, and sender. Replay protection: each tx signature is accepted only once." },
      { step: "4", title: "Receive results · AI analysis · On-chain proof", desc: "The tool call returns a complete AI analysis report. SHA-256 hashes of Nonce Guardian and Shield Monitor AI reports are simultaneously inscribed on Solana Memo Program — an immutable on-chain audit record and a direct implementation of Verifiable Compute." },
    ],
    codeTitle: "Example Code",
    feeTitle: "Fee Structure",
    fees: [
      { label: "Per tool call", value: "$1.00 USDC (atomic on-chain settlement)" },
      { label: "Payment method", value: "SPL Token Transfer → Sakura Fee Wallet" },
      { label: "Billing trigger", value: "Pay before call, execute after verification" },
      { label: "Refund policy", value: "On-chain payments are irreversible — verify tool params before paying" },
      { label: "Compatible clients", value: "Claude Desktop · Cursor · VS Code · Any MCP client · Autonomous AI agents" },
    ],
    whyTitle: "Why This Matters for the Agentic Economy",
    whyBody: "The traditional API economy depends on humans completing account registration, subscription payments, and OAuth authorization — every step requires human intervention. When AI agents become the primary API consumers, this model breaks. x402 lets AI agents pay autonomously, like a human swiping a card: one HTTP header, one on-chain transfer, one instant confirmation. Every Sakura tool call result includes a Verifiable Compute credential — a SHA-256 hash permanently inscribed on Solana mainnet, independently verifiable by anyone on Solscan. This is the highest standard of AI accountability achievable at the technical level.",
    contact: "Developer support and integration inquiries:",
    contactHandle: "𝕏 @sakuraaijp",
  },
  ja: {
    back: "← ホームへ戻る",
    badge: "🤖 MCP AGENT API · AGENTIC ECONOMY · SOLANA",
    title: "Sakura MCP Agent API",
    tagline: "HTTPは情報交換を定義した。x402は価値交換を定義する。",
    subtitle: "Claude Desktop・Cursor・VS Code、その他あらゆる自律AIエージェントを含む任意のMCPクライアントが、Sakuraの3つのSolana DeFiセキュリティプロトコルを直接呼び出せます。各呼び出しはオンチェーンUSDCで原子決済、1リクエスト$1.00。アカウント不要。サブスクリプション不要。OAuth不要。人間の承認ゲート不要。",
    introTitle: "なぜx402なのか？",
    introBody: "インターネットが誕生したとき、HTTPはマシン間の情報交換プロトコルを定義しました。Agentic Economy時代、AIエージェントは人間の介入なしに自律的にサービスを呼び出し、支払いを完了する必要があります。従来のサブスクリプション、OAuthフロー、手動承認ゲート——これらの仕組みは人間のために設計されたものであり、マシンのためではありません。x402（HTTP 402 Payment Required）はStripe Machine Payments Protocolのオンチェーンネイティブ実装です：1つのAPI呼び出し、1回のオンチェーンUSDC支払い、1つの原子確認。中間者なし。アカウントシステムなし。待機なし。SakuraはSolana DeFiセキュリティ領域でx402を本番環境に初めて実装したプロジェクトです。",
    toolsTitle: "3つの利用可能ツール",
    tools: [
      {
        name: "nonce_scan",
        badge: "ツール I · NONCE GUARDIAN",
        badgeColor: "#FF4444",
        desc: "指定したSolanaウォレットのすべてのDurable Nonceアカウントをスキャンし、80バイトのnonce構造体のauthority pubkeyを解析、authorityの異常を検出し、Claude Sonnet AIリスクレポートを生成、レポートのSHA-256ハッシュをMemo Programを通じてSolanaメインネットに永久刻印します。",
        endpoint: "tool: nonce_scan · param: wallet_address (string)",
      },
      {
        name: "ghost_simulate",
        badge: "ツール II · GHOST RUN",
        badgeColor: "#7C6FFF",
        desc: "自然言語のDeFi戦略説明を受け取り、Claude AIが意図を解析してトランザクションシーケンスを構築、simulateTransactionがリアルメインネット状態でゴースト実行し、正確なトークンデルタ・APY推定・ガスコスト・競合検出を返します。確認前の資本リスクはゼロ。",
        endpoint: "tool: ghost_simulate · param: strategy (string)",
      },
      {
        name: "shield_monitor",
        badge: "ツール III · LIQUIDATION SHIELD",
        badgeColor: "#FF9F0A",
        desc: "KaminoとMarginFiにわたるウォレットの貸出ポジションのヘルスファクターをスキャンし、清算トリガー価格を計算、救済返済のシミュレーション結果と推奨アクションを含むAIリスク分析を生成。SPL Token Approve事前承認と組み合わせることで、完全自律型清算救済が可能になります。",
        endpoint: "tool: shield_monitor · param: wallet_address (string)",
      },
    ],
    quickstartTitle: "4ステップで統合",
    steps: [
      { step: "1", title: "USDCを持つSolanaウォレットを準備", desc: "呼び出しウォレットに十分なUSDCがあることを確認（1呼び出しあたり$1.00）。PhantomやあらゆるSolanaウォレットが使用可能。アカウント作成やKYC不要。" },
      { step: "2", title: "$1.00 USDCをSakura Fee Walletに送金", desc: "各ツール呼び出し前に、ウォレットからSakura Fee Walletへ$1.00 USDC（SPL Token Transfer）を送金。tx signatureを保存してください——これが支払い証明です。" },
      { step: "3", title: "リクエストヘッダーに支払い証明を含める", desc: "MCP JSON-RPCリクエストにヘッダーを含めます：x-payment: <tx_signature>。Sakuraのバックエンドがオンチェーンの支払い記録をリアルタイム検証し、金額・受取人・支払人を確認。リプレイ攻撃対策：各tx signatureは1回のみ使用可能。" },
      { step: "4", title: "結果を受信 · AI分析 · オンチェーン証明", desc: "ツール呼び出しが完全なAI分析レポートを返します。Nonce GuardianとShield MonitorのAIレポートのSHA-256ハッシュは同時にSolana Memo Programに刻印——改ざん不可能なオンチェーン監査記録であり、Verifiable Computeの直接実装です。" },
    ],
    codeTitle: "サンプルコード",
    feeTitle: "料金体系",
    fees: [
      { label: "ツール呼び出し1回あたり", value: "$1.00 USDC（オンチェーン原子決済）" },
      { label: "支払い方法", value: "SPL Token Transfer → Sakura Fee Wallet" },
      { label: "課金タイミング", value: "呼び出し前に支払い、検証後に実行" },
      { label: "返金ポリシー", value: "オンチェーン支払いは不可逆——支払い前にツールパラメータを確認してください" },
      { label: "対応クライアント", value: "Claude Desktop · Cursor · VS Code · 任意MCPクライアント · 自律AIエージェント" },
    ],
    whyTitle: "Agentic Economyにとっての重要性",
    whyBody: "従来のAPIエコノミーは人間がアカウント登録・サブスクリプション支払い・OAuth認証を完了することに依存しています——すべてのステップに人間の介入が必要です。AIエージェントが主要なAPIコンシューマーになると、このモデルは機能しなくなります。x402はAIエージェントが人間がカードをスワイプするように自律的に支払いを完了することを可能にします：1つのHTTPヘッダー、1回のオンチェーン送金、1つの即時確認。SakuraのすべてのツールコールはVerifiable Computeクレデンシャルを含みます——SHA-256ハッシュがSolanaメインネットに永久刻印され、誰でもSolscanで独立してAIの推論経路を検証可能。これはAIの説明責任が技術的に達成できる最高水準です。",
    contact: "開発者サポート・統合相談：",
    contactHandle: "𝕏 @sakuraaijp",
  },
};

const CURL_EXAMPLE = `# Step 1: Send $1.00 USDC payment (get tx signature from wallet)
# Step 2: Call the MCP tool with payment proof

curl -X POST https://sakura-app.vercel.app/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "x-payment: <YOUR_TX_SIGNATURE>" \\
  -H "x-wallet: <YOUR_WALLET_ADDRESS>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "nonce_scan",
      "arguments": {
        "wallet_address": "<TARGET_WALLET>"
      }
    }
  }'`;

const TS_EXAMPLE = `import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

// Step 1: Pay $1.00 USDC to Sakura Fee Wallet
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SAKURA_FEE_WALLET = "<SAKURA_FEE_WALLET_ADDRESS>";

async function callSakuraTool(
  toolName: "nonce_scan" | "ghost_simulate" | "shield_monitor",
  params: Record<string, string>
) {
  // Build and send $1.00 USDC payment transaction
  const paymentTx = new Transaction().add(
    createTransferCheckedInstruction(
      senderAta,           // your USDC ATA
      new PublicKey(USDC_MINT),
      sakuraAta,           // Sakura fee wallet USDC ATA
      senderPublicKey,
      1_000_000,           // $1.00 USDC (6 decimals)
      6
    )
  );
  const txSig = await connection.sendTransaction(paymentTx, [wallet]);
  await connection.confirmTransaction(txSig);

  // Call Sakura MCP tool with payment proof
  const response = await fetch("https://sakura-app.vercel.app/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payment": txSig,
      "x-wallet": senderPublicKey.toString(),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: params },
    }),
  });

  return response.json();
}

// Example: Scan for Nonce attack vectors
const result = await callSakuraTool("nonce_scan", {
  wallet_address: "YourWalletAddressHere",
});`;

export default function McpPage() {
  const { lang } = useLang();
  const c = CONTENT[lang];

  const sectionStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "28px 28px 24px",
    marginBottom: 20,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Back */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", letterSpacing: "0.03em" }}>
            {c.back}
          </Link>
        </div>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,91,255,0.08)", border: "1px solid rgba(99,91,255,0.25)",
          borderRadius: 20, padding: "5px 14px", marginBottom: 24,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#635BFF", display: "inline-block" }} />
          <span style={{ fontSize: 11, color: "#8B87FF", fontWeight: 500, letterSpacing: 1.5, fontFamily: "var(--font-mono)" }}>
            {c.badge}
          </span>
        </div>

        {/* Title */}
        <h1 className="jp-heading" style={{ fontSize: 32, fontWeight: 300, color: "var(--text-primary)", marginBottom: 10, letterSpacing: "0.06em" }}>
          {c.title}
        </h1>
        <div style={{ fontSize: 14, color: "#8B87FF", marginBottom: 16, letterSpacing: "0.04em", fontFamily: "var(--font-heading)" }}>
          {c.tagline}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 2.0, marginBottom: 40, maxWidth: 640 }}>
          {c.subtitle}
        </p>

        {/* Intro: Why x402 */}
        <div style={{ ...sectionStyle, borderTop: "2px solid #635BFF" }}>
          <div style={{ fontSize: 10, color: "#8B87FF", letterSpacing: "0.18em", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
            WHY x402
          </div>
          <h2 className="jp-heading" style={{ fontSize: 16, fontWeight: 400, color: "var(--text-primary)", marginBottom: 14, letterSpacing: "0.05em" }}>
            {c.introTitle}
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 2.1, margin: 0 }}>
            {c.introBody}
          </p>
        </div>

        {/* Tools */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-mono)", marginBottom: 16, textTransform: "uppercase" }}>
            {c.toolsTitle}
          </div>
          <div className="jp-divider" style={{ margin: "0 0 16px" }} />
          {c.tools.map((tool) => (
            <div key={tool.name} style={{
              ...sectionStyle,
              borderTop: `2px solid ${tool.badgeColor}`,
              marginBottom: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  background: `${tool.badgeColor}18`, border: `1px solid ${tool.badgeColor}35`,
                  borderRadius: 6, padding: "3px 10px",
                  fontSize: 9, color: tool.badgeColor, letterSpacing: "0.14em", fontFamily: "var(--font-mono)",
                }}>{tool.badge}</div>
              </div>
              <div className="jp-heading" style={{ fontSize: 15, fontWeight: 400, color: "var(--text-primary)", marginBottom: 10, letterSpacing: "0.05em" }}>
                {tool.name}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 2.0, marginBottom: 12 }}>
                {tool.desc}
              </p>
              <div style={{
                fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)",
                background: "var(--bg-base)", border: "1px solid var(--border)",
                borderRadius: 4, padding: "6px 10px", letterSpacing: "0.05em",
              }}>
                {tool.endpoint}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Start */}
        <div style={{ ...sectionStyle, borderTop: "2px solid var(--accent)" }}>
          <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.18em", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
            QUICK START
          </div>
          <h2 className="jp-heading" style={{ fontSize: 16, fontWeight: 400, color: "var(--text-primary)", marginBottom: 20, letterSpacing: "0.05em" }}>
            {c.quickstartTitle}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {c.steps.map((s) => (
              <div key={s.step} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: "var(--accent-soft)", border: "1px solid var(--accent-mid)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)",
                }}>{s.step}</div>
                <div>
                  <div className="jp-heading" style={{ fontSize: 13, fontWeight: 400, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "0.04em" }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.9 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Examples */}
        <div style={{ ...sectionStyle }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-mono)", marginBottom: 12, textTransform: "uppercase" }}>
            {c.codeTitle}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#8B87FF", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
              CURL
            </div>
            <pre style={{
              fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)",
              background: "var(--bg-base)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "14px 16px", overflowX: "auto",
              lineHeight: 1.7, margin: 0,
            }}>{CURL_EXAMPLE}</pre>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#8B87FF", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
              TYPESCRIPT
            </div>
            <pre style={{
              fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)",
              background: "var(--bg-base)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "14px 16px", overflowX: "auto",
              lineHeight: 1.7, margin: 0,
            }}>{TS_EXAMPLE}</pre>
          </div>
        </div>

        {/* Fee Structure */}
        <div style={{ ...sectionStyle }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-mono)", marginBottom: 16, textTransform: "uppercase" }}>
            {c.feeTitle}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {c.fees.map((fee, i) => (
              <div key={i} style={{
                display: "flex", gap: 16, alignItems: "flex-start",
                padding: "12px 16px",
                borderBottom: i < c.fees.length - 1 ? "1px solid var(--border)" : "none",
                background: i % 2 === 0 ? "var(--bg-base)" : "var(--bg-card)",
              }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 140, letterSpacing: "0.03em" }}>{fee.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-primary)", letterSpacing: "0.03em" }}>{fee.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Why it matters */}
        <div style={{ ...sectionStyle, borderTop: "2px solid var(--gold)" }}>
          <div style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.18em", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
            VERIFIABLE COMPUTE · SOLANA
          </div>
          <h2 className="jp-heading" style={{ fontSize: 16, fontWeight: 400, color: "var(--text-primary)", marginBottom: 14, letterSpacing: "0.05em" }}>
            {c.whyTitle}
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 2.1, margin: 0 }}>
            {c.whyBody}
          </p>
        </div>

        {/* API Endpoint Reference */}
        <div style={{
          background: "var(--bg-base)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "14px 18px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-mono)", marginBottom: 10, textTransform: "uppercase" }}>
            API REFERENCE
          </div>
          {[
            { method: "POST", path: "/api/mcp", desc: "MCP JSON-RPC endpoint (x402 gated)" },
            { method: "GET",  path: "/api/mcp", desc: "List available tools (free)" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: i === 0 ? 6 : 0 }}>
              <span style={{
                fontSize: 9, fontFamily: "var(--font-mono)", color: "#8B87FF",
                background: "rgba(99,91,255,0.1)", border: "1px solid rgba(99,91,255,0.2)",
                borderRadius: 3, padding: "2px 7px", letterSpacing: "0.08em", flexShrink: 0,
              }}>{r.method}</span>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                {r.path}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>— {r.desc}</span>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div style={{ textAlign: "center", paddingTop: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{c.contact}</div>
          <a href="https://x.com/sakuraaijp" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", letterSpacing: "0.04em" }}>
            {c.contactHandle}
          </a>
        </div>

      </div>
      <Footer />
    </div>
  );
}
