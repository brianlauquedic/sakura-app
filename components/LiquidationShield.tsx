"use client";

import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import type { LendingPosition, RescueSimulation, MonitorResult, ShieldConfig } from "@/lib/liquidation-shield";

interface MonitorResponse extends MonitorResult {
  config: ShieldConfig;
  rescueSimulations: RescueSimulation[];
  aiAnalysis: string | null;
}

interface RescueResponse {
  success: boolean;
  rescueSig: string | null;
  memoSig: string | null;
  auditChain: string | null;
  error: string | null;
}

const PROTOCOL_COLOR: Record<string, string> = {
  kamino: "#FF9F0A",
  marginfi: "#34C759",
  solend: "#7C6FFF",
  unknown: "var(--text-muted)",
};

function healthColor(hf: number): string {
  if (hf < 1.05) return "#FF4444";
  if (hf < 1.2) return "#FF8C00";
  if (hf < 1.5) return "#FFD700";
  return "var(--green)";
}

function healthLabel(hf: number): string {
  if (hf < 1.0) return "🚨 清算中";
  if (hf < 1.05) return "🔴 極危";
  if (hf < 1.2) return "⚠️ 警告";
  if (hf < 1.5) return "⚡ 注意";
  return "✅ 安全";
}

export default function LiquidationShield() {
  const { walletAddress } = useWallet();
  const [inputAddr, setInputAddr] = useState(walletAddress ?? "");
  const [maxUsdc, setMaxUsdc] = useState("1000");
  const [triggerHF, setTriggerHF] = useState("1.05");
  const [loading, setLoading] = useState(false);
  const [rescuingIdx, setRescuingIdx] = useState<number | null>(null);
  const [result, setResult] = useState<MonitorResponse | null>(null);
  const [rescueResults, setRescueResults] = useState<Record<number, RescueResponse>>({});
  const [error, setError] = useState<string | null>(null);

  async function scan() {
    const addr = inputAddr.trim();
    if (!addr || addr.length < 32) { setError("請輸入有效的 Solana 錢包地址"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    setRescueResults({});
    try {
      const res = await fetch("/api/liquidation-shield/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: addr,
          config: {
            approvedUsdc: parseFloat(maxUsdc) || 1000,
            triggerThreshold: parseFloat(triggerHF) || 1.05,
            targetHealthFactor: 1.4,
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as {error?: string}).error ?? `HTTP ${res.status}`);
      }
      const data: MonitorResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "掃描失敗");
    } finally {
      setLoading(false);
    }
  }

  async function executeRescue(sim: RescueSimulation, idx: number) {
    if (!walletAddress) return;
    setRescuingIdx(idx);
    try {
      const res = await fetch("/api/liquidation-shield/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          position: sim.position,
          rescueUsdc: sim.rescueUsdc,
          mandateTxSig: result?.config.mandateTxSig,
        }),
      });
      const data: RescueResponse = await res.json();
      setRescueResults(prev => ({ ...prev, [idx]: data }));
    } catch (err) {
      setRescueResults(prev => ({
        ...prev,
        [idx]: {
          success: false,
          rescueSig: null, memoSig: null, auditChain: null,
          error: err instanceof Error ? err.message : "救援失敗",
        },
      }));
    } finally {
      setRescuingIdx(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)",
          borderRadius: 20, padding: "4px 12px", marginBottom: 12,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF4444", display: "inline-block", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: "#FF4444", fontWeight: 500, letterSpacing: 1.2, fontFamily: "var(--font-mono)" }}>
            LIQUIDATION SHIELD — ACTIVE MONITORING
          </span>
        </div>
        <h2 style={{
          fontSize: 20, fontWeight: 300, color: "var(--text-primary)",
          fontFamily: "var(--font-heading)", letterSpacing: "0.06em", marginBottom: 8,
        }}>
          🛡️ AI 清算防護盾
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, maxWidth: 560 }}>
          掃描您在 Kamino、MarginFi 的借貸倉位健康因子。
          預授權救援資金後，AI 在健康因子觸發閾值時自動執行救援，防止清算損失。
          SPL Token Approve 硬約束確保 AI 絕不超出您授權的金額。
        </p>
      </div>

      {/* Config Panel */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderTop: "2px solid #FF4444",
        borderRadius: 10, padding: "20px 22px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
          設定救援參數（SPL Token Approve 硬約束）
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>最大救援金額 (USDC)</div>
            <input
              type="number"
              value={maxUsdc}
              onChange={e => setMaxUsdc(e.target.value)}
              min={0}
              style={{
                width: "100%", background: "var(--bg-base)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 12px", fontSize: 13,
                color: "var(--text-primary)", fontFamily: "var(--font-mono)", boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Token program 強制執行此上限</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>觸發健康因子閾值</div>
            <input
              type="number"
              value={triggerHF}
              onChange={e => setTriggerHF(e.target.value)}
              min={1.0} max={2.0} step={0.05}
              style={{
                width: "100%", background: "var(--bg-base)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 12px", fontSize: 13,
                color: "var(--text-primary)", fontFamily: "var(--font-mono)", boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>低於此值觸發自動救援</div>
          </div>
        </div>

        {/* Wallet input */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input
            value={inputAddr}
            onChange={e => setInputAddr(e.target.value)}
            placeholder="Solana 錢包地址 (base58)"
            style={{
              flex: 1, background: "var(--bg-base)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "10px 14px", fontSize: 13,
              color: "var(--text-primary)", fontFamily: "var(--font-mono)", outline: "none",
            }}
            onKeyDown={e => e.key === "Enter" && scan()}
          />
          <button
            onClick={scan}
            disabled={loading}
            style={{
              background: loading ? "var(--border)" : "#FF4444",
              border: "none", borderRadius: 8, padding: "10px 20px",
              fontSize: 13, fontWeight: 500, color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.04em", whiteSpace: "nowrap",
            }}
          >
            {loading ? "掃描中…" : "🔍 掃描倉位"}
          </button>
        </div>
        {walletAddress && walletAddress !== inputAddr && (
          <button
            onClick={() => setInputAddr(walletAddress)}
            style={{ marginTop: 8, fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            ↑ 使用已連接錢包地址
          </button>
        )}
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

      {/* Results */}
      {result && (
        <div>
          {/* Summary bar */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "16px 20px", marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
                POSITION SCAN
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                {result.positions.length === 0
                  ? "未發現借貸倉位"
                  : `${result.positions.length} 個倉位 · ${result.atRisk.length > 0 ? `${result.atRisk.length} 個需關注` : "全部安全"}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                SOL 價格: ${result.solPrice} · 掃描協議: Kamino + MarginFi
              </div>
            </div>
            {result.atRisk.length > 0 && (
              <div style={{
                background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.3)",
                borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#FF4444",
              }}>
                🚨 {result.atRisk.length} 個高風險
              </div>
            )}
          </div>

          {/* Positions */}
          {result.positions.map((pos: LendingPosition, i: number) => {
            const sim = result.rescueSimulations[i];
            const rescueRes = rescueResults[i];

            return (
              <div key={i} style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderLeft: `3px solid ${healthColor(pos.healthFactor)}`,
                borderRadius: 10, padding: "16px 20px", marginBottom: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                      color: PROTOCOL_COLOR[pos.protocol],
                      background: `${PROTOCOL_COLOR[pos.protocol]}18`,
                      border: `1px solid ${PROTOCOL_COLOR[pos.protocol]}35`,
                      borderRadius: 4, padding: "2px 8px", fontFamily: "var(--font-mono)",
                    }}>
                      {pos.protocol.toUpperCase()}
                    </span>
                    {pos.accountAddress && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {pos.accountAddress.slice(0, 12)}…
                      </span>
                    )}
                  </div>
                  <HealthBadge hf={pos.healthFactor} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 12 }}>
                  <MetricBox label="抵押品" value={`$${pos.collateralUsd.toFixed(0)}`} sub={pos.collateralToken} />
                  <MetricBox label="借款" value={`$${pos.debtUsd.toFixed(0)}`} sub={pos.debtToken} />
                  <MetricBox label="健康因子" value={pos.healthFactor.toFixed(3)} highlight={healthColor(pos.healthFactor)} />
                  <MetricBox label="清算閾值 LTV" value={`${(pos.liquidationThreshold * 100).toFixed(0)}%`} />
                </div>

                {/* Rescue simulation (for at-risk positions) */}
                {sim && pos.healthFactor < parseFloat(triggerHF) + 0.1 && (
                  <div style={{
                    background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.2)",
                    borderRadius: 8, padding: "12px 14px", marginBottom: 12,
                  }}>
                    <div style={{ fontSize: 11, color: "#FF4444", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                      RESCUE SIMULATION (simulateTransaction)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      <MetricBox label="需還款" value={`$${sim.rescueUsdc.toFixed(2)} USDC`} highlight="#FF9F0A" />
                      <MetricBox label="救援後 HF" value={sim.postRescueHealth.toFixed(3)} highlight="var(--green)" />
                      <MetricBox label="Gas 費" value={`${(sim.gasSol * 1e6).toFixed(1)} μSOL`} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: sim.withinMandate ? "var(--green)" : "#FF4444" }}>
                      {sim.withinMandate
                        ? `✓ 在預授權範圍內 (上限 $${result.config.approvedUsdc} USDC)`
                        : `✗ 超出預授權上限 $${result.config.approvedUsdc} USDC`}
                    </div>

                    {!rescueRes && sim.withinMandate && (
                      <button
                        onClick={() => executeRescue(sim, i)}
                        disabled={rescuingIdx === i}
                        style={{
                          marginTop: 10, background: rescuingIdx === i ? "var(--border)" : "#FF4444",
                          border: "none", borderRadius: 8, padding: "8px 18px",
                          fontSize: 12, fontWeight: 600, color: "#fff",
                          cursor: rescuingIdx === i ? "not-allowed" : "pointer",
                        }}
                      >
                        {rescuingIdx === i ? "救援執行中…" : "⚡ SAK 執行救援"}
                      </button>
                    )}

                    {rescueRes && (
                      <div style={{
                        marginTop: 10, padding: "10px 12px",
                        background: rescueRes.success ? "rgba(52,199,89,0.1)" : "rgba(255,68,68,0.1)",
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: rescueRes.success ? "var(--green)" : "#FF4444", marginBottom: 6 }}>
                          {rescueRes.success ? "✅ 救援成功" : "⚠️ 救援失敗"}
                        </div>
                        {rescueRes.rescueSig && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            TX: {rescueRes.rescueSig.slice(0, 20)}…
                          </div>
                        )}
                        {rescueRes.auditChain && (
                          <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                            ✦ 審計鏈: {rescueRes.auditChain}
                          </div>
                        )}
                        {rescueRes.error && (
                          <div style={{ fontSize: 12, color: "#FF4444", marginTop: 4 }}>{rescueRes.error}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* AI Analysis */}
          {result.aiAnalysis && (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderTop: "2px solid var(--accent)",
              borderRadius: 10, padding: "18px 20px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", fontFamily: "var(--font-mono)", fontWeight: 600, marginBottom: 12 }}>
                ✦ AI RISK ANALYSIS
              </div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 2.0, whiteSpace: "pre-wrap" }}>
                {result.aiAnalysis}
              </div>
            </div>
          )}

          {/* Empty state */}
          {result.positions.length === 0 && (
            <div style={{
              background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.25)",
              borderRadius: 10, padding: "24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 15, color: "var(--text-primary)", fontWeight: 500, marginBottom: 6 }}>
                此錢包無借貸倉位
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                未在 Kamino 或 MarginFi 發現任何活躍借貸倉位
              </div>
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
          如何運作？
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.85 }}>
          <strong style={{ color: "var(--text-primary)" }}>SPL Token Approve</strong> 設定硬性上限（由 token program 強制執行）→
          AI 用 <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>getProgramAccounts</code> 監控健康因子 →
          觸發時 <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>simulateTransaction</code> 預演救援 →
          SAK <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>lendAsset()</code> 執行還款 →
          Memo Program 寫入鏈上審計記錄（引用授權 TX）。
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ hf }: { hf: number }) {
  return (
    <div style={{
      background: `${healthColor(hf)}18`,
      border: `1px solid ${healthColor(hf)}40`,
      borderRadius: 8, padding: "6px 12px",
      fontSize: 13, fontWeight: 700, color: healthColor(hf),
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <span>{healthLabel(hf)}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{hf.toFixed(3)}</span>
    </div>
  );
}

function MetricBox({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: string
}) {
  return (
    <div style={{ background: "var(--bg-base)", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: highlight ?? "var(--text-primary)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
