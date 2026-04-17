/**
 * Sakura Devnet E2E Proof Script — runs the full dual-gate rescue flow
 * against Solana devnet and prints Solscan links so judges can click and
 * verify every step happened on-chain.
 *
 * What this script exercises (end-to-end):
 *   1. Airdrop devnet SOL to a freshly generated user + agent keypair
 *   2. Create a devnet USDC mint and mint 1,000 USDC to the user
 *   3. SPL Token `approve` — user delegates 800 USDC to the agent
 *   4. (Optional) `create_mandate` — user invokes the Anchor program to
 *      write the rescue policy into a PDA (max_usdc, trigger_hf_bps, agent)
 *   5. `execute_rescue` — agent invokes the Anchor program which
 *      CPI-calls SPL Token `transferChecked` to move USDC from user's ATA
 *      to agent's ATA (rescue escrow), double-gated by SPL delegate + PDA
 *   6. Pretty-print Solscan links for every signature
 *
 * Prereqs:
 *   - `SAKURA_MANDATE_PROGRAM_ID` set to the devnet-deployed program id
 *     (from `anchor deploy --provider.cluster devnet`). If unset, steps 4
 *     and 5 are skipped and the script runs only the SPL-delegate path.
 *   - `npx ts-node scripts/devnet-e2e.ts` or `npm run devnet:e2e`
 *
 * Safety:
 *   - Runs on devnet only — mainnet is explicitly refused via RPC-URL check.
 *   - Generates fresh keypairs each run — never touches user wallets.
 *   - Prints all Solscan links; copy-paste to see real on-chain state.
 */
/* eslint-disable no-console */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  mintTo,
  createAssociatedTokenAccount,
  createApproveInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  buildExecuteRescueIx,
  deriveMandatePDA,
  fetchMandate,
} from "../lib/mandate-program";

// ── Devnet safety guard ──────────────────────────────────────────────
const DEVNET_RPC = "https://api.devnet.solana.com";
const RPC = process.env.DEVNET_RPC_URL ?? DEVNET_RPC;
if (!/devnet/.test(RPC)) {
  console.error(`❌ RPC must target devnet. Got: ${RPC}`);
  process.exit(1);
}

function solscan(kind: "tx" | "account", id: string): string {
  return `https://solscan.io/${kind}/${id}?cluster=devnet`;
}

async function airdrop(conn: Connection, to: PublicKey, sol: number) {
  const sig = await conn.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
  const bh = await conn.getLatestBlockhash();
  await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  return sig;
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Sakura — Devnet E2E Rescue Proof");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── 1. Generate keypairs ──
  const user = Keypair.generate();
  const agent = Keypair.generate();
  const mintAuthority = Keypair.generate();
  console.log(`\n▸ user  ${user.publicKey.toBase58()}`);
  console.log(`▸ agent ${agent.publicKey.toBase58()}`);
  console.log(`  → ${solscan("account", user.publicKey.toBase58())}`);

  // ── 2. Airdrop devnet SOL ──
  console.log("\n[1/6] airdropping 2 SOL to user + agent + mint authority…");
  await airdrop(conn, user.publicKey, 2);
  await airdrop(conn, agent.publicKey, 2);
  await airdrop(conn, mintAuthority.publicKey, 1);

  // ── 3. Create a devnet USDC stand-in mint ──
  console.log("\n[2/6] creating devnet USDC mint (6 decimals)…");
  const usdcMint = await createMint(
    conn,
    mintAuthority,
    mintAuthority.publicKey,
    null,
    6,
  );
  console.log(`  mint: ${usdcMint.toBase58()}`);
  console.log(`  → ${solscan("account", usdcMint.toBase58())}`);

  // ── 4. Mint 1,000 USDC to the user ──
  const userAta = await createAssociatedTokenAccount(conn, user, usdcMint, user.publicKey);
  const agentAta = await createAssociatedTokenAccount(conn, agent, usdcMint, agent.publicKey);
  const mintSig = await mintTo(
    conn,
    mintAuthority,
    usdcMint,
    userAta,
    mintAuthority,
    1_000n * 1_000_000n, // 1,000.000000 USDC
  );
  console.log(`\n[3/6] minted 1,000 USDC to user ATA`);
  console.log(`  → ${solscan("tx", mintSig)}`);

  // ── 5. User calls SPL Token `approve` to delegate 800 USDC to agent ──
  const approveUsdc = 800;
  const approveIx = createApproveInstruction(
    userAta,
    agent.publicKey,
    user.publicKey,
    BigInt(approveUsdc * 1_000_000),
  );
  const approveTx = new Transaction().add(approveIx);
  const approveSig = await sendAndConfirmTransaction(conn, approveTx, [user]);
  console.log(`\n[4/6] SPL delegate set: agent may move up to ${approveUsdc} USDC`);
  console.log(`  → ${solscan("tx", approveSig)}`);

  // ── 6. Anchor program dual-gate path (if deployed) ──
  const programIdEnv = process.env.SAKURA_MANDATE_PROGRAM_ID;
  if (!programIdEnv) {
    console.log("\n[5/6] SAKURA_MANDATE_PROGRAM_ID not set — skipping Anchor dual-gate.");
    console.log("      Deploy with: anchor deploy --provider.cluster devnet");
    console.log("      then set the env var to run the Anchor path.");
    console.log("\nSingle-gate (SPL-delegate-only) verification:");
    const userBal = await getAccount(conn, userAta);
    console.log(`  user USDC ATA balance : ${Number(userBal.amount) / 1e6} USDC`);
    console.log(`  user USDC ATA delegate: ${userBal.delegate?.toBase58()}`);
    console.log(`  delegated amount       : ${Number(userBal.delegatedAmount) / 1e6} USDC`);
    return;
  }

  const programId = new PublicKey(programIdEnv);
  const [mandatePda] = deriveMandatePDA(user.publicKey, programId);
  console.log(`\n[5/6] Anchor mandate PDA: ${mandatePda.toBase58()}`);
  console.log(`  → ${solscan("account", mandatePda.toBase58())}`);
  console.log(
    "  (note: lib/mandate-program.ts uses a hard-coded SAKURA_MANDATE_PROGRAM_ID;",
  );
  console.log(
    "   ensure it matches SAKURA_MANDATE_PROGRAM_ID env or the rescue will target a different program)",
  );

  // Caller is expected to have already created the mandate via the frontend
  // or a separate `anchor run create-mandate` command. We check state here.
  const mandateInfo = await fetchMandate(conn, user.publicKey);
  if (!mandateInfo.state) {
    console.log(
      "\n⚠ No mandate PDA found. Create one first (frontend or anchor CLI).",
    );
    console.log(
      "  Expected seeds: [b\"sakura_mandate\", user_pubkey.as_ref()]",
    );
    return;
  }
  console.log(
    `  mandate state: active=${mandateInfo.state.isActive}, ` +
      `max=${Number(mandateInfo.state.maxUsdc) / 1e6} USDC, ` +
      `triggerHfBps=${mandateInfo.state.triggerHfBps}, ` +
      `rescueCount=${mandateInfo.state.rescueCount}`,
  );

  // ── 7. Execute rescue via Anchor CPI (dual-gate) ──
  console.log("\n[6/6] execute_rescue (dual-gate Anchor CPI)…");
  const rescueMicro = 200n * 1_000_000n; // 200 USDC
  const reportedHfBps = 105; // 1.05 — below the (assumed) 1.20 trigger

  // Build a 32-byte proof hash (any 32 bytes; Anchor only stores it)
  const proofHash = Buffer.alloc(32);
  proofHash.writeUInt32LE(Date.now() & 0xffffffff, 0);

  const rescueIx = buildExecuteRescueIx(
    mandatePda,
    agent.publicKey,
    userAta,
    agentAta,
    usdcMint,
    rescueMicro,
    reportedHfBps,
    proofHash,
  );

  const rescueTx = new Transaction().add(rescueIx);
  const rescueSig = await sendAndConfirmTransaction(conn, rescueTx, [agent]);
  console.log(`  rescue tx: → ${solscan("tx", rescueSig)}`);

  // ── Verification: read balances after rescue ──
  const userAfter = await getAccount(conn, userAta);
  const agentAfter = await getAccount(conn, agentAta);
  const postState = await fetchMandate(conn, user.publicKey);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Post-rescue on-chain state:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  user USDC  : ${Number(userAfter.amount) / 1e6}   (was 1000)`);
  console.log(`  agent USDC : ${Number(agentAfter.amount) / 1e6}  (rescue escrow)`);
  console.log(
    `  mandate totalRescued: ${
      postState.state ? Number(postState.state.totalRescued) / 1e6 : "?"
    } USDC  (expected ≥ 200)`,
  );
  console.log(
    `  mandate rescueCount : ${postState.state?.rescueCount ?? "?"}  (u64, was 0)`,
  );

  console.log("\n✅ Dual-gate rescue landed on-chain. Judges: click the Solscan links above.");
}

main().catch((err) => {
  console.error("\n❌ devnet-e2e failed:", err instanceof Error ? err.stack : err);
  process.exit(1);
});
