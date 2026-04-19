# Sakura Pitch — 3 versions

> **Product:** Agentic Consumer Protocol (tech: Intent-Execution Protocol)
> **Hackathon:** Colosseum Frontier 2026
> **One-liner:** AI agents act within math-enforced bounds, proved on-chain via Groth16.

The three versions below share the same spine (problem → solution →
proof → ask) but differ in depth and audience. Record all three —
Colosseum reviewers, Dovey Wan / Meltem Demirors investor tier, and
the 30-second elevator cut each need a different beat.

---

## Version A — 60 seconds (elevator, for shares on X / Farcaster)

> **[0:00–0:05] Hook**
> "AI agents for DeFi have two modes: read-only, and give-them-your-keys.
> Neither is acceptable."
>
> **[0:05–0:20] Problem**
> "Users want an agent that can lend to the best pool, repay debt before
> liquidation, rebalance when yields shift — but they don't want to hand
> over custody. Existing solutions are approval popups that break UX, or
> session keys that trust a server."
>
> **[0:20–0:40] Solution**
> "Sakura makes agentic authority cryptographic. The user signs a
> natural-language intent. A zero-knowledge proof — verified by Solana's
> alt_bn128 syscall in 116k compute units — proves that whatever the
> agent wants to do falls inside those bounds. If the proof fails, the
> on-chain transaction reverts before the DeFi action runs. It's not
> allowlisting. It's not a server enforcing policy. It's math."
>
> **[0:40–0:55] Proof**
> "We're live on devnet today — you can run `scripts/e2e-intent-execute.ts`
> and watch a Groth16 proof pass on-chain, end to end, in under 30 seconds.
> Program ID Ansze… — proof is real."
>
> **[0:55–1:00] Ask**
> "Sakura at Colosseum Frontier 2026. Find us at frontier.colosseum.org."

---

## Version B — 3 minutes (hackathon submission video)

### Shot 1 — cold open (0:00–0:15)
Screen recording of Phantom popup: "sign_intent — lend up to 1000 USDC…"
Voiceover: *"The user signs once. What comes next is what matters."*

### Shot 2 — problem (0:15–0:45)
Cut to split screen. Left: "Read-only — analyze your portfolio." Right:
"Full custody — give me your private key." Text overlay: "We reject this
false choice."
Voiceover: *"Every agentic wallet today lives on one side of this line.
Sakura is the cryptographic primitive that lets you live on neither side
— you get execution, without the custody handoff."*

### Shot 3 — the commitment (0:45–1:15)
Zoom into a terminal showing the 7 intent leaves. Then the 2-layer
Poseidon tree animating into a 32-byte hex hash. Then Solscan showing
the `sign_intent` tx + Intent PDA.
Voiceover: *"Your policy — max amount, allowed protocols, expiry —
gets hashed into a single 32-byte commitment. That's what goes on-chain.
The seven underlying values never leave your browser."*

### Shot 4 — the agent proposes (1:15–1:45)
Claude Sonnet chat: user asks *"go lend now"*. Claude invokes
`route-selector` skill. JSON output: `{action: Lend, target: Kamino,
amount: 100 USDC, expected_apy_delta: +150bps}`. Then `risk-checker`
runs — verdict `allow`.
Voiceover: *"Four Claude Agent Skills handle the decision: parse the
intent, pick the action, check the risks, then execute. Each skill is
scoped, inspectable, composable."*

### Shot 5 — the proof (1:45–2:15)
Terminal showing `snarkjs.groth16.fullProve` running for ~5s. Then the
v0 transaction being assembled: `ComputeBudget` + `execute_with_intent_proof`
+ Kamino deposit — all atomic.
Voiceover: *"snarkjs generates the Groth16 proof in under ten seconds.
We post a fresh Pyth price update, assemble an atomic v0 transaction
with the ZK gate first and the DeFi instruction second. If the pairing
check fails, the whole transaction reverts — the DeFi action never
happens."*

### Shot 6 — on-chain verification (2:15–2:40)
Solscan tx page showing the successful execution. Program logs:
`alt_bn128 pairing ✓` · `oracle cross-check ✓` · `ActionRecord written`.
Pan to the ActionRecord PDA with its `proof_fingerprint`.
Voiceover: *"Solana's alt_bn128 pairing syscall verifies the proof in
116k CU. Every executed action gets an on-chain forensic record —
`keccak256(proof_a ‖ proof_c)` — that anyone can audit later."*

### Shot 7 — the dual engine (2:40–2:55)
Title card: *"Agentic Consumer Protocol — for Dovey Wan's agent wave.
Intent-Execution Protocol — for Meltem's infra maturity curve. Same
product. Both framings are true."*

### Shot 8 — close (2:55–3:00)
"Sakura. Colosseum Frontier 2026. Bounded by math."

---

## Version C — 8 minutes (investor / deep-dive)

Covers version B then adds:

- **Minute 3–4:** Why this wasn't possible until 2026. `alt_bn128`
  syscall shipped in Solana 1.17. Light Protocol's `groth16-solana`
  crate matured. Pyth Pull Oracle (PriceUpdateV2) replaced push accounts.
  Claude Sonnet 4.6's skill composition became reliable. SAK v2
  stabilized. Sakura is the first product to compose all five.
- **Minute 4–5:** Market sizing. Solana DeFi TVL ~$4B. Agentic wallet
  TAM = retail self-custody holders who currently don't use DeFi
  because UX is too risky. That's ~10M Phantom MAUs.
- **Minute 5–6:** Moat. The circuit design (2-layer Poseidon, bit-test
  via IsEqual + sum, C5 USD cap via integer arithmetic) is
  non-obvious. The trusted setup is done. The VK is baked in. Forking
  requires redoing Phase 2 of the ceremony.
- **Minute 6–7:** Competitive landscape. Apricot Assist only manages
  Apricot's own X-Farm. Voltr is on Base/Mode, not Solana. Session-key
  wallets give soft bounds — no cryptographic guarantee. Sakura is the
  only Solana-native, bounds-enforcing, atomic-execution primitive.
- **Minute 7–8:** Roadmap. Mainnet deploy. Kamino + MarginFi real CPI
  (devnet is memo-mode because the reserves don't exist there). SDK for
  third-party agent builders. Blinks catalog for common intent templates.

---

## Key phrases to hit (every version)

- "Math, not trust"
- "The agent cannot exceed what the user consented to — it's a circuit constraint, not an allowlist"
- "Atomic v0 transaction — both land or both revert"
- "alt_bn128 pairing in 116k compute units"
- "Devnet-verified today, run the E2E test yourself"
