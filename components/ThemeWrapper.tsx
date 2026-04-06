"use client";

import { ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeWrapper({ children }: { children: ReactNode }) {
  const { dayVars } = useTheme();

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      ...dayVars,
    }}>
      {children}
    </div>
  );
}
