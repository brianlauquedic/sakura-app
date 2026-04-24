/**
 * scripts/som-analysis/day1-som.ts
 *
 * Day-1 Serviceable Obtainable Market snapshot for Sakura.
 *
 * Pulls TVL + borrowed + category from DefiLlama's public /protocol/{slug}
 * endpoint (no API key) for the 4 integrated protocols: Kamino, Jupiter,
 * Jito, Raydium. Writes a machine-readable JSON snapshot AND a
 * pitch-ready Markdown report to scripts/som-analysis/output/.
 *
 * Philosophy: every number in the output is sourced from one public
 * endpoint, so evaluators / investors can re-run and verify.
 *
 * Usage:
 *   npx tsx scripts/som-analysis/day1-som.ts
 *
 * Exits non-zero if any of the 4 protocol fetches fails — a hackathon
 * pitch that claims "Day-1 SOM $X" must be backed by a successful fetch,
 * not a stale cache, so we refuse to emit partial snapshots.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "output");

// DefiLlama protocol slugs — these are the canonical URLs on defillama.com.
// Verified against https://defillama.com/protocol/{slug} on 2026-04-24.
const PROTOCOLS = [
  {
    slug: "kamino",
    label: "Kamino",
    integrationKind: "Lending",
    cpiCells: 4,
    notes: "Kamino main market — USDC/SOL/mSOL reserves.",
  },
  {
    // Jupiter has multiple sub-protocols on DefiLlama. We sum two:
    //   - jupiter-aggregator (the swap router)
    //   - jupiter-lend       (the lending/earn product)
    // Both are wired in our CPI cells (5 total: 1 swap + 4 lend actions).
    slug: "jupiter-aggregator",
    altSlug: "jupiter-lend",
    label: "Jupiter (Swap + Lend)",
    integrationKind: "Aggregator + Lending",
    cpiCells: 5,
    notes: "Swap volume aggregator + Lend product (Earn vaults).",
  },
  {
    slug: "jito-liquid-staking",
    label: "Jito",
    integrationKind: "LST",
    cpiCells: 2,
    notes: "JitoSOL stake pool — includes MEV revenue share.",
  },
  {
    slug: "raydium",
    label: "Raydium",
    integrationKind: "AMM",
    cpiCells: 1,
    notes: "Direct AMM swap route (bypasses Jupiter aggregator).",
  },
] as const;

interface DefiLlamaProtocol {
  name: string;
  category?: string;
  currentChainTvls?: Record<string, number>;
  // The endpoint also returns huge historical series; we discard them.
}

interface ProtocolSnapshot {
  slug: string;
  label: string;
  integrationKind: string;
  cpiCells: number;
  solanaTvlUsd: number;
  solanaBorrowedUsd: number;
  solanaNetTvlUsd: number; // tvl - borrowed (if applicable)
  category: string;
  notes: string;
  sources: string[]; // DefiLlama URLs used
}

async function fetchProtocolSummary(slug: string): Promise<DefiLlamaProtocol> {
  const url = `https://api.llama.fi/protocol/${slug}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`DefiLlama ${slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as DefiLlamaProtocol;
  return data;
}

function extractSolanaTvl(data: DefiLlamaProtocol): {
  tvl: number;
  borrowed: number;
} {
  const t = data.currentChainTvls ?? {};
  // DefiLlama splits chain-scoped series into:
  //   "Solana"           — supply-side TVL
  //   "Solana-borrowed"  — outstanding borrow (lending protocols only)
  //   "Solana-staking"   — native-asset staking (LSTs)
  //   "Solana-pool2"     — incentivized LP (some AMMs)
  // We take whichever supply-side variant exists.
  const tvl =
    (t["Solana"] as number | undefined) ??
    (t["Solana-staking"] as number | undefined) ??
    (t["Solana-pool2"] as number | undefined) ??
    0;
  const borrowed = (t["Solana-borrowed"] as number | undefined) ?? 0;
  return { tvl, borrowed };
}

async function snapshotProtocol(
  p: (typeof PROTOCOLS)[number]
): Promise<ProtocolSnapshot> {
  const primary = await fetchProtocolSummary(p.slug);
  const sources = [`https://api.llama.fi/protocol/${p.slug}`];

  let { tvl, borrowed } = extractSolanaTvl(primary);

  // Jupiter: sum swap aggregator + lend product
  if ("altSlug" in p && p.altSlug) {
    const alt = await fetchProtocolSummary(p.altSlug);
    sources.push(`https://api.llama.fi/protocol/${p.altSlug}`);
    const altExtracted = extractSolanaTvl(alt);
    tvl += altExtracted.tvl;
    borrowed += altExtracted.borrowed;
  }

  return {
    slug: p.slug,
    label: p.label,
    integrationKind: p.integrationKind,
    cpiCells: p.cpiCells,
    solanaTvlUsd: Math.round(tvl),
    solanaBorrowedUsd: Math.round(borrowed),
    solanaNetTvlUsd: Math.round(tvl - borrowed),
    category: primary.category ?? "—",
    notes: p.notes,
    sources,
  };
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n}`;
}

function buildMarkdownReport(
  snaps: ProtocolSnapshot[],
  date: string
): string {
  const totalTvl = snaps.reduce((s, p) => s + p.solanaTvlUsd, 0);
  const totalBorrowed = snaps.reduce((s, p) => s + p.solanaBorrowedUsd, 0);
  const totalCpiCells = snaps.reduce((s, p) => s + p.cpiCells, 0);

  const rows = snaps
    .map(
      (p) =>
        `| ${p.label} | ${p.integrationKind} | ${p.cpiCells} | ${fmtUsd(
          p.solanaTvlUsd
        )} | ${fmtUsd(p.solanaBorrowedUsd)} | ${fmtUsd(p.solanaNetTvlUsd)} |`
    )
    .join("\n");

  return `# Day-1 SOM Snapshot — ${date}

**Day-1 Serviceable Obtainable Market**: the TVL actually addressable by
Sakura's mainnet CPI adapters, right now, across the 4 integrated Solana
protocols.

Not TAM. Not projections. The real number.

## Headline

- **Total addressable TVL (Solana): ${fmtUsd(totalTvl)}**
- **Of which lending / borrow-side debt: ${fmtUsd(totalBorrowed)}**
- **CPI cells live: ${totalCpiCells}**

Every bounded intent signed via Sakura can target any of these ${totalCpiCells}
(action × protocol) pairs. Adding a 5th protocol = new SOM slice; we are
NOT claiming addressable TVL we cannot execute against today.

## Per-protocol breakdown

| Protocol | Kind | CPI cells | Solana TVL | Borrowed | Net TVL |
|---|---|---:|---:|---:|---:|
${rows}
| **Total** |  | **${totalCpiCells}** | **${fmtUsd(totalTvl)}** | **${fmtUsd(totalBorrowed)}** | **${fmtUsd(totalTvl - totalBorrowed)}** |

## Methodology

1. For each protocol, fetch \`https://api.llama.fi/protocol/{slug}\`.
2. Read \`currentChainTvls.Solana\` (supply-side) and
   \`currentChainTvls.Solana-borrowed\` (debt-side).
3. For Jupiter: sum \`jupiter-aggregator\` + \`jupiter-lend\` because we
   integrate both surfaces (1 swap + 4 lend CPI cells).
4. No projections, no multipliers, no "100x in 2 years" math.

## Reproducibility

\`\`\`bash
npx tsx scripts/som-analysis/day1-som.ts
\`\`\`

Re-runs any time. No API key. Every number traces back to a DefiLlama URL
listed in the JSON \`sources\` field.

## Sources

${snaps.flatMap((p) => p.sources).map((s) => `- ${s}`).join("\n")}

---

_Generated by \`scripts/som-analysis/day1-som.ts\` at ${new Date().toISOString()}_
`;
}

async function main() {
  console.log("Fetching Day-1 SOM snapshot from DefiLlama...\n");

  const snapshots: ProtocolSnapshot[] = [];
  for (const p of PROTOCOLS) {
    process.stdout.write(`  [${p.label}] fetching... `);
    try {
      const snap = await snapshotProtocol(p);
      snapshots.push(snap);
      console.log(
        `${fmtUsd(snap.solanaTvlUsd)} TVL (borrowed ${fmtUsd(snap.solanaBorrowedUsd)})`
      );
    } catch (err) {
      console.log(`FAILED`);
      throw err;
    }
  }

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const totalTvl = snapshots.reduce((s, p) => s + p.solanaTvlUsd, 0);
  const totalBorrowed = snapshots.reduce(
    (s, p) => s + p.solanaBorrowedUsd,
    0
  );

  mkdirSync(OUT_DIR, { recursive: true });

  const jsonPath = join(OUT_DIR, `day1-som-${date}.json`);
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalSolanaTvlUsd: totalTvl,
        totalSolanaBorrowedUsd: totalBorrowed,
        totalCpiCells: snapshots.reduce((s, p) => s + p.cpiCells, 0),
        protocols: snapshots,
      },
      null,
      2
    )
  );

  const mdPath = join(OUT_DIR, `day1-som-${date}.md`);
  writeFileSync(mdPath, buildMarkdownReport(snapshots, date));

  console.log(`\n✅ Day-1 SOM snapshot complete.`);
  console.log(`   Total addressable Solana TVL: ${fmtUsd(totalTvl)}`);
  console.log(`   Of which borrowed: ${fmtUsd(totalBorrowed)}`);
  console.log(`\n   Wrote:`);
  console.log(`     ${jsonPath}`);
  console.log(`     ${mdPath}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
