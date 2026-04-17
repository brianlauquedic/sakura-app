# Sakura — Security & Threat Model

This document is the formal threat model for Sakura Liquidation Shield,
Nonce Guardian, and Ghost Run. It is written for auditors, exchange-listing
security teams, and DeFi users who want to understand **exactly what we
protect, what we do not protect, and what must be true for our guarantees
to hold**.

**This is not a compliance checklist or a pen-test report.** It is the
boundary of our security claim.

Last reviewed: 2026-04-17
Commit of record: see `git log -1 SECURITY.md`.

---

## 1. Scope

Sakura is an on-chain + off-chain system composed of four artifacts:

| Component | Location | Role |
|---|---|---|
| Anchor mandate program | `programs/sakura-mandate/src/lib.rs` (on-chain) | Enforces dual-gate rescue authorization |
| SPL Token delegate | User's USDC ATA (on-chain) | Second, independent cap on agent-spendable USDC |
| Sakura agent | `app/api/liquidation-shield/rescue/route.ts` (off-chain) | Monitors health factor, triggers rescue, collects fee |
| ZK proof & audit chain | `lib/groth16-verify.ts`, `lib/merkle-audit.ts` | Verifiable post-rescue record (BN254 Pedersen + Schnorr) |

Out of scope:
- User wallet private-key management (custody is always the user's)
- Solana validator consensus correctness
- Kamino/MarginFi protocol bugs (we rely on their liquidation math)
- Oracle manipulation at the protocol layer (Pyth / Switchboard integrity)
- Front-end XSS/CSRF beyond the CSRF Origin check at `route.ts:230`
- Supply-chain attacks on our npm dependencies — tracked separately in `docs/AUDIT-STATE.md`

---

## 2. Security Boundary Claims

Sakura makes **exactly these four claims**. Nothing more.

**S1. Agent cannot move more USDC than the user pre-authorized.**
The agent's ability to move the user's USDC is bounded by the **minimum**
of two independent on-chain gates:

- *Gate 1 — SPL Token delegate*: `spl-token approve(user_ata, agent, max_usdc)`
  is enforced by the SPL Token program itself during every `transfer`.
- *Gate 2 — Anchor mandate PDA*: `execute_rescue` re-verifies
  `rescue_amount ≤ max_usdc − total_rescued` via `checked_sub` before emitting
  the CPI.

Compromising one gate does not compromise both. An attacker who steals the
agent's signing key cannot execute a rescue above `max_usdc`.

**S2. Agent cannot execute a rescue on a healthy position.**
Anchor `execute_rescue` requires `reported_hf_bps ≤ mandate.trigger_hf_bps`
(program-checked). A compromised agent cannot "rescue" (read: drain)
a position with `HF > trigger` because the Anchor program rejects the tx
before any CPI is emitted. The `reported_hf_bps` value is **adversarial input
from the agent**, but is bounded from above by `trigger_hf_bps` which is
**user-signed at mandate creation**.

**S3. Nobody except the user can close or update the mandate.**
`close_mandate` and `update_mandate` are protected by `has_one = authority`,
so only the wallet that created the mandate can modify it. Agent key loss does
not give an attacker the ability to un-bound the mandate.

**S4. Every rescue is cryptographically committed to a Merkle audit chain.**
Every successful rescue emits an on-chain Solana Memo containing a full
SHA-256 + Poseidon dual hash + BN254 Pedersen commitment + Schnorr PoK of
the mandate identity and rescue amount. These are publicly recomputable
from the inputs recorded in the Memo. See `lib/crypto-proof.ts` and
`lib/groth16-verify.ts`.

---

## 3. Trust Assumptions (What Must Be True)

These are the statements a user must accept to believe our claims.

**T1. The user's wallet private key remains uncompromised.**
If the user's wallet is drained via seed-phrase theft, Sakura cannot help.
Sakura protects against **agent misbehavior**, not against user compromise.

**T2. The Solana L1 and Kamino/MarginFi protocol correctness.**
If Kamino's liquidation math is exploited such that a position is drained
before `HF < trigger` is reported, Sakura cannot intercept. We do not
maintain our own liquidation oracle.

**T3. `reported_hf_bps` lower bound: agent cannot lie *downward* beyond
what the program accepts, but CAN lie about timing.**
The Anchor program only enforces `reported_hf ≤ trigger`. It does **not**
verify the report is accurate against real-time protocol state — doing so
would require an on-chain oracle read per rescue, which is operationally
expensive on Solana today.
This means: an **honest but unfortunate** agent may rescue too early
(user pays fee for a rescue that wasn't strictly needed). A **malicious**
agent cannot drain the user (S1 holds), but *could* burn their SPL
allowance on marginally-early rescues until `total_rescued = max_usdc`.
Mitigation: users should set `max_usdc` to the smallest amount that covers
a realistic rescue, and revoke the delegate once the risk window closes.

**T4. Agent-collected fee goes to `SAKURA_FEE_WALLET` only if it is set.**
If the env var is unset the agent skips fee collection. A malicious
operator who sets `SAKURA_FEE_WALLET` to an arbitrary address can redirect
fees — but **only their 10%-of-saving cut**, never the user's principal
(bounded by S1).

**T5. ZK proof and audit chain are verifiable off-chain, not on-chain.**
We do not submit the Schnorr proof to an on-chain verifier program; the
proof is recorded in the Memo and any party can re-verify it using
`lib/groth16-verify.ts`. This is a transparency mechanism, not an
authorization gate.

---

## 4. Known Attack Scenarios

Each row below is an attack we have **explicitly considered**. "Outcome"
is what an attacker achieves given S1–S4 hold.

| # | Attack | Vector | Outcome | Residual risk |
|---|--------|--------|---------|---------------|
| A1 | Agent key theft | Ops machine compromise | Can execute rescues on existing mandates, up to `max_usdc`. Cannot drain healthy positions (S2). Cannot update mandates (S3). | User's at-risk collateral may be moved earlier than needed; bounded loss = 10% × liquidation_penalty × max_usdc. |
| A2 | Rogue operator | Insider with `SAKURA_FEE_WALLET` + `SAKURA_AGENT_PRIVATE_KEY` control | Same as A1 **plus** fee redirection. | Same as A1 for principal; operator's fee skim is bounded by Pay-per-Save (10% of liquidation penalty saved). |
| A3 | Kamino repay CPI failure | Kamino SDK bug or reserve state mismatch | `buildKaminoRepayInstructions` returns null; agent falls back to holding USDC in agent escrow. User's USDC is **not** lost — it's held by the agent in a PDA-derived ATA and repay is retried. | If agent is also compromised during the retry window, A1 applies to the in-escrow USDC. |
| A4 | Trigger-threshold inflation | Malicious update to `trigger_hf_bps` | Blocked by `has_one = authority` — only user can update. | None. |
| A5 | Mandate forgery via PDA collision | Attacker creates a mandate for a different wallet | PDA seed is `["sakura_mandate", authority.key().as_ref()]` — collision requires second-preimage on SHA-256, infeasible. | None. |
| A6 | Replayed rescue tx | Resubmit an old `execute_rescue` | Solana's recent-blockhash window (150 slots ≈ 60 s) + `total_rescued` cumulative counter prevents the second submission from doing net work: either blockhash expires or the amount adds to totals and is capped by `max_usdc`. | None significant. |
| A7 | Front-running rescue by competitor agent | MEV bot sniffs health factor, rescues first | Not possible — only the registered agent can call `execute_rescue` (`has_one = agent`). | None. |
| A8 | Dust-rescue griefing | Agent fires thousands of $0.10 rescues | Each bounded by `FEE_MIN_USDC` = $0.10; T3 applies — user can revoke delegate. | Annoyance + gas cost if attacker also pays fees. Low. |
| A9 | Fake Kamino liquidation event in backtest | Attacker seeds mainnet with suspicious txs | `scripts/backtest-rescues.ts` filters by Kamino program id only; can only be fooled by Kamino itself. | None for Sakura; backtest report caveats explicitly note skipped edge cases. |
| A10 | Solana Memo redaction | Attempt to hide audit trail | Memos are in Solana L1 tx history — cannot be redacted without a 51% reorg. | Reorg depth > memo commitment depth would be required; practically impossible at today's validator set. |
| A11 | Stale health-factor read (Kamino/MarginFi RPC lag) | Agent reads HF that is seconds old; price moves; rescue fires on position that was already liquidated on-chain | Anchor `execute_rescue` still enforces S1/S2 — no principal loss, but fee tx still fires. | User pays Pay-per-Save fee on a rescue whose `estimated_saving_usd` overestimates reality. We mitigate by `getLatestBlockhash("finalized")` for rescues ≥ $1000 (line 267 of `route.ts`). |
| A12 | Agent delegate de-sync | User revokes SPL delegate mid-rescue | SPL Token program rejects the CPI transfer; Anchor program logs `DelegateMismatch`; no funds move. | None — transaction fails safely. |

---

## 5. Explicitly NOT Protected Against

These are out of Sakura's guarantee zone. Stating them up front keeps us
honest and keeps users from making incorrect assumptions.

- **User phishing**: if the user signs a malicious `update_mandate` that
  raises `max_usdc`, their own signature defeats the bound.
- **Agent infrastructure outage**: a crashed agent does not rescue. We
  provide no SLA for rescue execution — the user retains self-custody and
  can always manually repay.
- **Protocol-level oracle manipulation**: if Pyth reports a wrong SOL
  price, Kamino liquidates at a wrong HF, and Sakura's HF read is equally
  wrong. We inherit the oracle's integrity, we do not improve it.
- **Cross-chain bridge risk**: Sakura is Solana-only. USDC bridged from
  other chains is indistinguishable on Solana and is not treated specially.
- **Denial-of-service via priority fee wars**: during extreme network
  congestion, rescue txs may be de-prioritized. We set a dynamic priority
  fee (`getDynamicPriorityFee`) but cannot out-bid an adversary infinitely.

---

## 6. Incident Response

If an incident is suspected:

1. **User action — immediate and unilateral**:
   - Call `spl-token revoke` on the USDC ATA to remove agent delegate.
     This alone makes every future rescue tx fail with `DelegateMismatch`.
   - Call Anchor `close_mandate` to flip `is_active = false`.
   - These two calls cost ~$0.0005 in SOL gas and take effect in ≤ 2 seconds.

2. **Operator action**:
   - Rotate `SAKURA_AGENT_PRIVATE_KEY`.
   - Post a public signed statement (via the Sakura agent's wallet pre-rotation)
     at a known GitHub release announcing the rotation and the final
     pre-rotation rescue signature.
   - Migrate existing user mandates: users must call `close_mandate` + create
     a new one with the new agent pubkey. We do not (and cannot) migrate
     their mandates for them — this is enforced by S3.

3. **Disclosure timeline**: within 24 h for critical (principal at risk),
   within 7 d for non-critical. We publish the signed incident writeup in
   `docs/incidents/`.

---

## 7. Cryptographic Primitives in Use

| Primitive | Library | Purpose |
|---|---|---|
| SHA-256 | Node `crypto` / browser `crypto.subtle` | Audit chain v2, Memo payload hashing |
| BN254 G1 scalar mul + addition | `@noble/curves@^2.2.0` | Pedersen commitment `C = rG + mH`, Schnorr PoK |
| Poseidon (light) | `lib/poseidon.ts` | Secondary dual-hash for audit chain |
| Keccak256 | `@noble/hashes` (transitive) | Solana transaction signing support |
| Fiat-Shamir heuristic | `lib/groth16-verify.ts` | Non-interactive Schnorr challenge |
| Merkle tree (SHA-256 binary) | `lib/merkle-audit.ts` | Batch audit aggregation |

**No custom crypto is rolled.** All elliptic-curve and hashing operations
go through audited libraries. The only custom code is the Pedersen + Schnorr
*composition*, which follows the textbook construction in Boneh & Shoup
ch. 19 (see inline comments in `lib/groth16-verify.ts`).

---

## 8. What Would Invalidate This Model

- Discovery of a bug in `anchor-lang 0.29.0` `has_one` / PDA seeds enforcement.
- Discovery of a BN254 G1 small-subgroup bug in `@noble/curves` affecting
  point addition.
- A Solana protocol change that allows cross-program state tampering.
- Evidence that Kamino's published liquidation penalty differs from the
  values in `LIQUIDATION_PENALTY_BY_PROTOCOL`.

We commit to revising this document within 72 h of any of the above
becoming public, and to notifying existing mandate holders via
on-chain Memo emission from the Sakura agent wallet.
