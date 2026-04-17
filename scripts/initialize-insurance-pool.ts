/**
 * scripts/initialize-insurance-pool.ts
 *
 * One-shot bootstrap for the Sakura Mutual Insurance Pool (v0.2) on devnet.
 *
 * Usage:
 *   npx tsx scripts/initialize-insurance-pool.ts
 *
 * Required env (.env.local):
 *   NEXT_PUBLIC_INSURANCE_PROGRAM_ID       — the deployed program id
 *   SAKURA_INSURANCE_ADMIN_PUBKEY          — the pool admin wallet (deploy authority)
 *   SAKURA_AGENT_PRIVATE_KEY               — used as admin_agent (legacy-path signer)
 *   SAKURA_PLATFORM_TREASURY_ATA           — USDC ATA that receives platform_fee_bps
 *                                            share of every premium (create this
 *                                            manually via `spl-token create-account`
 *                                            with the fee-collector wallet)
 *
 * The admin signs via ~/.config/solana/id.json (solana CLI default keypair).
 */

import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import {
  buildInitializePoolIx,
  derivePoolPDA,
  deriveVaultPDA,
  deserializePool,
  USDC_MINT_DEVNET,
  SAKURA_INSURANCE_PROGRAM_ID,
  microToUsdc,
} from "../lib/insurance-pool";

const DEVNET_RPC = process.env.HELIUS_API_KEY
  ? `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : "https://api.devnet.solana.com";

// Pool parameters (v0.2 Mutual). Tuned for the hackathon demo — these are
// hard-coded rather than env-driven to keep the bootstrap deterministic.
const PREMIUM_BPS = 500;                                   // 5% monthly of coverage_cap
const PLATFORM_FEE_BPS = 1500;                             // 15% of premium → treasury
const MIN_STAKE_MULTIPLIER = 500;                          // stake ≥ 5× premium
const MAX_COVERAGE_PER_USER_USDC = 10_000n * 1_000_000n;   // $10k cap per user (micro)
const WAITING_PERIOD_SEC = 60n * 60n;                      // 1 hour anti-JIT buy

async function main() {
  // 1. Load admin keypair from solana CLI default path
  const adminKpPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(adminKpPath)) {
    console.error(`❌ admin keypair not found at ${adminKpPath}`);
    process.exit(1);
  }
  const adminSecret = new Uint8Array(
    JSON.parse(fs.readFileSync(adminKpPath, "utf8"))
  );
  const admin = Keypair.fromSecretKey(adminSecret);

  const expectedAdmin = process.env.SAKURA_INSURANCE_ADMIN_PUBKEY?.trim();
  if (expectedAdmin && admin.publicKey.toBase58() !== expectedAdmin) {
    console.error(
      `❌ admin mismatch: solana CLI keypair is ${admin.publicKey.toBase58()} ` +
        `but SAKURA_INSURANCE_ADMIN_PUBKEY=${expectedAdmin}`
    );
    process.exit(1);
  }

  // 2. Derive admin_agent from SAKURA_AGENT_PRIVATE_KEY (legacy path)
  const agentSecretRaw = process.env.SAKURA_AGENT_PRIVATE_KEY?.trim();
  if (!agentSecretRaw) {
    console.error("❌ SAKURA_AGENT_PRIVATE_KEY missing from .env.local");
    process.exit(1);
  }
  const agentSecret = new Uint8Array(JSON.parse(agentSecretRaw));
  const adminAgent = Keypair.fromSecretKey(agentSecret);

  // 3. Read platform treasury ATA (must be pre-created)
  const treasuryStr = process.env.SAKURA_PLATFORM_TREASURY_ATA?.trim();
  if (!treasuryStr) {
    console.error(
      "❌ SAKURA_PLATFORM_TREASURY_ATA missing from .env.local\n" +
      "   Create a USDC ATA for the platform-fee collector first:\n" +
      `     spl-token create-account ${USDC_MINT_DEVNET.toBase58()} --owner <fee-wallet>`
    );
    process.exit(1);
  }
  const platformTreasury = new PublicKey(treasuryStr);

  console.log("Sakura Mutual Pool bootstrap (v0.2)");
  console.log("  program id          :", SAKURA_INSURANCE_PROGRAM_ID.toBase58());
  console.log("  admin               :", admin.publicKey.toBase58());
  console.log("  admin_agent         :", adminAgent.publicKey.toBase58());
  console.log("  platform_treasury   :", platformTreasury.toBase58());
  console.log("  usdc mint           :", USDC_MINT_DEVNET.toBase58(), "(devnet test)");
  console.log("  premium_bps         :", PREMIUM_BPS, "(monthly)");
  console.log("  platform_fee_bps    :", PLATFORM_FEE_BPS);
  console.log("  min_stake_multiplier:", MIN_STAKE_MULTIPLIER, `(≥ ${MIN_STAKE_MULTIPLIER / 100}× premium)`);
  console.log("  max_coverage/user   :", microToUsdc(MAX_COVERAGE_PER_USER_USDC), "USDC");
  console.log("  waiting_period      :", Number(WAITING_PERIOD_SEC), "sec");

  const [poolPda] = derivePoolPDA(admin.publicKey);
  const [vaultPda] = deriveVaultPDA(poolPda);
  console.log("  pool PDA            :", poolPda.toBase58());
  console.log("  vault PDA           :", vaultPda.toBase58());

  const conn = new Connection(DEVNET_RPC, "confirmed");

  // 4. Check if pool already exists (idempotent)
  const existing = await conn.getAccountInfo(poolPda);
  if (existing && existing.data.length > 0) {
    const pool = deserializePool(existing.data);
    if (pool) {
      console.log("\n✅ pool already initialized:");
      console.log("   total_stakes         :", pool.totalStakes.toString());
      console.log("   coverage_outstanding :", pool.coverageOutstanding.toString());
      console.log("   total_claims_paid    :", pool.totalClaimsPaid.toString());
      console.log("   paused               :", pool.paused);
      console.log("   premium_bps          :", pool.premiumBps);
      console.log("   platform_fee_bps     :", pool.platformFeeBps);
      console.log("   min_stake_multiplier :", pool.minStakeMultiplier);
      console.log("   max_coverage/user    :", microToUsdc(pool.maxCoveragePerUserUsdc), "USDC");
      console.log("   waiting_period       :", Number(pool.waitingPeriodSec), "sec");
      console.log("\n(Skipping initialize_pool — already done.)");
      return;
    }
    console.error(
      "❌ pool PDA exists with non-deserializable data — this is likely " +
      "a v0.1 pool. Migrate by closing + reinitializing, or pick a new admin."
    );
    process.exit(1);
  }

  // 5. Build + send initialize_pool tx
  const ix = buildInitializePoolIx({
    admin: admin.publicKey,
    adminAgent: adminAgent.publicKey,
    usdcMint: USDC_MINT_DEVNET,
    platformTreasury,
    premiumBps: PREMIUM_BPS,
    platformFeeBps: PLATFORM_FEE_BPS,
    minStakeMultiplier: MIN_STAKE_MULTIPLIER,
    maxCoveragePerUserUsdc: MAX_COVERAGE_PER_USER_USDC,
    waitingPeriodSec: WAITING_PERIOD_SEC,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = admin.publicKey;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  console.log("\nSending initialize_pool...");
  const sig = await sendAndConfirmTransaction(conn, tx, [admin], {
    commitment: "confirmed",
  });
  console.log("✅ success!");
  console.log("   signature:", sig);
  console.log(
    `   explorer : https://explorer.solana.com/tx/${sig}?cluster=devnet`
  );

  // 6. Verify state
  const after = await conn.getAccountInfo(poolPda);
  if (after) {
    const pool = deserializePool(after.data);
    if (pool) {
      console.log("\n--- on-chain pool state ---");
      console.log("   admin                :", pool.admin.toBase58());
      console.log("   admin_agent          :", pool.adminAgent.toBase58());
      console.log("   platform_treasury    :", pool.platformTreasury.toBase58());
      console.log("   usdc_mint            :", pool.usdcMint.toBase58());
      console.log("   usdc_vault           :", pool.usdcVault.toBase58());
      console.log("   total_stakes         :", pool.totalStakes.toString());
      console.log("   premium_bps          :", pool.premiumBps);
      console.log("   platform_fee_bps     :", pool.platformFeeBps);
      console.log("   min_stake_multiplier :", pool.minStakeMultiplier);
      console.log("   max_coverage/user    :", microToUsdc(pool.maxCoveragePerUserUsdc), "USDC");
      console.log("   waiting_period       :", Number(pool.waitingPeriodSec), "sec");
      console.log("   coverage_outstanding :", pool.coverageOutstanding.toString());
      console.log("   paused               :", pool.paused);
      console.log("   bump                 :", pool.bump);
    }
  }
}

main().catch((err) => {
  console.error("❌ initialize failed:", err);
  process.exit(1);
});
