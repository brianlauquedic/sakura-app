"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

const TIME_COLORS = [
  { from: 4,  to: 6,  bg: "#120A0D", accent: "#8B3040", name: "暁", label: "Dawn"      },
  { from: 6,  to: 9,  bg: "#0A0B12", accent: "#3A5C8B", name: "朝", label: "Morning"   },
  { from: 9,  to: 12, bg: "#0C0D0A", accent: "#4A7A55", name: "昼", label: "Noon"      },
  { from: 12, to: 15, bg: "#0E0C09", accent: "#8B7020", name: "午", label: "Afternoon" },
  { from: 15, to: 18, bg: "#130A08", accent: "#9B3520", name: "夕", label: "Dusk"      },
  { from: 18, to: 21, bg: "#09090F", accent: "#4A3A8B", name: "宵", label: "Evening"   },
  { from: 21, to: 24, bg: "#080810", accent: "#2A2050", name: "夜", label: "Night"     },
  { from: 0,  to: 4,  bg: "#0A0808", accent: "#3A1A20", name: "深夜", label: "Midnight" },
];

export function getTimeColor() {
  const h = new Date().getHours();
  return TIME_COLORS.find(c => h >= c.from && h < c.to) ?? TIME_COLORS[6];
}

export interface TimeBg { bg: string; accent: string; name: string; label: string; }

const DAY_VARS: React.CSSProperties = {
  "--bg-base":        "#F2EBE0",
  "--bg-card":        "#EAE0D0",
  "--bg-card-2":      "#E0D4C0",
  "--bg-header":      "rgba(242,235,224,0.95)",
  "--border":         "#C8B89A",
  "--border-light":   "#B8A880",
  "--text-primary":   "#2A1A10",
  "--text-secondary": "#6B5540",
  "--text-muted":     "#9B8570",
  "--accent-soft":    "rgba(192,57,43,0.08)",
  "--accent-mid":     "rgba(192,57,43,0.18)",
  "--gold":           "#8B6520",
  "--gold-soft":      "rgba(139,101,32,0.10)",
  "--green":          "#2D6040",
  "--green-soft":     "rgba(45,96,64,0.12)",
} as React.CSSProperties;

interface ThemeCtx {
  isDayMode: boolean;
  toggleDayMode: () => void;
  timeBg: TimeBg;
  dayVars: React.CSSProperties;
}

const ThemeContext = createContext<ThemeCtx>({
  isDayMode: false,
  toggleDayMode: () => {},
  timeBg: TIME_COLORS[6],
  dayVars: {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // v0.3 decision: dark-only. Top Solana hackathon winners (Drift,
  // TAPEDRIVE, Seer, Corbits) and all premium infrastructure brands
  // (Vercel, Linear, Stripe Docs, Phantom landing) ship dark-only.
  // The day-mode toggle was a feature that halved our design effort
  // and degraded contrast in both modes. Removed.
  const isDayMode = false;
  const [timeBg, setTimeBg] = useState<TimeBg>(getTimeColor());

  // Legacy dark-only forced `body.background = "#0E0C0A"` here, which
  // clobbered the 和紙 washi cream theme from globals.css. Removed —
  // body now correctly inherits --bg-base (#EDE4D3).

  useEffect(() => {
    const tick = () => setTimeBg(getTimeColor());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Toggle is a no-op kept for backward compatibility with AppNav
  // which still reads this. UI button will be hidden in AppNav.
  const toggleDayMode = () => {};
  const dayVars: React.CSSProperties = {};

  return (
    <ThemeContext.Provider value={{ isDayMode, toggleDayMode, timeBg, dayVars }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
