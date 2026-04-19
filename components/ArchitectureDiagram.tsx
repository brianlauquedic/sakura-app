"use client";

import { useLang } from "@/contexts/LanguageContext";

const t = {
  title: { zh: "技術架構", en: "Architecture", ja: "アーキテクチャ" },
  sakLayer: { zh: "Solana Agent Kit 執行層", en: "Solana Agent Kit Execution Layer", ja: "Solana Agent Kit実行層" },
  cryptoLayer: { zh: "密碼學證明層", en: "Cryptographic Proof Layer", ja: "暗号証明層" },
  chainLayer: { zh: "Solana 鏈上層", en: "Solana On-Chain Layer", ja: "Solanaオンチェーン層" },
  aiLayer: { zh: "AI 決策層", en: "AI Decision Layer", ja: "AI意思決定層" },
} as const;

type Lang = "zh" | "en" | "ja";

function LayerBox({ color, icon, title, items, glow }: {
  color: string; icon: string; title: string; items: string[]; glow: string;
}) {
  return (
    <div className={`relative rounded-xl border ${color} p-4 bg-black/40 backdrop-blur-sm`}
      style={{ boxShadow: `0 0 20px ${glow}` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-bold text-white/90">{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className="w-px h-4 bg-gradient-to-b from-white/20 to-white/5" />
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-white/20" />
      </div>
    </div>
  );
}

export default function ArchitectureDiagram() {
  const { lang: appLang } = useLang();
  const lang = (appLang || "en") as Lang;
  const i = (key: keyof typeof t) => t[key][lang] ?? t[key].en;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/90 to-black/70 p-5 space-y-1">
      <h3 className="text-center text-sm font-bold text-white/80 mb-4">
        🏗️ {i("title")} — Sakura Shielded Lending
      </h3>

      {/* AI Layer */}
      <LayerBox
        color="border-purple-500/30"
        glow="rgba(168,85,247,0.08)"
        icon="🧠"
        title={i("aiLayer")}
        items={["Claude Sonnet 4.6", "Portfolio Analysis", "Risk Assessment", "Strategy Generation"]}
      />

      <Arrow />

      {/* SAK Execution Layer */}
      <LayerBox
        color="border-blue-500/30"
        glow="rgba(59,130,246,0.08)"
        icon="⚡"
        title={i("sakLayer")}
        items={[
          "TokenPlugin: fetchPrice",
          "DefiPlugin: trade / stake / lend",
          "MiscPlugin: compressedAirdrop / jitoTip",
          "Jupiter V6 Swap",
          "Marinade / Jito Stake",
          "Lulo Lending",
        ]}
      />

      <Arrow />

      {/* Crypto Proof Layer */}
      <LayerBox
        color="border-emerald-500/30"
        glow="rgba(52,211,153,0.08)"
        icon="🔐"
        title={i("cryptoLayer")}
        items={[
          "SHA-256 Hash Chain",
          "Poseidon (BN254)",
          "Dual-Hash (zERC20)",
          "Merkle Audit Tree",
          "ZK Commitment Proof",
          "Cumulative Tracking",
          "Commitment-Nullifier",
        ]}
      />

      <Arrow />

      {/* Solana On-Chain Layer */}
      <LayerBox
        color="border-orange-500/30"
        glow="rgba(249,115,22,0.08)"
        icon="⛓️"
        title={i("chainLayer")}
        items={[
          "Memo Program (audit trail)",
          "SPL Token (delegate rescue)",
          "Light Protocol (ZK compress)",
          "Merkle Root Anchor",
          "Proof Digest On-Chain",
        ]}
      />

      {/* Tech badges */}
      <div className="pt-3 mt-3 border-t border-white/5 flex flex-wrap justify-center gap-2">
        {["Solana", "Next.js 16", "SAK v2", "Poseidon", "BN254", "Merkle Audit", "Light Protocol"].map(tag => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
