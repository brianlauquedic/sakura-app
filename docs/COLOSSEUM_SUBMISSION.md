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

## Pending fields

User will paste each remaining Colosseum form question + char limit.
Each will be drafted, char-counted to fit, and appended to this doc.

<!-- next field appended here -->
