/**
 * Sakura Rescue Insurance Pool — TypeScript Client
 *
 * Interacts with the on-chain Anchor program `sakura_insurance`
 * (see programs/sakura-insurance/src/lib.rs and the whitepaper at
 * docs/INSURANCE-POOL-WHITEPAPER.md).
 *
 * This module provides:
 *   1. PDA derivation for Pool / LpPosition / Policy / ClaimRecord
 *   2. Anchor instruction builders (typed, zero-dependency on Anchor CLI)
 *   3. On-chain account deserialization (borsh-compatible)
 *
 * Design notes:
 *   - We use raw @solana/web3.js + crypto.sha256 for Anchor discriminators
 *     instead of pulling the whole @coral-xyz/anchor runtime (keeps bundle
 *     small, avoids wallet adapter coupling in server routes).
 *   - Rescue flow chooses insurance-path ONLY when a Policy PDA exists,
 *     is active, and covers the rescue amount. Otherwise the existing
 *     sakura_mandate program (SPL-delegate escrow) handles the rescue.
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Connection,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import crypto from "crypto";

// ── Program ID ──────────────────────────────────────────────────────
// Placeholder pubkey until `anchor deploy` (see declare_id! in lib.rs).
// Override via NEXT_PUBLIC_INSURANCE_PROGRAM_ID env once deployed.
// Placeholder pubkey used until the program is deployed. We use the System
// Program ID (all-ones) as a sentinel — any caller can check equality with
// SystemProgram.programId to detect "not deployed".
export const SAKURA_INSURANCE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INSURANCE_PROGRAM_ID ??
    "11111111111111111111111111111111"
);

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// USDC mints (override in env if running devnet with a test mint)
export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// ── PDA Derivation ──────────────────────────────────────────────────

export function derivePoolPDA(
  admin: PublicKey,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_pool"), admin.toBuffer()],
    programId
  );
}

export function deriveVaultPDA(
  pool: PublicKey,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_vault"), pool.toBuffer()],
    programId
  );
}

export function deriveLpPositionPDA(
  lp: PublicKey,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_lp"), lp.toBuffer()],
    programId
  );
}

export function derivePolicyPDA(
  user: PublicKey,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_policy"), user.toBuffer()],
    programId
  );
}

export function deriveClaimRecordPDA(
  policy: PublicKey,
  claimNonce: bigint,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64LE(claimNonce, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_claim"), policy.toBuffer(), nonceBuf],
    programId
  );
}

// ── Anchor discriminators ───────────────────────────────────────────

function anchorIxDiscriminator(name: string): Buffer {
  return crypto
    .createHash("sha256")
    .update(`global:${name}`)
    .digest()
    .subarray(0, 8) as Buffer;
}

function anchorAccountDiscriminator(name: string): Buffer {
  return crypto
    .createHash("sha256")
    .update(`account:${name}`)
    .digest()
    .subarray(0, 8) as Buffer;
}

const IX_INIT_POOL = anchorIxDiscriminator("initialize_pool");
const IX_ROTATE_AGENT = anchorIxDiscriminator("rotate_admin_agent");
const IX_SET_PAUSED = anchorIxDiscriminator("set_paused");
const IX_LP_DEPOSIT = anchorIxDiscriminator("lp_deposit");
const IX_LP_WITHDRAW = anchorIxDiscriminator("lp_withdraw");
const IX_BUY_POLICY = anchorIxDiscriminator("buy_policy");
const IX_CLOSE_POLICY = anchorIxDiscriminator("close_policy");
const IX_CLAIM_PAYOUT = anchorIxDiscriminator("claim_payout");

const ACCT_POOL = anchorAccountDiscriminator("Pool");
const ACCT_LP = anchorAccountDiscriminator("LpPosition");
const ACCT_POLICY = anchorAccountDiscriminator("Policy");
const ACCT_CLAIM = anchorAccountDiscriminator("ClaimRecord");

// ── Account state types ─────────────────────────────────────────────

export interface PoolState {
  admin: PublicKey;
  adminAgent: PublicKey;
  usdcMint: PublicKey;
  usdcVault: PublicKey;
  totalShares: bigint;
  premiumBps: number;
  minReserveBps: number;
  coverageOutstanding: bigint;
  paused: boolean;
  bump: number;
}

export interface LpPositionState {
  lp: PublicKey;
  shares: bigint;
  depositedAt: bigint;
  bump: number;
}

export interface PolicyState {
  user: PublicKey;
  coverageCapUsdc: bigint;
  premiumPaidMicro: bigint;
  paidThroughUnix: bigint;
  totalClaimed: bigint;
  rescueCount: bigint;
  isActive: boolean;
  bump: number;
}

export interface ClaimRecordState {
  policy: PublicKey;
  amountUsdc: bigint;
  rescueSigHash: Buffer;
  claimNonce: bigint;
  ts: bigint;
  bump: number;
}

// ── Deserializers ───────────────────────────────────────────────────

export function deserializePool(data: Buffer): PoolState | null {
  if (data.length < 8 + 32 + 32 + 32 + 32 + 8 + 2 + 2 + 8 + 1 + 1) return null;
  if (!data.subarray(0, 8).equals(ACCT_POOL)) return null;

  let o = 8;
  const admin = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const adminAgent = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const usdcMint = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const usdcVault = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const totalShares = data.readBigUInt64LE(o); o += 8;
  const premiumBps = data.readUInt16LE(o); o += 2;
  const minReserveBps = data.readUInt16LE(o); o += 2;
  const coverageOutstanding = data.readBigUInt64LE(o); o += 8;
  const paused = data.readUInt8(o) === 1; o += 1;
  const bump = data.readUInt8(o);

  return {
    admin, adminAgent, usdcMint, usdcVault, totalShares,
    premiumBps, minReserveBps, coverageOutstanding, paused, bump,
  };
}

export function deserializeLpPosition(data: Buffer): LpPositionState | null {
  if (data.length < 8 + 32 + 8 + 8 + 1) return null;
  if (!data.subarray(0, 8).equals(ACCT_LP)) return null;

  let o = 8;
  const lp = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const shares = data.readBigUInt64LE(o); o += 8;
  const depositedAt = data.readBigInt64LE(o); o += 8;
  const bump = data.readUInt8(o);

  return { lp, shares, depositedAt, bump };
}

export function deserializePolicy(data: Buffer): PolicyState | null {
  if (data.length < 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1) return null;
  if (!data.subarray(0, 8).equals(ACCT_POLICY)) return null;

  let o = 8;
  const user = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const coverageCapUsdc = data.readBigUInt64LE(o); o += 8;
  const premiumPaidMicro = data.readBigUInt64LE(o); o += 8;
  const paidThroughUnix = data.readBigInt64LE(o); o += 8;
  const totalClaimed = data.readBigUInt64LE(o); o += 8;
  const rescueCount = data.readBigUInt64LE(o); o += 8;
  const isActive = data.readUInt8(o) === 1; o += 1;
  const bump = data.readUInt8(o);

  return {
    user, coverageCapUsdc, premiumPaidMicro, paidThroughUnix,
    totalClaimed, rescueCount, isActive, bump,
  };
}

export function deserializeClaimRecord(data: Buffer): ClaimRecordState | null {
  if (data.length < 8 + 32 + 8 + 32 + 8 + 8 + 1) return null;
  if (!data.subarray(0, 8).equals(ACCT_CLAIM)) return null;

  let o = 8;
  const policy = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const amountUsdc = data.readBigUInt64LE(o); o += 8;
  const rescueSigHash = Buffer.from(data.subarray(o, o + 32)); o += 32;
  const claimNonce = data.readBigUInt64LE(o); o += 8;
  const ts = data.readBigInt64LE(o); o += 8;
  const bump = data.readUInt8(o);

  return { policy, amountUsdc, rescueSigHash, claimNonce, ts, bump };
}

// ── On-chain fetch helpers ──────────────────────────────────────────

export async function fetchPool(
  connection: Connection,
  admin: PublicKey
): Promise<{ pda: PublicKey; state: PoolState | null }> {
  const [pda] = derivePoolPDA(admin);
  const info = await connection.getAccountInfo(pda);
  if (!info) return { pda, state: null };
  return { pda, state: deserializePool(Buffer.from(info.data)) };
}

export async function fetchPolicy(
  connection: Connection,
  user: PublicKey
): Promise<{ pda: PublicKey; state: PolicyState | null }> {
  const [pda] = derivePolicyPDA(user);
  const info = await connection.getAccountInfo(pda);
  if (!info) return { pda, state: null };
  return { pda, state: deserializePolicy(Buffer.from(info.data)) };
}

export async function fetchLpPosition(
  connection: Connection,
  lp: PublicKey
): Promise<{ pda: PublicKey; state: LpPositionState | null }> {
  const [pda] = deriveLpPositionPDA(lp);
  const info = await connection.getAccountInfo(pda);
  if (!info) return { pda, state: null };
  return { pda, state: deserializeLpPosition(Buffer.from(info.data)) };
}

// ── Instruction builders ────────────────────────────────────────────

/**
 * initialize_pool: admin creates the pool PDA + vault token account.
 *   args: premium_bps (u16), min_reserve_bps (u16)
 */
export function buildInitializePoolIx(params: {
  admin: PublicKey;
  adminAgent: PublicKey;
  usdcMint: PublicKey;
  premiumBps: number;
  minReserveBps: number;
}): TransactionInstruction {
  const { admin, adminAgent, usdcMint, premiumBps, minReserveBps } = params;
  const [pool] = derivePoolPDA(admin);
  const [vault] = deriveVaultPDA(pool);

  const data = Buffer.alloc(8 + 2 + 2);
  IX_INIT_POOL.copy(data, 0);
  data.writeUInt16LE(premiumBps, 8);
  data.writeUInt16LE(minReserveBps, 10);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: adminAgent, isSigner: false, isWritable: false },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** rotate_admin_agent: admin updates who may sign claim_payout. */
export function buildRotateAdminAgentIx(params: {
  admin: PublicKey;
  newAgent: PublicKey;
}): TransactionInstruction {
  const [pool] = derivePoolPDA(params.admin);
  const data = Buffer.alloc(8 + 32);
  IX_ROTATE_AGENT.copy(data, 0);
  params.newAgent.toBuffer().copy(data, 8);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: params.admin, isSigner: true, isWritable: false },
    ],
    data,
  });
}

/** set_paused: admin pauses / unpauses the pool (LP withdraw stays open). */
export function buildSetPausedIx(params: {
  admin: PublicKey;
  paused: boolean;
}): TransactionInstruction {
  const [pool] = derivePoolPDA(params.admin);
  const data = Buffer.alloc(8 + 1);
  IX_SET_PAUSED.copy(data, 0);
  data.writeUInt8(params.paused ? 1 : 0, 8);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: params.admin, isSigner: true, isWritable: false },
    ],
    data,
  });
}

/**
 * lp_deposit: LP deposits USDC, receives pool shares.
 *   args: amount_usdc (u64 micro-USDC)
 */
export function buildLpDepositIx(params: {
  poolAdmin: PublicKey;
  lp: PublicKey;
  lpUsdcAta: PublicKey;
  amountMicroUsdc: bigint;
}): TransactionInstruction {
  const [pool] = derivePoolPDA(params.poolAdmin);
  const [vault] = deriveVaultPDA(pool);
  const [lpPosition] = deriveLpPositionPDA(params.lp);

  const data = Buffer.alloc(8 + 8);
  IX_LP_DEPOSIT.copy(data, 0);
  data.writeBigUInt64LE(params.amountMicroUsdc, 8);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: lpPosition, isSigner: false, isWritable: true },
      { pubkey: params.lp, isSigner: true, isWritable: true },
      { pubkey: params.lpUsdcAta, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** lp_withdraw: LP burns shares, receives pro-rata USDC. */
export function buildLpWithdrawIx(params: {
  poolAdmin: PublicKey;
  lp: PublicKey;
  lpUsdcAta: PublicKey;
  sharesToBurn: bigint;
}): TransactionInstruction {
  const [pool] = derivePoolPDA(params.poolAdmin);
  const [vault] = deriveVaultPDA(pool);
  const [lpPosition] = deriveLpPositionPDA(params.lp);

  const data = Buffer.alloc(8 + 8);
  IX_LP_WITHDRAW.copy(data, 0);
  data.writeBigUInt64LE(params.sharesToBurn, 8);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: lpPosition, isSigner: false, isWritable: true },
      { pubkey: params.lp, isSigner: true, isWritable: false },
      { pubkey: params.lpUsdcAta, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** buy_policy: user pays premium, receives coverage for `coverage_cap`. */
export function buildBuyPolicyIx(params: {
  poolAdmin: PublicKey;
  user: PublicKey;
  userUsdcAta: PublicKey;
  premiumMicroUsdc: bigint;
  coverageCapMicroUsdc: bigint;
}): TransactionInstruction {
  const [pool] = derivePoolPDA(params.poolAdmin);
  const [vault] = deriveVaultPDA(pool);
  const [policy] = derivePolicyPDA(params.user);

  const data = Buffer.alloc(8 + 8 + 8);
  IX_BUY_POLICY.copy(data, 0);
  data.writeBigUInt64LE(params.premiumMicroUsdc, 8);
  data.writeBigUInt64LE(params.coverageCapMicroUsdc, 16);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: params.user, isSigner: true, isWritable: true },
      { pubkey: params.userUsdcAta, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** close_policy: user closes + refunds unused premium. */
export function buildClosePolicyIx(params: {
  poolAdmin: PublicKey;
  user: PublicKey;
  userUsdcAta: PublicKey;
}): TransactionInstruction {
  const [pool] = derivePoolPDA(params.poolAdmin);
  const [vault] = deriveVaultPDA(pool);
  const [policy] = derivePolicyPDA(params.user);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: params.user, isSigner: true, isWritable: false },
      { pubkey: params.userUsdcAta, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: IX_CLOSE_POLICY,
  });
}

/**
 * claim_payout: agent pulls USDC from pool to repay user's rescue.
 *   args: amount_usdc (u64), rescue_sig_hash ([u8;32]), claim_nonce (u64)
 * The claim_nonce must be unique per policy — we recommend using the
 * execution unix-timestamp-in-ms (bounded to u64) to guarantee monotonicity.
 */
export function buildClaimPayoutIx(params: {
  poolAdmin: PublicKey;
  policyUser: PublicKey;
  adminAgent: PublicKey;
  payer: PublicKey;
  rescueDestinationAta: PublicKey;
  amountMicroUsdc: bigint;
  rescueSigHash: Buffer;  // 32 bytes
  claimNonce: bigint;
}): TransactionInstruction {
  if (params.rescueSigHash.length !== 32) {
    throw new Error(
      `rescueSigHash must be exactly 32 bytes, got ${params.rescueSigHash.length}`
    );
  }
  const [pool] = derivePoolPDA(params.poolAdmin);
  const [vault] = deriveVaultPDA(pool);
  const [policy] = derivePolicyPDA(params.policyUser);
  const [claimRecord] = deriveClaimRecordPDA(policy, params.claimNonce);

  const data = Buffer.alloc(8 + 8 + 32 + 8);
  IX_CLAIM_PAYOUT.copy(data, 0);
  data.writeBigUInt64LE(params.amountMicroUsdc, 8);
  params.rescueSigHash.copy(data, 16, 0, 32);
  data.writeBigUInt64LE(params.claimNonce, 48);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: params.adminAgent, isSigner: true, isWritable: false },
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: claimRecord, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: params.rescueDestinationAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ── High-level helpers ──────────────────────────────────────────────

/**
 * Check whether an insurance-backed rescue is available for this user.
 * Returns the Policy PDA + state if and only if:
 *   - A Policy PDA exists for the user
 *   - Policy is active
 *   - `now <= paid_through + 48h grace`
 *   - Remaining coverage (cap - total_claimed) >= rescueAmount
 */
export async function checkInsuranceEligibility(params: {
  connection: Connection;
  user: PublicKey;
  rescueMicroUsdc: bigint;
  nowUnix?: number;
}): Promise<{
  eligible: boolean;
  policyPda: PublicKey;
  policy: PolicyState | null;
  reason?: string;
}> {
  const now = params.nowUnix ?? Math.floor(Date.now() / 1000);
  const { pda, state } = await fetchPolicy(params.connection, params.user);

  if (!state) {
    return { eligible: false, policyPda: pda, policy: null, reason: "no_policy" };
  }
  if (!state.isActive) {
    return { eligible: false, policyPda: pda, policy: state, reason: "inactive" };
  }
  const graceSec = 48n * 3600n;
  if (BigInt(now) > state.paidThroughUnix + graceSec) {
    return { eligible: false, policyPda: pda, policy: state, reason: "lapsed" };
  }
  const remaining = state.coverageCapUsdc - state.totalClaimed;
  if (remaining < params.rescueMicroUsdc) {
    return {
      eligible: false,
      policyPda: pda,
      policy: state,
      reason: "insufficient_coverage",
    };
  }
  return { eligible: true, policyPda: pda, policy: state };
}

// ── Utility ─────────────────────────────────────────────────────────

/** Hash a signature string into the 32-byte `rescue_sig_hash` on-chain field. */
export function hashRescueSig(rescueSig: string): Buffer {
  return crypto.createHash("sha256").update(rescueSig).digest();
}

/** Convert USDC (float) to micro-USDC (6 decimals). */
export function usdcToMicro(usdc: number): bigint {
  return BigInt(Math.ceil(usdc * 1_000_000));
}

/** Convert micro-USDC to USDC float. */
export function microToUsdc(micro: bigint): number {
  return Number(micro) / 1_000_000;
}

/** Pretty-print a PolicyState for API responses. */
export function formatPolicy(state: PolicyState) {
  return {
    user: state.user.toString(),
    coverageCapUsdc: microToUsdc(state.coverageCapUsdc),
    premiumPaidUsdc: microToUsdc(state.premiumPaidMicro),
    paidThrough: new Date(Number(state.paidThroughUnix) * 1000).toISOString(),
    totalClaimedUsdc: microToUsdc(state.totalClaimed),
    remainingCoverageUsdc: microToUsdc(state.coverageCapUsdc - state.totalClaimed),
    rescueCount: Number(state.rescueCount),
    isActive: state.isActive,
  };
}

/** Pretty-print a PoolState for API responses. */
export function formatPool(state: PoolState) {
  return {
    admin: state.admin.toString(),
    adminAgent: state.adminAgent.toString(),
    usdcMint: state.usdcMint.toString(),
    usdcVault: state.usdcVault.toString(),
    totalShares: state.totalShares.toString(),
    premiumBps: state.premiumBps,
    minReserveBps: state.minReserveBps,
    coverageOutstandingUsdc: microToUsdc(state.coverageOutstanding),
    paused: state.paused,
  };
}

/** Pretty-print an LpPositionState for API responses. */
export function formatLpPosition(state: LpPositionState) {
  return {
    lp: state.lp.toString(),
    shares: state.shares.toString(),
    depositedAt: new Date(Number(state.depositedAt) * 1000).toISOString(),
  };
}
