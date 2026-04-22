import { ProtocolId } from "./insurance-pool";
import type { TranslationKey } from "./i18n";

export type AprDisplayKind = "lend-borrow" | "lend-only" | "stake" | "swap-fee";

export interface ProtocolMeta {
  id: ProtocolId;
  label: string;
  /** i18n key for the tagline shown under the protocol name.
   *  Resolves to zh/en/ja via `useLang().t(taglineKey)`. */
  taglineKey: TranslationKey;
  /** Path under /public/ to the protocol's real logo (cream-tinted
   *  inside the 朱印 seal frame by LogoSeal). */
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
export const PROTOCOL_META: ProtocolMeta[] = [
  {
    id: ProtocolId.Jupiter,
    label: "Jupiter",
    taglineKey: "metaJupiterTagline",
    logoSrc: "/logos/jupiter.svg",
    aprKind: "lend-only",
  },
  {
    id: ProtocolId.Raydium,
    label: "Raydium",
    taglineKey: "metaRaydiumTagline",
    logoSrc: "/logos/raydium.png",
    aprKind: "swap-fee",
  },
  {
    id: ProtocolId.Kamino,
    label: "Kamino",
    taglineKey: "metaKaminoTagline",
    logoSrc: "/logos/kamino.svg",
    aprKind: "lend-borrow",
  },
  {
    id: ProtocolId.Jito,
    label: "Jito",
    taglineKey: "metaJitoTagline",
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

/** Two-line APR display: a big right-aligned value + a tiny
 *  i18n-aware label key (caller resolves via `t(labelKey)`). */
export interface AprDisplay {
  value: string;           // e.g. "5.56%" or "5.56% / 7.18%"
  labelKey: TranslationKey; // e.g. "aprLendOnly"
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
        ? { value: `${aprs.JupiterLend.lendApy.toFixed(2)}%`, labelKey: "aprLendOnly" }
        : { value: "—", labelKey: "aprLendOnly" };
    case "lend-borrow":
      return aprs.Kamino
        ? {
            value: `${aprs.Kamino.lendApy.toFixed(2)}% / ${aprs.Kamino.borrowApy.toFixed(2)}%`,
            labelKey: "aprLendBorrow",
          }
        : { value: "— / —", labelKey: "aprLendBorrow" };
    case "stake":
      return aprs.Jito
        ? { value: `${aprs.Jito.stakeApy.toFixed(2)}%`, labelKey: "aprStake" }
        : { value: "—", labelKey: "aprStake" };
    case "swap-fee":
      return aprs.Raydium
        ? { value: `${aprs.Raydium.feePct.toFixed(2)}%`, labelKey: "aprSwapFee" }
        : { value: "—", labelKey: "aprSwapFee" };
  }
}
