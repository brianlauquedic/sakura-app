"use client";

import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import type { StrategyStep, GhostRunResult, StepSimulation } from "@/lib/ghost-run";

interface SimulateResponse {
  steps: StrategyStep[];
  result: GhostRunResult;
}

interface ExecuteResponse {
  success: boolean;
  signatures: string[];
  memoSig: string | null;
  errors: string[];
}

const EXAMPLE_STRATEGIES = [
  "質押 1 SOL 到 Marinade，獲得 mSOL",
  "把 50 USDC 存入 Kamino 賺取收益",
  "質押 2 SOL 到 Jito，並把 100 USDC 存入 Kamino",
];

export default function GhostRun() {
  const { walletAddress } = useWallet();
  const [strategy, setStrategy] = useState("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [simResult, setSimResult] = useState<SimulateResponse | null>(null);
  const [execResult, setExecResult] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSimulation() {
    const text = strategy.trim();
    if (!text) { setError("請輸入您的 DeFi 策略"); return; }
    if (!walletAddress) { setError("請先連接錢包"); return; }

    setLoading(true);
    setError(null);
    setSimResult(null);
    setExecResult(null);

    try {
      const res = await fetch("/api/ghost-run/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: text, wallet: walletAddress }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data: SimulateResponse = await res.json();
      setSimResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "模擬失敗");
    } finally {
      setLoading(false);
    }
  }

  async function executeStrategy() {
    if (!simResult || !walletAddress) return;
    setExecuting(true);
    setExecResult(null);
    try {
      const res = await fetch("/api/ghost-run/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: simResult.steps, wallet: walletAddress }),
      });
      const data: ExecuteResponse = await res.json();
      setExecResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "執行失敗");
    } finally {
      setExecuting(false);
    }
  }

  const stepTypeLabel: Record<string, string> = {
    swap: "兌換",
    stake: "質押",
    lend: "存款",
  };
  const stepTypeColor: Record<string, string> = {
    swap: "#7C6FFF",
    stake: "#34C759",
    lend: "#FF9F0A",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(124,111,255,0.1)", border: "1px solid rgba(124,111,255,0.3)",
          borderRadius: 20, padding: "4px 12px", marginBottom: 12,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C6FFF", display: "inline-block" }} />
          <span style={{ fontSize: 11, color: "#7C6FFF", fontWeight: 500, letterSpacing: 1.2, fontFamily: "var(--font-mono)" }}>
            GHOST RUN — STRATEGY SIMULATOR
          </span>
        </div>
        <h2 style={{
          fontSize: 20, fontWeight: 300, color: "var(--text-primary)",
          fontFamily: "var(--font-heading)", letterSpacing: "0.06em", marginBottom: 8,
        }}>
          👻 幽靈執行 DeFi 策略
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, maxWidth: 560 }}>
          用 Solana 原生 <code style={{ fontFamily: "var(--font-mono)", color: "#7C6FFF" }}>simulateTransaction</code> 在真實鏈上狀態下「幽靈執行」您的整個 DeFi 策略，
          拿到精確結果後再決定是否真正執行。全球首創。
        </p>
      </div>

      {/* Strategy input */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderTop: "2px solid #7C6FFF",
        borderRadius: 10, padding: "20px 22px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          用自然語言描述您的 DeFi 策略
        </div>
        <textarea
          value={strategy}
          onChange={e => setStrategy(e.target.value)}
          placeholder="例：質押 3 SOL 到 Marinade，並把 50 USDC 存入 Kamino"
          rows={3}
          style={{
            width: "100%", background: "var(--bg-base)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "10px 14px", fontSize: 13,
            color: "var(--text-primary)", fontFamily: "var(--font-body)",
            outline: "none", resize: "vertical", boxSizing: "border-box",
            lineHeight: 1.7,
          }}
        />
        {/* Example strategies */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {EXAMPLE_STRATEGIES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setStrategy(ex)}
              style={{
                fontSize: 11, color: "var(--text-muted)",
                background: "var(--bg-base)", border: "1px solid var(--border)",
                borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {ex}
            </button>
          ))}
        </div>
        <button
          onClick={runSimulation}
          disabled={loading}
          style={{
            marginTop: 14, background: loading ? "var(--border)" : "#7C6FFF",
            border: "none", borderRadius: 8, padding: "10px 24px",
            fontSize: 13, fontWeight: 500, color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {loading ? "幽靈執行中…" : "👻 幽靈執行模擬"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.3)",
          borderRadius: 8, padding: "12px 16px", marginBottom: 16,
          fontSize: 13, color: "#FF4444",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Simulation results */}
      {simResult && (
        <div>
          {/* Step-by-step results */}
          <div style={{
            fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.15em",
            textTransform: "uppercase", marginBottom: 12, fontFamily: "var(--font-mono)",
          }}>
            幽靈執行結果
          </div>

          {simResult.result.steps.map((sim: StepSimulation, i: number) => (
            <div key={i} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderLeft: `3px solid ${stepTypeColor[sim.step.type] ?? "var(--accent)"}`,
              borderRadius: 10, padding: "16px 20px", marginBottom: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                    color: stepTypeColor[sim.step.type],
                    background: `${stepTypeColor[sim.step.type]}18`,
                    border: `1px solid ${stepTypeColor[sim.step.type]}35`,
                    borderRadius: 4, padding: "2px 8px",
                    fontFamily: "var(--font-mono)",
                  }}>
                    {stepTypeLabel[sim.step.type] ?? sim.step.type}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                    {sim.step.inputAmount} {sim.step.inputToken} → {sim.step.outputToken}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    via {sim.step.protocol}
                  </span>
                </div>
                <span style={{
                  fontSize: 11, borderRadius: 4, padding: "3px 8px",
                  background: sim.success ? "rgba(52,199,89,0.12)" : "rgba(255,68,68,0.12)",
                  color: sim.success ? "var(--green)" : "#FF4444",
                  border: `1px solid ${sim.success ? "rgba(52,199,89,0.3)" : "rgba(255,68,68,0.3)"}`,
                  fontWeight: 600,
                }}>
                  {sim.success ? "✓ 可執行" : "✗ 失敗"}
                </span>
              </div>

              {sim.success && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <MetricBox
                    label="預期獲得"
                    value={`${sim.outputAmount.toFixed(4)} ${sim.step.outputToken}`}
                    color="var(--green)"
                  />
                  <MetricBox
                    label="Gas 費用"
                    value={`${(sim.gasSol * 1e6).toFixed(1)} μSOL`}
                    color="var(--text-muted)"
                  />
                  {sim.estimatedApy !== undefined && (
                    <MetricBox
                      label="年化收益率"
                      value={`${sim.estimatedApy.toFixed(1)}%`}
                      color="#FF9F0A"
                    />
                  )}
                  {sim.annualUsdYield !== undefined && (
                    <MetricBox
                      label="預計年收益"
                      value={`+$${sim.annualUsdYield.toFixed(2)}`}
                      color="var(--green)"
                    />
                  )}
                </div>
              )}

              {sim.error && (
                <div style={{ fontSize: 12, color: "#FF4444", marginTop: 8 }}>
                  {sim.error}
                </div>
              )}
            </div>
          ))}

          {/* Summary */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "16px 20px", marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
                SIMULATION SUMMARY
              </div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>
                {simResult.result.steps.length} 步策略 ·
                總 Gas: {(simResult.result.totalGasSol * 1e6).toFixed(1)} μSOL (~$
                {(simResult.result.totalGasSol * 170 * 1000).toFixed(3)})
              </div>
              {simResult.result.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: "#FF9F0A", marginTop: 4 }}>{w}</div>
              ))}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700,
              color: simResult.result.canExecute ? "var(--green)" : "#FF4444",
            }}>
              {simResult.result.canExecute ? "✅ 可安全執行" : "⚠️ 請檢查警告"}
            </div>
          </div>

          {/* Confirm execution */}
          {simResult.result.canExecute && !execResult && (
            <button
              onClick={executeStrategy}
              disabled={executing}
              style={{
                width: "100%", padding: "14px",
                background: executing ? "var(--border)" : "linear-gradient(135deg, #7C6FFF, #5A4FD1)",
                border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 600, color: "#fff",
                cursor: executing ? "not-allowed" : "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {executing ? "執行中…" : "⚡ 確認執行策略（真實上鏈）"}
            </button>
          )}

          {/* Execution result */}
          {execResult && (
            <div style={{
              background: execResult.success ? "rgba(52,199,89,0.08)" : "rgba(255,68,68,0.08)",
              border: `1px solid ${execResult.success ? "rgba(52,199,89,0.3)" : "rgba(255,68,68,0.3)"}`,
              borderRadius: 10, padding: "18px 20px",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: execResult.success ? "var(--green)" : "#FF4444", marginBottom: 10 }}>
                {execResult.success ? "✅ 策略執行成功" : "⚠️ 部分執行失敗"}
              </div>
              {execResult.signatures.map((sig, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                  TX {i + 1}: {sig.slice(0, 20)}…
                </div>
              ))}
              {execResult.memoSig && (
                <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
                  ✦ 鏈上執行憑證: {execResult.memoSig.slice(0, 20)}…
                </div>
              )}
              {execResult.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: "#FF4444", marginTop: 4 }}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Educational footer */}
      <div style={{
        marginTop: 24, padding: "14px 18px",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
          什麼是幽靈執行？
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.85 }}>
          Solana 原生 RPC <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>simulateTransaction</code> 可以在
          <strong style={{ color: "var(--text-primary)" }}>真實鏈上狀態</strong>下執行交易，無需廣播、無需簽名，返回精確的 token 變化量和 gas 消耗。
          Jupiter 構建真實交易，Ghost Run 模擬它，讓您在簽字前看到確切結果。
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "var(--bg-base)", borderRadius: 8, padding: "10px 12px",
    }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color }}>
        {value}
      </div>
    </div>
  );
}
