"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";

const CONTENT = {
  en: {
    badge: "PRIVACY · SAKURA AGENTIC BOUNDS LAYER",
    title: "Privacy Policy",
    updated: "Last updated: 6 April 2026",
    sections: [
      {
        heading: "1. Overview",
        body: [
          `This Privacy Policy ("Policy") describes how Sakura ("Sakura," "we," "us," or "our") collects, uses, stores, and shares information when you access or use Sakura — our Solana-native execution-bounds layer for AI agents — together with the web application, the on-chain Anchor program, the Groth16 verifier, the x402 MCP server, and all associated interfaces (collectively, the "Services").`,
          `Sakura is non-custodial. We do not hold custody of your assets. Intent commitments are signed by you and anchored as 32-byte Poseidon hashes on-chain; the underlying policy values never leave your browser. Every agent action that claims to operate inside your bounds must submit a Groth16 proof, verified on-chain by the alt_bn128 pairing syscall, inside the same atomic Solana v0 transaction as the DeFi instruction it accompanies. Sakura's on-chain program has no authority to move funds outside that gate. Your wallet remains entirely under your control at all times.`,
          `By using the Services, you acknowledge that you have read and understood this Policy and consent to the collection and use of your information as described herein. This Policy should be read alongside our Terms of Service.`,
        ],
      },
      {
        heading: "2. Information We Collect",
        subsections: [
          {
            title: "2.1 Wallet Information",
            items: [
              "Public wallet address — when you connect a Solana wallet (Phantom, Backpack, OKX, or any other adapter-compatible wallet), we receive only your public address. We never request or access your private keys, seed phrase, or signing authority beyond the scope you sign at each prompt.",
              "On-chain transactions — public Solana transactions involving your address are, by design, visible to anyone via a Solana RPC or block explorer; we query them through a third-party RPC provider (currently Helius) for UI display. We do not add to the public record beyond the transactions you choose to sign.",
            ],
          },
          {
            title: "2.2 What Stays in Your Browser (Never Uploaded)",
            items: [
              "Raw intent values — the natural-language description, per-action cap, USD cap, protocol bitmap, action bitmap, expiry, and nonce you provide during intent signing are folded into a 32-byte Poseidon commitment in your browser. Only the commitment is broadcast on-chain. The underlying values are never transmitted to a Sakura server.",
              "Intent witness in localStorage — to allow your chosen AI agent to later generate Groth16 proofs for in-bounds actions, the pre-image of the commitment (the \"witness\") is stored in your browser's localStorage, keyed by your wallet and the commitment hash. It is read only by code running in your browser. Clearing site data deletes it.",
              "Zero-knowledge proofs — Groth16 proofs are produced in your browser via snarkjs. We do not receive the witness that produced them; only the public proof bytes (which, by construction, reveal no policy value) are placed on-chain.",
            ],
          },
          {
            title: "2.3 Technical, Rate-Limit, and Bot-Defense Data",
            items: [
              "HTTP request metadata — IP address, user-agent string, Accept-Language header, and request timestamp, used transiently for rate-limiting and bot detection.",
              "Bot-defense metrics — our middleware (built on Upstash Redis) computes an anonymised header-fingerprint score for each request and stores, for a short TTL, counters keyed by IP and by wallet address. These are used to blunt scraping, faucet abuse, and automated attacks.",
              "Faucet requests — the /api/faucet endpoint accepts a devnet wallet address and dispenses 0.05 SOL + 100 test USDC. We store the submitted address and the source IP in Upstash Redis under a 24-hour TTL strictly to enforce the \"one claim per address, five per IP per day\" rate limits.",
              "x402 MCP calls — the /api/mcp endpoint records each settled payment's transaction signature (which is already a public on-chain artifact) together with the calling IP, strictly to prevent replay and enforce rate limits.",
              "In-app telemetry — pages visited and error traces (browser console errors, SDK exceptions) that we receive for debugging. No advertising or cross-site tracking beacons are installed.",
            ],
          },
          {
            title: "2.4 What We Do Not Collect",
            items: [
              "No KYC. We do not ask for your name, photograph, government ID, or tax residency.",
              "No email or account. We do not operate an account system, password store, or email list.",
              "No AI prompts or model outputs. Sakura does not run a managed AI agent on your behalf; we do not collect conversations with any AI system.",
              "No payment-card data. Sakura does not process fiat or card payments and does not operate a subscription.",
              "No data sales. We do not sell, rent, or license personal information to advertisers or data brokers.",
            ],
          },
          {
            title: "2.5 Cookies and Local Storage",
            body: "Sakura uses a small number of strictly-necessary browser storage items: (a) a localStorage entry caching your language preference; (b) a localStorage entry holding your intent witness, as described in 2.2; (c) a session-scoped cookie for CSRF protection on authenticated endpoints. We do not use third-party advertising or cross-site tracking cookies. You may clear all of the above at any time via your browser's site-data controls.",
          },
          {
            title: "2.6 Minors",
            body: "The Services are intended for users who are at least 18 years of age, or the age of contractual majority in your jurisdiction, whichever is higher. We do not knowingly collect personal information from persons under 13 (in the United States) or under 16 (in the EEA and jurisdictions applying equivalent data-protection standards). If you believe a minor has provided us information, please contact us and we will delete the relevant off-chain records.",
          },
        ],
      },
      {
        heading: "3. How We Use Your Information",
        intro: "We use the information described in Section 2 strictly for the following purposes:",
        items: [
          "Deliver the verifier Services — rendering the intent-signing interface, relaying your signed transactions to the Solana network via an RPC provider, and displaying the ActionRecord audit trail.",
          "Abuse defense and rate-limiting — preventing faucet exhaustion, MCP replay, and automated scraping, using the anonymised metrics described in 2.3.",
          "Security — detecting unauthorised-access patterns and enforcing sanctions-list screening at the IP and wallet-address level.",
          "Product improvement — using aggregated, anonymised metrics (e.g. page latency, proof generation time distribution) to improve performance. No identifying data is used for this purpose.",
          "Legal obligations — complying with applicable law, lawful authority requests, and enforcement of our Terms of Service.",
        ],
        note: "We do not operate a managed AI agent, and we do not collect prompts, model outputs, or any AI conversation history. We do not train any machine-learning model on your data.",
      },
      {
        heading: "4. Sharing of Information",
        intro: "We do not sell your personal information. Categories of sharing are strictly limited to the following:",
        subsections: [
          { title: "Infrastructure providers", body: "We engage a small set of infrastructure vendors under data-processing agreements: Vercel (application hosting), Upstash (managed Redis for rate-limiting and bot-defense counters), and one or more Solana RPC providers (currently Helius) for blockchain reads. Oracle networks (Pyth, Switchboard) are consumed on-chain and receive no off-chain data from us." },
          { title: "Blockchain data", body: "The Solana blockchain is a public ledger by design. Your wallet address and any transaction you sign are permanently and independently visible via any Solana RPC or explorer. Sakura never writes to the chain on your behalf; every on-chain write originates from a signature you personally produce in your own wallet." },
          { title: "Legal and regulatory authorities", body: "We may disclose information in response to lawful requests from competent authorities, to comply with applicable law, or to establish, exercise, or defend legal claims." },
          { title: "Sanctions screening", body: "We screen IP addresses and wallet addresses against OFAC, UN, EU, UK, and Singapore sanctions designations. Blocked addresses are not retained beyond what is necessary to enforce the block." },
          { title: "Corporate transactions", body: "In the event of a merger, acquisition, financing, or similar transaction, information may be transferred to a successor or acquirer, subject to privacy protections no less protective than those in this Policy." },
          { title: "Aggregated or anonymised statistics", body: "We may publish aggregated or irreversibly anonymised figures (for example, total actions verified, stress-test outcomes, or median proof time) in documentation or marketing materials." },
        ],
      },
      {
        heading: "5. Blockchain Data Notice",
        body: ["The Solana blockchain is a public ledger. Your wallet address and all transactions associated with it are permanently visible on-chain. Sakura reads this public data to provide analysis but cannot delete or modify any on-chain records. Connecting your wallet to Sakura does not grant us any signing authority or control over your funds."],
      },
      {
        heading: "6. Security",
        body: [
          "All traffic between your browser and Sakura endpoints is carried over TLS. Operational access to infrastructure is limited and audited. Sakura never requests your private key, seed phrase, or signatures beyond the two classes described in the Terms of Service §3.2 (intent_sign and, optionally, SPL Token Approve).",
          "No system is perfectly secure. You remain responsible for the security of the wallet software you use, the device on which it runs, and the custody of your seed phrase. If you believe your wallet has been compromised, revoke any outstanding SPL Token Approve allowance and any active intent via your own wallet, without waiting for us.",
        ],
      },
      {
        heading: "7. Data Retention",
        intro: "Off-chain retention windows are calibrated to purpose:",
        items: [
          "Rate-limit and bot-defense counters — stored in Upstash Redis under a short TTL, typically 24 hours, after which the counters expire automatically.",
          "HTTP request metadata (IP, user-agent) — retained for up to 14 days in operational logs for abuse investigation, then deleted.",
          "x402 payment records — transaction signatures are stored for replay prevention; the corresponding off-chain log entry expires within 30 days, while the signature itself remains on-chain permanently as a Solana transaction.",
          "Aggregated product metrics — retained indefinitely in anonymised form.",
        ],
        note: "On-chain records (intent commitments, ActionRecord PDAs, payment transactions) are permanent by design and cannot be deleted by Sakura or anyone else — see Section 8.",
      },
      {
        heading: "8. Your Choices and Rights",
        intro: "Subject to your jurisdiction and to the constraints below, you may have the right to:",
        items: [
          "Access a copy of the off-chain personal information we hold about you;",
          "Correct inaccurate or incomplete off-chain information;",
          "Delete off-chain personal data, subject to legal retention obligations;",
          "Restrict or object to specific processing activities;",
          "Data portability — receive your off-chain data in a structured, machine-readable format;",
          "Withdraw consent to optional processing at any time; and",
          "Lodge a complaint with your local data-protection supervisory authority (for EEA/UK residents, the authority in your country of residence).",
        ],
        note: "On-chain data is beyond the reach of these rights. Your wallet address, intent commitment hashes, Groth16 public inputs, and ActionRecord PDAs are written to the Solana blockchain, which is immutable and outside Sakura's control. Neither Sakura nor anyone else can delete, amend, or redact on-chain records. This is a property of the underlying public ledger, not a Sakura policy choice. Rights of access and portability as to on-chain data are effectively self-service via any Solana RPC or block explorer. To exercise any of the above rights against our off-chain records, contact us via @sakuraaijp on X. For EEA/UK residents, we act as the data controller; our lawful bases for processing are (i) legitimate interest in operating and securing the Services, (ii) performance of a contract (the Terms of Service), and (iii) compliance with legal obligations. For California residents, we do not sell or share personal information as those terms are defined under the CCPA.",
      },
      {
        heading: "9. Updates to This Policy",
        body: ["We may revise this Policy from time to time. Material changes will be communicated in-app with reasonable advance notice. Continued use of the Services after the effective date of any update constitutes your acceptance of the revised Policy."],
      },
      {
        heading: "10. Contact",
        body: ["If you have questions, concerns, or requests relating to this Privacy Policy, please contact us:"],
        contact: true,
      },
    ],
  },
  zh: {
    badge: "隱私 · SAKURA AGENTIC BOUNDS LAYER",
    title: "隱私政策",
    updated: "最後更新：2026年4月6日",
    sections: [
      {
        heading: "1. 概述",
        body: [
          `本隱私政策（「政策」）說明 Sakura（「Sakura」、「我們」或「我方」）在您訪問或使用 Sakura——Solana 原生的代理執行邊界層——及其配套網頁應用程式、鏈上 Anchor 程式、Groth16 驗證器、x402 MCP 伺服器及所有相關介面（統稱「服務」）時，如何收集、使用、儲存和分享資訊。`,
          `Sakura 為非託管架構。我們不持有您的資產。意圖承諾由您親自簽署，並以 32 位元組 Poseidon 雜湊定錨於鏈上；底層的策略值從不離開您的瀏覽器。任何代理宣稱要在您的邊界內動作時，都必須提交一份 Groth16 證明，由鏈上 alt_bn128 配對 syscall 驗證；此證明必須與其所附帶的 DeFi 指令，同處於一筆 Solana v0 原子交易之內。Sakura 的鏈上程式在此閘門之外，沒有任何動用資金的權限。您的錢包始終完全由您掌控。`,
          `使用服務即表示您已閱讀並理解本政策，並同意依本政策所述方式收集和使用您的資訊。本政策應與我們的使用條款一併閱讀。`,
        ],
      },
      {
        heading: "2. 我們收集的資訊",
        subsections: [
          {
            title: "2.1 錢包資訊",
            items: [
              "公開錢包位址——當您以 Solana 錢包（Phantom、Backpack、OKX 或任一相容介面之錢包）連接服務時，我們僅接收您的公開位址。除您每次彈窗所親自簽署之範圍外，我們絕不要求或存取您的私鑰、助記詞、或任何簽署權限。",
              "鏈上交易——涉及您位址之 Solana 交易，依設計本即公開可見；我們透過第三方 RPC 供應商（目前為 Helius）查詢以顯示於介面。除您本人選擇簽署之交易外，我方不會增加任何公開紀錄。",
            ],
          },
          {
            title: "2.2 留在您瀏覽器內（絕不上傳）",
            items: [
              "意圖原始值——您於簽署時提供的自然語言描述、單次金額上限、USD 上限、協議位元圖、動作位元圖、過期時間及 nonce，於您的瀏覽器內被壓縮為 32 位元組 Poseidon 承諾。鏈上僅廣播承諾本身；原始值不傳送至 Sakura 任何伺服器。",
              "意圖見證值（localStorage）——為使您所選擇之 AI 代理日後可為合規動作生成 Groth16 證明，承諾之前像（即「見證值」）儲存於您瀏覽器之 localStorage，以錢包位址與承諾雜湊作為索引；僅由您瀏覽器內的程式碼讀取。清除站點資料即可刪除。",
              "零知識證明——Groth16 證明於您瀏覽器內透過 snarkjs 產生。我方不接收其生成時所用之見證值；僅公開證明位元組（於構造上不揭露任何策略值）被送上鏈。",
            ],
          },
          {
            title: "2.3 技術性、速率限制與反機器人資料",
            items: [
              "HTTP 請求元資料——IP 位址、user-agent 字串、Accept-Language 表頭與請求時戳；僅短期用於速率限制與機器人偵測。",
              "反機器人指標——我們的中介層（建構於 Upstash Redis）為每筆請求計算匿名化的表頭指紋分數，並以短期 TTL 儲存以 IP 及錢包位址為鍵之計數器，用於抑制爬蟲、faucet 濫用及自動化攻擊。",
              "Faucet 請求——/api/faucet 端點接受 devnet 錢包位址，發放 0.05 SOL + 100 測試 USDC。我們以 24 小時 TTL 將該位址與來源 IP 儲存於 Upstash Redis，僅為執行「每位址每日 1 次、每 IP 每日 5 次」之速率限制。",
              "x402 MCP 呼叫——/api/mcp 端點記錄每筆已結算付款之交易簽名（該簽名本即為公開鏈上物件）及呼叫方 IP，僅用於防止重放並執行速率限制。",
              "應用內遙測——所訪問頁面及錯誤軌跡（瀏覽器主控台錯誤、SDK 例外），用於除錯。不安裝任何廣告或跨站追蹤信標。",
            ],
          },
          {
            title: "2.4 我們不收集",
            items: [
              "無 KYC——我們不要求您的姓名、照片、政府核發身分證明或稅務居住地。",
              "無電子郵件或帳號——我們不運作帳號系統、密碼儲存或電郵清單。",
              "無 AI 提示或模型輸出——Sakura 不代您運行 AI 代理；我們不收集您與任何 AI 系統之對話。",
              "無支付卡資料——Sakura 不處理法幣或支付卡，亦不運行訂閱。",
              "無資料販售——我們不向廣告商或資料仲介販售、租賃或授權個人資訊。",
            ],
          },
          {
            title: "2.5 Cookie 與本地儲存",
            body: "Sakura 僅使用少量嚴格必要之瀏覽器儲存項目：(a) 快取您語言偏好之 localStorage 項目；(b) 承載您意圖見證值之 localStorage 項目（見 2.2）；(c) 僅於 session 範圍內、用於經驗證端點 CSRF 防護之 cookie。我們不使用第三方廣告或跨站追蹤 cookie。您可隨時透過瀏覽器的站點資料控制項，清除以上所有項目。",
          },
          {
            title: "2.6 未成年人",
            body: "本服務之對象為年滿 18 歲、或您所在司法管轄區成年年齡較 18 歲為高者。我們不會故意收集美國 13 歲以下、或歐洲經濟區及適用同等資料保護標準管轄區 16 歲以下人士之個人資訊。若您相信有未成年人向我們提供資訊，請聯絡我們，我們將刪除相關鏈下紀錄。",
          },
        ],
      },
      {
        heading: "3. 我們如何使用您的資訊",
        intro: "我們僅將第 2 節所述資訊用於以下目的：",
        items: [
          "交付驗證服務——呈現意圖簽署介面、透過 RPC 供應商將您簽署之交易轉發至 Solana 網路、顯示 ActionRecord 審計軌跡。",
          "濫用防禦與速率限制——防止 faucet 耗盡、MCP 重放、自動化爬取，所依據之資料皆為 2.3 所述匿名化指標。",
          "安全——偵測未授權存取樣態，於 IP 及錢包位址兩層執行制裁清單過濾。",
          "產品改進——使用彙總、匿名化指標（如頁面延遲、證明生成時間分佈）以提升效能。此用途不使用任何可識別身分之資料。",
          "法律義務——遵守適用法律、合法機關之要求，及本使用條款之執行。",
        ],
        note: "我們不運行受管理之 AI 代理，亦不收集任何提示、模型輸出或對話紀錄。我們不以您的資料訓練任何機器學習模型。",
      },
      {
        heading: "4. 資訊分享",
        intro: "我們不出售您的個人資訊。分享之類別嚴格限於以下：",
        subsections: [
          { title: "基礎設施供應商", body: "我們在資料處理協議下聘用少數基礎設施供應商：Vercel（應用託管）、Upstash（受管 Redis，用於速率限制與反機器人計數）、以及一家或多家 Solana RPC 供應商（目前為 Helius，用於鏈上讀取）。預言機網路（Pyth、Switchboard）於鏈上消費，不接收我方任何鏈下資料。" },
          { title: "區塊鏈資料", body: "Solana 區塊鏈本即公開帳本。您的錢包位址與您所簽署之任何交易，皆可透過任何 Solana RPC 或瀏覽器獨立且永久地查看。Sakura 絕不代您寫入鏈上；任何鏈上寫入皆源自您本人錢包所產生之簽名。" },
          { title: "法律及監管機關", body: "我們可能因合法機關之請求、遵守適用法律、或為主張、行使或抗辯法律權利而披露資訊。" },
          { title: "制裁清單過濾", body: "我們將 IP 位址與錢包位址與 OFAC、聯合國、歐盟、英國、新加坡制裁指定進行比對。被阻斷之位址僅保留至執行阻斷所必要之期間。" },
          { title: "公司交易", body: "於合併、收購、融資或類似交易中，您的資訊可能移轉予承繼或收購方；其受有之隱私保護不低於本政策。" },
          { title: "彙總或匿名統計資料", body: "我們可能於文件或行銷材料中，公布彙總或不可逆匿名化之數據（例如：驗證之動作總數、壓力測試結果、中位證明時長）。" },
        ],
      },
      {
        heading: "5. 區塊鏈資料聲明",
        body: ["Solana 區塊鏈是公開帳本。您的錢包地址及相關所有交易永久可見。Sakura 讀取此公開資料以提供分析，但無法刪除或修改任何鏈上記錄。連接錢包至 Sakura 不授予我們任何簽署權限或對您資金的控制。"],
      },
      {
        heading: "6. 安全性",
        body: [
          "您瀏覽器與 Sakura 端點之間之所有流量皆以 TLS 加密傳輸。基礎設施之運維存取經過限制並留有審計紀錄。Sakura 絕不要求您的私鑰、助記詞，亦絕不要求超出使用條款 §3.2 所述兩類（intent_sign、以及可選之 SPL Token Approve）之任何簽署。",
          "任何系統皆無法絕對安全。您對所使用之錢包軟體、運行該軟體之設備、以及助記詞之保管，負最終責任。若您相信錢包已遭入侵，請立即於您本人錢包中撤銷任何未完成之 SPL Token Approve 授權與任何有效意圖，不需等候我方。",
        ],
      },
      {
        heading: "7. 資料保留",
        intro: "鏈下資料之保留窗口，視目的而訂：",
        items: [
          "速率限制與反機器人計數器——儲存於 Upstash Redis，通常設定 24 小時 TTL，到期自動失效。",
          "HTTP 請求元資料（IP、user-agent）——於運維日誌中保留至多 14 日，供濫用調查之用，其後刪除。",
          "x402 付款紀錄——交易簽名用於防止重放；對應鏈下紀錄項目將於 30 日內到期，而簽名本身以 Solana 交易形式永久留存於鏈上。",
          "彙總產品指標——以匿名化形式無限期保留。",
        ],
        note: "鏈上紀錄（意圖承諾、ActionRecord PDA、付款交易）依設計屬永久性，Sakura 或任何人皆無法刪除——詳見第 8 節。",
      },
      {
        heading: "8. 您的選擇與權利",
        intro: "依您所在司法管轄區，並受下列限制之約束，您可能享有下列權利：",
        items: [
          "存取——取得我方持有之您的鏈下個人資訊副本；",
          "更正——更正不準確或不完整之鏈下資訊；",
          "刪除——刪除鏈下個人資料，受法律保留義務之限制；",
          "限制或反對特定處理活動；",
          "可攜性——以結構化、機器可讀格式取得您的鏈下資料；",
          "隨時撤回對選擇性處理之同意；以及",
          "向您所在地之資料保護監管機關提出申訴（歐洲經濟區／英國居民，向您居住國之監管機關）。",
        ],
        note: "鏈上資料超出上述權利之可行範圍。您的錢包位址、意圖承諾雜湊、Groth16 公開輸入，以及 ActionRecord PDA 皆寫入於 Solana 區塊鏈，而區塊鏈不可變、亦不在 Sakura 控制之內。Sakura 或任何他人，皆無法刪除、修改或遮蔽鏈上紀錄——此乃底層公開帳本之性質，非 Sakura 之政策選擇。對鏈上資料之存取權與可攜性，可透過任何 Solana RPC 或瀏覽器自助行使。若欲行使上述權利針對我方之鏈下紀錄，請透過 X 上的 @sakuraaijp 聯絡我們。對歐洲經濟區／英國居民而言，我方作為資料控管者；處理之合法依據為：(i) 運營並保障服務之正當利益；(ii) 契約之履行（使用條款）；(iii) 遵守法律義務。對加州居民而言，我方不出售亦不共享 CCPA 所定義之個人資訊。",
      },
      {
        heading: "9. 政策更新",
        body: ["我們可能不時修訂本政策。重大變更將透過應用程式內通知提前告知。在任何更新生效日期後繼續使用服務，即表示您接受修訂後的政策。"],
      },
      {
        heading: "10. 聯絡方式",
        body: ["如您對本隱私政策有任何疑問、意見或要求，請聯絡我們："],
        contact: true,
      },
    ],
  },
  ja: {
    badge: "プライバシー · SAKURA AGENTIC BOUNDS LAYER",
    title: "プライバシーポリシー",
    updated: "最終更新：2026年4月6日",
    sections: [
      {
        heading: "1. 概要",
        body: [
          `本プライバシーポリシー（「ポリシー」）は、Sakura（「Sakura」「当社」）が、Sakura——AI エージェントのための Solana ネイティブ実行境界層——およびその付属のウェブアプリケーション、オンチェーン Anchor プログラム、Groth16 検証器、x402 MCP サーバー、関連インターフェース（総称して「サービス」）へのアクセスまたは利用時に、情報をどのように収集・使用・保存・共有するかを説明します。`,
          `Sakura は非カストディアルです。お客様の資産を預かることはありません。意図コミットメントはお客様ご自身が署名し、32 バイトの Poseidon ハッシュとしてオンチェーンに定錨されます。元のポリシー値はお客様のブラウザを離れません。エージェントが境界内で動作していると主張するには、Groth16 証明を提出し、オンチェーンの alt_bn128 ペアリング syscall による検証を通過せねばなりません。この証明は、それに伴う DeFi 命令と同じ Solana v0 アトミックトランザクションの中で提出されます。Sakura のオンチェーンプログラムには、このゲートの外で資金を動かす権限はありません。お客様のウォレットは常に、完全にお客様の管理下にあります。`,
          `サービスを利用することで、お客様は本ポリシーを読み理解し、記載された方法での情報収集・利用に同意したものとみなされます。本ポリシーは、当社の利用規約と併せてお読みください。`,
        ],
      },
      {
        heading: "2. 当社が収集する情報",
        subsections: [
          {
            title: "2.1 ウォレット情報",
            items: [
              "公開ウォレットアドレス——Solana ウォレット（Phantom、Backpack、OKX、その他アダプタ互換ウォレット）を接続された際、当社は公開アドレスのみを受領します。各プロンプトでお客様が署名される範囲を超えて、秘密鍵、シードフレーズ、または署名権限を要求・取得することはありません。",
              "オンチェーン取引——お客様のアドレスに関連する公開取引は、設計上、任意の Solana RPC またはブロックエクスプローラーで誰でも閲覧可能です。当社は、UI 表示の目的で、第三者 RPC プロバイダー（現在は Helius）経由でそれらを取得します。お客様ご自身が署名される取引以外に、公開記録へ追記することはありません。",
            ],
          },
          {
            title: "2.2 お客様のブラウザ内に留まる情報（送信されません）",
            items: [
              "意図の原値——意図署名時にご入力いただく自然言語テキスト、1 回あたりの上限、USD 上限、プロトコルおよびアクションのビットマップ、有効期限、ノンス。これらはブラウザ内で 32 バイトの Poseidon コミットメントへと畳み込まれます。オンチェーンに送信されるのはコミットメントのみで、元の値が Sakura のいかなるサーバーへも送信されることはありません。",
              "意図のウィットネス（localStorage）——後にお客様の選ばれた AI エージェントが境界内動作の Groth16 証明を生成できるよう、コミットメントの原像（「ウィットネス」）は、ウォレットアドレスとコミットメントハッシュをキーとして、お客様のブラウザの localStorage に保存されます。読み取りはブラウザ内のコードに限られます。サイトデータの消去により削除できます。",
              "ゼロ知識証明——Groth16 証明は、ブラウザ内の snarkjs によって生成されます。当社は、その生成に用いられたウィットネスを受領しません。構成上、いかなるポリシー値も開示しない公開証明バイト列のみが、オンチェーンに記録されます。",
            ],
          },
          {
            title: "2.3 技術情報、レート制限、ボット防御データ",
            items: [
              "HTTP リクエストのメタデータ——IP アドレス、user-agent 文字列、Accept-Language ヘッダー、リクエスト時刻。レート制限およびボット検知のために、短期的に利用されます。",
              "ボット防御指標——当社のミドルウェア（Upstash Redis 上に構築）は、各リクエストに対して匿名化されたヘッダー指紋スコアを算出し、IP アドレスおよびウォレットアドレスをキーとするカウンターを短い TTL で保持します。これはスクレイピング、faucet の乱用、自動化攻撃の緩和に用いられます。",
              "Faucet リクエスト——/api/faucet エンドポイントは、devnet ウォレットアドレスを受け付け、0.05 SOL と 100 テスト USDC を配布します。当社は、「1 アドレスにつき 1 日 1 回、1 IP につき 1 日 5 回」のレート制限を実施する目的にのみ、送信されたアドレスと送信元 IP を 24 時間 TTL で Upstash Redis に保持します。",
              "x402 MCP 呼び出し——/api/mcp エンドポイントは、リプレイ防止およびレート制限の実施にのみ、各決済済み支払いのトランザクション署名（既に公開オンチェーンの成果物）と呼び出し元 IP を記録します。",
              "アプリ内テレメトリ——訪問ページとエラー軌跡（ブラウザコンソールのエラー、SDK 例外）をデバッグ目的で受領します。広告やクロスサイトトラッキングのビーコンは一切設置しません。",
            ],
          },
          {
            title: "2.4 当社が収集しないもの",
            items: [
              "KYC は行いません。お客様の氏名、写真、政府発行 ID、税務居住地を求めることはありません。",
              "メールアドレスやアカウントを保有しません。アカウントシステム、パスワードストア、メール配信リストを運用していません。",
              "AI プロンプト・モデル出力は収集しません。Sakura はお客様に代わって AI エージェントを運用しておらず、いかなる AI システムとの対話も収集しません。",
              "支払いカードデータは扱いません。Sakura は法定通貨やカード決済を処理せず、サブスクリプションも運用していません。",
              "データ販売は行いません。広告主やデータブローカーに対して、個人情報を販売、貸与、ライセンスすることはありません。",
            ],
          },
          {
            title: "2.5 Cookie とローカルストレージ",
            body: "Sakura は、必要最小限のブラウザ保存項目のみを使用します——(a) 言語設定をキャッシュする localStorage 項目、(b) 2.2 に記載した意図ウィットネスを保持する localStorage 項目、(c) 認証エンドポイントにおける CSRF 対策のためのセッション範囲 cookie。第三者の広告やクロスサイトトラッキング用 cookie は使用しません。これらはいつでも、ブラウザのサイトデータ管理機能から消去いただけます。",
          },
          {
            title: "2.6 未成年者",
            body: "本サービスは、18 歳以上の方、またはお客様の管轄区域における成年年齢が 18 歳を上回る場合は当該年齢以上の方のみを対象とします。当社は、米国における 13 歳未満、または欧州経済領域その他同等のデータ保護水準を適用する地域における 16 歳未満の方からは、意図的に個人情報を収集いたしません。未成年者が情報をご提供になったと思われる場合は、当社までご連絡ください。該当するオフチェーン記録を削除いたします。",
          },
        ],
      },
      {
        heading: "3. 情報の利用方法",
        intro: "第 2 条に記載した情報は、以下の目的に限って利用します：",
        items: [
          "検証サービスの提供——意図署名インターフェースのレンダリング、RPC プロバイダー経由でのお客様署名済み取引の Solana ネットワークへの中継、ActionRecord 監査軌跡の表示。",
          "濫用防御とレート制限——2.3 に記載した匿名化指標を用いた、faucet の枯渇、MCP のリプレイ、自動化スクレイピングの防止。",
          "セキュリティ——不正アクセスパターンの検出、および IP とウォレットアドレスの両階層における制裁リスト審査の実施。",
          "プロダクト改善——集計・匿名化指標（ページ遅延、証明生成時間分布など）を用いた性能向上。本目的に、識別可能なデータは一切用いません。",
          "法的義務——適用法令の遵守、適法な当局の要請への対応、利用規約の執行。",
        ],
        note: "当社は、運用上の AI エージェントを運用しておらず、プロンプト、モデル出力、AI 会話履歴を一切収集しません。お客様のデータで、いかなる機械学習モデルも学習いたしません。",
      },
      {
        heading: "4. 情報の共有",
        intro: "当社は、お客様の個人情報を販売しません。共有の類型は、以下に厳格に限定されます：",
        subsections: [
          { title: "インフラストラクチャ・プロバイダー", body: "データ処理契約の下、少数のインフラストラクチャ・ベンダーに限って業務委託を行っています——Vercel（アプリケーションホスティング）、Upstash（レート制限およびボット防御カウンター用マネージド Redis）、Solana RPC プロバイダー（現在は Helius。ブロックチェーン読み取り）。オラクルネットワーク（Pyth、Switchboard）はオンチェーンで消費されるものであり、当社のオフチェーンデータを受領することはありません。" },
          { title: "ブロックチェーンデータ", body: "Solana ブロックチェーンは、設計上、公開台帳です。お客様のウォレットアドレス、および署名された取引は、任意の Solana RPC またはエクスプローラーにて、独立かつ恒久的に閲覧可能です。Sakura がお客様に代わってチェーンに書き込むことは一切ありません。オンチェーンへの書き込みはすべて、お客様ご自身のウォレット内で生成された署名に起源します。" },
          { title: "法的・規制当局", body: "適格な当局からの適法な要請に応じて、適用法令を遵守するため、または法的請求を確立・行使・抗弁するために、情報を開示することがあります。" },
          { title: "制裁スクリーニング", body: "当社は、OFAC、国連、EU、英国、シンガポールの制裁指定に対して、IP アドレスおよびウォレットアドレスを照合します。遮断されたアドレスは、遮断の執行に必要な範囲を超えて保持することはありません。" },
          { title: "企業取引", body: "合併、買収、資金調達、またはこれに類する取引の際には、本ポリシーと同等以上のプライバシー保護を条件に、情報が承継者または買収者へ移転される場合があります。" },
          { title: "集計または匿名化統計", body: "集計または不可逆的に匿名化された数値（例：検証済み動作の総数、ストレステスト結果、証明時間の中央値）を、ドキュメントやマーケティング資料において公表することがあります。" },
        ],
      },
      {
        heading: "5. ブロックチェーンデータに関する注意",
        body: ["Solanaブロックチェーンは公開台帳です。ウォレットアドレスとそれに関連するすべての取引は永続的に公開されています。Sakuraはこの公開データを分析のために読み取りますが、オンチェーンの記録を削除または変更することはできません。ウォレットをSakuraに接続しても、当社に署名権限やお客様の資金に対する制御権は付与されません。"],
      },
      {
        heading: "6. セキュリティ",
        body: [
          "お客様のブラウザと Sakura のエンドポイント間のすべての通信は、TLS により暗号化されます。インフラストラクチャへの運用アクセスは制限され、監査記録が残されます。Sakura は、利用規約 §3.2 に記載した 2 種類の署名（intent_sign、および任意の SPL Token Approve）を超えて、秘密鍵、シードフレーズ、署名を要求することは一切ありません。",
          "いかなるシステムも完全に安全ではありません。お客様がご利用のウォレットソフトウェア、それが稼働するデバイス、およびシードフレーズの保管については、お客様に責任が帰属します。ウォレットが侵害された可能性がある場合は、当社の対応を待たず、お客様ご自身のウォレットから、未消化の SPL Token Approve 授権および有効な意図を直ちにお取り消しください。",
        ],
      },
      {
        heading: "7. データ保持",
        intro: "オフチェーンの保持期間は、目的に即して設定されています：",
        items: [
          "レート制限およびボット防御カウンター——Upstash Redis に短い TTL（通常 24 時間）で保持され、時間経過により自動的に失効します。",
          "HTTP リクエストのメタデータ（IP、user-agent）——濫用調査の目的で、運用ログに最大 14 日間保持された後、削除されます。",
          "x402 支払い記録——トランザクション署名は、リプレイ防止のために保持されます。対応するオフチェーンのログエントリは 30 日以内に失効しますが、署名自体は Solana トランザクションとしてオンチェーンに恒久的に残ります。",
          "集計済みプロダクト指標——匿名化された形式で無期限に保持されます。",
        ],
        note: "オンチェーン記録（意図コミットメント、ActionRecord PDA、支払いトランザクション）は、設計上、恒久的なものであり、Sakura を含む何者によっても削除できません。詳細は第 8 条をご参照ください。",
      },
      {
        heading: "8. お客様の選択と権利",
        intro: "お客様の居住地、および下記の制約に従い、お客様には以下の権利が認められる場合があります：",
        items: [
          "アクセス——当社が保有するお客様のオフチェーン個人情報の写しを取得する権利；",
          "訂正——不正確または不完全なオフチェーン情報を訂正する権利；",
          "削除——法的保持義務の対象となるものを除き、オフチェーン個人データを削除する権利；",
          "特定の処理活動の制限または異議申立；",
          "ポータビリティ——構造化・機械可読な形式でオフチェーンデータを受け取る権利；",
          "任意の処理への同意を随時撤回する権利；ならびに",
          "お客様所在地のデータ保護監督機関への申立権（欧州経済領域／英国居住者の場合、お客様のご居住国の機関）。",
        ],
        note: "オンチェーンのデータは、これらの権利の射程外にあります。お客様のウォレットアドレス、意図コミットメントハッシュ、Groth16 の公開入力、ActionRecord PDA は、Solana ブロックチェーンに書き込まれています。同ブロックチェーンは不可変であり、Sakura の統制の外にあります。Sakura その他いかなる者も、オンチェーン記録を削除、変更、遮蔽することはできません——これは、Sakura の方針上の選択ではなく、基礎となる公開台帳の性質です。オンチェーンデータに対するアクセス権およびポータビリティは、任意の Solana RPC またはブロックエクスプローラーから、お客様ご自身でご利用いただけます。オフチェーン記録に対して上記の権利を行使される場合は、X の @sakuraaijp までご連絡ください。欧州経済領域／英国居住者について、当社はデータ管理者として行為し、処理の適法根拠は、(i) サービスの運用・保護に関する正当な利益、(ii) 契約（利用規約）の履行、(iii) 法的義務の遵守です。カリフォルニア居住者について、当社は CCPA が定義する個人情報の販売・共有を行いません。",
      },
      {
        heading: "9. ポリシーの更新",
        body: ["本ポリシーは随時改訂される場合があります。重要な変更はアプリ内通知で事前にお知らせします。更新の発効日以降もサービスを継続して利用することで、改訂されたポリシーへの同意とみなされます。"],
      },
      {
        heading: "10. お問い合わせ",
        body: ["本プライバシーポリシーに関するご質問、ご意見、またはご要望は以下までご連絡ください："],
        contact: true,
      },
    ],
  },
};

export default function PrivacyPage() {
  const { lang } = useLang();
  const c = CONTENT[lang] ?? CONTENT.en;

  const sectionStyle: React.CSSProperties = { marginBottom: 40 };
  const h2Style: React.CSSProperties = {
    fontSize: 20, fontWeight: 700, fontFamily: "var(--font-heading)",
    color: "var(--text-primary)", marginBottom: 12,
    paddingBottom: 8, borderBottom: "1px solid var(--border)",
  };
  const h3Style: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
    marginBottom: 8, marginTop: 20,
  };
  const pStyle: React.CSSProperties = {
    fontSize: 14, lineHeight: 1.85, color: "var(--text-secondary)", marginBottom: 12,
  };
  const ulStyle: React.CSSProperties = { paddingLeft: 20, marginBottom: 12 };
  const liStyle: React.CSSProperties = {
    fontSize: 14, lineHeight: 1.85, color: "var(--text-secondary)", marginBottom: 4,
  };

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "56px 32px 80px" }}>
        {/* Back link */}
        <Link href="/" style={{
          fontSize: 12, color: "var(--text-muted)", textDecoration: "none",
          letterSpacing: "0.08em", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24,
        }}>
          {lang === "zh" ? "← 返回首頁" : lang === "ja" ? "← ホームへ戻る" : "← Back to Home"}
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-block", fontSize: 11, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "var(--accent)",
            border: "1px solid var(--accent-mid)", borderRadius: 4,
            padding: "3px 10px", marginBottom: 16, fontFamily: "var(--font-mono)",
          }}>
            {c.badge}
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 700, fontFamily: "var(--font-heading)",
            color: "var(--text-primary)", letterSpacing: "0.04em", marginBottom: 12,
          }}>
            {c.title}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {c.updated}
          </p>
        </div>

        {/* Sakura platform intro */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)", borderRadius: 8,
          padding: "16px 20px", marginBottom: 32,
          fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.85,
        }}>
          <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)", letterSpacing: "0.04em" }}>
            {lang === "zh" ? "Sakura 零託管原則" : lang === "ja" ? "Sakura ゼロカストディ原則" : "Sakura Zero-Custody Principle"}
          </strong>
          {" — "}
          {lang === "zh"
            ? "大多數 AI / DeFi 工具在隱私上提供的，僅僅是一份政策文件——您只能選擇相信。Sakura 的隱私保護建立於三條可獨立驗證的架構原則之上，而非需要信任的承諾：① 策略不離瀏覽器——您簽下的意圖策略值（意圖文字、金額上限、USD 上限、協議/動作位元圖、nonce）於您本人瀏覽器中壓縮為 32 位元組 Poseidon 承諾；原始值不傳送至 Sakura 任何伺服器；② 非託管——Sakura Anchor 程式無「管理員提領」指令，資金移動皆源自您本人錢包之簽名；我方運營方無覆蓋能力；③ 源碼 MIT、整合無需許可——Anchor 程式、Groth16 電路、驗證金鑰、SDK 皆於公開 Git 倉庫可取得，第三方可獨立驗證我們的行為與本政策一致。這不是「我們承諾保護您的隱私」，而是「我們於架構上無法違反」。"
            : lang === "ja"
            ? "ほとんどの AI / DeFi ツールがプライバシーについて提供するのは、一枚のポリシー文書だけ——お客様に残された選択肢は、信じるか否かのみです。Sakura のプライバシー保護は、独立に検証可能な 3 つのアーキテクチャ原則の上に立ちます。信じていただく必要のある約束ではありません。① ポリシーはブラウザの外に出ない——署名時のポリシー値（意図テキスト、金額上限、USD 上限、プロトコル／アクションのビットマップ、ノンス）は、お客様のブラウザ内で 32 バイトの Poseidon コミットメントへと圧縮されます。元の値が Sakura のいかなるサーバーへも送信されることはありません。② ノンカストディアル——Sakura Anchor プログラムには「管理者引き出し」命令が存在せず、資金の移動はすべて、お客様ご自身のウォレットによる署名に起源します。運営者の上書き権限は存在しません。③ ソースは MIT、統合に許可は不要——Anchor プログラム、Groth16 回路、検証鍵、SDK は公開 Git リポジトリで取得でき、第三者は当社の挙動が本ポリシーと一致していることを独立に検証できます。これは「プライバシーを守ることを約束します」ではなく、「アーキテクチャ上、違反できません」という意味です。"
            : "Most AI / DeFi tools offer only a policy document on privacy — you have no choice but to trust it. Sakura's privacy protection rests on three architectural principles that can be independently verified, not on promises you must take on faith: ① Policy stays in the browser — the policy values you sign (intent text, amount cap, USD cap, protocol and action bitmaps, nonce) are folded in your browser into a 32-byte Poseidon commitment; the raw values never reach any Sakura server. ② Non-custodial by construction — the Sakura Anchor program has no administrator-withdraw instruction; every movement of funds originates from a signature you personally produce in your own wallet. There is no operator override. ③ MIT source, permissionless integration — the Anchor program, the Groth16 circuit, the verifying key, and the SDK are all publicly available on a Git repository; any third party can independently verify that our behaviour matches this Policy. This is not a promise to protect your privacy — it is an architecture in which violating it is not available to us."}
        </div>

        {c.sections.map((sec, i) => (
          <div key={i} style={sectionStyle}>
            <h2 style={h2Style}>{sec.heading}</h2>

            {/* Top-level body paragraphs */}
            {"body" in sec && Array.isArray(sec.body) && sec.body.map((p, j) => (
              <p key={j} style={pStyle}>{p}</p>
            ))}

            {/* Intro text */}
            {"intro" in sec && sec.intro && <p style={pStyle}>{sec.intro}</p>}

            {/* Top-level bullet list */}
            {"items" in sec && sec.items && (
              <ul style={ulStyle}>
                {sec.items.map((item, j) => <li key={j} style={liStyle}>{item}</li>)}
              </ul>
            )}

            {/* Note */}
            {"note" in sec && sec.note && <p style={{ ...pStyle, fontStyle: "italic", opacity: 0.85 }}>{sec.note}</p>}

            {/* Subsections */}
            {"subsections" in sec && sec.subsections && sec.subsections.map((sub, j) => (
              <div key={j}>
                <h3 style={h3Style}>{sub.title}</h3>
                {"body" in sub && sub.body && <p style={pStyle}>{sub.body}</p>}
                {"items" in sub && sub.items && (
                  <ul style={ulStyle}>
                    {sub.items.map((item, k) => <li key={k} style={liStyle}>{item}</li>)}
                  </ul>
                )}
              </div>
            ))}

            {/* Contact block */}
            {"contact" in sec && sec.contact && (
              <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "20px 24px", display: "inline-block", marginTop: 8,
              }}>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  𝕏 <a href="https://x.com/sakuraaijp" target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--accent)", textDecoration: "none" }}>@sakuraaijp</a>
                </p>
              </div>
            )}
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
}
