"use client";

import { useEffect } from "react";
import WalletConnect from "@/components/WalletConnect";
import IntentSigner from "@/components/IntentSigner";
import ActionHistory from "@/components/ActionHistory";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useWallet } from "@/contexts/WalletContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";

function AppContent() {
  const { walletAddress, shortAddr, disconnect, showLanding, setShowLanding, activeProvider, isDemo, setIsDemo } = useWallet();
  // Dark-only design (v0.3). timeBg was used to tint background by time-of-day
  // but was overriding the Shadcn --background variable and causing contrast
  // regressions. Now we always use --bg-base (墨色).
  const { t } = useLang();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Bug 5 fix: case-insensitive demo param (?demo=TRUE, ?demo=True, etc.)
    setIsDemo(params.get("demo")?.toLowerCase() === "true");
  }, [setIsDemo]);

  const showApp = (!!walletAddress && !showLanding) || isDemo;

  return (
    <main className="min-h-screen" style={{
      background: "var(--bg-base)",
    }}>
      <div
        className="main-container"
        style={{
          maxWidth: showApp ? 860 : 1280,
          margin: "0 auto",
          padding: showApp ? "40px 24px" : "0",
        }}
      >
        {!showApp ? (
          <WalletConnect
            walletAddress={walletAddress}
            onEnterApp={() => setShowLanding(false)}
            onTryDemo={() => { setIsDemo(true); window.history.pushState({}, "", "/?demo=true"); }}
          />
        ) : (
          <div style={{ padding: "40px 0" }}>
            {/* ── Demo mode banner ── */}
            {isDemo && (
              <div style={{
                background: "linear-gradient(90deg, rgba(255,60,0,0.15), rgba(255,140,0,0.15))",
                border: "1px solid rgba(255,100,0,0.4)",
                borderRadius: 8, padding: "8px 16px", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 14 }}>🎬</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
                  color: "#FF6A00", fontFamily: "var(--font-mono)",
                }}>
                  DEMO MODE
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                  — preset data, no wallet required
                </span>
              </div>
            )}

            {/* ── Header bar ── */}
            <div className="app-header" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 28,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  onClick={() => { setIsDemo(false); setShowLanding(true); window.history.pushState({}, "", "/"); }}
                  style={{
                    fontSize: 18, fontWeight: 300, letterSpacing: "0.1em",
                    fontFamily: "var(--font-heading)", color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  Sakura
                </span>
              </div>
              <div className="app-header-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "6px 12px",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: isDemo ? "#FF6A00" : "var(--green)",
                    display: "inline-block",
                  }} />
                  <span style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                    {isDemo ? "demo...mode" : shortAddr}
                  </span>
                  {!isDemo && activeProvider && (
                    <span style={{
                      fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em",
                    }}>
                      {activeProvider === "phantom" ? "Phantom" : "OKX"}
                    </span>
                  )}
                </div>
                {isDemo ? (
                  <button
                    onClick={() => { setIsDemo(false); setShowLanding(true); window.history.pushState({}, "", "/"); }}
                    style={{
                      fontSize: 12, color: "#FF9F0A",
                      background: "rgba(255,159,10,0.1)", border: "1px solid rgba(255,159,10,0.4)",
                      borderRadius: 6, padding: "6px 12px", cursor: "pointer",
                      letterSpacing: "0.04em", fontWeight: 600,
                    }}
                  >
                    🔗 連接錢包
                  </button>
                ) : (
                  <button
                    onClick={() => disconnect()}
                    style={{
                      fontSize: 12, color: "var(--text-muted)",
                      background: "var(--bg-card)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "6px 12px", cursor: "pointer",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {t("appDisconnect")}
                  </button>
                )}
                <a
                  href="/mcp"
                  className="app-header-secondary"
                  style={{
                    fontSize: 11, fontWeight: 600, color: "var(--accent)",
                    textDecoration: "none", padding: "6px 10px",
                    border: "1px solid var(--accent-mid)",
                    background: "var(--accent-soft)",
                    borderRadius: 6, letterSpacing: "0.06em",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  MCP API
                </a>
                {true && (
                  <button
                    onClick={() => { setIsDemo(false); setShowLanding(true); window.history.pushState({}, "", "/"); }}
                    className="app-header-secondary"
                    style={{
                      fontSize: 12, color: "var(--text-muted)",
                      background: "none", border: "none",
                      cursor: "pointer", padding: "6px 4px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {t("appHome")}
                  </button>
                )}
              </div>
            </div>

            {/* ── Agentic Consumer Protocol — Intent Execution ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <ErrorBoundary fallbackLabel="Intent Signer">
                <IntentSigner />
              </ErrorBoundary>
              <ErrorBoundary fallbackLabel="Action History">
                <ActionHistory />
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

export default function Home() {
  return <AppContent />;
}
