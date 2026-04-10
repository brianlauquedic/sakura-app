import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Sakura — Solana の AI セキュリティレイヤー",
  description: "見えない脆弱性を捕捉し、予測できない結果を事前に再現し、逃げ切れない清算を阻止する。",
  openGraph: {
    title: "Sakura — Solana の AI セキュリティレイヤー",
    description: "見えない脆弱性を捕捉し、予測できない結果を事前に再現し、逃げ切れない清算を阻止する。",
    url: "https://www.sakuraaai.com",
    siteName: "Sakura",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sakura — Solana の AI セキュリティレイヤー",
    description: "見えない脆弱性を捕捉し、予測できない結果を事前に再現し、逃げ切れない清算を阻止する。",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500;700&family=Noto+Sans+JP:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
