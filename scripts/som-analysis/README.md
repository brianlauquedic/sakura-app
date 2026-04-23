# SOM Analysis — Day-1 Serviceable Obtainable Market

Grounded evidence replacing the TAM slide. Every number here points to a
reproducible public data source so evaluators can verify without trusting us.

## Why this exists

Dovey Wan (Primitive Ventures) reviewed Sakura in 2026-04 and said:

> "技术方向是成立的, 就是有点太 meta & surface level. TAM 对于 startup 来说都
> 是假的, SOM 才是真的. Hackathon 还是做点 grounded 的用例比较合适 ——
> 譬如可触达的 integration targets, 每类 integration 的使用频次, 哪类交易最
> 需要这种边界验证 etc."

This folder is the response.

## What "Day-1 SOM" means

**Not** "the total $100B DeFi market we could theoretically serve." That's TAM,
and it's fake.

**Yes** "the exact wallets, on the exact 4 Solana protocols we already have
mainnet CPI adapters for, holding assets we can actually gate with our ZK
verifier today."

## The 4 integrated protocols (see `components/ArchitectureDiagram.tsx`)

| Protocol    | Category           | CPI cells | Adapter                          |
|-------------|--------------------|-----------|----------------------------------|
| Kamino      | Lending            | 4         | `lib/adapters/kamino.ts`         |
| Jupiter     | Swap + Lend        | 5         | `lib/adapters/jupiter-lend.ts`   |
| Jito        | LST                | 2         | `lib/adapters/jito.ts`           |
| Raydium     | AMM (direct swap)  | 1         | `lib/adapters/raydium.ts`        |
| **Total**   |                    | **12**    |                                  |

## Running the analysis

```bash
# Day-1 SOM: TVL + borrowing + category (pulls DefiLlama public API)
npx tsx scripts/som-analysis/day1-som.ts

# Output:
#   scripts/som-analysis/output/day1-som-YYYY-MM-DD.json  (structured)
#   scripts/som-analysis/output/day1-som-YYYY-MM-DD.md    (pitch-ready)
```

No API keys required. DefiLlama is free and public.

## Roadmap (not yet implemented)

- `agentic-wallets.sql` — Dune query to find wallets active on ≥2 of the 4
  protocols in the last 30 days (proxy for "agentic DeFi user").
- `tx-pattern-freq.sql` — classify txs into rebalance / lend / stake / swap
  and measure distribution.
- `rebalance-horizon.sql` — measure time-between-action for multi-step flows
  to test the "long-horizon rebalancing = highest pain" thesis.

Those need a Dune account. Gated until Step 2 decision.
