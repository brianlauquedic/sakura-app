/**
 * Solana Actions — `actions.json` manifest.
 *
 * Wallets (Phantom, Backpack, Solflare, etc.) discover Blinks on this
 * domain by fetching `https://<domain>/actions.json`. The `rules` array
 * tells the wallet which URLs host Action endpoints and how to map
 * human-friendly paths to API routes.
 *
 * Spec: https://solana.com/docs/advanced/actions#actionsjson
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      rules: [
        // Pretty-url → API route mapping. Users can share
        // https://sakura.xyz/blink/sign-intent?... and the wallet
        // will fetch from /api/actions/sign-intent.
        { pathPattern: "/blink/sign-intent", apiPath: "/api/actions/sign-intent" },
        { pathPattern: "/blink/sign-intent/**", apiPath: "/api/actions/sign-intent/**" },

        // Expose API endpoints directly for Blink dialogue inspectors.
        { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
      ],
    },
    {
      headers: {
        // CORS — wallets fetch actions.json cross-origin.
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        // Cache 5 min — wallet discovery; rarely changes.
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
