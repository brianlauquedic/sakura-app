# Demo Video — Shot-by-shot recording checklist

> For the 3-minute technical demo submission. Open the terminal and the
> app side-by-side (left = app, right = terminal) before starting. Use
> OBS with a single scene — no cuts; edit in post.

## Pre-flight (5 min before recording)

```bash
# 1. Confirm devnet is reachable
solana balance --url devnet

# 2. Confirm Helius env vars
echo $HELIUS_API_KEY | head -c 10

# 3. Dry-run E2E to warm caches (so the real recording finishes in ~25s)
npx tsx scripts/e2e-intent-execute.ts

# 4. Clear the terminal
clear
```

Open in the browser:
- `http://localhost:3000` (running `npm run dev`)
- Solscan: `https://solscan.io/account/AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp?cluster=devnet`

## Shot 1 — intent signing UI (0:00–0:30)

1. Focus the browser, show `IntentSigner` component.
2. Type natural-language intent: *"Lend up to 1000 USDC into Kamino or
   MarginFi, $10k max per action."*
3. Adjust sliders: max amount 1000, USD cap 10000, hours 24.
4. Toggle pills: Kamino ✓ MarginFi ✓ · Lend ✓ Repay ✓.
5. Click **Sign Intent**. Phantom popup appears.
6. Click Approve in Phantom.
7. Show the green success banner with the Solscan link.

## Shot 2 — terminal E2E (0:30–1:30)

1. Focus terminal.
2. Run: `npx tsx scripts/e2e-intent-execute.ts`
3. As the output scrolls, highlight these lines with cursor:
   - `[1/6] Protocol PDA : ...`
   - `[3/6] sign_intent ✓`
   - `[4/6] priceMicro=... slot=...`
   - `[5/6] ✓ proof generated, public signals: 6`
   - `[5/6] off-chain snarkjs verify: ✓ OK`
   - `[6/6] ✓ execute landed: https://solscan.io/tx/...`
4. Stay on the final "🎉 E2E PASS" line for 2 seconds.

## Shot 3 — on-chain proof (1:30–2:15)

1. Copy the Solscan tx URL from the terminal.
2. Paste into the browser. Let the page load.
3. Scroll to **Program Logs**. Highlight:
   - `Instruction: ExecuteWithIntentProof`
   - No revert — transaction succeeded.
4. Scroll to **Instructions**. Show the 2-ix composition:
   `ComputeBudget` + `execute_with_intent_proof`.
5. (If time) click the ActionRecord PDA in the "Token Balance Change"
   section to show it was written.

## Shot 4 — audit feed (2:15–2:45)

1. Switch back to `http://localhost:3000`.
2. Scroll to `ActionHistory` component.
3. Click `refresh`. The just-executed action appears at the top.
4. Zoom in: action type = Lend, target = Kamino, amount, oracle price,
   slot, fingerprint.

## Shot 5 — close card (2:45–3:00)

Static title card (render in post):

> **Sakura**
> Agentic Consumer Protocol
> Colosseum Frontier 2026
> github.com/<your-handle>/sakura

## Voiceover tips

- Record the voiceover separately from the screen capture so you can
  re-do takes without re-running `e2e-intent-execute.ts`.
- Use the script in `docs/PITCH.md` Version B as the VO source.
- Pause 0.5s between shots so editor transitions have room to land.
