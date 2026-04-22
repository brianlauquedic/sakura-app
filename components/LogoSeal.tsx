/**
 * LogoSeal — same vermillion 朱印 frame as NumeralSeal, but the centered
 * mark is the protocol's REAL logo (mounted from /public/logos/) rather
 * than a kanji character.
 *
 * The frame stays Sakura's brand (vermillion + 桜紋 gold pattern + gold
 * inner hairline + 4 corner gold beads); the protocol logo inside is
 * cream-tinted via `filter: brightness(0) invert(1)` so it reads
 * cleanly on the red background regardless of the logo's native colors.
 *
 * Same render-cost profile as NumeralSeal: pure SVG + one <img>, no
 * client state, no event handlers — module-level.
 */

import Image from "next/image";

interface LogoSealProps {
  /** Path under /public/, e.g. "/logos/jupiter.svg". */
  logoSrc: string;
  /** Accessible label for the protocol. */
  label: string;
  size?: number;
}

let counter = 0;
const uid = () => `logo-seal-${++counter}`;

export default function LogoSeal({
  logoSrc,
  label,
  size = 56,
}: LogoSealProps) {
  const patId = uid();
  // Inner logo is ~52% of the seal — leaves room for the gold border
  // + corner beads to read clearly.
  const innerSize = Math.round(size * 0.52);

  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        position: "relative",
      }}
      aria-label={`${label} seal`}
    >
      <svg
        viewBox="0 0 56 56"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          {/* 桜紋 gold sakura pattern — same texture as NumeralSeal so
              the two seal types share visual language. */}
          <pattern
            id={patId}
            x="0"
            y="0"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <g
              fill="rgba(230, 201, 101, 0.26)"
              stroke="rgba(230, 201, 101, 0.18)"
              strokeWidth="0.3"
            >
              <ellipse cx="14" cy="7" rx="1.8" ry="3.2" />
              <ellipse cx="20.65" cy="11.45" rx="1.8" ry="3.2" transform="rotate(72 20.65 11.45)" />
              <ellipse cx="18.1" cy="19.25" rx="1.8" ry="3.2" transform="rotate(144 18.1 19.25)" />
              <ellipse cx="9.9" cy="19.25" rx="1.8" ry="3.2" transform="rotate(216 9.9 19.25)" />
              <ellipse cx="7.35" cy="11.45" rx="1.8" ry="3.2" transform="rotate(288 7.35 11.45)" />
              <circle cx="14" cy="14" r="1.1" />
            </g>
          </pattern>
        </defs>

        {/* Drop shadow */}
        <rect x="3" y="4" width="50" height="50" rx="5" fill="rgba(0,0,0,0.14)" />
        {/* 朱色 seal block */}
        <rect x="2" y="2" width="50" height="50" rx="5" fill="#C9312A" />
        {/* Gold sakura pattern overlay */}
        <rect x="2" y="2" width="50" height="50" rx="5" fill={`url(#${patId})`} />
        {/* Fine gold inner hairline */}
        <rect
          x="6"
          y="6"
          width="42"
          height="42"
          rx="3.5"
          fill="none"
          stroke="#E6C965"
          strokeWidth="0.6"
          opacity="0.55"
        />
        {/* Outermost ultra-thin gold line */}
        <rect
          x="2.4"
          y="2.4"
          width="49.2"
          height="49.2"
          rx="4.8"
          fill="none"
          stroke="#E6C965"
          strokeWidth="0.4"
          opacity="0.25"
        />
        {/* 4 corner gold bead flourishes */}
        {[
          [7, 7],
          [47, 7],
          [7, 47],
          [47, 47],
        ].map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="0.65"
            fill="#E6C965"
            opacity="0.7"
          />
        ))}
      </svg>

      {/* Centered protocol logo — cream-tinted so any source palette
          reads as a single ink-mark on the vermillion field. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Image
          src={logoSrc}
          alt={label}
          width={innerSize}
          height={innerSize}
          style={{
            // Kill source colors → pure white → drop opacity to cream.
            // This keeps every protocol legible on the red field while
            // unifying them as a stamped-mark series rather than four
            // disparate brand badges.
            filter: "brightness(0) invert(1)",
            opacity: 0.93,
            objectFit: "contain",
          }}
          unoptimized
        />
      </div>
    </div>
  );
}
