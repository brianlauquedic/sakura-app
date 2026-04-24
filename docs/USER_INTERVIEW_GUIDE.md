# User Interview Guide — 5 interviews × 20 min

> For W3D20-21. Target: 5 Phantom/OKX users who hold ≥ $500 in
> Solana DeFi (ideally Kamino or Jupiter Lend lending positions, or
> Jito staking). Recruit via Farcaster channel `/solana` or
> SuperteamDAO member list.
>
> Goal: validate that "bounded agentic authority" is a felt need, and
> that the intent-signing UX is not more painful than the status quo.

## Ground rules

- Record audio only (with consent). Transcribe with Whisper. Paste
  raw quotes into `docs/USER_INTERVIEW_NOTES.md`.
- Never lead. Ask open questions first, pointed questions second.
- If an interviewee says "I like it" — push back: *"when did you last
  use something like this?"*

## Pre-interview (2 min)

- Confirm: *"How much SOL / USDC roughly do you have in Kamino,
  Jupiter Lend, Jito, Raydium, or similar Solana DeFi right now?"*
- If < $500, politely end — they're not in the target segment.

## Block 1 — status quo (5 min)

1. "Walk me through the last time you manually repaid a loan or
   rebalanced a position. What made you do it? How long did it take?"
2. "Have you ever set an alert / bot / automation for your DeFi? Tell
   me about it. Did you keep using it, or did it get deleted?"
3. "If you trusted that an AI could lend to the best pool for you, on
   a scale of 0–10 how likely would you be to turn it on today? What's
   the gap between that number and 10?"

## Block 2 — custody friction (5 min)

4. "What's your gut reaction to the phrase 'agentic wallet'?"
5. "Have you used Abstract, Agentic, Infinex, or any session-key
   wallet? If so, why did you stop? If not, why haven't you tried?"
6. "What would have to be true about an agent for you to give it $1000
   of authority? $10000? Unlimited?"

## Block 3 — Sakura intent signing (5 min)

Open `http://localhost:3000` on your screen. Share via Meet/Zoom.

7. Walk them through signing an intent. Do NOT explain the
   cryptography unless they ask. Observe where they hesitate.
8. *"On a scale of 0–10, how clear is it to you what you just signed?"*
9. *"If the agent tried to do something outside these bounds, what do
   you expect would happen?"*  (Looking for: do they intuit that it's
   cryptographically prevented, or do they think it's a soft check?)

## Block 4 — willingness (5 min)

10. *"If this worked exactly as described, how much of your current
    DeFi balance would you route through it?"*
11. *"What would make you recommend it to a friend?"*
12. *"What would stop you from using it?"*

## Post-interview

- Score 0–10 their willingness to be a design-partner tester.
- Extract 1 quote that belongs in the pitch deck.
- Note any feature request mentioned by ≥2 interviewees — that's a
  real signal.

## Rubric for "success"

Out of 5 interviews:
- ≥ 3 describe the status-quo pain concretely (block 1 q1).
- ≥ 3 say 7+ on block 3 q8 (intent clarity).
- ≥ 3 would route ≥ 20% of current balance (block 4 q10).

If those three are true, the problem+solution fit is validated and we
ship. If any fail, we re-iterate on the failed axis before W4D26
mainnet deploy.
