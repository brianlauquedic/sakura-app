/**
 * scripts/initialize-mainnet.ts
 *
 * Run ONCE after `deploy-mainnet.sh` lands the program on mainnet.
 * Initializes the IntentProtocol PDA + fee vault ATA. Idempotent —
 * skips if the PDA already exists.
 *
 * Usage:
 *   MAINNET_RPC=https://... npx tsx scripts/initialize-mainnet.ts
 *
 * Prereqs (loaded from ~/.config/solana/mainnet-admin.json):
 *   - Admin keypair funded with ≥ 0.1 SOL (covers rent for PDA + ATA)
 *
 * Post-conditions:
 *   - IntentProtocol PDA exists at deriveProtocolPDA(admin)
 *   - fee_vault ATA exists at deriveFeeVaultPDA(protocol)
 *   - Script prints the addresses you should copy into Vercel env:
 *       NEXT_PUBLIC_INSURANCE_PROGRAM_ID = <program-id>
 *       NEXT_PUBLIC_SAKURA_PROTOCOL_ADMIN = <admin-pubkey>
 *       SAKURA_PROTOCOL_ADMIN             = <admin-pubkey>
 */
/* eslint-disable no-console */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createMint, createAssociatedTokenAccount } from "@solana/spl-token";
import {
  SAKURA_INSURANCE_PROGRAM_ID,
  buildInitializeProtocolIx,
  deriveProtocolPDA,
  deriveFeeVaultPDA,
  fetchProtocol,
} from "../lib/insurance-pool";

const RPC = process.env.MAINNET_RPC ?? "https://api.mainnet-beta.solana.com";
// Mainnet USDC mint — real deployments should use this, not a test mint.
const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

function solscan(kind: "tx" | "account", id: string) {
  return `https://solscan.io/${kind}/${id}`;
}

async function main() {
  const conn = new Connection(RPC, "confirmed");

  const adminKpPath = path.join(
    os.homedir(),
    ".config/solana/mainnet-admin.json"
  );
  if (!fs.existsSync(adminKpPath)) {
    throw new Error(`admin keypair not found at ${adminKpPath}`);
  }
  const admin = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(adminKpPath, "utf8")))
  );

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Sakura Mainnet Initialize");
  console.log("  Program :", SAKURA_INSURANCE_PROGRAM_ID.toBase58());
  console.log("  Admin   :", admin.publicKey.toBase58());
  console.log("  RPC     :", RPC);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Idempotent check
  const { state: existing } = await fetchProtocol(conn, admin.publicKey);
  if (existing) {
    const [pda] = deriveProtocolPDA(admin.publicKey);
    console.log("\n✓ Protocol already initialized — nothing to do.");
    console.log("  PDA   :", pda.toBase58());
    console.log("  stats :", {
      intents_signed: existing.totalIntentsSigned.toString(),
      actions_executed: existing.totalActionsExecuted.toString(),
    });
    printVercelEnv(admin.publicKey);
    return;
  }

  // Decide which USDC mint to use. On mainnet, ALWAYS use the real one.
  // The deploy script warns if this is not the mainnet RPC.
  const usdcMint = USDC_MINT_MAINNET;
  console.log("  USDC  :", usdcMint.toBase58(), "(mainnet)");

  // Platform treasury ATA (under admin) — receives the platform fee cut.
  let treasuryAta: PublicKey;
  try {
    treasuryAta = await createAssociatedTokenAccount(
      conn,
      admin,
      usdcMint,
      admin.publicKey
    );
    console.log("  treasury ATA created:", treasuryAta.toBase58());
  } catch (e: unknown) {
    // Might already exist — derive and move on.
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    treasuryAta = getAssociatedTokenAddressSync(usdcMint, admin.publicKey);
    console.log(
      "  treasury ATA already exists:",
      treasuryAta.toBase58(),
      "(",
      e instanceof Error ? e.message : String(e),
      ")"
    );
  }

  const initIx = buildInitializeProtocolIx({
    admin: admin.publicKey,
    usdcMint,
    platformTreasury: treasuryAta,
    executionFeeBps: 10, // 0.1% per execution
    platformFeeBps: 1500, // 15% of the exec fee goes to treasury
  });

  console.log("\nSubmitting initialize_protocol…");
  const sig = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(initIx),
    [admin],
    { commitment: "confirmed" }
  );
  console.log("✓ initialize_protocol:", solscan("tx", sig));

  const [protocolPda] = deriveProtocolPDA(admin.publicKey);
  const [feeVault] = deriveFeeVaultPDA(protocolPda);
  console.log("\n── PDAs ──");
  console.log("  Protocol  :", protocolPda.toBase58());
  console.log("  Fee Vault :", feeVault.toBase58());
  console.log("  Treasury  :", treasuryAta.toBase58());

  printVercelEnv(admin.publicKey);
}

function printVercelEnv(adminPubkey: PublicKey) {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Copy these into your Vercel project env (Production):");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  NEXT_PUBLIC_INSURANCE_PROGRAM_ID = ${SAKURA_INSURANCE_PROGRAM_ID.toBase58()}`);
  console.log(`  NEXT_PUBLIC_SAKURA_PROTOCOL_ADMIN = ${adminPubkey.toBase58()}`);
  console.log(`  SAKURA_PROTOCOL_ADMIN             = ${adminPubkey.toBase58()}`);
  console.log(`  NEXT_PUBLIC_SOLANA_RPC            = https://api.mainnet-beta.solana.com`);
  console.log("\nThen: `vercel --prod` (or promote the preview once env is set).");
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
