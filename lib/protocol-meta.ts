/**
 * lib/protocol-meta.ts — display metadata for the 4 龙头 protocols.
 *
 * Hoisted to module scope per React best-practice
 * `rendering-hoist-jsx` — these are static structures with no
 * per-render cost. Logos are inline SVG (no external requests, no
 * broken-image risk during a live demo).
 */

import { ProtocolId } from "./insurance-pool";
import type { ReactNode } from "react";
import { createElement } from "react";

export type AprDisplayKind = "lend-borrow" | "lend-only" | "stake" | "swap-fee";

export interface ProtocolMeta {
  id: ProtocolId;
  label: string;
  /** Tagline shown under the name. */
  tagline: string;
  /** Brand accent color (hex) used for the logo and active border. */
  color: string;
  /** Inline SVG logo (24×24 viewbox) to keep React render cost ~0. */
  logo: ReactNode;
  /** Drives which APR fields to read off `/api/protocol-aprs`. */
  aprKind: AprDisplayKind;
}

// ── Inline SVG logos (24×24, currentColor where possible) ────────────
//
// Static module-level JSX would create a TSX file, so we use
// `createElement` to keep this as a plain .ts module.

function CircleLogo({
  bg,
  letter,
  letterColor = "#fff",
}: {
  bg: string;
  letter: string;
  letterColor?: string;
}): ReactNode {
  return createElement(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
    },
    createElement("circle", { cx: 12, cy: 12, r: 11, fill: bg }),
    createElement(
      "text",
      {
        x: 12,
        y: 16,
        textAnchor: "middle",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "system-ui, sans-serif",
        fill: letterColor,
      },
      letter
    )
  );
}

const JUPITER_LOGO = CircleLogo({ bg: "#C8F284", letter: "J", letterColor: "#0E1414" });
const RAYDIUM_LOGO = CircleLogo({ bg: "#3A2FB6", letter: "R" });
const KAMINO_LOGO = CircleLogo({ bg: "#9747FF", letter: "K" });
const JITO_LOGO = CircleLogo({ bg: "#1F9C5C", letter: "J" });

// ── Public registry, ordered by Solana龙头 priority ──────────────────
export const PROTOCOL_META: ProtocolMeta[] = [
  {
    id: ProtocolId.Jupiter,
    label: "Jupiter",
    tagline: "DEX agg + Lend",
    color: "#C8F284",
    logo: JUPITER_LOGO,
    aprKind: "lend-only",
  },
  {
    id: ProtocolId.Raydium,
    label: "Raydium",
    tagline: "Direct AMM swap",
    color: "#3A2FB6",
    logo: RAYDIUM_LOGO,
    aprKind: "swap-fee",
  },
  {
    id: ProtocolId.Kamino,
    label: "Kamino",
    tagline: "Lending market",
    color: "#9747FF",
    logo: KAMINO_LOGO,
    aprKind: "lend-borrow",
  },
  {
    id: ProtocolId.Jito,
    label: "Jito",
    tagline: "JitoSOL liquid stake",
    color: "#1F9C5C",
    logo: JITO_LOGO,
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

/**
 * Format the APR/fee blurb shown on each protocol card.
 * Returns `null` while APRs are still loading so the UI can show a skeleton.
 */
export function formatAprBlurb(
  meta: ProtocolMeta,
  aprs: ProtocolAprsResponse | null
): string | null {
  if (!aprs) return null;
  switch (meta.aprKind) {
    case "lend-only":
      return aprs.JupiterLend
        ? `Lend ${aprs.JupiterLend.lendApy.toFixed(2)}% APY`
        : "Lend —";
    case "lend-borrow":
      return aprs.Kamino
        ? `Lend ${aprs.Kamino.lendApy.toFixed(2)}% · Borrow ${aprs.Kamino.borrowApy.toFixed(2)}%`
        : "Lend / Borrow —";
    case "stake":
      return aprs.Jito
        ? `Stake ${aprs.Jito.stakeApy.toFixed(2)}% APY`
        : "Stake —";
    case "swap-fee":
      return aprs.Raydium
        ? `Pool fee ${aprs.Raydium.feePct.toFixed(2)}%`
        : "Swap";
  }
}
