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
  /** Path under /public/ to the protocol's real logo (mounted inside
   *  the 朱印 seal frame and cream-tinted by LogoSeal). */
  logoSrc: string;
  /** Drives which APR fields to read off `/api/protocol-aprs`. */
  aprKind: AprDisplayKind;
}

// ── Public registry ─────────────────────────────────────────────────
//
// Sakura's brand vermillion 朱印 frame wraps each protocol's REAL logo
// (cream-tinted via LogoSeal so every brand reads cleanly on the red
// field). The frame is the "Sakura presents" gesture; the inner mark
// preserves protocol identity.
//
// Logo files in /public/logos/ — fetched 2026-04 from each project's
// own CDN / Coingecko (jupiter.svg from jup.ag, kamino.svg from
// cdn.kamino.finance, raydium.jpg + jito.png from coingecko).
export const PROTOCOL_META: ProtocolMeta[] = [
  {
    id: ProtocolId.Jupiter,
    label: "Jupiter",
    tagline: "DEX 聚合 · Lend 借貸",
    logoSrc: "/logos/jupiter.svg",
    aprKind: "lend-only",
  },
  {
    id: ProtocolId.Raydium,
    label: "Raydium",
    tagline: "AMM 直接路由",
    logoSrc: "/logos/raydium.png",
    aprKind: "swap-fee",
  },
  {
    id: ProtocolId.Kamino,
    label: "Kamino",
    tagline: "Solana #2 借貸市場",
    logoSrc: "/logos/kamino.svg",
    aprKind: "lend-borrow",
  },
  {
    id: ProtocolId.Jito,
    label: "Jito",
    tagline: "JitoSOL 流動性質押",
    logoSrc: "/logos/jito.png",
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
