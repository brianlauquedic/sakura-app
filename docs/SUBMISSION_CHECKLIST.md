# Frontier Submission — Final Checklist

> Work through this top-to-bottom the day of submission. Each item
> either has a ✓ verification command or a "how to" pointer.

## T-72 hours

- [ ] **devnet E2E passes**
      `npx tsx scripts/e2e-intent-execute.ts` → see "🎉 E2E PASS"
- [ ] **full-repo typecheck is green**
      `npx tsc --noEmit` → no output
- [ ] **next build is green**
      `npm run build` → no errors
- [ ] **lint is green**
      `npm run lint` → no errors
- [ ] **unit tests pass** (if present)
      `npm test` → all green
- [ ] **README reflects v0.3** — title says "Agentic Consumer Protocol",
      program ID is `Ansze...`, architecture section lists all 4 skills.
- [ ] **5 user interviews done** — notes pasted in `docs/USER_INTERVIEW_NOTES.md`.
      Rubric from `docs/USER_INTERVIEW_GUIDE.md` satisfied (≥3 of 5
      hit willingness thresholds).

## T-48 hours — Mainnet

- [ ] **Mainnet admin keypair funded**
      `solana balance ~/.config/solana/mainnet-admin.json --url mainnet-beta` → ≥ 4 SOL
- [ ] **VK is fresh vs .so**
      `ls -l programs/sakura-insurance/src/zk_verifying_key.rs target/deploy/sakura_insurance.so`
      (if VK is newer, rebuild: `cargo-build-sbf --manifest-path programs/sakura-insurance/Cargo.toml`)
- [ ] **Deploy to mainnet**
      `./scripts/deploy-mainnet.sh` → prints Solscan program link
- [ ] **Initialize mainnet protocol**
      `MAINNET_RPC=https://... npx tsx scripts/initialize-mainnet.ts`
      → copy the printed Vercel env vars
- [ ] **Set Vercel prod env vars** (via `vercel env add` or dashboard):
      `NEXT_PUBLIC_INSURANCE_PROGRAM_ID`, `NEXT_PUBLIC_SAKURA_PROTOCOL_ADMIN`,
      `SAKURA_PROTOCOL_ADMIN`, `NEXT_PUBLIC_SOLANA_RPC=mainnet-beta`,
      `HELIUS_API_KEY`, `ANTHROPIC_API_KEY`, `SAKURA_AGENT_PRIVATE_KEY`,
      `SAKURA_FEE_WALLET`, `INTERNAL_API_SECRET`
- [ ] **Deploy to Vercel production**
      `vercel --prod` → verify the deployed URL loads IntentSigner + ActionHistory
- [ ] **Mainnet smoke test — small amount**
      Sign a real intent with $10 USDC bounds, trigger the agent, watch the
      ActionRecord land on mainnet Solscan.

## T-24 hours — Videos

- [ ] **60-second elevator** (Pitch version A) recorded
- [ ] **3-minute submission** (Pitch version B + DEMO_SHOT_LIST.md) recorded
- [ ] **8-minute investor deep-dive** (Pitch version C) recorded
- [ ] **All three uploaded** to YouTube (unlisted) — URLs saved
- [ ] Pre-flight from `docs/DEMO_SHOT_LIST.md` executed before each take

## T-0 — Submit

- [ ] Go to https://frontier.colosseum.org/ (or the 2026-specific submission URL)
- [ ] Fill in the form:
      - Project name: **Sakura**
      - Track: consumer / agentic / ZK (whichever applies)
      - Tagline: *"AI agents act within math-enforced bounds, proved on-chain via Groth16."*
      - GitHub: public repo URL
      - Demo URL: deployed Vercel production URL
      - Devnet program: `AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp` + Solscan link
      - Mainnet program: (same ID, mainnet Solscan link)
      - Submission video: YouTube unlisted (3-min version)
      - Full pitch video: YouTube unlisted (8-min version)
- [ ] **Double-check** the GitHub repo is public
- [ ] **Verify** `/blink/sign-intent?intent=...&protos=3&actions=10` resolves
      correctly in a wallet dialink inspector (Blinks.vercel.app)
- [ ] Post-submit: tweet the 60-second elevator with the submission link

## Post-submit quality gates

- [ ] No `TODO:` or `FIXME:` left in production code path
      `grep -rn "TODO\|FIXME" lib app/api programs components` → triage
- [ ] No hardcoded secrets in the repo
      `git grep -E "sk-ant-|-----BEGIN PRIVATE"` → empty
- [ ] `.env.local` is in `.gitignore` — re-confirm
- [ ] Open source license in place — `LICENSE` exists, matches README

## Optional but high-leverage

- [ ] Submit to Superteam tracks separately — each track that Sakura fits
- [ ] Tweet a 15-second Solscan-timelapse of the pairing verification
- [ ] DM the Solana DevRel account with the demo link — free amplification
- [ ] Post in Colosseum Discord #showcase with a GIF of IntentSigner flow

---

If every box above is ticked, the submission is ready. If any devnet/
mainnet item fails, STOP and fix rather than submit a broken flow —
reviewers run the code.
