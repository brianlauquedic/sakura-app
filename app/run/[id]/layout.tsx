import type { Metadata } from "next";

// Server component — can export generateMetadata safely
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sakuraaai.com";
  const ogImageUrl = `${siteUrl}/api/og/run/${id}`;

  return {
    title: "Ghost Run · Proof-of-Simulation Report",
    description:
      "Solana DeFi strategy pre-simulated and SHA-256 committed on-chain before execution.",
    openGraph: {
      title: "👻 Ghost Run · Proof-of-Simulation Report",
      description:
        "Solana DeFi strategy pre-simulated. SHA-256 committed on Solana mainnet before any execution.",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Ghost Run · Proof-of-Simulation Report",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "👻 Ghost Run · Proof-of-Simulation Report",
      description:
        "Solana DeFi strategy pre-simulated. SHA-256 committed on Solana mainnet before any execution.",
      images: [ogImageUrl],
      site: "@sakuraaijp",
    },
  };
}

export default function RunLayout({ children }: { children: React.ReactNode }) {
  return children;
}
