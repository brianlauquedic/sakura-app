# Sakura — Agentic Consumer Protocol

> **The Intent-Execution Protocol for Solana. AI agents act within
> mathematically-enforced bounds — proved on-chain via Groth16 pairing.**
>
> Users sign a natural-language intent. AI agents propose concrete DeFi
> actions. A zk-SNARK proves the action is inside the intent. Solana's
> `alt_bn128` syscall verifies the proof in ~116k CU. The agent cannot
> exceed the bounds — it's math, not trust.

Built for [Colosseum Frontier Hackathon 2026](https://frontier.colosseum.org/)
(April 6 – May 11) · Solana devnet-verified · Powered by Claude Sonnet 4.6
+ Solana Agent Kit v2 + Claude Agent Skills + Model Context Protocol.

**Program (devnet):** `AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp`
**E2E test:** `npx tsx scripts/e2e-intent-execute.ts`
(prints a "🎉 E2E PASS" line with a Solscan tx link after verifying on-chain pairing)

---

## The problem

AI agents for DeFi have two states:
1. **Read-only** — can analyze your portfolio but can't act.
2. **Custody-required** — you give them your private key and hope.

Neither is acceptable. A real agentic wallet needs **bounded authority**:
the ability to act without the ability to exceed what the user consented to.
Existing solutions (session keys, allowlists, approval popups) either
degrade UX to the point of uselessness, or provide only soft guarantees.

**Sakura closes the gap** with a cryptographic guarantee:
`action ⊆ user_signed_intent`, proved on-chain before the action lands.

---

## How it works

```
  User         Agent          Sakura (on-chain)        DeFi (Kamino/MarginFi/Jupiter/…)
  ────         ─────          ─────────────────        ──────────────────────────────
  sign NL
  intent ─────────► Poseidon tree ─► sign_intent ─► Intent PDA
                    (7 leaves → 1)

                  propose action ─► Groth16 proof ─► execute_with_intent_proof ─► DeFi ix
                                    (snarkjs)         ├─ alt_bn128 pairing ✓      (atomic v0 tx —
                                                      ├─ Pyth oracle cross-check   both land or
                                                      └─ ActionRecord written      both revert)
```

### 1. Intent sign (one-time per policy window)

User writes: *"Let my agent lend up to 1000 USDC into Kamino or MarginFi,
max $10k per action."* The Intent Parser skill converts that into a
structured tuple:

| Leaf | Field | Example |
|---|---|---|
| 1 | `intent_text_hash` | Poseidon(utf8 bytes, folded in 31-byte chunks) |
| 2 | `wallet_bytes` | 31-byte slice of user pubkey |
| 3 | `nonce` | anti-replay u64 |
| 4 | `max_amount` | per-action token cap, u64 micro-units |
| 5 | `max_usd_value` | per-action USD cap, u64 micro-USD |
| 6 | `allowed_protocols` | u32 bitmap — Kamino=0, MarginFi=1, Solend=2, Jupiter=3, … |
| 7 | `allowed_action_types` | u32 bitmap — Borrow=0, Lend=1, Swap=2, Repay=3, … |

These 7 leaves are hashed with a 2-layer Poseidon tree (circomlibjs is
arity-2/3 only, so we chain `h1 = P(t,w,n)`, `h2 = P(ma,mu,ap)`,
`h_final = P(h1,h2,aa)`). The 32-byte `intent_commitment` is what goes
on-chain. **The seven leaves themselves never leave the browser.**

### 2. Action propose (every time the agent wants to act)

The Route Selector skill picks an `(action_type, action_target_index,
action_amount)` tuple that fits the bounds AND improves user utility
given current yields. The Risk Checker skill runs deterministic
sanity checks (oracle freshness, price deviation, post-action health
factor, slippage, pool solvency). If both pass, the Intent Executor
skill generates a Groth16 proof.

### 3. On-chain verification (the crux)

`execute_with_intent_proof` is a single Anchor instruction that:

- **Verifies the Groth16 proof** via Light Protocol's `groth16-solana`
  crate over Solana's `alt_bn128_pairing` syscall. 6 public inputs:
  `[intent_commitment, action_type, action_amount, action_target_index,
  oracle_price_usd_micro, oracle_slot]`. Runs in ~116k CU.
- **Cross-checks the Pyth price** — parses the PriceUpdateV2 account,
  confirms `posted_slot == oracle_slot` AND price scaled to micro-USD
  matches within ±1 tolerance. This prevents a malicious prover from
  baking a stale price into the proof.
- **Enforces slot freshness** — `current_slot - oracle_slot ≤ 150` (~60s).
- **Writes an ActionRecord PDA** with `keccak256(proof_a ‖ proof_c)` as a
  forensic fingerprint, seeded by `(intent, action_nonce)` so replay is
  prevented by Anchor `init`.

The DeFi instruction (Kamino deposit, MarginFi repay, Jupiter swap, …)
is appended **after** `execute_with_intent_proof` in the same atomic
v0 transaction. If the gate fails, the whole tx reverts — the DeFi
action never happens.

### 4. Circuit constraints

The ZK circuit (`circuits/src/intent_proof.circom`) enforces 5 constraints:

- **C1** Poseidon tree commitment binds the proof to THIS specific intent.
- **C2** `action_amount ≤ max_amount`.
- **C3** `bit[action_target_index]` of `allowed_protocols == 1`.
- **C4** `bit[action_type]` of `allowed_action_types == 1`.
- **C5** `action_amount × oracle_price ≤ max_usd_value × 10^6`.

Plus Num2Bits range checks on every numeric input — defense against
BN254 field-wraparound attacks. See circuit header comments for detail.

---

## Architecture — where every piece lives

```
circuits/src/intent_proof.circom           — Groth16 circuit (1909 constraints)
circuits/build/                            — R1CS + wasm + zkey artifacts
ceremony/                                  — trusted setup outputs (pot13)
programs/sakura-insurance/src/lib.rs       — Anchor program, v0.3
programs/sakura-insurance/src/zk_verifying_key.rs  — auto-generated VK
scripts/parse-vk-to-rust.js                — VK → Rust codegen
scripts/e2e-intent-execute.ts              — devnet-passing E2E test
lib/zk-proof.ts                            — snarkjs proof gen + onchain byte encoding
lib/insurance-pool.ts                      — TS client (PDAs, ix builders, deserializers)
lib/sak-executor.ts                        — SAK → unsigned ix adapter + v0 tx composer
components/IntentSigner.tsx                — user-facing intent-signing form
components/ActionHistory.tsx               — getProgramAccounts → on-chain audit feed
app/api/mcp/route.ts                       — MCP server (3 v0.3 tools)
app/api/actions/sign-intent/route.ts       — Solana Blink for one-click intent signing
app/actions.json/route.ts                  — Blinks manifest
.claude/skills/intent-parser/SKILL.md      — NL → policy tuple
.claude/skills/route-selector/SKILL.md     — bounds-aware action picker
.claude/skills/risk-checker/SKILL.md       — pre-submit sanity gate
.claude/skills/intent-executor/SKILL.md    — prove + atomic-execute
```

---

## Using Solana Agent Kit to the limit

SAK v2 is **sign-and-send-only** — `stakeWithJup`, `lendAsset`, `trade`
all return a signature, not an unsigned tx. That's incompatible with
atomic ZK-gated execution, which requires composing the gate and the
action into one tx.

**Our solution:** `lib/sak-executor.ts` bypasses SAK's send step and
uses SAK's underlying protocol primitives (Jupiter v6 HTTP API, Marinade
IDL, Kamino/MarginFi CPIs) to produce unsigned `TransactionInstruction[]`.
The plugin objects are still used for non-send utilities (price quotes,
APY estimates). This lets us keep SAK's ergonomics for the agent's
decision layer while giving the executor the atomic composability it
needs.

---

## Dual-engine narrative (for the pitch deck)

- **Dovey Wan engine** — *Agentic Consumer Protocol*. Frame Sakura
  against the incoming wave of AI-wallet consumer products. This isn't
  infrastructure for institutions; it's the UX primitive that makes
  agentic self-custody safe for a retail user who just wants to
  "let my agent lend to the best pool."
- **Meltem Demirors engine** — *Intent-Execution Protocol*. Frame
  Sakura against the on-chain maturity curve: Solana has `alt_bn128`,
  Light Protocol has `groth16-solana`, Pyth has Receiver accounts, SAK
  has executor plugins — Sakura is the assembly that lets all four do
  what none of them alone could: prove bounded agentic authority.

Both framings describe the same product. The tech name is
**Intent-Execution Protocol**; the positioning name is
**Agentic Consumer Protocol**.

---

## Quickstart (devnet)

```bash
# Build the on-chain program
cargo-build-sbf --manifest-path programs/sakura-insurance/Cargo.toml

# Run the end-to-end ZK test against deployed devnet program
npx tsx scripts/e2e-intent-execute.ts
```

You should see:

```
[5/6] Generating Groth16 proof…
  ✓ proof generated, public signals: 6
  off-chain snarkjs verify: ✓ OK
[6/6] Submitting execute_with_intent_proof…
  ✓ execute landed: https://solscan.io/tx/…
🎉 E2E PASS — intent-execution verified on-chain via alt_bn128 pairing.
```

---

## License

MIT — see [LICENSE](./LICENSE).
