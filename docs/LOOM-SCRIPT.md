# Sakura — 3-Minute Loom Demo Script

> Target: Colosseum Frontier 2026 judges. Keep the camera on the product,
> the narrator off-screen. English voice-over is the default, Chinese is
> the localized alternate for regional judges. Each section header marks
> the **exact second** it should land — if you go over, cut content, not
> pace.

---

## Cold open — 0:00 → 0:15

**[SCREEN]** Tweet thumbnail of the 2026-04-11 Drift exploit headline:
*"Drift drains $285M via Durable Nonce authority hijack."* Fade to wallet-
scan spinner.

**[VO — EN]**
"Six days ago, 285 million dollars left Drift in a single afternoon.
Not because of a bad contract — because of a hidden Durable Nonce
authority nobody was looking at. Sakura is the tool that would have
caught it before it fired."

**[VO — ZH]**
「六天前，Drift 被抽走了兩億八千五百萬美元。合約沒寫錯，是一個隱藏的
Durable Nonce 授權沒人看。Sakura 就是那個本來應該事先抓到它的工具。」

---

## Feature 1 — Nonce Guardian — 0:15 → 0:55

**[SCREEN]** Paste a wallet address into the Nonce Guardian panel. Show the
spinning RPC call, then the red risk card appearing.

**[VO — EN]**
"Nonce Guardian scans every Durable Nonce account owned by your wallet
using `getProgramAccounts` on the System program, decodes the
80-byte layout, and flags any account whose authority is not you. That
is the exact attack vector Drift missed. Claude Sonnet 4.6 writes a
human-readable report; the user pays one dollar in USDC through Coinbase
x402. Zero subscription."

**[VO — ZH]**
「Nonce Guardian 用 `getProgramAccounts` 掃描你錢包下的每一個 Durable
Nonce 賬戶，解開那 80 bytes 結構，任何 authority 不是你的都會被標紅——
這就是 Drift 當時沒看到的攻擊面。Claude Sonnet 4.6 生成中文風險報告，
用戶用 Coinbase x402 在鏈上支付 1 USDC，一次性，不綁訂閱。」

**[ON-SCREEN CUT]** Zoom in on the x402 payment confirmation modal +
Solscan link opening in a new tab. Highlight the green "verified" badge.

---

## Feature 2 — Ghost Run — 0:55 → 1:30

**[SCREEN]** Type a natural-language strategy into Ghost Run:
*"Stake 3 SOL to Marinade and lend 50 USDC into Kamino."* Hit simulate.

**[VO — EN]**
"Ghost Run takes the prompt, builds two real unsigned transactions,
and runs them through Solana's native `simulateTransaction` RPC
against live on-chain state. No mocks, no estimates. You see the exact
mSOL you'd receive, the exact kUSDC return, the exact gas cost —
before signing anything. This is the one thing every chain except
Solana can't do, and we made it a consumer product."

**[VO — ZH]**
「Ghost Run 把你的自然語言策略轉成真的未簽名交易，餵進 Solana 原生的
`simulateTransaction` RPC，跑在即時鏈上狀態下。不是估算，不是 mock。
你會看到精確到 6 位小數的 mSOL 收益、kUSDC 收益、gas 成本——簽名之前全
部已知。這是只有 Solana 能做到的事，我們把它包成了消費級產品。」

**[ON-SCREEN CUT]** Show the simulation result card with the delta tokens
and gas. Click "Execute" and show the SAK-powered Jupiter swap firing.
Memo anchor link appears on Solscan.

---

## Feature 3 — Liquidation Shield — 1:30 → 2:20

**[SCREEN]** Open the Liquidation Shield tab. Show Kamino + MarginFi
positions auto-discovered with real health factors from the klend-sdk
oracle feeds. Click "Authorize rescue up to $1,000."

**[VO — EN]**
"Liquidation Shield is the hardest piece. The user pre-authorizes a
spending cap using SPL Token `approve` — that's the *first* on-chain
gate, enforced by the SPL Token program itself. Then they invoke our
Anchor program to write a mandate PDA — *second* gate, enforced by the
program with `has_one = agent`, `checked_sub` arithmetic, and a
`reported_hf_bps ≤ trigger_hf_bps` check that prevents the agent
from forging a panic. When health factor crosses the trigger, the
agent assembles a transaction that CPI-calls Kamino's `repay` with
`payer = agent, owner = user`, paying down the debt with the rescued
USDC. We collect 1% only on success. The cryptographic audit chain
is a real Pedersen commitment with Schnorr proof-of-knowledge on
BN254 — genuine elliptic curve operations via `@noble/curves`, not
hash-shaped pretend-crypto. Every rescue leaves a Memo anchor on
Solscan."

**[VO — ZH]**
「Liquidation Shield 是最難的一塊。用戶先用 SPL Token `approve` 授權
一個預算上限——這是第一道閘門，由 SPL Token 程式本身強制執行。再呼叫
我們的 Anchor 程式寫入 mandate PDA——這是第二道閘門，程式本身用
`has_one = agent`、`checked_sub` 算術、以及 `reported_hf_bps ≤
trigger_hf_bps` 檢查，防止代理偽造健康因子觸發救援。當健康因子真的跌破
閾值，代理組裝交易，CPI 呼叫 Kamino 的 `repay`，payer=代理、owner=
用戶，用救援金直接還債。成功才收 1%。鏈上審計鏈是真正的 BN254 Pedersen
commitment + Schnorr 零知識證明，由 `@noble/curves` 做真正的橢圓曲線運
算，不是用 hash 偽造的結構。每一次救援在 Solscan 都有 Memo 證據。」

**[ON-SCREEN CUT]** Rapid-fire three Solscan tabs: (1) the SPL approve tx,
(2) the Anchor `execute_rescue` tx with the two-gate CPI trace expanded,
(3) the Kamino `repay` tx with the user's obligation debt decreased.
Highlight the decreasing debt balance on the last tab.

---

## Close — 2:20 → 3:00

**[SCREEN]** Business-model slide. Three rows, total ARPU ≈ $5.20/month.

**[VO — EN]**
"Three products, three revenue lines. One dollar per nonce audit,
thirty basis points per Ghost Run swap via Jupiter's integrator fee,
one percent performance fee on successful rescues. Margin is 95%
because we spend about four cents on Claude tokens per paid call.
Break-even at one-hundred-eighty monthly actives on a platform with
five-hundred-thousand monthly actives — a zero-point-zero-four percent
penetration rate. The Anchor program, the ZK proof, the dual-gate
architecture, the devnet E2E script that produces clickable Solscan
links — everything judges need to verify is in the repo and linked
below. Thank you."

**[VO — ZH]**
「三個產品，三條收入線。每次 nonce 審計 1 美元，Ghost Run 透過 Jupiter
integrator fee 抽 30 bps，救援成功後抽 1% 績效費。邊際成本 5 美分，
毛利 95%。Solana 生態 50 萬月活，我們只需要 0.04% 滲透率就能損益兩平。
Anchor 程式、ZK 證明、雙閘門架構、還有能生成 Solscan 可點擊鏈結的
devnet E2E 腳本，評審需要驗證的每一項都在 GitHub。謝謝。」

**[SCREEN END CARD]** GitHub URL, devnet E2E command
(`npm run devnet:e2e`), Solscan devnet example link, team handle.

---

## Recording checklist (before you hit record)

- [ ] Browser: incognito, 1440×900, light mode, zoom 100 %, cache cleared
- [ ] Wallet: a devnet wallet with visible USDC + a Kamino obligation
- [ ] RPC: Helius devnet URL warm (one dummy call before record)
- [ ] Tabs preloaded in this order: Sakura home → Nonce Guardian input → Ghost Run input → Liquidation Shield input → Solscan blank
- [ ] Kill notifications (Do Not Disturb on), close Slack/Discord
- [ ] `/api/verify` curled once to warm the serverless region
- [ ] Anchor program ID in the UI matches what the devnet E2E script prints

## Pacing rules

1. Never explain what is visible. If the screen shows "1,000 USDC", don't say "one thousand USDC" — say *why* it matters.
2. Every feature segment must cut to at least one Solscan tab inside 20 seconds of starting — judges need on-chain evidence, not UI claims.
3. Keep the cursor out of dead corners; if you're not clicking, it should be parked next to what you're talking about.
4. The closing end card stays on screen for 7 seconds with the URLs; the voice-over ends 3 seconds before the card fades so judges can read without narration.

## What judges will actually click (rank-order)

1. The devnet E2E Solscan link — does an Anchor program they can inspect actually exist and have landed transactions?
2. The GitHub commit history — do the claims in the script trace to code, tests, and commits?
3. `/api/verify` in the browser — does the public proof endpoint return real BN254 points, or pretend-crypto?
4. BUSINESS.md — do the numbers match the code or diverge?

Every one of these is answerable "yes, verifiably" as of this commit.
Do not claim anything you can't show a Solscan tab for.
