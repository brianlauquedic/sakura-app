/**
 * Fund a devnet wallet (Phantom / OKX / any) with 2 SOL + 100 test USDC
 * so it can sign intents against the Sakura devnet deployment.
 *
 * Usage:
 *   npx tsx scripts/fund-devnet-wallet.ts <solana-pubkey>
 *
 * Example:
 *   npx tsx scripts/fund-devnet-wallet.ts 9aBcDeFg...
 *
 * Requires:
 *   · ~/.config/solana/id.json  is the admin keypair (the USDC mint
 *     authority). If your admin keypair lives elsewhere, set
 *     ANCHOR_WALLET to point at it before running.
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import { homedir } from "os";

const USDC_MINT = new PublicKey(
  "7rEhvYrGGT41FQrCt3zNx8Bko9TFVvytYWpP1mqhtLi3"
); // Sakura devnet test USDC
const SOL_AIRDROP = 2 * LAMPORTS_PER_SOL;
const USDC_AMOUNT_MICRO = 100_000_000n; // 100 USDC (6 decimals)
const DEVNET_RPC =
  process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com";

(async () => {
  const targetArg = process.argv[2];
  if (!targetArg) {
    console.error(
      "Usage: npx tsx scripts/fund-devnet-wallet.ts <solana-pubkey>\n" +
      "Example: npx tsx scripts/fund-devnet-wallet.ts 9aBcDeFg..."
    );
    process.exit(1);
  }
  let target: PublicKey;
  try {
    target = new PublicKey(targetArg);
  } catch {
    console.error(`Not a valid Solana pubkey: ${targetArg}`);
    process.exit(1);
  }

  const conn = new Connection(DEVNET_RPC, "confirmed");

  const walletPath =
    process.env.ANCHOR_WALLET ?? `${homedir()}/.config/solana/id.json`;
  const admin = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf8")))
  );

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Funding devnet wallet: ${target.toBase58()}`);
  console.log(`  RPC: ${DEVNET_RPC}`);
  console.log(`  Admin (USDC authority): ${admin.publicKey.toBase58()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // ── 1. Airdrop SOL ─────────────────────────────────────────
  console.log(`[1/2] Airdropping ${SOL_AIRDROP / LAMPORTS_PER_SOL} SOL…`);
  try {
    const sig = await conn.requestAirdrop(target, SOL_AIRDROP);
    await conn.confirmTransaction(sig, "confirmed");
    const bal = await conn.getBalance(target, "confirmed");
    console.log(
      `  ✓ sig: ${sig}\n  target SOL balance: ${bal / LAMPORTS_PER_SOL}\n`
    );
  } catch (e) {
    console.log(
      `  ⚠ airdrop failed (RPC rate limit?). Try again in a few minutes ` +
      `or use https://faucet.solana.com/ manually.\n  error: ${
        (e as Error).message
      }\n`
    );
  }

  // ── 2. Mint 100 test USDC to target's ATA ──────────────────
  console.log(`[2/2] Minting 100 USDC to target's ATA…`);
  const ata = await getOrCreateAssociatedTokenAccount(
    conn,
    admin,
    USDC_MINT,
    target
  );
  console.log(`  ATA: ${ata.address.toBase58()}`);

  const sig = await mintTo(
    conn,
    admin,
    USDC_MINT,
    ata.address,
    admin,
    Number(USDC_AMOUNT_MICRO)
  );
  const post = await getAccount(conn, ata.address, "confirmed");
  console.log(
    `  ✓ sig: ${sig}\n  target USDC balance: ${Number(post.amount) / 1e6} USDC`
  );

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ Done. In Phantom on devnet, you should now see:`);
  console.log(`     · ${SOL_AIRDROP / LAMPORTS_PER_SOL} SOL`);
  console.log(`     · 100 USDC (mint ${USDC_MINT.toBase58()})`);
  console.log(
    `  If Phantom UI shows 0 USDC, it may not auto-display this`
  );
  console.log(`  non-canonical test mint — verify on Solscan:`);
  console.log(
    `    https://solscan.io/account/${ata.address.toBase58()}?cluster=devnet`
  );
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
})().catch((e) => {
  console.error("fund failed:", e);
  process.exit(1);
});
