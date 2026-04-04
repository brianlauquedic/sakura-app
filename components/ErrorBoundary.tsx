"use client";

import React from "react";

interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackLabel?: string },
  State
> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        background: "rgba(168,41,58,0.08)", border: "1px solid rgba(168,41,58,0.25)",
        borderRadius: 16, padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, color: "#EF4444", marginBottom: 8 }}>
          {this.props.fallbackLabel ?? "加载出错"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
          {this.state.message}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, message: "" })}
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", padding: "8px 20px", borderRadius: 8,
            cursor: "pointer", fontSize: 13,
          }}
        >重试</button>
      </div>
    );
  }
}
