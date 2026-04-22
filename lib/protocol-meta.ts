/**
 * lib/protocol-meta.ts — display metadata for the 4 龙头 protocols.
 *
 * Hoisted to module scope per React best-practice
 * `rendering-hoist-jsx` — these are static structures with no
 * per-render cost. Logos are inline SVG (no external requests, no
 * broken-image risk during a live demo).
 */

import { ProtocolId } from "./insurance-pool";

export type AprDisplayKind = "lend-borrow" | "lend-only" | "stake" | "swap-fee";

export interface ProtocolMeta {
  id: ProtocolId;
  label: string;
  /** Tagline shown under the name. */
  tagline: string;
  /** Single kanji to stamp inside the 朱印 seal — picked for its
   *  semantic match to the protocol's primary action. */
  sealKanji: string;
  /** Drives which APR fields to read off `/api/protocol-aprs`. */
  aprKind: AprDisplayKind;
}

// ── 朱印 (vermillion seal) Public registry ──────────────────────────
//
// All four protocols share Sakura's brand vermillion (#C9312A — see
// app/globals.css `--accent`). The kanji inside each seal differentiates
// them: chosen so the primary on-chain action of the protocol is
// directly readable as a Japanese seal-script character.
//
//   聚 (jù)  — gather / aggregate     → Jupiter (DEX aggregator)
//   換 (huàn) — exchange / swap       → Raydium (AMM swap)
//   貸 (dài)  — lend                   → Kamino (lending market)
//   鎖 (suǒ)  — lock / stake           → Jito (LST staking)
export const PROTOCOL_META: ProtocolMeta[] = [
  {
    id: ProtocolId.Jupiter,
    label: "Jupiter",
    tagline: "DEX 聚合 · Lend 借貸",
    sealKanji: "聚",
    aprKind: "lend-only",
  },
  {
    id: ProtocolId.Raydium,
    label: "Raydium",
    tagline: "AMM 直接路由",
    sealKanji: "換",
    aprKind: "swap-fee",
  },
  {
    id: ProtocolId.Kamino,
    label: "Kamino",
    tagline: "Solana #2 借貸市場",
    sealKanji: "貸",
    aprKind: "lend-borrow",
  },
  {
    id: ProtocolId.Jito,
    label: "Jito",
    tagline: "JitoSOL 流動性質押",
    sealKanji: "鎖",
    aprKind: "stake",
  },
];

// ── Shared response shape for /api/protocol-aprs ─────────────────────
export interface ProtocolAprsResponse {
  Kamino: { lendApy: number; borrowApy: number } | null;
  JupiterLend: { lendApy: number } | null;
  Jito: { stakeApy: number } | null;
  Raydium: { feePct: number } | null;
  lastUpdated: string;
  source: "live" | "cached" | "fallback";
  cacheAge?: number;
}

/** Two-line APR display: a big right-aligned value + a tiny uppercase label. */
export interface AprDisplay {
  value: string; // e.g. "5.56%" or "5.56% / 7.18%"
  label: string; // e.g. "Lend APY" or "Lend / Borrow"
}

/**
 * Build the structured APR display for a protocol card.
 * Returns `null` while APRs are still loading so the UI can show a skeleton.
 */
export function formatAprDisplay(
  meta: ProtocolMeta,
  aprs: ProtocolAprsResponse | null
): AprDisplay | null {
  if (!aprs) return null;
  switch (meta.aprKind) {
    case "lend-only":
      return aprs.JupiterLend
        ? { value: `${aprs.JupiterLend.lendApy.toFixed(2)}%`, label: "Lend APY" }
        : { value: "—", label: "Lend APY" };
    case "lend-borrow":
      return aprs.Kamino
        ? {
            value: `${aprs.Kamino.lendApy.toFixed(2)}% / ${aprs.Kamino.borrowApy.toFixed(2)}%`,
            label: "Lend / Borrow",
          }
        : { value: "— / —", label: "Lend / Borrow" };
    case "stake":
      return aprs.Jito
        ? { value: `${aprs.Jito.stakeApy.toFixed(2)}%`, label: "Stake APY" }
        : { value: "—", label: "Stake APY" };
    case "swap-fee":
      return aprs.Raydium
        ? { value: `${aprs.Raydium.feePct.toFixed(2)}%`, label: "Pool fee" }
        : { value: "—", label: "Pool fee" };
  }
}
