"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { StoredRun } from "@/lib/run-store";

export default function RunPage() {
  const params = useParams();
  const id = params.id as string;
  const [run, setRun] = useState<StoredRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/run/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setRun(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://sakuraaai.com/run/${id}`;

  const twitterText = run ? encodeURIComponent(
    `👻 Ghost Run Report — Solana DeFi Strategy Pre-Simulated\n` +
    `Strategy: ${run.strategy.slice(0, 60)}${run.strategy.length > 60 ? "..." : ""}\n` +
    `Commitment ID: ${run.commitmentId ?? "N/A"}\n` +
    `⛩️ SHA-256 pre-committed on Solana mainnet\n` +
    `Verify: ${shareUrl}\n` +
    `@sakuraaijp #GhostRun #Solana`
  ) : "";

  if (loading) return (
    <main style={{ background: "#0A0A0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#475569", fontSize: 14, fontFamily: "monospace" }}>Loading report...</div>
    </main>
  );

  if (notFound || !run) return (
    <main style={{ background: "#0A0A0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👻</div>
        <div style={{ color: "#EF4444", fontSize: 16, marginBottom: 8 }}>Report not found</div>
        <div style={{ color: "#475569", fontSize: 12 }}>This report may have expired (7-day TTL) or never existed.</div>
        <a href="/?demo=true" style={{ display: "inline-block", marginTop: 20, color: "#8B5CF6", fontSize: 13 }}>Try Ghost Run →</a>
      </div>
    </main>
  );

  // Parse result for display
  const result = run.result as { steps?: Array<{step: {inputAmount: number; inputToken: string; outputToken: string}; outputAmount: number; estimatedApy: number | null; gasSol: number; success: boolean}>; canExecute?: boolean; totalGasSol?: number; warnings?: string[] };
  const steps = result?.steps ?? [];
  const formattedDate = new Date(run.ts).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

  return (
    <main style={{ background: "#0A0A0F", minHeight: "100vh" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>👻</span>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#8B5CF6", fontWeight: 700, marginBottom: 2, fontFamily: "monospace" }}>
                GHOST RUN · PROOF-OF-SIMULATION
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9" }}>
                Pre-Execution Report
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#334155", fontFamily: "monospace" }}>
            {formattedDate} UTC · Wallet: {run.walletShort}... · ID: {id}
          </div>
        </div>

        {/* Strategy */}
        <div style={{ background: "#13131A", border: "1px solid #1E1E2E", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#8B5CF6", fontWeight: 700, letterSpacing: 2, marginBottom: 8, fontFamily: "monospace" }}>STRATEGY</div>
          <div style={{ fontSize: 14, color: "#E2E8F0", lineHeight: 1.6 }}>{run.strategy}</div>
        </div>

        {/* Simulation results */}
        <div style={{ background: "#080B14", border: "1px solid #1E3A5F", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#60A5FA", fontWeight: 700, letterSpacing: 2, marginBottom: 12, fontFamily: "monospace" }}>
            SIMULATION RESULTS · {result.canExecute ? "✓ EXECUTABLE" : "⚠ ISSUES DETECTED"}
          </div>
          {steps.map((s, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: i < steps.length - 1 ? "1px solid #1E1E2E" : "none"
            }}>
              <div>
                <div style={{ fontSize: 13, color: s.success ? "#10B981" : "#EF4444", fontWeight: 600 }}>
                  {s.success ? "✓" : "✗"} Step {i + 1}: {s.step.inputAmount} {s.step.inputToken} → {s.step.outputToken}
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                  Output: {s.outputAmount.toFixed(4)} {s.step.outputToken}
                  {s.estimatedApy != null ? ` · APY ${s.estimatedApy.toFixed(1)}%` : ""}
                  {` · Gas ${s.gasSol.toFixed(6)} SOL`}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1E1E2E", fontSize: 11, color: "#475569" }}>
            Total gas: {result.totalGasSol?.toFixed(6) ?? "—"} SOL
            {result.warnings?.length ? ` · ⚠ ${result.warnings.join("; ")}` : ""}
          </div>
        </div>

        {/* Commitment proof */}
        {run.commitmentId && (
          <div style={{ background: "#0A0A0F", border: "1px solid #8B5CF630", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#8B5CF6", fontWeight: 700, letterSpacing: 2, marginBottom: 12, fontFamily: "monospace" }}>
              ⛩️ PROOF-OF-SIMULATION · ONCHAIN PRE-COMMITMENT
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "#475569" }}>Commitment ID</span>
                <span style={{ color: "#8B5CF6", fontFamily: "monospace" }}>{run.commitmentId}</span>
              </div>
              {run.commitmentMemoSig && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: "#475569" }}>Onchain TX</span>
                  <a
                    href={`https://solscan.io/tx/${run.commitmentMemoSig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#60A5FA", fontFamily: "monospace", textDecoration: "none" }}
                  >
                    {run.commitmentMemoSig.slice(0, 20)}… →
                  </a>
                </div>
              )}
              <div style={{ fontSize: 11, color: "#334155", marginTop: 4, lineHeight: 1.6 }}>
                This simulation result was SHA-256 committed on Solana mainnet BEFORE any execution.
                Anyone can verify on Solscan that the outcome was known pre-trade.
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {run.aiAnalysis && (
          <div style={{ background: "#13131A", border: "1px solid #1E1E2E", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#F59E0B", fontWeight: 700, letterSpacing: 2, marginBottom: 10, fontFamily: "monospace" }}>AI ANALYSIS</div>
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{run.aiAnalysis}</div>
          </div>
        )}

        {/* Share + CTA */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <a
            href={`https://twitter.com/intent/tweet?text=${twitterText}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", background: "#1A1A2E", border: "1px solid #8B5CF640",
              borderRadius: 8, color: "#E2E8F0", textDecoration: "none", fontSize: 13, fontWeight: 600
            }}
          >
            𝕏 Share on X
          </a>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", background: "#13131A", border: "1px solid #1E1E2E",
              borderRadius: 8, color: "#94A3B8", cursor: "pointer", fontSize: 13
            }}
          >
            📋 Copy Link
          </button>
          <a
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", background: "linear-gradient(135deg, #8B5CF620, #6D28D920)",
              border: "1px solid #8B5CF640", borderRadius: 8, color: "#8B5CF6",
              textDecoration: "none", fontSize: 13, fontWeight: 600
            }}
          >
            🌸 Try Sakura Free →
          </a>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: "#1E293B", textAlign: "center", fontFamily: "monospace" }}>
          SAKURA · AI SECURITY LAYER · SOLANA · sakuraaai.com
        </div>
      </div>
    </main>
  );
}
