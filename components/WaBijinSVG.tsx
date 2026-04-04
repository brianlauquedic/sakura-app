"use client";

interface WaBijinSVGProps {
  size?: number;
  className?: string;
}

/**
 * 和美人 Wa-bijin — Traditional Japanese Beauty
 * 浮世絵風 Ukiyo-e style portrait icon
 * 島田髷 Shimada hairstyle · 簪 Kanzashi · 白粉 Powder skin · 朱唇 Vermillion lips
 */
export default function WaBijinSVG({ size = 32, className }: WaBijinSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── 髪 Hair (島田髷 Shimada-mage) ── */}
      {/* Main hair mass — deep lacquer black */}
      <ellipse cx="50" cy="22" rx="22" ry="14" fill="#1A1008" />
      {/* Shimada top bun — elevated chignon */}
      <ellipse cx="50" cy="10" rx="14" ry="8" fill="#1A1008" />
      {/* Hair wing left */}
      <ellipse cx="32" cy="20" rx="10" ry="6" fill="#201408" transform="rotate(-15 32 20)" />
      {/* Hair wing right */}
      <ellipse cx="68" cy="20" rx="10" ry="6" fill="#201408" transform="rotate(15 68 20)" />
      {/* Hair sheen highlight */}
      <ellipse cx="46" cy="8" rx="5" ry="2.5" fill="#3A2818" opacity="0.7" />

      {/* ── 簪 Kanzashi — gold hair ornaments ── */}
      {/* Left kanzashi pin */}
      <line x1="34" y1="14" x2="26" y2="8" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="25.5" cy="7.5" r="2.2" fill="#C9A84C" />
      <circle cx="25.5" cy="7.5" r="1" fill="#F0D070" />
      {/* Right kanzashi pin */}
      <line x1="66" y1="14" x2="74" y2="8" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="74.5" cy="7.5" r="2.2" fill="#C9A84C" />
      <circle cx="74.5" cy="7.5" r="1" fill="#F0D070" />
      {/* Central kanzashi */}
      <line x1="50" y1="5" x2="50" y2="-1" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round" />
      <circle cx="50" cy="-1" r="1.8" fill="#C9A84C" />

      {/* ── 顔 Face — 白磁 porcelain skin ── */}
      {/* Face base */}
      <ellipse cx="50" cy="50" rx="18" ry="22" fill="#F5EAD5" />
      {/* Subtle jaw definition */}
      <ellipse cx="50" cy="60" rx="13" ry="12" fill="#F0E4CC" />
      {/* Cheek blush — pale sakura */}
      <ellipse cx="38" cy="52" rx="5" ry="3" fill="#E8B4B0" opacity="0.25" />
      <ellipse cx="62" cy="52" rx="5" ry="3" fill="#E8B4B0" opacity="0.25" />

      {/* ── 眉 Eyebrows — thin willow-leaf ── */}
      {/* Left eyebrow */}
      <path d="M36 40 Q40 37 44 39" stroke="#2A1808" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Right eyebrow */}
      <path d="M56 39 Q60 37 64 40" stroke="#2A1808" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* ── 目 Eyes — almond shaped ── */}
      {/* Left eye white */}
      <ellipse cx="40" cy="46" rx="5.5" ry="3.5" fill="#FAF6F0" />
      {/* Left iris — dark warm brown */}
      <ellipse cx="40" cy="46" rx="3" ry="3" fill="#2A1808" />
      {/* Left pupil */}
      <ellipse cx="40" cy="46" rx="1.5" ry="2" fill="#0F0A04" />
      {/* Left eye highlight */}
      <circle cx="41.2" cy="44.8" r="0.8" fill="#FFFFFF" opacity="0.9" />
      {/* Left upper eyelid line */}
      <path d="M34.5 44.5 Q40 42 45.5 44.5" stroke="#2A1808" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* Left lower eyelid line */}
      <path d="M35 47.5 Q40 49.5 45 47.5" stroke="#3A2010" strokeWidth="0.6" fill="none" strokeLinecap="round" />

      {/* Right eye white */}
      <ellipse cx="60" cy="46" rx="5.5" ry="3.5" fill="#FAF6F0" />
      {/* Right iris */}
      <ellipse cx="60" cy="46" rx="3" ry="3" fill="#2A1808" />
      {/* Right pupil */}
      <ellipse cx="60" cy="46" rx="1.5" ry="2" fill="#0F0A04" />
      {/* Right eye highlight */}
      <circle cx="61.2" cy="44.8" r="0.8" fill="#FFFFFF" opacity="0.9" />
      {/* Right upper eyelid line */}
      <path d="M54.5 44.5 Q60 42 65.5 44.5" stroke="#2A1808" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* Right lower eyelid line */}
      <path d="M55 47.5 Q60 49.5 65 47.5" stroke="#3A2010" strokeWidth="0.6" fill="none" strokeLinecap="round" />

      {/* ── 鼻 Nose — delicate ── */}
      <path d="M48 53 Q50 56 52 53" stroke="#C8A882" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* ── 口 Lips — 朱 vermillion ── */}
      {/* Upper lip */}
      <path d="M43 61 Q46 58.5 50 60 Q54 58.5 57 61 Q54 62.5 50 61.5 Q46 62.5 43 61Z" fill="#C0392B" />
      {/* Lower lip */}
      <path d="M43 61 Q46.5 65.5 50 65 Q53.5 65.5 57 61 Q54 62.5 50 61.5 Q46 62.5 43 61Z" fill="#C0392B" />
      {/* Lip shine */}
      <ellipse cx="50" cy="63" rx="3" ry="1" fill="#E05040" opacity="0.5" />
      {/* Lip line */}
      <path d="M43 61 Q50 60 57 61" stroke="#A0281E" strokeWidth="0.5" fill="none" />

      {/* ── 首 Neck — elongated elegant ── */}
      <rect x="43" y="70" width="14" height="14" rx="2" fill="#F0E4CC" />
      {/* Neck shadow line */}
      <line x1="46" y1="70" x2="46" y2="82" stroke="#DDD0BA" strokeWidth="0.5" opacity="0.5" />
      <line x1="54" y1="70" x2="54" y2="82" stroke="#DDD0BA" strokeWidth="0.5" opacity="0.5" />

      {/* ── 着物 Kimono collar ── */}
      {/* Left collar panel */}
      <path d="M43 82 L33 100 L50 96 Z" fill="#1A1008" />
      {/* Right collar panel */}
      <path d="M57 82 L67 100 L50 96 Z" fill="#1A1008" />
      {/* Inner collar (白 white under-collar — 半衿 han-eri) */}
      <path d="M43 82 L38 96 L50 93 L62 96 L57 82 L50 86 Z" fill="#EDE8DF" />
      {/* Collar edge line */}
      <path d="M43 82 L50 86 L57 82" stroke="#C8B89A" strokeWidth="0.6" fill="none" />

      {/* ── 朱 Accent dot — seal mark on kimono ── */}
      <circle cx="50" cy="98" r="2" fill="#C0392B" opacity="0.6" />
    </svg>
  );
}
