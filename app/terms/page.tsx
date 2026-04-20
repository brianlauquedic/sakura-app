"use client";

import { useLang } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";

const CONTENT = {
  en: {
    badge: "LEGAL · SAKURA AI GUARDIAN",
    title: "Terms of Service",
    updated: "Last updated: 6 April 2026",
    notice: "Important Notice: Section 11 of these Terms contains a binding arbitration clause and class-action waiver. Please read it carefully before using the Services.",
    sections: [
      {
        heading: "1. Introduction",
        body: [
          `These Terms of Service ("Terms") constitute a binding legal agreement between you ("User," "you," or "your") and Sakura ("Sakura," "we," "us," or "our") governing your access to and use of Sakura Shielded Lending — our private lending layer on Solana with on-chain Groth16 ZK-verified rescue — and its associated Solana-native primitives (cross-protocol CPI routing, alt_bn128 pairing verifier, on-chain audit), including the web application, the lending-pool smart contract, AI analysis features, and all associated interfaces (collectively, the "Services").`,
          "Our Privacy Policy is incorporated into these Terms by reference and forms part of this agreement.",
          "By accessing or using the Services, you confirm that you are at least 18 years of age, that you have read and understood these Terms, and that you agree to be bound by them.",
          `We may update these Terms from time to time. Continued use of the Services after any update constitutes acceptance of the revised Terms.`,
        ],
      },
      {
        heading: "2. Artificial Intelligence Disclaimer",
        subsections: [
          { title: "2.1 Nature of AI Outputs", body: "You are interacting with an AI system powered by Claude AI (Anthropic), not a licensed human financial adviser. All AI-generated content, analysis, security assessments, and DeFi commentary are provided on an informational basis only and do not constitute investment advice or a solicitation to buy or sell any asset. AI output may contain errors, omissions, or outdated information." },
          { title: "2.2 Your Responsibilities", body: "You are solely responsible for independently evaluating all AI-generated content before acting upon it. All DeFi decisions and transactions are entirely at your discretion and risk." },
          { title: "2.3 AI Limitations", body: "Security risk scores and portfolio health assessments reflect available data at the time of analysis and may not capture real-time market conditions, new exploits, or protocol changes. Sakura does not guarantee the accuracy, reliability, or completeness of any AI-generated analysis." },
          { title: "2.4 On-Chain Verification", body: "Sakura records a SHA-256 hash of each AI analysis decision on the Solana blockchain for transparency and independent verification. This hash is a cryptographic fingerprint only and does not constitute financial advice or a guarantee of outcomes." },
        ],
      },
      {
        heading: "3. Wallet Connection and Read-Only Access",
        subsections: [
          { title: "3.1 Non-Custodial", body: "Sakura never holds custody of your assets and never stores your private keys or seed phrase. Shielded Lending operates in read-only mode. cross-protocol routing and Shielded Lending may execute on-chain transactions on your behalf — but only with your explicit confirmation (跨協議救援) or pre-authorization via SPL Token Approve within a hard spending cap you set (Shielded Lending). Sakura never initiates transactions beyond the scope you have authorized." },
          { title: "3.2 User Responsibility", body: "You remain fully in control of your wallet at all times. You are solely responsible for all DeFi transactions you choose to execute based on Sakura's analysis." },
          { title: "3.3 Third-Party Wallet", body: "Phantom is a third-party wallet application. Sakura bears no liability for issues arising from Phantom's software, security, or availability." },
        ],
      },
      {
        heading: "4. Core Mechanism",
        subsections: [
          { title: "4.1 Intent Signing", body: "You write your agent's action bounds in natural language — per-action cap, allowed protocols, expiry. Seven policy values fold through a two-layer Poseidon tree into a 32-byte commitment, anchored on-chain in a Program Derived Address seeded by your wallet. The original policy values stay in your browser; only the hash reaches the chain. Signing itself does not execute any DeFi action — it only anchors the bound. A one-time 0.1% fee on notional applies at signing, with the first $10M of integrator volume rebated." },
          { title: "4.2 ZK Proof Generation & Verification", body: "When your agent attempts an action, the Sakura client generates a Groth16 zero-knowledge proof in your browser, attesting that the action falls inside the signed commitment (amount cap, protocol, action type, live Pyth price, slot freshness). The proof is submitted together with the DeFi instruction inside a single Solana v0 atomic transaction. The on-chain verifier checks the proof via the alt_bn128 pairing syscall in ~116k compute units, before any DeFi instruction is allowed to touch user funds. Proofs expire in sixty seconds. A $0.01 per-action fee covers the on-chain verification cost." },
          { title: "4.3 Atomic Agentic DeFi Execution", body: "The ZK gate and the DeFi instruction share a single v0 atomic transaction — inseparable. If the proof fails to verify, or if the proof passes but the DeFi instruction itself fails, the entire transaction reverts; user funds are never touched. No gap remains in which the proof passes while the action is suspended mid-flight. Every execution leaves a keccak256 fingerprint on-chain; users, auditors, and counterparties can each reconstruct it independently on Solscan. Sakura does not guarantee execution success for the underlying DeFi instruction itself — failure modes specific to Kamino, MarginFi, Jupiter, Marinade, or any other integrated protocol remain the protocol's own." },
          { title: "4.4 x402 MCP Server", body: "Sakura operates an MCP server at /api/mcp following the HTTP 402 / x402 Machine Payments Protocol. When a client (Claude Desktop, Cursor, VS Code, or any MCP-compatible implementation) calls the endpoint, the server returns 402 together with a $1 USDC payment demand. Once the caller settles atomically on-chain, the tool result returns in the same response cycle. No account, no OAuth, no subscription — authentication is payment." },
        ],
      },
      {
        heading: "5. Access and Use",
        subsections: [
          { title: "5.1 License", body: "Sakura grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Services solely for your personal, non-commercial purposes." },
          {
            title: "5.2 Prohibited Conduct",
            intro: "You may not use the Services to:",
            items: [
              "engage in any unlawful, harmful, or fraudulent activity;",
              "attack, probe, or attempt to gain unauthorized access to Sakura's systems;",
              "upload, transmit, or deploy malware, viruses, or harmful code;",
              "generate prohibited content, including hate speech or content that incites violence;",
              "create multiple accounts to abuse subscription credits or promotions; or",
              "circumvent geographic restrictions or access the Services from a Restricted Jurisdiction.",
            ],
          },
          { title: "5.3 Fee Model", body: "Sakura operates on pay-per-use: no accounts, no subscriptions, no business-development gate. The fees are: (a) intent signing — a one-time 0.1% fee on notional, rebated up to the first $10M of integrator volume; (b) agent action — $0.01 per verified action, collected on-chain; (c) x402 MCP endpoint — $1 USDC per /api/mcp call, settled atomically via HTTP 402. All fees are collected on-chain and are transparent. The protocol fee vault is governed by a 3-of-5 multisig, subject to program-level hard ceilings (execution_fee_bps ≤ 2%, platform_fee_bps ≤ 100%). The verifying key is baked into the program at deploy time and cannot be altered without redeployment. No token." },
        ],
      },
      {
        heading: "6. Subscription, Billing, and Fees",
        body: [
          "Subscriptions renew automatically unless you downgrade to the free plan before the end of the current billing cycle. Downgrades take effect at the start of the next billing cycle.",
          "Subscription fees are charged upfront and are non-refundable unless required by applicable law. Payment processing is handled by Stripe.",
        ],
      },
      {
        heading: "7. Risk Notice",
        warning: "Cryptocurrency and DeFi risk. Cryptocurrency markets are highly volatile and speculative. AI-generated analysis does not guarantee profitable outcomes. You should only commit funds you can afford to lose entirely.",
        body: [
          "AI analysis risk. AI-generated safety scores and DeFi recommendations are informational tools, not investment advice, and do not guarantee any outcome.",
          "Third-party protocol risk. DeFi protocols analyzed by Sakura are independent third-party systems. Sakura bears no liability for losses arising from interacting with any DeFi protocol.",
          "General. Past performance is not indicative of future results. Nothing in the Services constitutes a solicitation or recommendation to buy or sell any asset.",
        ],
      },
      {
        heading: "8. Geographic Restrictions",
        intro: "The Services are not available to persons in any of the following jurisdictions:",
        items: [
          "Mainland China", "Iran", "Cuba", "North Korea", "Syria",
          "The Crimea, Donetsk, and Luhansk regions of Ukraine",
          "Any other jurisdiction subject to comprehensive economic sanctions (UN, OFAC, EU, or UK)",
        ],
        note: "By using the Services, you represent and warrant that you are not in a Restricted Jurisdiction.",
      },
      {
        heading: "9. Intellectual Property",
        body: [
          "Sakura and its licensors retain all rights, title, and interest in and to the platform, software, AI models, branding, and all other materials comprising the Services.",
          "You own the analysis outputs you generate. You grant Sakura a non-exclusive, royalty-free license to process your data for operating and improving the Services, consistent with our Privacy Policy.",
        ],
      },
      {
        heading: "10. Limitation of Liability and Disclaimers",
        body: [
          `The Services are provided "as is" and "as available" without warranties of any kind, express or implied.`,
          "To the fullest extent permitted by applicable law, Sakura's total liability shall not exceed the greater of (a) the total fees paid by you in the twelve (12) months preceding the claim, or (b) USD 100.",
        ],
        intro: "Sakura bears no liability for:",
        items: [
          "losses arising from DeFi transactions you execute based on Sakura's analysis;",
          "inaccuracies in AI-generated security scores or portfolio assessments;",
          "losses from smart contract exploits, rug pulls, or protocol failures;",
          "losses from GoPlus API inaccuracies or third-party data failures;",
          "Solana network failures, congestion, or blockchain-level events;",
          "unauthorized access to your Phantom wallet; or",
          "service interruptions due to third-party API outages or force majeure events.",
        ],
      },
      {
        heading: "11. Arbitration and Dispute Resolution",
        body: [
          "All disputes arising out of or relating to these Terms shall be finally resolved by binding confidential arbitration administered by the Singapore International Arbitration Centre (SIAC). The seat of arbitration shall be Singapore. The language shall be English.",
          "Class Action Waiver. You irrevocably waive any right to participate in a class action or representative proceeding. All claims must be brought in your individual capacity only.",
        ],
      },
      {
        heading: "12. Termination",
        body: ["You may stop using the Services at any time. Sakura may suspend or terminate your access without prior notice if you breach these Terms or pose a security or legal risk. Sections 7, 9, 10, 11, and this Section 12 survive termination."],
      },
      {
        heading: "13. Contact",
        body: ["Questions, notices, or legal correspondence should be directed to:"],
        contact: true,
      },
    ],
  },
  zh: {
    badge: "法律 · SAKURA AI GUARDIAN",
    title: "使用條款",
    updated: "最後更新：2026年4月6日",
    notice: "重要聲明：本條款第11條包含具有約束力的仲裁條款及集體訴訟棄權聲明，請在使用服務前仔細閱讀。",
    sections: [
      {
        heading: "1. 簡介",
        body: [
          `本使用條款（「條款」）構成您（「使用者」、「您」）與 Sakura（「Sakura」、「我們」或「我方」）之間具有約束力的法律協議，規範您訪問和使用 Sakura Shielded Lending — 我們位於 Solana 的私密借貸層（由鏈上 Groth16 ZK 證明驗證救援），及其配套 Solana 原生基礎元件（跨協議 CPI 路由、alt_bn128 配對驗證器、鏈上審計），包括網頁應用程式、借貸池智能合約、AI 分析功能及所有相關介面（統稱「服務」）。`,
          "我們的隱私政策已納入本條款並構成本協議的一部分。",
          "訪問或使用服務即表示您確認年滿18歲，已閱讀並理解本條款，並同意受其約束。",
          "我們可能不時更新本條款。在任何更新後繼續使用服務，即表示接受修訂後的條款。",
        ],
      },
      {
        heading: "2. 人工智慧免責聲明",
        subsections: [
          { title: "2.1 AI 輸出的性質", body: "您正在與由 Claude AI（Anthropic）驅動的 AI 系統互動，而非持有執照的人類財務顧問。所有 AI 生成的內容、分析、安全評估及 DeFi 評論僅供參考，不構成投資建議或買賣任何資產的邀請。AI 輸出可能包含錯誤、遺漏或過時資訊。" },
          { title: "2.2 您的責任", body: "您有責任在採取行動前獨立評估所有 AI 生成的內容。所有 DeFi 決策和交易完全由您自行決定並承擔風險。" },
          { title: "2.3 AI 的局限性", body: "安全風險評分和投資組合健康評估反映的是分析時的可用資料，可能無法反映實時市場條件、新漏洞或協議變更。Sakura 不保證任何 AI 生成分析的準確性、可靠性或完整性。" },
          { title: "2.4 鏈上驗證", body: "Sakura 將每個 AI 分析決策的 SHA-256 哈希值記錄在 Solana 區塊鏈上，以實現透明度和獨立驗證。此哈希值僅是加密指紋，不構成財務建議或結果保證。" },
        ],
      },
      {
        heading: "3. 錢包連接與唯讀存取",
        subsections: [
          { title: "3.1 非託管", body: "Sakura 從不持有您的資產托管，也不儲存您的私鑰或助記詞。Shielded Lending 以純唯讀模式運作。cross-protocol routing 和 Shielded Lending 可代表您執行鏈上交易——但僅在您明確確認（跨協議救援）或透過 SPL Token Approve 在您設定的硬性支出上限內預授權（Shielded Lending）的情況下進行。Sakura 絕不超出您授權範圍發起任何交易。" },
          { title: "3.2 使用者責任", body: "您始終完全掌控自己的錢包。您根據 Sakura 分析選擇執行的所有 DeFi 交易均由您獨自負責。" },
          { title: "3.3 第三方錢包", body: "Phantom 是第三方錢包應用程式。Sakura 對因 Phantom 軟體、安全性或可用性問題引起的損失不承擔責任。" },
        ],
      },
      {
        heading: "4. 核心機制",
        subsections: [
          { title: "4.1 意圖簽署", body: "您以自然語言寫下代理的動作邊界——單次金額上限、允許協議集合、過期時間。七項策略值透過 2 層 Poseidon 樹壓縮為 32 位元組承諾，定錨於以您錢包為種子的 Program Derived Address (PDA) 之中。原始策略值始終留在您的瀏覽器內；鏈上僅見雜湊。簽署本身不執行任何 DeFi 動作——僅將邊界定錨。簽署時收取名義金額 0.1% 的一次性費用；整合者前 \\$10M 的整合量免收。" },
          { title: "4.2 ZK 證明生成與驗證", body: "代理每次嘗試執行動作時，Sakura 客戶端於您的瀏覽器內生成一份 Groth16 零知識證明，證明此次動作落在已簽承諾的邊界之內（金額上限、協議、動作類型、當下 Pyth 價格、slot 新鮮度）。此證明連同 DeFi 指令，提交於單一 Solana v0 原子交易之內。鏈上驗證器透過 alt_bn128 配對 syscall 驗證證明，耗時約 116k compute units——在任何 DeFi 指令被允許觸及用戶資金之前。證明 60 秒即過期。代理每次動作收取 \\$0.01 手續費，用於覆蓋鏈上驗證成本。" },
          { title: "4.3 原子性代理 DeFi 執行", body: "ZK 閘門與 DeFi 指令同處於單一 v0 原子交易之內——不可分離。若證明驗證失敗，或證明通過但 DeFi 指令本身失敗，整筆交易回滾；用戶資金從未被動過。不存在「證明通過、動作卻懸空」的縫隙。每一次執行在鏈上留下 keccak256 指紋；用戶、審計師、對手方，皆可在 Solscan 上獨立還原。Sakura 不保證底層 DeFi 指令本身的執行成功——Kamino、MarginFi、Jupiter、Marinade 等協議自身的失敗模式，仍然存在，各協議自負。" },
          { title: "4.4 x402 MCP 伺服器", body: "Sakura 在 /api/mcp 提供遵循 HTTP 402 / x402 Machine Payments Protocol 的 MCP 伺服器。客戶端（Claude Desktop、Cursor、VS Code，或任意 MCP 相容實作）呼叫端點後，伺服器回傳 402 與一筆 \\$1 USDC 付款請求；呼叫方於鏈上原子結算後，工具結果於同一響應週期內返回。無帳號、無 OAuth、無訂閱——認證即支付。" },
        ],
      },
      {
        heading: "5. 存取與使用",
        subsections: [
          { title: "5.1 授權", body: "Sakura 授予您有限、非獨家、不可轉讓、可撤銷的授權，僅供個人、非商業目的訪問和使用服務。" },
          {
            title: "5.2 禁止行為",
            intro: "您不得使用服務：",
            items: [
              "從事任何非法、有害或欺詐性活動；",
              "攻擊、探測或嘗試未授權存取 Sakura 的系統；",
              "上傳、傳輸或部署惡意軟體、病毒或有害代碼；",
              "生成禁止內容，包括仇恨言論或煽動暴力的內容；",
              "創建多個帳戶以濫用訂閱點數或優惠活動；或",
              "規避地理限制或從受限司法管轄區存取服務。",
            ],
          },
          { title: "5.3 收費模式", body: "Sakura 採用按使用付費模式：無帳號、無訂閱、無商務談判。費用結構為：(a) 意圖簽署——名義金額 0.1% 的一次性費用，整合者前 $10M 整合量免收；(b) 代理動作——每次驗證 $0.01，鏈上收取；(c) x402 MCP 端點——每次 /api/mcp 呼叫 $1 USDC，透過 HTTP 402 原子結算。所有費用皆在鏈上收取，完全透明。協議費金庫由 3-of-5 多簽管理，並受 program-level 硬性上限約束（execution_fee_bps ≤ 2%、platform_fee_bps ≤ 100%）。驗證金鑰於部署時寫入程式，非重新部署不可更改。無代幣。" },
        ],
      },
      {
        heading: "6. 訂閱、計費及費用",
        body: [
          "訂閱自動續訂，除非您在當前帳單週期結束前降級至免費方案。降級於下一個帳單週期開始時生效。",
          "訂閱費用預先收取，除非適用法律有要求，否則不予退款。付款處理由 Stripe 負責。",
        ],
      },
      {
        heading: "7. 風險提示",
        warning: "加密貨幣及 DeFi 風險：加密貨幣市場高度波動且具有投機性。AI 生成的分析不保證盈利結果。您應只投入您能承受全部損失的資金。",
        body: [
          "AI 分析風險：AI 生成的安全評分和 DeFi 建議是資訊工具，不構成投資建議，也不保證任何結果。",
          "第三方協議風險：Sakura 分析的 DeFi 協議是獨立的第三方系統。Sakura 對因與任何 DeFi 協議互動而產生的損失不承擔責任。",
          "一般性說明：過去的表現不代表未來的結果。服務中的任何內容均不構成買賣任何資產的邀請或建議。",
        ],
      },
      {
        heading: "8. 地理限制",
        intro: "服務不向以下司法管轄區的人員提供：",
        items: [
          "中國大陸", "伊朗", "古巴", "朝鮮", "敘利亞",
          "烏克蘭的克里米亞、頓涅茨克和盧甘斯克地區",
          "受聯合國、美國財政部外國資產控制辦公室（OFAC）、歐盟或英國全面經濟制裁的任何其他司法管轄區",
        ],
        note: "使用服務即表示您聲明並保證您不在受限司法管轄區。",
      },
      {
        heading: "9. 智慧財產權",
        body: [
          "Sakura 及其授權方保留平台、軟體、AI 模型、品牌及構成服務的所有其他材料的全部權利。",
          "您擁有您生成的分析輸出。您授予 Sakura 非獨家、免版稅的授權，按照我們的隱私政策處理您的資料，用於運營和改進服務。",
        ],
      },
      {
        heading: "10. 責任限制及免責聲明",
        body: [
          "服務按「現狀」和「可用狀態」提供，不附帶任何形式的明示或默示保證。",
          "在適用法律允許的最大範圍內，Sakura 對任何索賠的總責任不超過以下較高者：(a) 您在索賠前12個月支付給 Sakura 的總費用，或 (b) 100美元。",
        ],
        intro: "Sakura 對以下情況不承擔責任：",
        items: [
          "您根據 Sakura 分析執行的 DeFi 交易產生的損失；",
          "AI 生成的安全評分或投資組合評估不準確；",
          "智能合約漏洞、跑路或協議故障造成的損失；",
          "GoPlus API 不準確或第三方資料失誤造成的損失；",
          "Solana 網絡故障、擁塞或區塊鏈級事件；",
          "您 Phantom 錢包遭受未授權存取；或",
          "由第三方 API 中斷或不可抗力事件導致的服務中斷。",
        ],
      },
      {
        heading: "11. 仲裁及爭議解決",
        body: [
          "因本條款或服務引起的或與之相關的所有爭議，應最終由新加坡國際仲裁中心（SIAC）按照其規則以保密方式進行有約束力的仲裁解決。仲裁地為新加坡，語言為英語。",
          "集體訴訟棄權：您不可撤銷地放棄參與集體訴訟或代表性程序的任何權利。所有索賠必須以個人身份提出。",
        ],
      },
      {
        heading: "12. 終止",
        body: ["您可隨時停止使用服務。如您違反本條款或構成安全或法律風險，Sakura 可不事先通知即暫停或終止您的存取。第7、9、10、11條及本第12條在終止後繼續有效。"],
      },
      {
        heading: "13. 聯絡方式",
        body: ["問題、通知或法律函件請發送至："],
        contact: true,
      },
    ],
  },
  ja: {
    badge: "法的事項 · SAKURA AI GUARDIAN",
    title: "利用規約",
    updated: "最終更新：2026年4月6日",
    notice: "重要なお知らせ：本規約の第11条には、拘束力のある仲裁条項とクラスアクション放棄が含まれています。サービスをご利用になる前に必ずお読みください。",
    sections: [
      {
        heading: "1. はじめに",
        body: [
          `本利用規約（「規約」）は、お客様（「ユーザー」「お客様」）とSakura（「Sakura」「当社」）の間で締結される拘束力のある法的合意であり、Sakura Shielded Lending — Solana上のプライベート・レンディング・レイヤー（オンチェーン Groth16 ZK 証明による救援）— およびその付属のSolanaネイティブ基盤（クロスプロトコル CPI ルーティング、alt_bn128 ペアリング検証、オンチェーン監査）、ウェブアプリケーション、レンディング・プール・スマートコントラクト、AI分析機能、および関連インターフェース（総称して「サービス」）へのアクセスおよび利用を規定します。`,
          "当社のプライバシーポリシーは参照により本規約に組み込まれ、本合意の一部を構成します。",
          "サービスにアクセスまたは利用することで、お客様は18歳以上であること、本規約を読み理解したこと、および本規約に拘束されることに同意することを確認します。",
          "当社は随時本規約を更新することがあります。更新後もサービスを継続して利用することで、改訂された規約への同意とみなされます。",
        ],
      },
      {
        heading: "2. 人工知能に関する免責事項",
        subsections: [
          { title: "2.1 AI出力の性質", body: "お客様は、免許を持つ人間のファイナンシャルアドバイザーではなく、Claude AI（Anthropic）搭載のAIシステムと対話しています。AI生成のコンテンツ、分析、セキュリティ評価、DeFiに関する解説はすべて情報提供のみを目的としており、投資アドバイスや資産の売買の勧誘を構成するものではありません。" },
          { title: "2.2 お客様の責任", body: "お客様はAI生成コンテンツに基づいて行動する前に、自ら独立して評価する責任を負います。すべてのDeFiに関する決定とトランザクションは、お客様自身の裁量とリスクで行われます。" },
          { title: "2.3 AIの限界", body: "セキュリティリスクスコアとポートフォリオヘルス評価は、分析時点のデータを反映しており、リアルタイムの市場状況、新しいエクスプロイト、またはプロトコルの変更を反映していない場合があります。Sakuraはいかなるアドバイスの正確性、信頼性、または完全性も保証しません。" },
          { title: "2.4 オンチェーン検証", body: "SakuraはAI分析の各決定のSHA-256ハッシュをSolanaブロックチェーンに記録し、透明性と独立した検証を可能にします。このハッシュは暗号学的フィンガープリントに過ぎず、金融アドバイスや結果の保証を構成するものではありません。" },
        ],
      },
      {
        heading: "3. ウォレット接続と読み取り専用アクセス",
        subsections: [
          { title: "3.1 非カストディアル・読み取り専用", body: "Sakuraは読み取り専用プラットフォームです。Phantomウォレットを接続する際、Sakuraは分析提供のみを目的として、お客様の公開ウォレットアドレスと公開されているオンチェーンデータを読み取ります。秘密鍵やシードフレーズへのアクセス、署名権限を必要とする操作は一切行いません。" },
          { title: "3.2 ユーザーの責任", body: "お客様は常にウォレットを完全に管理しています。Sakuraの分析に基づいて実行するDeFiトランザクションはすべてお客様の責任です。" },
          { title: "3.3 サードパーティウォレット", body: "Phantomはサードパーティのウォレットアプリケーションです。Sakuraはそのソフトウェア、セキュリティ、または可用性に起因する問題について一切の責任を負いません。" },
        ],
      },
      {
        heading: "4. 中核機構",
        subsections: [
          { title: "4.1 意図署名", body: "お客様は、自然言語でエージェントの動作境界を書き下します——アクション 1 回あたりの上限、許可プロトコル集合、有効期限。7 つのポリシー値は、2 層の Poseidon ツリーを経て 32 バイトのコミットメントに畳み込まれ、お客様のウォレットをシードとする Program Derived Address (PDA) にオンチェーン定錨されます。元のポリシー値はお客様のブラウザに留まり、チェーンにはハッシュのみが届きます。署名そのものは、DeFi 動作を一切伴いません——境界を定錨するだけです。名目額の 0.1% の一回限り手数料が署名時に発生します。統合者あたり最初の \\$10M 分はリベートされます。" },
          { title: "4.2 ZK 証明の生成と検証", body: "エージェントが動作を試みるとき、Sakura クライアントはお客様のブラウザ内で Groth16 ゼロ知識証明を生成します。証明は、当該動作が署名済みコミットメントの境界内に収まっていること（金額上限、プロトコル、動作タイプ、現在の Pyth 価格、スロットの新鮮度）を保証します。証明は、単一の Solana v0 アトミックトランザクション内で DeFi 命令と共に提出されます。オンチェーン検証器は、alt_bn128 ペアリング syscall によって証明を約 116k compute units で検証します——DeFi 命令がユーザー資金に触れるよりも前に、です。証明は 60 秒で失効します。エージェント動作 1 回あたり \\$0.01 の手数料が、オンチェーン検証コストを補填するために課されます。" },
          { title: "4.3 アトミックなエージェント DeFi 実行", body: "ZK ゲートと DeFi 命令は、単一の v0 アトミックトランザクションの中に同居します——分離不可能です。証明が検証に失敗した場合、あるいは証明が通っても DeFi 命令自体が失敗した場合、トランザクション全体がリバートされます。ユーザー資金が触れられることはありません。「証明は通ったが動作は宙に浮いた」という隙間は、存在しません。各実行は keccak256 指紋をオンチェーンに残し、ユーザー、監査人、取引相手は、Solscan 上で独立に復元することができます。Sakura は、基盤となる DeFi 命令そのものの成功を保証しません——Kamino、MarginFi、Jupiter、Marinade 等、各統合プロトコル固有の失敗モードは、各プロトコルの責に属します。" },
          { title: "4.4 x402 MCP サーバー", body: "Sakura は /api/mcp にて、HTTP 402 / x402 Machine Payments Protocol に準拠した MCP サーバーを運用します。クライアント（Claude Desktop、Cursor、VS Code、および任意の MCP 互換実装）がエンドポイントを呼び出すと、サーバーは 402 と \\$1 USDC の支払要求を返します。呼び出し側がオンチェーンで原子決済を完了すると、ツールの応答は同一レスポンスサイクル内で戻ります。アカウント不要、OAuth 不要、サブスクリプション不要——認証そのものが決済です。" },
        ],
      },
      {
        heading: "5. アクセスと利用",
        subsections: [
          { title: "5.1 ライセンス", body: "Sakuraはお客様に対し、本規約に従い、個人的・非商業的目的のみでサービスにアクセスし利用するための、限定的・非独占的・譲渡不可・取消可能なライセンスを付与します。" },
          {
            title: "5.2 禁止行為",
            intro: "お客様は以下の目的でサービスを利用することはできません：",
            items: [
              "違法、有害、または詐欺的な活動への従事；",
              "Sakuraのシステムへの不正アクセスの試み；",
              "マルウェア、ウイルス、または有害なコードのアップロード・送信・展開；",
              "ヘイトスピーチや暴力を扇動するコンテンツを含む禁止コンテンツの生成；",
              "サブスクリプションクレジットやプロモーションを悪用するための複数アカウントの作成；または",
              "地理的制限の回避や制限管轄区域からのサービスアクセス。",
            ],
          },
          { title: "5.3 料金モデル", body: "Sakura は従量課金制で運用されます——アカウント、サブスクリプション、事業開発交渉、いずれも不要です。手数料構造は以下の通り：(a) 意図署名——名目額の 0.1% を 1 回限り徴収、統合者の最初の $10M 分はリベート；(b) エージェント動作——検証 1 回あたり $0.01 をオンチェーンで徴収；(c) x402 MCP エンドポイント——/api/mcp 呼び出し 1 回あたり $1 USDC、HTTP 402 により原子的に決済。すべての手数料はオンチェーンで透明に徴収されます。プロトコル金庫は 3-of-5 マルチシグによって管理され、プログラムレベルの上限（execution_fee_bps ≤ 2%、platform_fee_bps ≤ 100%）の範囲内で運用されます。検証鍵は展開時にプログラムに焼き込まれ、再展開なしには改変できません。トークンは発行しません。" },
        ],
      },
      {
        heading: "6. サブスクリプション・請求・料金",
        body: [
          "サブスクリプションは、現在の請求サイクルが終わる前に無料プランにダウングレードしない限り、自動的に更新されます。ダウングレードは次の請求サイクルの開始時に有効になります。",
          "サブスクリプション料金は事前に請求され、適用法で要求される場合を除き返金不可です。支払い処理はStripeが担当します。",
        ],
      },
      {
        heading: "7. リスク通知",
        warning: "暗号資産およびDeFiのリスク：暗号資産市場は非常に変動が激しく投機的です。AI生成の分析は利益を保証するものではありません。失ってもよいと思える資金のみを投入してください。",
        body: [
          "AI分析リスク：AI生成のセキュリティスコアやDeFi推奨は情報ツールであり、投資アドバイスではなく、いかなる結果も保証しません。",
          "サードパーティプロトコルリスク：Sakuraが分析するDeFiプロトコルは独立したサードパーティシステムです。SakuraはいかなるDeFiプロトコルとのやり取りから生じる損失についても責任を負いません。",
          "一般事項：過去のパフォーマンスは将来の結果を示すものではありません。サービス内のいかなる内容も、資産の売買の勧誘または推薦を構成するものではありません。",
        ],
      },
      {
        heading: "8. 地理的制限",
        intro: "サービスは以下の管轄区域の居住者には提供されません：",
        items: [
          "中国本土", "イラン", "キューバ", "北朝鮮", "シリア",
          "ウクライナのクリミア、ドネツク、ルハンスク地域",
          "国連、米国財務省外国資産管理局（OFAC）、EU、または英国による包括的経済制裁の対象となるその他の管轄区域",
        ],
        note: "サービスを利用することで、お客様は制限管轄区域に居住していないことを表明し保証します。",
      },
      {
        heading: "9. 知的財産権",
        body: [
          "Sakuraおよびそのライセンサーは、プラットフォーム、ソフトウェア、AIモデル、ブランド、およびサービスを構成するすべての素材に関するすべての権利を保持します。",
          "お客様が生成した分析出力はお客様が所有します。お客様はSakuraに対し、プライバシーポリシーに従ってサービスの運営と改善のためにデータを処理する非独占的・ロイヤリティフリーのライセンスを付与します。",
        ],
      },
      {
        heading: "10. 責任の制限と免責事項",
        body: [
          "サービスは「現状のまま」および「利用可能な状態で」提供され、いかなる種類の明示的または黙示的保証も伴いません。",
          "適用法で認められる最大限の範囲で、Sakuraの総責任は、(a) 請求の前12ヶ月間にお客様がSakuraに支払った総額、または (b) 100米ドルのいずれか大きい方を超えないものとします。",
        ],
        intro: "Sakuraは以下について責任を負いません：",
        items: [
          "Sakuraの分析に基づいてお客様が実行したDeFiトランザクションから生じる損失；",
          "AI生成のセキュリティスコアやポートフォリオ評価の不正確さ；",
          "スマートコントラクトのエクスプロイト、ラグプル、またはプロトコル障害による損失；",
          "GoPlus APIの不正確さまたはサードパーティデータの障害による損失；",
          "Solanaネットワークの障害、混雑、またはブロックチェーンレベルのイベント；",
          "お客様のPhantomウォレットへの不正アクセス；または",
          "サードパーティAPIの停止または不可抗力イベントによるサービス中断。",
        ],
      },
      {
        heading: "11. 仲裁と紛争解決",
        body: [
          "本規約またはサービスに関連して生じるすべての紛争は、シンガポール国際仲裁センター（SIAC）の規則に従い、シンガポールを仲裁地として英語で行われる拘束力のある機密仲裁によって最終的に解決されます。",
          "クラスアクション放棄：お客様はクラスアクションや代表者訴訟に参加する権利を取り消し不可能な形で放棄します。すべての請求は個人として行われる必要があります。",
        ],
      },
      {
        heading: "12. 終了",
        body: ["お客様はいつでもサービスの利用を停止できます。お客様が本規約に違反したり、セキュリティ上または法的なリスクをもたらしたりする場合、Sakuraは事前通知なしにアクセスを停止または終了することがあります。第7、9、10、11条および本第12条は終了後も有効です。"],
      },
      {
        heading: "13. お問い合わせ",
        body: ["ご質問、通知、または法的書類は以下にお送りください："],
        contact: true,
      },
    ],
  },
};

export default function TermsPage() {
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
  const warningBoxStyle: React.CSSProperties = {
    background: "var(--bg-card)", border: "1px solid var(--accent-mid)",
    borderLeft: "3px solid var(--accent)", borderRadius: 8,
    padding: "14px 18px", marginBottom: 16,
    fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7,
  };

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "56px 32px 80px" }}>
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
          padding: "16px 20px", marginBottom: 24,
          fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.85,
        }}>
          <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)", letterSpacing: "0.04em" }}>
            {lang === "zh" ? "關於 Sakura" : lang === "ja" ? "Sakuraについて" : "About Sakura"}
          </strong>
          {" — "}
          {lang === "zh"
            ? "Sakura 是 Solana 原生的代理執行邊界層。用戶一次性簽下一句自然語言邊界——例如「代理可在 Kamino 借貸，單次 $500 USDC，為期一週」。這句話被壓縮為 32 位元組 Poseidon 承諾，定錨於 Solana PDA。代理此後的每一次動作，都必須附上一份 Groth16 零知識證明，證明該動作落在承諾之內；此證明由鏈上 alt_bn128 配對 syscall 直接驗證，耗時約 116k compute units，然後 DeFi 指令才得以動用用戶資金。三項架構層面的承諾：① 零託管——私鑰永不離開用戶設備；② 運營方抹除——並非以策略約束運營方，而是數學不容許運營方的覆蓋權存在；③ 源碼 MIT 授權、整合無需許可——無帳號、無 OAuth、無商務談判。備えあれば憂いなし——架構層面的承諾，不是營銷口號。"
            : lang === "ja"
            ? "Sakura は、AI エージェントのための Solana ネイティブ実行境界層である。ユーザーは、境界を自然言語で一度だけ署名する——例えば「エージェントは Kamino に、1 回 $500 USDC、1 週間だけ貸せる」。この 1 文は 32 バイトの Poseidon コミットメントへと圧縮され、Solana の PDA に定錨される。エージェントはその後の各動作ごとに、当該動作がコミットメントの内側に収まることを示す Groth16 ゼロ知識証明を添付せねばならない。この証明は、alt_bn128 ペアリング syscall によってオンチェーンで直接検証され、約 116k compute units を要する。検証が通って初めて、DeFi 命令はユーザー資金に触れることが許される。3 つのアーキテクチャ上のコミットメント：① ゼロカストディ——秘密鍵はユーザーのデバイスを離れない；② 運営者の消去——運営者の上書き権は、数学がそれを認めないゆえに、そもそも存在しえない；③ ソースは MIT、統合は許可不要——アカウント、OAuth、事業開発交渉、いずれも不要。備えあれば憂いなし——アーキテクチャレベルの約束であって、マーケティングスローガンではない。"
            : "Sakura is a Solana-native execution-bounds layer for AI agents. A user signs, once, a natural-language bound — for instance: \"the agent may lend up to $500 USDC into Kamino, for one week.\" The sentence is compressed into a 32-byte Poseidon commitment on-chain. Every subsequent agent action must ship with a Groth16 zero-knowledge proof that the action falls inside that commitment; the proof is verified on-chain by the alt_bn128 pairing syscall in ~116k compute units, before any DeFi instruction is allowed to touch user funds. Three architectural commitments: ① Zero custody — the user's private key never leaves the user's device; ② Operator erasure — the operator class has no override capability because the math does not admit one; ③ MIT-licensed source, permissionless integration — no account, no OAuth, no business-development gate. 備えあれば憂いなし — an architectural commitment, not a marketing slogan."}
        </div>

        {/* Global notice */}
        <div style={warningBoxStyle}><strong>{lang === "zh" ? "重要聲明：" : lang === "ja" ? "重要なお知らせ：" : "Important Notice: "}</strong>{c.notice.replace(/^[^：:]+[：:]\s*/, "")}</div>

        {c.sections.map((sec, i) => (
          <div key={i} style={sectionStyle}>
            <h2 style={h2Style}>{sec.heading}</h2>

            {"warning" in sec && sec.warning && (
              <div style={warningBoxStyle}>{sec.warning}</div>
            )}

            {"body" in sec && Array.isArray(sec.body) && sec.body.map((p, j) => (
              <p key={j} style={pStyle}>{p}</p>
            ))}

            {"intro" in sec && sec.intro && <p style={pStyle}>{sec.intro}</p>}

            {"items" in sec && sec.items && (
              <ul style={ulStyle}>
                {sec.items.map((item, j) => <li key={j} style={liStyle}>{item}</li>)}
              </ul>
            )}

            {"note" in sec && sec.note && <p style={{ ...pStyle, fontStyle: "italic", opacity: 0.85 }}>{sec.note}</p>}

            {"subsections" in sec && sec.subsections && sec.subsections.map((sub, j) => (
              <div key={j}>
                <h3 style={h3Style}>{sub.title}</h3>
                {"body" in sub && sub.body && <p style={pStyle}>{sub.body}</p>}
                {"intro" in sub && sub.intro && <p style={pStyle}>{sub.intro}</p>}
                {"items" in sub && sub.items && (
                  <ul style={ulStyle}>
                    {sub.items.map((item, k) => <li key={k} style={liStyle}>{item}</li>)}
                  </ul>
                )}
              </div>
            ))}

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
