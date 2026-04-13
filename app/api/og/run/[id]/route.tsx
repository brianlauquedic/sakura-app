import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { LOGO_BIJIN_B64 } from "@/lib/logo-bijin-b64";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0A0A14 0%, #0F0A1E 60%, #12082A 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo top-right */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_BIJIN_B64}
          alt="Sakura"
          width={90}
          height={120}
          style={{
            position: "absolute",
            top: 48,
            right: 72,
            objectFit: "cover",
            objectPosition: "top",
            borderRadius: 12,
            opacity: 0.9,
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <span style={{ fontSize: 36 }}>👻</span>
          <div
            style={{
              fontSize: 13,
              color: "#8B5CF6",
              letterSpacing: 3,
              fontWeight: 700,
            }}
          >
            SAKURA · GHOST RUN · PROOF-OF-SIMULATION
          </div>
        </div>

        {/* Main heading */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#F1F5F9",
            marginBottom: 20,
            maxWidth: 860,
            lineHeight: 1.2,
          }}
        >
          Solana DeFi Strategy
          <br />
          Pre-Simulated
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: 18,
            color: "#64748B",
            marginBottom: 36,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: "#10B981" }}>⛩️</span>
          <span>SHA-256 committed on Solana mainnet · pre-trade</span>
        </div>

        {/* ID pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 10,
            padding: "10px 20px",
          }}
        >
          <span style={{ fontSize: 12, color: "#8B5CF6", letterSpacing: 2 }}>
            REPORT ID
          </span>
          <span
            style={{
              fontSize: 14,
              color: "#A78BFA",
              fontFamily: "monospace",
            }}
          >
            {id}
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 72,
            fontSize: 13,
            color: "#334155",
            letterSpacing: 2,
          }}
        >
          sakuraaai.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
