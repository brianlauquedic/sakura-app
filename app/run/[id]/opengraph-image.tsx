import { ImageResponse } from "next/og";
import { getRun } from "@/lib/run-store";

export const runtime = "nodejs";
export const alt = "Ghost Run · Proof-of-Simulation Report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id).catch(() => null);

  const strategy = run?.strategy?.slice(0, 80) ?? "Solana DeFi Strategy";
  const commitmentId = run?.commitmentId ?? "GR-XXXXXXXX";
  const ts = run ? new Date(run.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0A0A14 0%, #0F0A1E 50%, #0A0F1A 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: Logo + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Sakura logo circle */}
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>
              🌸
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", letterSpacing: 1 }}>
                Sakura
              </span>
              <span style={{ fontSize: 12, color: "#475569", letterSpacing: 3 }}>
                AI SECURITY LAYER · SOLANA
              </span>
            </div>
          </div>
          <div style={{
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.4)",
            borderRadius: 8, padding: "6px 16px",
            fontSize: 13, fontWeight: 700, color: "#8B5CF6", letterSpacing: 2,
          }}>
            👻 GHOST RUN
          </div>
        </div>

        {/* Middle: Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: "#8B5CF6",
            letterSpacing: 3, display: "flex", alignItems: "center", gap: 8,
          }}>
            ⛩️ PROOF-OF-SIMULATION · ONCHAIN COMMITMENT
          </div>

          <div style={{
            fontSize: strategy.length > 50 ? 28 : 34,
            fontWeight: 700, color: "#F1F5F9", lineHeight: 1.3,
            maxWidth: 900,
          }}>
            {strategy}{run?.strategy && run.strategy.length > 80 ? "…" : ""}
          </div>

          <div style={{
            display: "flex", gap: 32, alignItems: "center",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#475569", letterSpacing: 2 }}>COMMITMENT ID</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#A78BFA", fontFamily: "monospace" }}>
                {commitmentId}
              </span>
            </div>
            {ts && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "#475569", letterSpacing: 2 }}>DATE</span>
                <span style={{ fontSize: 16, color: "#64748B" }}>{ts}</span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#475569", letterSpacing: 2 }}>VERIFIED</span>
              <span style={{ fontSize: 16, color: "#10B981", fontWeight: 600 }}>✓ Pre-execution</span>
            </div>
          </div>
        </div>

        {/* Bottom: Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "1px solid #1E293B", paddingTop: 20,
        }}>
          <span style={{ fontSize: 14, color: "#334155", letterSpacing: 1 }}>
            sakuraaai.com/run/{id}
          </span>
          <span style={{ fontSize: 13, color: "#334155" }}>
            SHA-256 committed on Solana mainnet before execution
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
