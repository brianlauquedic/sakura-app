# Colosseum Frontier 2026 — Submission Answers

Working draft of answers for the Colosseum Frontier 2026 submission
form. Each section is sized to a 1000-character cap (Colosseum default
unless otherwise noted) and presented in the editorial / builder voice
established for Sakura.

---

## What are you building, and who is it for?

**986 chars · 1000 limit**

> Sakura is a Solana-native execution-bounds verifier for AI agents.
> Where every other approach (session keys, signed receipts, daily
> Merkle roots) lets the out-of-bounds action LAND, then records or
> limits — Sakura reverts before the DeFi instruction executes.
>
> Live on devnet: program `AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp`
> · 12 CPI cells (Kamino, Jupiter, Jito, Raydium) · ~204,460 CU/tx ·
> 121/121 tests + 15/15 adversarial reverts · MIT.
>
> A user signs one sentence ("agent may lend up to $1k USDC into
> Kamino, $10k cap, one week") that folds into a 32-byte Poseidon
> commitment on-chain; seven private values stay in the browser. Every
> agent action ships a Groth16 proof atomic with the DeFi instruction.
>
> Built for (1) Solana DeFi users running agentic strategies on borrow
> positions ($1.62B outstanding across Kamino + Jupiter Lend);
> (2) wallet operators (Phantom/Backpack/Abstract/Infinex) shipping
> agent modes — permissionless, 0.1% fee after $10M integrator rebate.

---

## Why did you decide to build this, and why build it now?

**971 chars · 1000 limit**

> Self-custody is a right retail users have been losing for two
> decades — Mt.Gox (2014), OKEx (2019), FTX (2022). Any rule an
> operator can override, will be overridden.
>
> I built Sakura to erase the operator class entirely. The user is the
> sovereign; the math is merely the enforcement.
>
> **Why now — three signals converged in 2025-26:**
>
> (1) Solana 1.17's `alt_bn128` syscall made Groth16 verification
> viable on L1 — ~204k CU per tx, vs. dollars per call on Ethereum L1.
>
> (2) Phantom, Backpack, Abstract, Infinex began shipping agent modes
> in 2026. The user-protection layer needs to land before the first
> big agent-DeFi failure, not after.
>
> (3) The harm is already booked: six 2024-25 Solana incidents, ~$42M
> in losses, $33M structurally preventable by the non-custodial
> bounded-intent model (`docs/INCIDENT-LIBRARY.md`, per-incident
> counter-factual).
>
> After the next big exploit, every wallet will scramble to bolt on
> something. Sakura ships the layer before they have to.

---

## What technologies are you using or integrating with to build your product?

**994 chars · 1000 limit**

> **On-chain (Solana-native):** Anchor + Rust on devnet · Solana `alt_bn128_pairing` syscall for on-chain Groth16 verification (~204k CU/tx) · 12 CPI integrations: Kamino Lend, Jupiter v6 + Jupiter Lend, Jito Stake Pool, Raydium Router · Pyth (PriceUpdateV2) + Switchboard On-Demand dual-oracle median gate · @solana/web3.js + @coral-xyz/anchor + Solana Wallet Adapter (Phantom + OKX).
>
> **Zero-knowledge:** Circom (bounded-intent circuit) · Poseidon (commitment) · Groth16 / BN128 · snarkjs (browser proof gen).
>
> **Frontend + distribution:** Next.js 16 App Router · React 19 · TypeScript · Vercel (sakuraaai.com) · tri-lingual i18n (zh/en/ja).
>
> **AI:** Claude Code (Opus/Sonnet 4.x) drove program code, tests, docs, analysis scripts, copy · Anthropic Agent SDK + MCP server (x402-monetized endpoint at /api/mcp/x402).
>
> **Dev + test:** Vitest (121/121 unit + 8 invariant + 15/15 adversarial revert) · DefiLlama + publicnode RPC for SOM scripts · Squads (3-of-5 governance, planned).

---

## Please share any important context about your repo

**981 chars · 1000 limit**

> The repo is the entire Sakura product — no parts held separately, no forked code. Frontend, Anchor program, ZK circuit + verifying key, tests, analysis scripts, docs, demo assets — all in-tree.
>
> Notes for judges:
>
> - **Devnet only.** Program live at `AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp`. Mainnet deploy deferred until post-hackathon — no real funds at risk during evaluation.
> - **Governance documented, not executed.** `docs/SQUADS_MIGRATION_RUNBOOK.md` describes the path from current 1/1 EOA upgrade authority to a 3-of-5 Squads multisig; on-chain transfer post-hackathon.
> - **Trusted setup is external.** Powers-of-Tau output referenced, not committed; only the resulting verifying key (`zk_verifying_key.rs`) ships in-tree, immutable.
> - **`scripts/som-analysis/` + `scripts/backtest-rescues.ts` are evidence artifacts** — not user-facing code; they reproduce empirical claims ($42M incident library, Kamino backtest) from public sources, no API keys required.

---

## Pitch video — YouTube metadata

For the separate "Pitch video" submission slot. Local file:
`scripts/demo-video/dist/sakura-pitch-2min.mp4` (108s · 3.3 MB · 1080p
H.264). Upload to YouTube `@Sakuraaaijp`, paste the resulting link
into the Colosseum form's Pitch-video field.

**Title (50 chars)**

```
Sakura · We revert before the DeFi instruction lands
```

**Description**

```
Sakura — every other AI-agent guardrail on Solana lets the action
LAND, then records or limits. Sakura reverts before the DeFi
instruction executes.

I’m Brian Lau. This is my 2-minute pitch.

Self-custody is a right retail users have been losing for two
decades. Mt.Gox. OKEx. FTX. Same structure each time — any rule a
software operator can override, will be overridden. Agentic DeFi
is the fourth iteration of the same trade. Sakura erases the
operator class from the user’s threat model.

— Chapters —

0:00  $42M of Solana agent losses · $33M structurally impossible
0:09  Self-custody, lost three times
0:30  The fourth iteration
0:50  How Sakura works — with live footage
       (sakuraaai.com · IntentSigner · Solana Explorer 206,325 CU)
1:22  Why me
1:39  Where to find it

— Links —

→ Live demo:    https://www.sakuraaai.com/?demo=true
→ Demo video:   <YouTube link to sakura-demo-3min after upload>
→ Repo (MIT):   https://github.com/brianlauquedic/sakura-app
→ Devnet:       AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp
→ DM me:        @sakuraaijp on X

— Production note —

Rendered with on-screen typography + Edge TTS voiceover (en-US-
GuyNeural -5%) for production speed. Live product footage extracted
from a real devnet e2e run. Happy to record a human-narrated
version on request.

#ColosseumFrontier #Solana #AIagent #ZKproof
```

**Why this version (vs prior drafts)**

- Title leads with the USP itself, no slot-metadata words ("pitch",
  "Colosseum", "2-min") — YouTube's algorithm classifies the slot
  from context; the title is for the project.
- Description first sentence delivers Sakura + USP + diff vs. other
  approaches in one stroke (visible above the YouTube preview fold).
- Technical phrasing tightened: "erases the operator class **from
  the user’s threat model**" (precise) over "makes the operator
  class structurally impossible" (slight overreach — the class
  itself isn’t banned, the user’s exposure to it is).
- Hashtags trimmed from 7 → 4 (signal vs. spam).
- Curly apostrophe `’` (U+2019) used throughout to match the
  voiceover (`I’m Brian Lau`) — straight ASCII `'` reads slightly
  off in the on-screen text and against the voice.

---

## Anything else judges should know about your project that isn't captured above?

**462 chars · 500 limit**

> Three honest disclosures.
>
> (1) Submission videos are AI-rendered (Playwright + Edge TTS); live product inside is real devnet footage.
>
> (2) Mainnet deferred until post-hackathon. Squads 3-of-5 migration documented, not executed (still 1/1 EOA). No wallet integration yet.
>
> (3) $33M of $42M Solana agent losses claimed preventable — not full $42M; per-incident counter-factuals in `docs/INCIDENT-LIBRARY.md`. Backtest 0 hits in quiet window — surfaced honestly.

---

## How do you know people actually need, or will need this product?

> **Honest framing: we are betting on emerging demand, not pulling on saturated demand.** Three signals support the bet:
>
> - **Past harm is documented.** Six 2024-25 Solana incidents totaling **$42M** in user losses where AI-agent / bot-custody patterns directly caused the loss. Catalogued with per-incident counter-factual in `docs/INCIDENT-LIBRARY.md`. DEXX (8,620 wallets · $30M), Solareum, Banana Gun, etc. The harm is on the books.
> - **Supply side is committing.** Phantom, Backpack, Abstract, and Infinex all announced agent modes shipping in 2026. The wallets that hold the assets are about to expose those assets to AI-agent delegation — whether or not bounded-intent verification exists.
> - **The structurally most-exposed surface is concrete.** $1.62B outstanding borrow debt across Kamino + Jupiter Lend (DefiLlama, 2026-04-24) is where the loss-upper-bound under unbounded delegation diverges from the action amount. That's the population with the highest dollar-stakes asymmetry.
>
> What we do **not** have: user interviews, waitlist sign-ups, paid pilots, or design-partner integrations. We are pre-customer. If agentic-DeFi adoption stalls, our market shrinks; if it takes off, we are positioned for it. A structural bet, not a demand-pull bet.

---

## How far along are you? Do you have users?

> **Zero users. Zero revenue. Devnet only.**
>
> What is shipped and verifiable:
>
> - Anchor program at `AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp` on Solana devnet
> - **12 CPI cells** across Kamino, Jupiter v6 + Jupiter Lend, Jito Stake Pool, Raydium AMM router
> - **121/121** unit tests + **8** invariant tests + **15/15** adversarial-revert stress tests passing
> - End-to-end Groth16 flow runnable via `npx tsx scripts/e2e-intent-execute.ts` — produces a real on-chain ActionRecord PDA
> - **~204,460 CU** per gated tx (mean of 5/5 devnet runs, raw data in `docs/bench/2026-04-22-cfull-cu.json`)
> - Live demo at `sakuraaai.com/?demo=true` (no wallet required)
> - MIT-licensed, public source: `github.com/brianlauquedic/sakura-app`
> - Two videos (demo + pitch) submitted with this application
>
> **Honest read**: this is hackathon-grade primitive. Working on devnet, no real funds at risk, no integrator shipping it yet. Mainnet deploy intentionally deferred until post-hackathon. The technical core is real; the go-to-market has not begun.

---

## Who else is building in this space, and what do you think they're getting wrong?

> **Direct Solana comparables** (all submitted to Colosseum prior seasons):
>
> | Approach | What happens to an out-of-bounds action |
> |---|---|
> | Session-key rotation *(default wallet answer)* | Lands; the next session key is narrower |
> | **Signed AI** (Breakout 2025) | Lands; a compressed-NFT receipt is minted |
> | **AgentRunner** (Cypherpunk 2025) | Lands; rolled into the day's Merkle root |
> | **AgentCred** (Cypherpunk 2025) | Lands up to the hot-key balance |
>
> **Adjacent (broader Web3 AI security):** Blowfish (tx simulation), GoPlus (token risk scoring), Goat (anomaly detection).
>
> **What they're getting wrong**: every direct comparable treats the agent guardrail as a **runtime policy check, executed after the action lands**. Either the action lands and gets recorded (Signed AI, AgentRunner), or the action lands up to a policy ceiling (session keys, AgentCred). The category default frames "containment" as "what do we do when something out-of-bounds happens?"
>
> Sakura's bet is that the question is wrong. The right question is "**how do we make out-of-bounds actions structurally unconstructible?**" — by binding the proof-of-bounds atomically to the DeFi instruction in a single v0 transaction. No proof, no execution. The transaction is never submitted.
>
> The differentiator isn't a better policy. It's that we don't run a policy at all.

---

## How do you make money, or how do you plan to?

> **Five priced operations, no token, fee flow only.** Full breakdown in `docs/VALUE_CAPTURE.md`. Summary:
>
> | Op | Price | Margin |
> |---|---|---|
> | `sign_intent` | 0.1% × max_usd_value | ~85% |
> | `execute_with_intent_proof` | $0.01 flat / action | ~99% |
> | `revoke_intent` | $0.05 flat (friction tax — discourage churn) | ~95% |
> | MCP `/api/mcp/x402` agent endpoint | $1 / call (x402 micropayments) | ~95% |
> | Integrator notional override | 0.1% after $10M rebate | n/a |
>
> **Current revenue: $0** (devnet only).
>
> **Phased path:**
> 1. **Mainnet launch (post-hackathon):** sign_intent fees from any user signing directly through `sakuraaai.com`
> 2. **Integrator partnerships (6–12 months):** when Phantom / Backpack / Abstract / Infinex ship a Sakura-gated agent mode, the 0.1% override accrues to the protocol fee vault automatically — zero ongoing BD overhead
> 3. **MCP/x402 endpoint (12+ months):** agent providers pay per-call to use Sakura as an execution gate — agent-callable Sakura-execution-as-a-service
>
> No token. No emissions. No yield promises. No claim that Sakura will "decentralize" through governance later. The math gate is the math gate; the fees flow to the protocol vault; the protocol vault is multisig-controlled.

---

## How long have you each been working on this? Have you been working on it full time?

> **Solo founder · Brian Lau · currently full-time.**
>
> - **Sakura the codebase**: ~3 months.
> - **The conviction underneath it predates this build by years** — watching the self-custody-vs-software-veto trade play out across Mt.Gox (2014) → OKEx (2019) → FTX (2022). The technical idea (bounded-intent + Groth16 as a Solana-native primitive) became cost-feasible only after Solana 1.17's `alt_bn128_pairing` syscall — part of why the build started when it did, not earlier.
> - **Pre-Sakura**: Solana DeFi engineering background — protocol-level work, comfortable with Anchor, IDLs, CPI composition, and the Solana account model.
> - **Full-time**: yes. Sakura is the entire bandwidth — not splitting attention with another role.

---

## Where is each member of the team currently based, and do you work in-person together?

> **Solo founder.** No team to coordinate in-person.
>
> **Currently based: Hong Kong.** The repo runs on Solana devnet (public RPC) and Vercel — geographically agnostic; nothing in the build depends on physical co-location.
>
> **Post-funding plan:** hire 1–2 senior Solana / ZK engineers within 6 months of seed close. Whether to co-locate the team depends on candidate location and preference — no hard hub requirement. Strong remote hire from anywhere wouldn't be deprioritized over a local one. Hong Kong gives reasonable timezone overlap with both Asia DeFi (Singapore, Tokyo, Seoul) and US west coast for late-evening calls — a useful middle for a globally-distributed early team.

---

## Pending fields

User will paste each remaining Colosseum form question + char limit.
Each will be drafted, char-counted to fit, and appended to this doc.

<!-- next field appended here -->
