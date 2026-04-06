"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import AppNav from "@/components/AppNav";

function ThemedShell({ children }: { children: ReactNode }) {
  const { dayVars } = useTheme();
  return (
    <div style={{ minHeight: "100vh", ...dayVars }}>
      <AppNav />
      {children}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <WalletProvider>
        <ThemeProvider>
          <ThemedShell>{children}</ThemedShell>
        </ThemeProvider>
      </WalletProvider>
    </LanguageProvider>
  );
}
