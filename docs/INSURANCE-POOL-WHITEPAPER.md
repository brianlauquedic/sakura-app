# Sakura Rescue Insurance Pool — Whitepaper v0.1

> **A mutual DeFi rescue-insurance market on Solana.**
> Users pay premiums to pre-fund rescue capital. LPs earn yield on unused
> premiums. When a rescue fires, the payout is drawn from the pool — not
> the user's own wallet. Integrates natively with Sakura Liquidation Shield.

Author: Sakura core team
Status: **Draft for Colosseum Frontier Hackathon 2026**
Last updated: 2026-04-17

---

## 1. Motivation — why an insurance pool at all

Sakura Liquidation Shield v1 (already shipped) works like this:

> The user pre-authorizes up to `max_usdc` in their own wallet via SPL
> `approve`. When HF drops below trigger, the agent pulls from the user's
> wallet to repay their debt. Fee: 10 % of liquidation-penalty saved
> (`Pay-per-Save v1`, see `SECURITY.md` §2).

This is safe, but has four structural problems:

| # | Problem | Impact |
|---|---------|--------|
| P1 | Every user must keep rescue capital liquid in their own wallet | Capital-inefficient; idle USDC earns 0 % |
| P2 | Users who never get rescued pay nothing (beyond $1/mo Guardian) — moral hazard inverse | No sustainable revenue stream |
| P3 | Users who *need* rescuing often can't afford to idle capital | Worst-case users are worst-served |
| P4 | No way for bystanders to earn on Sakura's safety value | No LP flywheel |

The Rescue Insurance Pool solves all four: users pool premiums, LPs back
the pool, and rescues draw from shared capital that earns yield while idle.

---

## 2. Design in one paragraph

Users pay a monthly premium `P = r_prem × coverage_cap` (configurable,
default **10 bps/mo** of at-risk collateral cap) into a shared **USDC
pool**. LPs deposit USDC into the same pool and receive ERC-4626-style
**pool shares**. On a successful rescue, up to the user's `coverage_cap`
is drawn from the pool (not the user's wallet) and sent to the rescue
destination. Unused premiums accrue to share price — LPs earn yield on
the time-value of un-used rescue capital. The user's `coverage_cap`
renews monthly as premiums are paid; unpaid policies lapse in ≤ 48 h.

---

## 3. Accounts (Anchor)

```
Pool (singleton PDA)
  seeds = ["sakura_pool"]
  fields: admin, usdc_vault, total_shares, premium_bps,
          min_reserve_bps, paused, bump

LpPosition (one per LP)
  seeds = ["sakura_lp", lp_wallet]
  fields: lp, shares, deposited_at, last_yield_claim_slot, bump

Policy (one per insured user)
  seeds = ["sakura_policy", user_wallet]
  fields: user, coverage_cap_usdc, premium_paid_micro, paid_through_unix,
          total_claimed, rescue_count, is_active, bump

ClaimRecord (PDA per claim)
  seeds = ["sakura_claim", user_wallet, nonce_le_bytes]
  fields: policy, amount_usdc, rescue_sig_32, ts, settled
```

All PDAs live under a new program `sakura_insurance` (separate from the
existing `sakura_mandate`). The mandate program stays in charge of
dual-gate authorization; the insurance program is strictly the
*source of rescue capital* when the user opts in.

---

## 4. Core instructions

### 4.1 LP side

| Ix | Effect | Gatekeeping |
|---|---|---|
| `lp_deposit(usdc)` | transfer USDC to `pool.usdc_vault`, mint shares = `usdc × total_shares / pool_usdc` (first depositor: 1 share per 1 µUSDC) | any wallet |
| `lp_withdraw(shares)` | burn shares, transfer back `usdc = shares × pool_usdc / total_shares` | reverts if `pool_usdc - usdc < min_reserve_bps × coverage_outstanding` |

Yield is implicit: share price = `pool_usdc / total_shares` rises as
premiums land and falls as claims land.

### 4.2 User side

| Ix | Effect | Gatekeeping |
|---|---|---|
| `buy_policy(premium, coverage_cap)` | transfer premium to pool; create/update Policy PDA; set `paid_through = now + 30 d × premium / (premium_bps × coverage_cap)` | `premium >= premium_bps × coverage_cap × 30_days / YEAR` |
| `renew_policy(premium)` | extends `paid_through` | Policy must not be lapsed > 48 h |
| `close_policy` | refunds `unused_days × daily_premium`; flips `is_active=false` | user-signed only |

Policy is **lapsed** if `now > paid_through + 48h grace`. Rescues against
lapsed policies are rejected.

### 4.3 Rescue / claim

`claim_payout(amount_usdc, rescue_sig_32)`

- **Signer:** the registered Sakura agent (same pubkey used in `sakura_mandate`).
- **Accounts:** `policy`, `pool.usdc_vault`, `rescue_destination_ata`,
  `claim_record` (new PDA seeded on policy + per-claim nonce).
- **Checks:**
  1. `policy.is_active && now <= policy.paid_through + 48h`
  2. `policy.total_claimed + amount_usdc ≤ policy.coverage_cap_usdc`
  3. `pool.usdc_vault.amount >= amount_usdc`
  4. `signer == pool.admin_agent` (admin agent is a separate pubkey from
     pool admin — can be rotated without migration)
  5. Replay protection: `claim_record` PDA cannot already exist
- **Effect:** CPI USDC transfer from vault → rescue destination; bump
  `policy.total_claimed`; write `claim_record` with rescue_sig hash.

### 4.4 Admin / safety

- `pause(reason_hash)` — admin can pause new policies + new claims; LP
  withdraw remains open so LPs never feel trapped.
- `rotate_admin_agent(new)` — updates the rescue-claim signer without
  touching active policies (no user migration).
- `set_premium_bps(new_bps)` — only affects policies bought after the
  change; existing policies keep their locked-in rate until renewal.

---

## 5. Economics

### 5.1 Steady-state premium pricing

Assumptions (all conservative, documented so anyone can argue with the
numbers):

- 4 % annual portfolio-loss rate on insured positions (Kamino historical
  base rate 2024–2026, see `docs/BACKTEST-RESCUES.md`)
- 5 % liquidation penalty (Kamino)
- Rescue success rate of our policy: 85 % (backtest, $10k cap tier)
- LP target yield: 8 % APY (competitive with Kamino supply USDC)

Break-even premium =
`(4% × 5% × 85%) + (LP_yield_target) + (ops_cost)`
= `0.17% + 8% + 0.25%` annualized on coverage
≈ **0.70 %/mo of coverage cap** (42 bps base rate, rounded up)

Default whitepaper number **10 bps/mo** is already well above the
actuarial floor → leaves room for LP yield + ops + buffer reserves.

### 5.2 Reserve ratio

`min_reserve_bps = 2000` (20 %). LP withdraws that would push reserve
below this threshold revert. This protects LPs from themselves during
panic withdraws — no single LP can drain the pool below coverage.

### 5.3 LP yield example

Suppose **$1M pool**, **$3M outstanding coverage** across 300 policies:

- Monthly premium inflow = `3M × 10 bps = $3,000`
- Expected monthly claim outflow = `3M × (4 %/12) × 5 % × 85 % = $425`
- **Monthly net to LPs** = `$2,575` → **30.9 % APY** on $1M pool

The pool is still solvent under a **7× tail event** (7 months of
baseline claims in a single month), because premiums > claim at 7× factor.
Beyond that, `pause()` engages and policies go into claim-queue.

---

## 6. Moral hazard & adverse selection

### 6.1 Moral hazard
If users are insured, do they take on riskier positions?

- **Deductible via Pay-per-Save fee**: existing 10 %-of-penalty fee still
  applies to insurance-backed rescues (pool pays the 90 %, user pays the
  10 % fee directly). User has real skin in the game per rescue.
- **Coverage cap < position size**: coverage_cap is bounded by
  `0.25 × user_collateral_usd` at policy issuance. Users cannot
  coverage-gap their whole position.
- **Rescue-count surcharge**: after 3 rescues in 30 d, premium doubles
  at next renewal (admin-configurable). Non-linear premium curve priced
  against observed loss ratio per policy.

### 6.2 Adverse selection
Do only high-risk users buy policies?

- **Policy pricing is flat 10 bps/mo at v0.1**. For v0.2 we price on
  `collateral_composition × LTV_percentile × protocol_risk_band` — each
  one is observable on-chain, so premium is computable without KYC.
- **Minimum policy age = 7 d** before first claim. Prevents "buy
  insurance when HF is already 1.05" death-spiral claims.

---

## 7. Failure modes

| # | Scenario | Response |
|---|---|---|
| F1 | Single rescue larger than pool reserve | `claim_payout` reverts; falls back to v1 agent-pull model (user's own ATA) |
| F2 | Mass-liquidation event exhausts pool | `pause()` new policies; LP withdraw still open; remaining queue paid pro-rata. Users retain self-custody rescue rights via existing mandate program. |
| F3 | Pool admin key compromise | Admin signs pause + rotation via 2-of-3 multisig (out-of-scope for v0.1 Anchor program; assumed in upgrade path) |
| F4 | LP run (20 %+ withdraw in 1 hr) | Reserve floor (`min_reserve_bps`) guarantees `0.20 × coverage` stays. Pool stops accepting new policies until ratio rebounds. |

---

## 8. Integration with Sakura Liquidation Shield v1

**Zero breaking changes to v1.** The two programs interoperate via the
rescue route:

```
if (user has active Policy in sakura_insurance
    && coverage_cap covers needed rescue amount):
    → route Step 2.5: claim_payout from pool (pool-funded rescue)
    → no SPL delegate gate needed for principal
else:
    → route Step 2.5 falls back to sakura_mandate v1
    → SPL delegate + Anchor mandate gates enforce ceiling
```

The user opts in by calling `buy_policy`; they can still keep their
`sakura_mandate` active as backup. Pay-per-Save fee applies identically
in both paths.

---

## 9. Why this is novel

- **Nexus Mutual / InsurAce (EVM):** parametric protocol-insolvency
  insurance, payouts require off-chain claim adjudication (days-to-weeks).
  Sakura pool pays out in the same Solana block as the rescue itself
  (seconds).
- **Solend Liquidator Fund:** one-sided — protocol's own buffer, not a
  user-funded pool. LPs cannot participate.
- **Kamino Insurance Fund:** protocol reserve against bad-debt, not
  per-position rescue capital.
- **Sakura Rescue Insurance Pool** is, to our knowledge, the first
  **Solana-native, user-funded, LP-backed, claim-within-seconds rescue
  market**. The novelty is the time-scale + funding model combination,
  not any single piece.

---

## 10. v0.1 scope for hackathon demo

Ship:

1. `programs/sakura-insurance/src/lib.rs` — minimal Anchor program
   implementing §4 instructions (400 lines ish)
2. `lib/insurance-pool.ts` — TypeScript client lib: deposit / withdraw /
   buy-policy / claim helpers
3. Integration in `app/api/liquidation-shield/rescue/route.ts` Step 2.5 —
   try insurance path first, fallback to v1 mandate path

Defer to v0.2 (post-hackathon):

- Dynamic premium pricing by LTV percentile
- 2-of-3 admin multisig
- On-chain rescue-count surcharge enforcement (v0.1 enforces it off-chain)
- Second-order LP products (leveraged LP, insured-LP reinsurance)

---

## 11. Open questions we are deliberately NOT answering yet

- Tokenization of pool shares as an SPL token (would enable secondary
  market for policies and LP positions but adds regulatory surface)
- Cross-protocol coverage (v0.1 is single pool across Kamino+MarginFi;
  v0.2 may introduce separate risk bands per protocol)
- Reinsurance / cat-bond issuance against pool tail risk

These are interesting, but outside the hackathon window.
