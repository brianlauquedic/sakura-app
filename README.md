# Sakura

**Sign one intent. Your AI agent operates inside it. Proven on-chain.**

Bounded AI-agent execution for Solana. A single Groth16 proof, verified
by the `alt_bn128` syscall in 116k compute units, enforces that every
agent action falls inside a user-signed commitment. No session keys.
No allowlists. No operator override.

Built for [Colosseum Frontier 2026](https://frontier.colosseum.org/).
Devnet program `AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp`.
Run `npx tsx scripts/e2e-intent-execute.ts` — the pairing passes
on-chain in under thirty seconds.

---

## The primitive

**Signed intent, private bounds.** Seven policy values — amount caps,
allowed protocols, allowed actions, expiry, wallet, nonce, intent
hash — fold into a 32-byte Poseidon commitment. The commitment is
the only thing stored on-chain. The underlying seven values never
leave the browser.

**Atomic prove-and-execute.** The ZK gate instruction and the DeFi
instruction share one v0 transaction. Both land, or both revert.
There is no intermediate state where the gate passes and the action
fails, or the reverse.

**Oracle-bound.** The proof carries a Pyth price the verifier
cross-checks against a fresh on-chain slot. The slot-freshness
window is 150 slots, roughly 60 seconds. A stale price cannot be
forged into a favorable proof.

**Composable.** The gate is an Anchor instruction, not a wallet. Any
agentic wallet, AI agent framework, or protocol integration drops
it into its execution path. The DeFi instruction belongs to the
integrator; the enforcement belongs to Sakura.

---

## Workflow

1. **Sign** the intent — one wallet popup writes a 32-byte hash into
   the Intent PDA.
2. **Propose** — the agent picks an action that fits inside the
   committed bounds.
3. **Prove** — snarkjs generates the Groth16 proof in about eight
   seconds off-chain.
4. **Execute** — the atomic transaction lands, writing an
   `ActionRecord` PDA with a `keccak256(proof_a ‖ proof_c)`
   fingerprint. Or it reverts.

---

## Why only now

Five pieces of Solana infrastructure matured in the last eighteen
months. Sakura is the first composition that treats them as one
primitive.

| Layer | Role |
|---|---|
| `alt_bn128` pairing syscall | Economical BN254 verification on-chain |
| Light Protocol `groth16-solana` | Production-ready single-pairing verifier |
| Pyth Pull Oracle `PriceUpdateV2` | Slot-verifiable price accounts |
| Solana Agent Kit v2 | Plugin surface for Jupiter, Marinade, Kamino, MarginFi |
| Claude Sonnet 4.6 Agent Skills | Structured, composable decision pipeline |

---

## Circuit constraints

| | Constraint |
|---|---|
| C1 | Intent commitment matches the 2-layer Poseidon tree of the seven private witness values |
| C2 | `action_amount ≤ max_amount` |
| C3 | `bit[action_target_index]` of `allowed_protocols == 1` |
| C4 | `bit[action_type]` of `allowed_action_types == 1` |
| C5 | `action_amount × oracle_price ≤ max_usd_value × 10⁶` |

Every numeric input is `Num2Bits`-bounded against BN254 field
wraparound. The circuit compiles to 1,909 non-linear constraints,
fitting the `pot13` trusted-setup ceremony.

---

## For protocol builders

Sakura ships as a primitive you drop into an agentic execution path.

```ts
import {
  buildSignIntentIx,
  buildExecuteWithIntentProofIx,
} from "@sakura/insurance-pool";
import {
  computeIntentCommitment,
  generateIntentProof,
  proofToOnchainBytes,
} from "@sakura/zk-proof";

// Once per policy window
await connection.sendTransaction(
  buildSignIntentIx({ admin, user, intentCommitment, expiresAt })
);

// Every agentic action
const { proof } = await generateIntentProof(witness);
const { proofA, proofB, proofC } = proofToOnchainBytes(proof);

const tx = new Transaction()
  .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
  .add(buildExecuteWithIntentProofIx({ ...args, proofA, proofB, proofC }))
  .add(yourDefiInstruction);         // runs only if the gate passes
```

The gate adds ~120k CU to the transaction. The DeFi instruction is
builder-owned. Sakura does not dictate protocol choice or parameter
shape.

See `lib/sak-executor.ts` for the reference adapter that turns SAK v2
plugin calls into unsigned instructions. See `.claude/skills/` for the
four-skill decision pipeline (`intent-parser`, `route-selector`,
`risk-checker`, `intent-executor`) — which an integrating framework
can keep, swap, or replace.

---

## Repository layout

```
circuits/src/intent_proof.circom               Groth16 circuit
programs/sakura-insurance/src/lib.rs           Anchor program
programs/sakura-insurance/src/zk_verifying_key.rs   VK (auto-generated)
scripts/e2e-intent-execute.ts                  Devnet E2E (passing)
scripts/deploy-mainnet.sh                      Gated mainnet deploy
scripts/initialize-mainnet.ts                  Post-deploy init
lib/zk-proof.ts                                snarkjs + on-chain encoding
lib/insurance-pool.ts                          TypeScript client
lib/sak-executor.ts                            SAK → unsigned-ix adapter
components/IntentSigner.tsx                    Intent-signing UI
components/ActionHistory.tsx                   On-chain audit feed
app/api/mcp/route.ts                           MCP server (3 intent tools)
app/api/actions/sign-intent/route.ts           Solana Blink
.claude/skills/                                Four Agent Skills
.github/workflows/ci.yml                       Typecheck + test CI
__tests__/                                     Cryptographic invariant tests
docs/                                          Pitch, demo, submission docs
```

---

## Quickstart

```bash
# Run the devnet end-to-end ZK test
npx tsx scripts/e2e-intent-execute.ts

# Start the local app
npm run dev
# visit http://localhost:3000
```

Expected output:

```
[5/6] Generating Groth16 proof…
  ✓ proof generated, public signals: 6
  off-chain snarkjs verify: ✓ OK
[6/6] Submitting execute_with_intent_proof…
  ✓ execute landed: https://solscan.io/tx/…
🎉 E2E PASS — intent-execution verified on-chain via alt_bn128 pairing.
```

---

## Our approach

We do not build a wallet. We build the verifier layer every agentic
wallet needs and does not want to reinvent. The circuit, the program,
the verifying key — they are a public good from the first block.

---

## License

MIT — see [LICENSE](./LICENSE).
