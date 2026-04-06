"use client";

import { useState, useEffect, ReactNode } from "react";
import React from "react";

const DAY_VARS: React.CSSProperties = {
  "--bg-base":       "#F2EBE0",
  "--bg-card":       "#EAE0D0",
  "--bg-card-2":     "#E0D4C0",
  "--border":        "#C8B89A",
  "--border-light":  "#B8A880",
  "--text-primary":  "#2A1A10",
  "--text-secondary":"#6B5540",
  "--text-muted":    "#9B8570",
  "--accent-soft":   "rgba(192,57,43,0.08)",
  "--accent-mid":    "rgba(192,57,43,0.18)",
  "--gold":          "#8B6520",
  "--gold-soft":     "rgba(139,101,32,0.10)",
  "--green":         "#2D6040",
  "--green-soft":    "rgba(45,96,64,0.12)",
} as React.CSSProperties;

export default function ThemeWrapper({ children }: { children: ReactNode }) {
  const [isDayMode, setIsDayMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sakura_day_mode");
    if (saved === "1") setIsDayMode(true);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      ...(isDayMode ? DAY_VARS : {}),
    }}>
      {children}
    </div>
  );
}
