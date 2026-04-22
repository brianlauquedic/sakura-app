"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";

const CONTENT = {
  en: {
    badge: "LEGAL · SAKURA AGENTIC BOUNDS LAYER",
    title: "Terms of Service",
    updated: "Last updated: 6 April 2026",
    notice: "Important Notice: Section 11 of these Terms contains a binding arbitration clause and class-action waiver. Please read it carefully before using the Services.",
    sections: [
      {
        heading: "1. Introduction",
        body: [
          `These Terms of Service ("Terms") constitute a binding legal agreement between you ("User," "you," or "your") and Sakura ("Sakura," "we," "us," or "our") governing your access to and use of the Sakura protocol — a Solana-native execution-bounds layer for AI agents, comprising the Anchor program, the Groth16 on-chain verifier, the Poseidon intent-commitment registry, the x402 MCP endpoint, the associated SDK, the web application, and all related interfaces (collectively, the "Services").`,
          `The Sakura Anchor program currently operates on Solana devnet. Mainnet-beta availability is contingent on third-party security audit completion; no service-level commitment is offered for either environment.`,
          "Our Privacy Policy is incorporated into these Terms by reference and forms part of this agreement.",
          "By accessing or using the Services, you confirm that you are at least 18 years of age, that you have read and understood these Terms, and that you agree to be bound by them.",
          `We may update these Terms from time to time. Continued use of the Services after any update constitutes acceptance of the revised Terms.`,
        ],
      },
      {
        heading: "2. Nature of the Services",
        subsections: [
          { title: "2.1 Execution-Bounds Verifier, Not a Financial Adviser", body: "Sakura is an on-chain verifier layer that enforces user-signed execution bounds on third-party AI agents. It is not a custodian, broker-dealer, exchange, investment adviser, fund, or financial institution. Nothing in the Services constitutes investment, legal, tax, or other professional advice, nor a solicitation to buy or sell any asset." },
          { title: "2.2 No Managed Agent", body: "Sakura does not operate an AI agent on your behalf. You choose, configure, and remain solely responsible for any third-party agent you authorize to act within the bounds you sign. Any reference to a specific AI provider (for example, Anthropic Claude) in documentation or examples is illustrative only." },
          { title: "2.3 Your Responsibility for Intent Signing", body: "You alone determine the substance of each intent — the natural-language description, amount cap, USD cap, permitted protocols, permitted action types, and expiry. A signature binds you mathematically to those bounds. Sakura does not and cannot revise an intent on your behalf; you may only revoke and resign." },
          { title: "2.4 Limits of the ZK Gate", body: "The Groth16 proof system verifies, in mathematics, that a proposed action falls inside the bounds you signed. It does not, and does not claim to, evaluate whether the action is prudent, profitable, legal under your local law, or suitable to your financial circumstances. Enforcement is structural; judgment is yours." },
          { title: "2.5 On-Chain Transparency", body: "Each intent signature writes a 32-byte Poseidon commitment to a Program Derived Address; each verified agent action writes an ActionRecord PDA containing a keccak256 execution fingerprint, the referenced oracle slots, and the action metadata. These records are public, permanent, and independently auditable via Solscan or any Solana RPC — Sakura cannot hide, alter, or erase them after the fact." },
        ],
      },
      {
        heading: "3. Wallet Connection and Custody",
        subsections: [
          { title: "3.1 Non-Custodial", body: "Sakura does not hold custody of your assets and does not store your private keys or seed phrase. Every on-chain action originates from a signature produced inside your own wallet; the Sakura Anchor program has no administrator-withdrawal instruction and cannot move funds outside the scope you have authorized. The fee vault PDA is controlled by the program, not by any Sakura operator key." },
          { title: "3.2 Signature Scope", body: "Two classes of signature are required. (a) intent_sign: anchors your natural-language bound on-chain and deducts a one-time 0.1% notional fee. (b) SPL Token Approve (optional): a cap, set by you, that authorizes an agent's subsequent pull-transfers inside the bounds you have already signed. No third class of signature is ever requested by Sakura. You may revoke either at any time." },
          { title: "3.3 Third-Party Wallet Software", body: "Sakura supports Solana wallet adapters including Phantom, Backpack, OKX and others. All such wallets are independent third-party products. Sakura bears no liability for any defect, unavailability, or compromise of third-party wallet software, nor for any loss of funds or credentials that occurs outside the Sakura program itself." },
        ],
      },
      {
        heading: "4. Core Mechanism",
        subsections: [
          { title: "4.1 Intent Signing", body: "You write your agent's action bounds in natural language — per-action cap, USD cap, allowed protocols, allowed action types, expiry. Seven policy values fold through a two-layer Poseidon tree into a 32-byte commitment, anchored on-chain in a Program Derived Address seeded by your wallet. The original policy values stay in your browser and are never transmitted to a Sakura server; only the hash reaches the chain. Signing itself does not execute any DeFi action — it only anchors the bound. A one-time 0.1% fee on notional applies at signing, with the first $10M of integrator volume rebated, and an absolute hard cap of $1,000 per sign regardless of notional." },
          { title: "4.2 ZK Proof Generation & Dual-Oracle Gate", body: "When your agent attempts an action, the Sakura client generates a Groth16 zero-knowledge proof in your browser, attesting that the action falls inside the signed commitment. Inside the same Solana v0 atomic transaction, the on-chain verifier (a) checks the proof via the alt_bn128 pairing syscall in ~116k compute units, and (b) re-reads price feeds from two independent oracle networks — Pyth and Switchboard — settles the USD cap against their median, and rejects the action if the cross-oracle deviation exceeds 100 basis points. The Pyth reading must additionally fall within a 150-block freshness window. Only after both gates clear is the DeFi instruction permitted to touch user funds. A $0.01 per-action fee covers the on-chain verification cost." },
          { title: "4.3 Atomic Agentic DeFi Execution", body: "The ZK gate and the DeFi instruction share a single v0 atomic transaction — inseparable. If the proof fails to verify, if the oracle gate fails, or if the DeFi instruction itself fails, the entire transaction reverts; user funds are never touched. No gap remains in which the proof passes while the action is suspended mid-flight. Every execution leaves a keccak256 fingerprint on-chain; users, auditors, and counterparties can each reconstruct it independently on Solscan. Sakura does not guarantee execution success for the underlying DeFi instruction itself — failure modes specific to Jupiter, Raydium, Kamino, Jito, or any other integrated protocol remain the protocol's own." },
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
              "abuse faucet endpoints, circumvent rate limits, or operate coordinated scripts against the public API;",
              "circumvent geographic restrictions or access the Services from a Restricted Jurisdiction.",
            ],
          },
          { title: "5.3 Fee Model", body: "Sakura operates on pay-per-use: no accounts, no subscriptions, no business-development gate. The fees are: (a) intent signing — a one-time 0.1% fee on notional, rebated up to the first $10M of integrator volume; (b) agent action — $0.01 per verified action, collected on-chain; (c) x402 MCP endpoint — $1 USDC per /api/mcp call, settled atomically via HTTP 402. All fees are collected on-chain and are transparent. The protocol fee vault is governed by a 3-of-5 multisig, subject to program-level hard ceilings (execution_fee_bps ≤ 2%, platform_fee_bps ≤ 100%). The verifying key is baked into the program at deploy time and cannot be altered without redeployment. No token." },
        ],
      },
      {
        heading: "6. No Token, Open Source, Devnet Status",
        subsections: [
          { title: "6.1 No Token and Not a Security", body: "Sakura has not issued, and does not intend to issue, any fungible or non-fungible token. No airdrop is planned. Nothing in the Services constitutes an offer of securities, investment contracts, or any other regulated financial instrument. Any third-party claim purporting to offer a Sakura token should be treated as fraudulent." },
          { title: "6.2 Open Source", body: "The Anchor program, the Groth16 circuit, the verifying key, and the client SDK are released under the MIT License and published on a public Git repository. The public verifying key is further baked into the deployed program and cannot be altered without redeployment. Sakura's trademarks and the sakuraaai.com brand assets remain our property." },
          { title: "6.3 Devnet Status and Mainnet Roadmap", body: "The Services presently operate on Solana devnet only. Mainnet-beta deployment is contingent on completion of a third-party security audit. Until mainnet launch, no economic value is intended to transit the Services; any faucet-issued test assets have no monetary value. No service-level commitment is made for either devnet or mainnet-beta." },
        ],
      },
      {
        heading: "7. Risk Disclosures",
        warning: "Cryptocurrency, DeFi, and emerging cryptographic infrastructure carry material risk. Commit only funds you can afford to lose in full. Sakura does not guarantee any outcome, security, or service-level.",
        body: [
          "Smart contract risk. The Anchor program has not yet undergone a third-party audit. Notwithstanding internal testing and adversarial stress-test archives, residual vulnerabilities may exist; a previously unknown exploit may cause loss of funds held in user-approved allowances or in any integrated DeFi protocol.",
          "ZK proof risk. The Groth16 proving system relies on a multi-party Powers-of-Tau trusted setup. A compromise of the ceremony would not, on its own, allow funds to move outside your signed bounds — but may, in theory, allow a malicious prover to forge a passing proof for an action that does. Standard trusted-setup trust assumptions apply.",
          "Oracle risk. The verifier consumes Pyth and Switchboard price feeds. Coordinated manipulation of both oracle networks, or a prolonged freshness failure at either, may cause the dual-oracle gate to misbehave (either reverting legitimate actions or, in extremis, admitting mispriced ones).",
          "Third-party DeFi protocol risk. Integrated protocols (Jupiter, Raydium, Kamino, Jito, and any others) are independent systems. Sakura bears no liability for losses arising from exploits, insolvency, or governance failures of any such protocol.",
          "Stablecoin issuer risk. USDC and other stablecoins used as fee tokens or inside the permitted action set remain subject to their respective issuer's policies, including freeze and blocklist capabilities.",
          "Regulatory risk. Cryptoassets and agent-autonomous execution are subject to evolving regulation (including MiCA in the European Economic Area, equivalent regimes in Singapore, Hong Kong, Japan, and elsewhere). Future regulation may restrict or prohibit continued operation of the Services in your jurisdiction.",
          "General. Past performance is not indicative of future results. Nothing in the Services constitutes a solicitation or recommendation to buy, sell, or hold any asset.",
        ],
      },
      {
        heading: "8. Geographic and Sanctions Restrictions",
        intro: "The Services are not available to persons ordinarily resident in, or accessing the Services from, any of the following jurisdictions:",
        items: [
          "Mainland China", "Iran", "Cuba", "North Korea", "Syria", "Russia", "Belarus", "Myanmar", "Venezuela",
          "The Crimea, Donetsk, Luhansk, Zaporizhzhia, and Kherson regions of Ukraine",
          "Any other jurisdiction subject to comprehensive economic sanctions administered by the United Nations, the United States Office of Foreign Assets Control (OFAC), the European Union, the United Kingdom, or Singapore",
        ],
        note: "By using the Services, you represent and warrant that you are not located in, ordinarily resident in, a national of, or owned or controlled by a national of any Restricted Jurisdiction, and that you are not on any sanctions list maintained by the foregoing authorities. Sakura reserves the right to block wallet addresses that appear on the OFAC SDN list or any equivalent designation.",
      },
      {
        heading: "9. Intellectual Property",
        body: [
          "The Sakura Anchor program, the Groth16 circuit and verifying key, and the client SDK are released under the MIT License, publicly available on a Git repository; you may use, modify, and redistribute them under that licence.",
          "The Sakura name, logo, visual identity, and sakuraaai.com domain and content are the property of Sakura and its licensors. No right, title, or interest in those marks or branded assets is transferred to you by the MIT licence or by these Terms; their use for commercial or misleading purposes requires our written permission.",
          "You retain ownership of any intent text you compose and of any data you generate within your own wallet. You grant Sakura a non-exclusive, royalty-free licence strictly to process on-chain commitments and anonymised operational metrics as necessary to deliver the Services, consistent with our Privacy Policy.",
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
          "losses arising from any action you authorize an AI agent to perform within your signed bounds;",
          "losses from smart-contract exploits, rug pulls, governance failures, or insolvency of any integrated DeFi protocol (including Jupiter, Raydium, Kamino, Jito);",
          "losses arising from malfunction, compromise, or unavailability of any oracle (including Pyth and Switchboard), any RPC provider, or any trusted-setup ceremony;",
          "losses arising from issuer action on a stablecoin or token used in the Services (including freeze, blocklist, or redemption suspension);",
          "Solana network failures, congestion, forks, or any other blockchain-level event;",
          "unauthorized access to any third-party wallet software or to the device on which such software runs; or",
          "service interruptions due to third-party API outages, sanctions-list screening, or force-majeure events.",
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
    badge: "法律 · SAKURA AGENTIC BOUNDS LAYER",
    title: "使用條款",
    updated: "最後更新：2026年4月6日",
    notice: "重要聲明：本條款第11條包含具有約束力的仲裁條款及集體訴訟棄權聲明，請在使用服務前仔細閱讀。",
    sections: [
      {
        heading: "1. 簡介",
        body: [
          `本使用條款（「條款」）構成您（「使用者」、「您」）與 Sakura（「Sakura」、「我們」、「我方」）之間具有約束力的法律協議，規範您訪問和使用 Sakura 協議——一個面向 AI 代理、由 Solana 原生支撐的執行邊界層，由 Anchor 程式、鏈上 Groth16 驗證器、Poseidon 意圖承諾登記、x402 MCP 端點、配套 SDK、網頁應用程式及所有相關介面構成（統稱「服務」）。`,
          `Sakura Anchor 程式目前於 Solana devnet 上運作；mainnet-beta 之啟用，以第三方安全審計完成為前提。無論在任一環境，我們皆不承諾服務可用性水準（SLA）。`,
          "我們的隱私政策已納入本條款並構成本協議的一部分。",
          "訪問或使用服務即表示您確認年滿18歲，已閱讀並理解本條款，並同意受其約束。",
          "我們可能不時更新本條款。在任何更新後繼續使用服務，即表示接受修訂後的條款。",
        ],
      },
      {
        heading: "2. 服務的性質",
        subsections: [
          { title: "2.1 執行邊界驗證層，而非財務顧問", body: "Sakura 是一個鏈上驗證層，用於對第三方 AI 代理執行用戶已簽署的邊界約束。Sakura 並非託管方、經紀交易商、交易所、投資顧問、基金或任何金融機構。服務中的任何內容，均不構成投資、法律、稅務或其他專業建議，亦不構成買賣任何資產的邀請。" },
          { title: "2.2 Sakura 不代您運行 AI 代理", body: "Sakura 不代您運行任何 AI 代理。您自行選擇、配置並全權負責您授權在已簽邊界內動作的第三方代理。文件或示例中對特定 AI 供應商（例如 Anthropic Claude）的提及，僅供說明，不代表服務涵蓋範圍。" },
          { title: "2.3 意圖簽署的責任在您", body: "每一份意圖的全部內容——自然語言描述、單次金額上限、USD 上限、允許協議、允許動作類型、過期時間——概由您自行決定。一次簽署即代表您在數學上受其約束。Sakura 無權亦無能力代您修改意圖；您僅能撤銷後重簽。" },
          { title: "2.4 ZK 閘門的邊界", body: "Groth16 證明系統於數學上驗證「擬議動作落在您已簽邊界之內」——僅此而已。它不評估、亦不主張評估，該動作是否審慎、是否獲利、在您所在司法管轄區是否合法、是否符合您的財務狀況。執行由結構保證，判斷由您自理。" },
          { title: "2.5 鏈上透明", body: "每一次意圖簽署將 32 位元組 Poseidon 承諾寫入一個 Program Derived Address；每一次通過驗證的代理動作將一個 ActionRecord PDA 寫入鏈上，內含 keccak256 執行指紋、所引用預言機的 slot 參考、動作元資料。上述紀錄為公開、永久、可獨立查核（Solscan 或任意 Solana RPC 皆可）——Sakura 事後無權隱藏、修改或抹除。" },
        ],
      },
      {
        heading: "3. 錢包連接與託管關係",
        subsections: [
          { title: "3.1 非託管", body: "Sakura 不託管您的任何資產，亦不儲存您的私鑰或助記詞。每一筆鏈上動作皆源自您本人錢包內生成的簽名；Sakura Anchor 程式沒有任何「管理員提領」指令，無法將資金移出您已授權之範圍。手續費金庫 PDA 由程式本身控制，非由 Sakura 任何運營方之金鑰控制。" },
          { title: "3.2 簽名範圍", body: "僅需兩類簽名：（a）intent_sign：將您的自然語言邊界定錨於鏈上，並扣取名義金額 0.1% 的一次性費用；（b）SPL Token Approve（可選）：由您設定之代理後續拉式轉帳授權上限，僅在您已簽邊界之內動用。除此兩類之外，Sakura 不會要求您簽署第三類。兩者皆可由您隨時撤銷。" },
          { title: "3.3 第三方錢包軟體", body: "Sakura 支援 Solana 錢包介面，包括但不限於 Phantom、Backpack、OKX 等。上述錢包皆為獨立之第三方產品。Sakura 對第三方錢包軟體之任何瑕疵、不可用性、被入侵，以及任何發生於 Sakura 程式之外的資產或憑證損失，概不承擔責任。" },
        ],
      },
      {
        heading: "4. 核心機制",
        subsections: [
          { title: "4.1 意圖簽署", body: "您以自然語言寫下代理的動作邊界——單次金額上限、USD 上限、允許協議、允許動作類型、過期時間。七項策略值透過 2 層 Poseidon 樹壓縮為 32 位元組承諾，定錨於以您錢包為種子的 Program Derived Address (PDA) 之內。原始策略值始終留在您的瀏覽器內，從不傳送至 Sakura 任何伺服器；鏈上僅見雜湊。簽署本身不執行任何 DeFi 動作——僅將邊界定錨。簽署時收取名義金額 0.1% 的一次性費用；整合者前 \\$10M 整合量免收，無論名義金額多寡，每次簽署費用絕對封頂於 \\$1,000。" },
          { title: "4.2 ZK 證明生成與雙預言機閘門", body: "代理每次嘗試執行動作時，Sakura 客戶端於您的瀏覽器內生成一份 Groth16 零知識證明，證明此次動作落在已簽承諾之內。於同一筆 Solana v0 原子交易內，鏈上驗證器：(a) 透過 alt_bn128 配對 syscall 驗證證明，耗時約 116k compute units；(b) 同時讀取 Pyth 與 Switchboard 兩家獨立預言機的價格，取中位數結算 USD 上限，跨所偏差超過 100 bp（basis points）即拒絕該動作。Pyth 讀取須另於 150 塊新鮮度窗口之內。上述兩道閘門皆通過後，DeFi 指令才得以動用用戶資金。代理每次動作收取 \\$0.01 手續費，用於覆蓋鏈上驗證成本。" },
          { title: "4.3 原子性代理 DeFi 執行", body: "ZK 閘門與 DeFi 指令同處於單一 v0 原子交易之內——不可分離。若證明驗證失敗、雙預言機閘門失敗、或 DeFi 指令本身失敗，整筆交易回滾；用戶資金從未被動過。不存在「證明通過、動作卻懸空」的縫隙。每一次執行在鏈上留下 keccak256 指紋；用戶、審計師、對手方，皆可在 Solscan 上獨立還原。Sakura 不保證底層 DeFi 指令自身的執行成功——Jupiter、Raydium、Kamino、Jito 及其他整合協議自身的失敗模式，由各該協議自負。" },
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
              "濫用 faucet 端點、繞過速率限制、或以協同腳本攻擊公開 API；",
              "規避地理限制或從受限司法管轄區存取服務。",
            ],
          },
          { title: "5.3 收費模式", body: "Sakura 採用按使用付費模式：無帳號、無訂閱、無商務談判。費用結構為：(a) 意圖簽署——名義金額 0.1% 的一次性費用，整合者前 $10M 整合量免收；(b) 代理動作——每次驗證 $0.01，鏈上收取；(c) x402 MCP 端點——每次 /api/mcp 呼叫 $1 USDC，透過 HTTP 402 原子結算。所有費用皆在鏈上收取，完全透明。協議費金庫由 3-of-5 多簽管理，並受 program-level 硬性上限約束（execution_fee_bps ≤ 2%、platform_fee_bps ≤ 100%）。驗證金鑰於部署時寫入程式，非重新部署不可更改。無代幣。" },
        ],
      },
      {
        heading: "6. 無代幣、開源授權、Devnet 狀態",
        subsections: [
          { title: "6.1 無代幣、非證券", body: "Sakura 未發行、亦不打算發行任何同質化或非同質化代幣，亦無任何空投計劃。服務中的任何內容，不構成證券、投資合約、或任何其他受監管之金融工具之要約。凡聲稱提供「Sakura 代幣」之第三方行為，皆應視為詐騙。" },
          { title: "6.2 開源", body: "Anchor 程式、Groth16 電路、驗證金鑰、客戶端 SDK，皆以 MIT 授權條款發布於公開 Git 倉庫。公開驗證金鑰並已於部署時烘焙入合約，非重新部署不可變更。Sakura 之商標及 sakuraaai.com 品牌資產，仍屬我方所有。" },
          { title: "6.3 Devnet 狀態與 Mainnet 路線圖", body: "服務目前僅於 Solana devnet 上運作；mainnet-beta 之部署以第三方安全審計完成為前提。於 mainnet 啟用之前，服務不應承載任何經濟價值；faucet 發放之測試資產，不具任何貨幣價值。無論 devnet 或 mainnet-beta，我方皆不承諾服務水準（SLA）。" },
        ],
      },
      {
        heading: "7. 風險揭示",
        warning: "加密貨幣、DeFi 及新興密碼學基礎設施皆具實質性風險。您應只投入您能承受全部損失的資金。Sakura 不保證任何結果、安全性或服務水準。",
        body: [
          "智能合約風險：Anchor 程式尚未經第三方稽核。儘管我們已進行內部測試並建立對抗性壓力測試存檔，殘留漏洞可能仍然存在；新型已發現或未發現之攻擊手法，可能導致您於錢包授權額度或整合 DeFi 協議內之資金受損。",
          "ZK 證明風險：Groth16 證明系統依賴多方 Powers-of-Tau 信任設定儀式。儀式遭破壞本身，不足以使資金超出您已簽邊界——惟理論上，可能使惡意證明者為越界動作偽造可通過的證明。標準信任設定假設適用。",
          "預言機風險：驗證器消費 Pyth 與 Switchboard 價格饋送。兩家預言機同時遭操縱、或其中一家新鮮度長時間失效，可能使雙預言機閘門異常（過度拒絕合法動作，或於極端情況下誤放錯價動作）。",
          "第三方 DeFi 協議風險：整合之協議（Jupiter、Raydium、Kamino、Jito 及其他）皆為獨立系統。因該等協議遭攻擊、破產、治理失敗等所致之損失，Sakura 概不負責。",
          "穩定幣發行方風險：USDC 及其他用作手續費代幣或出現於允許動作集合中的穩定幣，仍受其發行方政策約束，包括但不限於凍結與黑名單能力。",
          "法規風險：加密資產及代理自主執行受動態演進之法規約束（包含歐洲經濟區的 MiCA，以及新加坡、香港、日本等地之對應法規）。未來之法規可能限制或禁止 Sakura 於您所在司法管轄區之持續運作。",
          "一般性說明：過去的表現不代表未來的結果。服務中的任何內容，均不構成買賣或持有任何資產的邀請或建議。",
        ],
      },
      {
        heading: "8. 地域限制與制裁",
        intro: "服務不向常居於、或由以下司法管轄區存取之人員提供：",
        items: [
          "中國大陸", "伊朗", "古巴", "朝鮮", "敘利亞", "俄羅斯", "白俄羅斯", "緬甸", "委內瑞拉",
          "烏克蘭的克里米亞、頓涅茨克、盧甘斯克、扎波羅熱及赫爾松地區",
          "受聯合國、美國財政部外國資產控制辦公室（OFAC）、歐盟、英國或新加坡全面經濟制裁的任何其他司法管轄區",
        ],
        note: "使用服務即表示您聲明並保證：您不在受限司法管轄區居住或常駐，亦非其國民，亦非受該等國民控股或控制之實體，且不在前述機構維護之任何制裁清單之上。Sakura 保留阻斷任何出現於 OFAC SDN 清單或同等指定之錢包位址之權利。",
      },
      {
        heading: "9. 智慧財產權",
        body: [
          "Sakura Anchor 程式、Groth16 電路及驗證金鑰、客戶端 SDK，以 MIT 授權條款發布，並於公開 Git 倉庫可取得；您可依該授權使用、修改、再發佈。",
          "Sakura 名稱、標誌、視覺識別、sakuraaai.com 網域及其內容，為 Sakura 及其授權方之財產。MIT 授權與本條款皆不轉讓此等商標或品牌資產之任何權利、權屬或利益；未經我方書面許可，不得作商業或足致誤認之使用。",
          "您保有您撰寫之意圖文本、以及您於自身錢包內所產生之任何資料的所有權。您僅為 Sakura 交付服務所必要之範圍，授予其處理鏈上承諾及匿名化運營指標之非獨家、免版稅授權——其範圍受我方隱私政策約束。",
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
          "您授權 AI 代理於已簽邊界之內執行任何動作所產生之損失；",
          "整合之任何 DeFi 協議（包含 Jupiter、Raydium、Kamino、Jito）之智能合約漏洞、跑路、治理失敗、或破產所致之損失；",
          "任何預言機（包含 Pyth 與 Switchboard）、任何 RPC 供應商、任何信任設定儀式之故障、遭入侵、或不可用所致之損失；",
          "服務中所使用穩定幣或代幣發行方之行為（包含凍結、黑名單、贖回暫停）所致之損失；",
          "Solana 網絡故障、擁塞、分叉、或任何其他區塊鏈級事件；",
          "任何第三方錢包軟體、或運行該軟體之設備，遭未授權存取；或",
          "因第三方 API 中斷、制裁清單過濾、或不可抗力事件所導致之服務中斷。",
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
    badge: "法的事項 · SAKURA AGENTIC BOUNDS LAYER",
    title: "利用規約",
    updated: "最終更新：2026年4月6日",
    notice: "重要なお知らせ：本規約の第11条には、拘束力のある仲裁条項とクラスアクション放棄が含まれています。サービスをご利用になる前に必ずお読みください。",
    sections: [
      {
        heading: "1. はじめに",
        body: [
          `本利用規約（「規約」）は、お客様（「ユーザー」「お客様」）と Sakura（「Sakura」「当社」）の間で締結される拘束力のある法的合意であり、Sakura プロトコル——AI エージェントのための Solana ネイティブな実行境界層であり、Anchor プログラム、オンチェーン Groth16 検証器、Poseidon 意図コミットメント登録、x402 MCP エンドポイント、付属 SDK、ウェブアプリケーション、および関連するすべてのインターフェース（総称して「サービス」）——へのアクセスおよび利用を規定します。`,
          `Sakura Anchor プログラムは、現在 Solana devnet 上で稼働しています。mainnet-beta への移行は第三者セキュリティ監査の完了を前提とし、いずれの環境においてもサービス水準（SLA）の約束は一切行いません。`,
          "当社のプライバシーポリシーは参照により本規約に組み込まれ、本合意の一部を構成します。",
          "サービスにアクセスまたは利用することで、お客様は18歳以上であること、本規約を読み理解したこと、および本規約に拘束されることに同意することを確認します。",
          "当社は随時本規約を更新することがあります。更新後もサービスを継続して利用することで、改訂された規約への同意とみなされます。",
        ],
      },
      {
        heading: "2. サービスの性質",
        subsections: [
          { title: "2.1 実行境界の検証層であり、ファイナンシャルアドバイザーではない", body: "Sakura は、第三者の AI エージェントに対して、ユーザーが署名した実行境界を強制するオンチェーン検証層です。カストディアン、ブローカーディーラー、取引所、投資顧問、ファンド、その他いかなる金融機関でもありません。本サービスのいかなる内容も、投資、法律、税務、その他の専門的な助言を構成するものではなく、また資産の売買を勧誘するものでもありません。" },
          { title: "2.2 Sakura はお客様に代わって AI エージェントを運用しません", body: "Sakura は、お客様に代わって AI エージェントを運用することはありません。お客様が署名した境界の内側で動作を委任する第三者エージェントの選定、設定、責任は、お客様に帰属します。ドキュメントやサンプル中の特定の AI プロバイダー（例：Anthropic Claude）への言及は、あくまで例示であり、サービス範囲を意味するものではありません。" },
          { title: "2.3 意図署名に対するお客様の責任", body: "各意図の内容——自然言語での記述、1 回あたりの上限、USD 上限、許可プロトコル、許可動作タイプ、有効期限——はすべてお客様が決定されます。1 度の署名によって、お客様はその境界に数学的に拘束されます。Sakura は、お客様に代わって意図を修正する権限も能力も持ちません。修正の代わりに、取消しと再署名のみが可能です。" },
          { title: "2.4 ZK 検証の限界", body: "Groth16 証明体系は、「提案された動作が、お客様が署名した境界内に収まること」を数学的に検証します——それ以上ではありません。当該動作が賢明であるか、利益を生むか、お客様の所在地の法の下で適法か、お客様の財務状況に照らして妥当か、これらの判断は行いませんし、行うと主張もしません。強制は構造が、判断はお客様が、それぞれ担います。" },
          { title: "2.5 オンチェーン透明性", body: "各意図署名は、32 バイトの Poseidon コミットメントを Program Derived Address に書き込みます。検証を通過した各エージェント動作は、keccak256 実行指紋、参照されたオラクル slot、動作メタデータを含む ActionRecord PDA をオンチェーンに記録します。これらの記録は公開かつ永続的で、Solscan または任意の Solana RPC を通じて独立に検証可能です——Sakura はこれを事後に隠蔽、改竄、消去することはできません。" },
        ],
      },
      {
        heading: "3. ウォレット接続とカストディ関係",
        subsections: [
          { title: "3.1 ノンカストディアル", body: "Sakura は、お客様の資産を一切カストディせず、秘密鍵やシードフレーズを保管することもありません。オンチェーン動作はすべて、お客様自身のウォレット内で生成された署名に起源します。Sakura Anchor プログラムには「管理者引き出し」命令が存在せず、お客様が授権した範囲を超えて資金を移動させることはできません。手数料金庫 PDA は、Sakura 運営者の鍵ではなく、プログラム自体によって制御されます。" },
          { title: "3.2 署名の範囲", body: "署名は 2 種類のみ必要とします。(a) intent_sign：お客様の自然言語境界をオンチェーンに定錨し、名目額の 0.1% の一回限り手数料を徴収します。(b) SPL Token Approve（任意）：お客様が設定した上限の範囲内で、エージェントによる後続のプル転送を認めるための授権です（既に署名済みの境界内のみ）。これ以外の第三の署名を、Sakura がお客様に要求することはありません。いずれもお客様の判断でいつでも取り消せます。" },
          { title: "3.3 第三者ウォレットソフトウェア", body: "Sakura は、Phantom、Backpack、OKX その他の Solana ウォレットアダプタに対応します。これらのウォレットはすべて独立した第三者製品であり、ソフトウェアの欠陥、利用不能、侵害、および Sakura プログラム外で発生する資産・認証情報の損失について、Sakura は一切責任を負いません。" },
        ],
      },
      {
        heading: "4. 中核機構",
        subsections: [
          { title: "4.1 意図署名", body: "お客様は、自然言語でエージェントの動作境界を書き下します——1 回あたりの上限、USD 上限、許可プロトコル、許可動作タイプ、有効期限。7 つのポリシー値は、2 層の Poseidon ツリーを経て 32 バイトのコミットメントに畳み込まれ、お客様のウォレットをシードとする Program Derived Address (PDA) にオンチェーン記録されます。元のポリシー値はお客様のブラウザに留まり、Sakura のいかなるサーバーにも送信されません。チェーンに届くのはハッシュのみです。署名そのものは、DeFi 動作を一切伴いません——境界を記録するだけです。名目額の 0.1% の一回限り手数料が署名時に発生します。統合者あたり最初の \\$10M 分はリベート、名目額の如何を問わず 1 回の署名ごとに \\$1,000 の絶対上限が適用されます。" },
          { title: "4.2 ZK 証明の生成と双予言機ゲート", body: "エージェントが動作を試みるとき、Sakura クライアントはお客様のブラウザ内で Groth16 ゼロ知識証明を生成します。証明は、当該動作が署名済みコミットメントの内側に収まっていることを主張します。同一の Solana v0 アトミックトランザクション内で、オンチェーン検証器は次を実行します——(a) alt_bn128 ペアリング syscall により、約 116k compute units で証明を検証；(b) Pyth と Switchboard の 2 つの独立したオラクルネットワークから価格を読み取り、その中央値で USD 上限を決済、乖離が 100 bp を超える場合は当該動作を拒絶。Pyth の読み取りはさらに 150 ブロックの新鮮度枠内である必要があります。両方のゲートが通過して初めて、DeFi 命令はユーザー資金に触れることが許可されます。エージェント動作 1 回あたり \\$0.01 の手数料が、オンチェーン検証コストを補填するために課されます。" },
          { title: "4.3 アトミックなエージェント DeFi 実行", body: "ZK ゲートと DeFi 命令は、単一の v0 アトミックトランザクションの中に同居します——分離は不可能です。証明が検証に失敗した場合、双予言機ゲートが失敗した場合、あるいは DeFi 命令自体が失敗した場合、トランザクション全体がリバートされ、ユーザー資金が触れられることはありません。「証明は通ったが動作は宙に浮いた」という隙間は、存在しません。各実行は keccak256 指紋をオンチェーンに残し、ユーザー、監査人、取引相手は、Solscan 上で独立に復元することができます。Sakura は、基盤となる DeFi 命令そのものの成功を保証しません——Jupiter、Raydium、Kamino、Jito その他、各統合プロトコル固有の失敗モードは、各プロトコルの責に属します。" },
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
              "Sakura のシステムへの不正アクセスの試み；",
              "マルウェア、ウイルス、または有害なコードのアップロード・送信・展開；",
              "faucet エンドポイントの濫用、レート制限の回避、公開 API に対する協調的スクリプトの運用；",
              "地理的制限の回避、または制限管轄区域からのサービスへのアクセス。",
            ],
          },
          { title: "5.3 料金モデル", body: "Sakura は従量課金制で運用されます——アカウント、サブスクリプション、事業開発交渉、いずれも不要です。手数料構造は以下の通り：(a) 意図署名——名目額の 0.1% を 1 回限り徴収、統合者の最初の $10M 分はリベート；(b) エージェント動作——検証 1 回あたり $0.01 をオンチェーンで徴収；(c) x402 MCP エンドポイント——/api/mcp 呼び出し 1 回あたり $1 USDC、HTTP 402 により原子的に決済。すべての手数料はオンチェーンで透明に徴収されます。プロトコル金庫は 3-of-5 マルチシグによって管理され、プログラムレベルの上限（execution_fee_bps ≤ 2%、platform_fee_bps ≤ 100%）の範囲内で運用されます。検証鍵は展開時にプログラムに焼き込まれ、再展開なしには改変できません。トークンは発行しません。" },
        ],
      },
      {
        heading: "6. トークン不発行・オープンソース・Devnet ステータス",
        subsections: [
          { title: "6.1 トークン不発行、非証券", body: "Sakura は、代替可能トークンおよび非代替トークンを発行しておらず、今後発行する予定もありません。エアドロップの計画もありません。本サービスのいかなる内容も、証券、投資契約、その他規制対象となる金融商品の募集を構成するものではありません。「Sakura トークン」を提供すると称する第三者の行為があれば、詐欺としてお取り扱いください。" },
          { title: "6.2 オープンソース", body: "Anchor プログラム、Groth16 回路、検証鍵、クライアント SDK は、MIT ライセンスに基づき、公開 Git リポジトリで公表されています。公開検証鍵はさらに、デプロイ時にプログラムに焼き込まれており、再デプロイなしには改変できません。Sakura の商標および sakuraaai.com のブランド資産は、当社に帰属します。" },
          { title: "6.3 Devnet ステータスと Mainnet ロードマップ", body: "本サービスは現在、Solana devnet 上でのみ稼働しています。mainnet-beta への展開は、第三者セキュリティ監査の完了を前提とします。mainnet 開始前においては、本サービスは経済的価値の媒介を意図していません。faucet が発行するテスト資産には、金銭的価値はありません。devnet、mainnet-beta のいずれにおいても、サービス水準の約束はいたしません。" },
        ],
      },
      {
        heading: "7. リスク開示",
        warning: "暗号資産、DeFi、および新興の暗号インフラには、実質的なリスクが伴います。全額失ってもかまわない資金のみを投入してください。Sakura は、いかなる結果、セキュリティ、サービス水準も保証しません。",
        body: [
          "スマートコントラクトリスク：Anchor プログラムは、まだ第三者セキュリティ監査を受けていません。内部テストおよび対抗ストレステストの記録を経てはいますが、残存する脆弱性が存在する可能性があります。既知・未知のエクスプロイトにより、お客様の authorize 済み上限内、あるいは統合 DeFi プロトコル内の資金が失われる可能性があります。",
          "ZK 証明リスク：Groth16 証明系は、多者参加の Powers-of-Tau 信頼セットアップ儀式に依拠します。儀式が侵害されても、それ自体によって資金がお客様の署名済み境界の外に動くことはありませんが、理論的には、悪意ある証明者が境界外の動作に対して検証を通過する証明を偽造する余地が生じ得ます。標準的な信頼セットアップ前提が適用されます。",
          "オラクルリスク：検証器は Pyth と Switchboard の価格フィードを消費します。両オラクルネットワークが同時に操作される、あるいは一方の新鮮度が長期に失敗する場合、双予言機ゲートが誤作動する可能性があります（正当な動作を過度に拒絶する、あるいは極端な状況では誤価格の動作を通過させる、等）。",
          "第三者 DeFi プロトコルリスク：統合対象のプロトコル（Jupiter、Raydium、Kamino、Jito その他）は、それぞれ独立したシステムです。当該プロトコルのエクスプロイト、債務不履行、ガバナンス失敗等に起因する損失について、Sakura は責任を負いません。",
          "ステーブルコイン発行者リスク：USDC その他、手数料トークンおよび許可動作集合の対象となるステーブルコインは、それぞれの発行者の方針（フリーズおよびブロックリスト機能を含む）の制約を受け続けます。",
          "規制リスク：暗号資産およびエージェント自律実行は、動的に進化する規制の対象となります（欧州経済領域の MiCA、およびシンガポール、香港、日本等における同等の制度を含む）。将来の規制により、お客様の所在地における本サービスの継続が制限または禁止される可能性があります。",
          "一般事項：過去の運用実績は、将来の結果を示すものではありません。本サービスのいかなる内容も、資産の売買または保有を勧誘・推奨するものではありません。",
        ],
      },
      {
        heading: "8. 地理的制限および制裁",
        intro: "本サービスは、以下の管轄区域に通常居住する方、または当該地域からアクセスされる方にはご提供いたしません：",
        items: [
          "中国本土", "イラン", "キューバ", "北朝鮮", "シリア", "ロシア", "ベラルーシ", "ミャンマー", "ベネズエラ",
          "ウクライナのクリミア、ドネツク、ルハンスク、ザポリージャ、ヘルソン地域",
          "国連、米国財務省外国資産管理局（OFAC）、EU、英国、またはシンガポールによる包括的経済制裁の対象となるその他の管轄区域",
        ],
        note: "サービスを利用することで、お客様は、制限管轄区域に所在または常居住しておらず、当該地域の国民でもなく、当該国民が所有または支配する主体でもなく、上記機関が維持するいかなる制裁リストにも記載されていないことを表明し、保証します。Sakura は、OFAC SDN リスト、またはこれに相当する指定に掲載されるウォレットアドレスを遮断する権利を留保します。",
      },
      {
        heading: "9. 知的財産権",
        body: [
          "Sakura Anchor プログラム、Groth16 回路および検証鍵、クライアント SDK は、MIT ライセンスの下で公開 Git リポジトリに公表されています。同ライセンスに従って、使用、改変、再配布していただけます。",
          "Sakura の名称、ロゴ、視覚的同一性、sakuraaai.com ドメインおよびそのコンテンツは、Sakura およびそのライセンサーに帰属します。MIT ライセンスおよび本規約は、これら商標・ブランド資産のいかなる権利、権原、利益もお客様に移転いたしません。商業目的または誤認を招く目的での使用には、当社の書面による許諾が必要です。",
          "お客様が作成した意図テキスト、およびお客様自身のウォレット内で生成したデータの所有権は、お客様に帰属します。お客様は、本サービスの提供に必要な範囲に限り、オンチェーンのコミットメントおよび匿名化された運用指標を処理するための非独占的・ロイヤリティフリーのライセンスを Sakura に付与するものとします——処理範囲は、当社のプライバシーポリシーに従います。",
        ],
      },
      {
        heading: "10. 責任の制限と免責事項",
        body: [
          "サービスは「現状のまま」および「利用可能な状態で」提供され、いかなる種類の明示的または黙示的保証も伴いません。",
          "適用法で認められる最大限の範囲で、Sakuraの総責任は、(a) 請求の前12ヶ月間にお客様がSakuraに支払った総額、または (b) 100米ドルのいずれか大きい方を超えないものとします。",
        ],
        intro: "Sakura は以下について責任を負いません：",
        items: [
          "お客様が署名済み境界内で AI エージェントに委ねた動作から生じる損失；",
          "統合対象の DeFi プロトコル（Jupiter、Raydium、Kamino、Jito を含む）におけるスマートコントラクトのエクスプロイト、ラグプル、ガバナンス失敗、または破綻による損失；",
          "オラクル（Pyth および Switchboard を含む）、RPC プロバイダー、あるいは信頼セットアップ儀式の誤動作、侵害、または利用不能に起因する損失；",
          "本サービスで使用されるステーブルコインまたはトークンの発行者による措置（フリーズ、ブロックリスト、償還停止を含む）に起因する損失；",
          "Solana ネットワークの障害、混雑、フォーク、その他のブロックチェーンレベルのイベント；",
          "第三者ウォレットソフトウェア、またはそれを実行する機器に対する、不正アクセス；または",
          "第三者 API の停止、制裁リストの審査、不可抗力事象に起因するサービスの中断。",
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
