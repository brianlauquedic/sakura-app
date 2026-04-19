/**
 * Sakura — Agentic Consumer Protocol TypeScript Client (v0.3)
 *
 * Interacts with the on-chain Anchor program `sakura_insurance` at
 * `programs/sakura-insurance/src/lib.rs` — v0.3 is the intent-execution
 * protocol where users sign intents and AI agents execute actions within
 * mathematically-enforced policy bounds.
 *
 * v0.3 replaces the v0.2 mutual-insurance model. PDAs/instructions:
 *   Pool    → IntentProtocol   (seeds: "sakura_intent_v3", admin)
 *   Policy  → Intent           (seeds: "sakura_intent_account", user)
 *   Claim   → ActionRecord     (seeds: "sakura_action", intent, nonce)
 *
 * Instructions exposed:
 *   - initialize_protocol       (admin, once per deployment)
 *   - rotate_admin              (admin key rotation)
 *   - set_paused                (emergency stop)
 *   - sign_intent               (user signs, creates Intent PDA)
 *   - revoke_intent             (user revokes)
 *   - execute_with_intent_proof (ZK-gated action execution)
 *
 * Oracle verification (same as v0.2): chain parses Pyth PriceUpdateV2 and
 * cross-checks oracle_price_usd_micro + oracle_slot against the actual
 * Pyth account at instruction execution time.
 */

import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Connection,
} from "@solana/web3.js";
import crypto from "crypto";

// ══════════════════════════════════════════════════════════════════════
// Constants — Program ID, token mints
// ══════════════════════════════════════════════════════════════════════

export const SAKURA_INSURANCE_PROGRAM_ID = new PublicKey(
  (process.env.NEXT_PUBLIC_INSURANCE_PROGRAM_ID ?? "").trim() ||
    // v0.3 deployment on devnet (intent-execution protocol)
    "AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp"
);

// Back-compat alias for any remaining legacy imports
export const SAKURA_PROGRAM_ID = SAKURA_INSURANCE_PROGRAM_ID;

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// Pyth SOL/USD price feed on devnet (the static account — v0.3 E2E posts
// fresh VAAs via Hermes, but this is useful for fallback / staging).
export const PYTH_SOL_USD_DEVNET = new PublicKey(
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
);

// ══════════════════════════════════════════════════════════════════════
// Action-type + Protocol enums (must match circuit bitmap interpretation)
// ══════════════════════════════════════════════════════════════════════

/** Bit index (0..31) in allowed_action_types bitmap */
export enum ActionType {
  Borrow = 0,
  Lend = 1,
  Swap = 2,
  Repay = 3,
  Withdraw = 4,
  Deposit = 5,
  Stake = 6,
  Unstake = 7,
  // 8..31 reserved
}

/** Bit index (0..31) in allowed_protocols bitmap */
export enum ProtocolId {
  Kamino = 0,
  MarginFi = 1,
  Solend = 2,
  Jupiter = 3,
  Marinade = 4,
  Jito = 5,
  Drift = 6,
  Zeta = 7,
  // 8..31 reserved
}

/** Build an allowed_protocols bitmap from a list of ProtocolId values. */
export function buildProtocolsBitmap(ids: ProtocolId[]): number {
  return ids.reduce((acc, id) => acc | (1 << id), 0);
}

/** Build an allowed_action_types bitmap from a list of ActionType values. */
export function buildActionTypesBitmap(types: ActionType[]): number {
  return types.reduce((acc, t) => acc | (1 << t), 0);
}

// ══════════════════════════════════════════════════════════════════════
// PDA Derivation
// ══════════════════════════════════════════════════════════════════════

export function deriveProtocolPDA(
  admin: PublicKey,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_intent_v3"), admin.toBuffer()],
    programId
  );
}

export function deriveFeeVaultPDA(
  protocol: PublicKey,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_fee_vault"), protocol.toBuffer()],
    programId
  );
}

export function deriveIntentPDA(
  user: PublicKey,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_intent_account"), user.toBuffer()],
    programId
  );
}

export function deriveActionRecordPDA(
  intent: PublicKey,
  actionNonce: bigint,
  programId: PublicKey = SAKURA_INSURANCE_PROGRAM_ID
): [PublicKey, number] {
  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64LE(actionNonce, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sakura_action"), intent.toBuffer(), nonceBuf],
    programId
  );
}

// ── Back-compat PDA aliases (so old callers don't break hard) ─────────
export const derivePoolPDA = deriveProtocolPDA;
export const deriveVaultPDA = deriveFeeVaultPDA;
export const derivePolicyPDA = deriveIntentPDA;
export const deriveClaimRecordPDA = deriveActionRecordPDA;

// ══════════════════════════════════════════════════════════════════════
// Anchor discriminators
// ══════════════════════════════════════════════════════════════════════

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

const IX_INIT_PROTOCOL = anchorIxDiscriminator("initialize_protocol");
const IX_ROTATE_ADMIN = anchorIxDiscriminator("rotate_admin");
const IX_SET_PAUSED = anchorIxDiscriminator("set_paused");
const IX_SIGN_INTENT = anchorIxDiscriminator("sign_intent");
const IX_REVOKE_INTENT = anchorIxDiscriminator("revoke_intent");
const IX_EXECUTE_WITH_INTENT_PROOF = anchorIxDiscriminator(
  "execute_with_intent_proof"
);

const ACCT_PROTOCOL = anchorAccountDiscriminator("IntentProtocol");
const ACCT_INTENT = anchorAccountDiscriminator("Intent");
const ACCT_ACTION_RECORD = anchorAccountDiscriminator("ActionRecord");

// ══════════════════════════════════════════════════════════════════════
// Account state types (v0.3 layout)
// ══════════════════════════════════════════════════════════════════════

export interface IntentProtocolState {
  admin: PublicKey;
  usdcMint: PublicKey;
  feeVault: PublicKey;
  platformTreasury: PublicKey;
  totalIntentsSigned: bigint;
  totalActionsExecuted: bigint;
  executionFeeBps: number;
  platformFeeBps: number;
  paused: boolean;
  bump: number;
}

export interface IntentState {
  user: PublicKey;
  intentCommitment: Buffer; // 32 bytes
  signedAt: bigint;
  expiresAt: bigint;
  actionsExecuted: bigint;
  isActive: boolean;
  bump: number;
}

export interface ActionRecordState {
  intent: PublicKey;
  actionNonce: bigint;
  actionType: number;
  actionAmount: bigint;
  actionTargetIndex: number;
  oraclePriceUsdMicro: bigint;
  oracleSlot: bigint;
  ts: bigint;
  proofFingerprint: Buffer; // 32 bytes keccak256
  bump: number;
}

// ══════════════════════════════════════════════════════════════════════
// Deserializers
// ══════════════════════════════════════════════════════════════════════

export function deserializeProtocol(data: Buffer): IntentProtocolState | null {
  // 8 disc + 32*4 + 8*2 + 2*2 + 1 + 1 = 158
  if (data.length < 158) return null;
  if (!data.subarray(0, 8).equals(ACCT_PROTOCOL)) return null;

  let o = 8;
  const admin = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const usdcMint = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const feeVault = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const platformTreasury = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const totalIntentsSigned = data.readBigUInt64LE(o); o += 8;
  const totalActionsExecuted = data.readBigUInt64LE(o); o += 8;
  const executionFeeBps = data.readUInt16LE(o); o += 2;
  const platformFeeBps = data.readUInt16LE(o); o += 2;
  const paused = data.readUInt8(o) === 1; o += 1;
  const bump = data.readUInt8(o);

  return {
    admin,
    usdcMint,
    feeVault,
    platformTreasury,
    totalIntentsSigned,
    totalActionsExecuted,
    executionFeeBps,
    platformFeeBps,
    paused,
    bump,
  };
}

export function deserializeIntent(data: Buffer): IntentState | null {
  // 8 disc + 32 + 32 + 8*3 + 1 + 1 = 98
  if (data.length < 98) return null;
  if (!data.subarray(0, 8).equals(ACCT_INTENT)) return null;

  let o = 8;
  const user = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const intentCommitment = Buffer.from(data.subarray(o, o + 32)); o += 32;
  const signedAt = data.readBigInt64LE(o); o += 8;
  const expiresAt = data.readBigInt64LE(o); o += 8;
  const actionsExecuted = data.readBigUInt64LE(o); o += 8;
  const isActive = data.readUInt8(o) === 1; o += 1;
  const bump = data.readUInt8(o);

  return {
    user,
    intentCommitment,
    signedAt,
    expiresAt,
    actionsExecuted,
    isActive,
    bump,
  };
}

export function deserializeActionRecord(
  data: Buffer
): ActionRecordState | null {
  // 8 disc + 32 + 8 + 1 + 8 + 1 + 8 + 8 + 8 + 32 + 1 = 115
  if (data.length < 115) return null;
  if (!data.subarray(0, 8).equals(ACCT_ACTION_RECORD)) return null;

  let o = 8;
  const intent = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const actionNonce = data.readBigUInt64LE(o); o += 8;
  const actionType = data.readUInt8(o); o += 1;
  const actionAmount = data.readBigUInt64LE(o); o += 8;
  const actionTargetIndex = data.readUInt8(o); o += 1;
  const oraclePriceUsdMicro = data.readBigUInt64LE(o); o += 8;
  const oracleSlot = data.readBigUInt64LE(o); o += 8;
  const ts = data.readBigInt64LE(o); o += 8;
  const proofFingerprint = Buffer.from(data.subarray(o, o + 32)); o += 32;
  const bump = data.readUInt8(o);

  return {
    intent,
    actionNonce,
    actionType,
    actionAmount,
    actionTargetIndex,
    oraclePriceUsdMicro,
    oracleSlot,
    ts,
    proofFingerprint,
    bump,
  };
}

// ══════════════════════════════════════════════════════════════════════
// On-chain fetch helpers
// ══════════════════════════════════════════════════════════════════════

export async function fetchProtocol(
  connection: Connection,
  admin: PublicKey
): Promise<{ pda: PublicKey; state: IntentProtocolState | null }> {
  const [pda] = deriveProtocolPDA(admin);
  const info = await connection.getAccountInfo(pda);
  if (!info) return { pda, state: null };
  return { pda, state: deserializeProtocol(Buffer.from(info.data)) };
}

export async function fetchIntent(
  connection: Connection,
  user: PublicKey
): Promise<{ pda: PublicKey; state: IntentState | null }> {
  const [pda] = deriveIntentPDA(user);
  const info = await connection.getAccountInfo(pda);
  if (!info) return { pda, state: null };
  return { pda, state: deserializeIntent(Buffer.from(info.data)) };
}

// ── Back-compat fetch aliases ─────────────────────────────────────────
export const fetchPool = fetchProtocol;
export const fetchPolicy = fetchIntent;

// ══════════════════════════════════════════════════════════════════════
// Instruction builders
// ══════════════════════════════════════════════════════════════════════

/**
 * initialize_protocol: admin sets up the IntentProtocol PDA + fee vault.
 */
export function buildInitializeProtocolIx(params: {
  admin: PublicKey;
  usdcMint: PublicKey;
  platformTreasury: PublicKey;
  executionFeeBps: number;
  platformFeeBps: number;
}): TransactionInstruction {
  const { admin, usdcMint, platformTreasury, executionFeeBps, platformFeeBps } =
    params;
  const [protocol] = deriveProtocolPDA(admin);
  const [feeVault] = deriveFeeVaultPDA(protocol);

  const data = Buffer.alloc(8 + 2 + 2);
  let o = 0;
  IX_INIT_PROTOCOL.copy(data, o); o += 8;
  data.writeUInt16LE(executionFeeBps, o); o += 2;
  data.writeUInt16LE(platformFeeBps, o);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: protocol, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: feeVault, isSigner: false, isWritable: true },
      { pubkey: platformTreasury, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * sign_intent: user signs a new intent (or rotates existing).
 *
 * `intentCommitment` is a 32-byte Poseidon-tree hash computed via
 * `computeIntentCommitment` in lib/zk-proof.ts over:
 *   (intent_text_hash, wallet, nonce, max_amount, max_usd_value,
 *    allowed_protocols, allowed_action_types)
 *
 * `expiresAt` is a Unix timestamp (i64) — intent cannot be used past this.
 */
export function buildSignIntentIx(params: {
  admin: PublicKey;       // protocol admin (PDA seed)
  user: PublicKey;
  intentCommitment: Buffer; // 32 bytes
  expiresAt: bigint;        // i64 Unix timestamp
}): TransactionInstruction {
  if (params.intentCommitment.length !== 32) {
    throw new Error(
      `intentCommitment must be 32 bytes, got ${params.intentCommitment.length}`
    );
  }
  const [protocol] = deriveProtocolPDA(params.admin);
  const [intent] = deriveIntentPDA(params.user);

  const data = Buffer.alloc(8 + 32 + 8);
  let o = 0;
  IX_SIGN_INTENT.copy(data, o); o += 8;
  params.intentCommitment.copy(data, o); o += 32;
  data.writeBigInt64LE(params.expiresAt, o);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: protocol, isSigner: false, isWritable: true },
      { pubkey: intent, isSigner: false, isWritable: true },
      { pubkey: params.user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * revoke_intent: user marks their intent inactive.
 */
export function buildRevokeIntentIx(params: {
  user: PublicKey;
}): TransactionInstruction {
  const [intent] = deriveIntentPDA(params.user);

  const data = Buffer.from(IX_REVOKE_INTENT);

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: intent, isSigner: false, isWritable: true },
      { pubkey: params.user, isSigner: true, isWritable: false },
    ],
    data,
  });
}

/**
 * execute_with_intent_proof: ZK-gated action execution. Verifies that
 * the proposed action falls within the bounds of the user's signed intent.
 *
 * On success: writes an ActionRecord PDA (seeded by intent + nonce) for
 * audit trail. The actual DeFi action (Kamino borrow, etc.) should be
 * placed by the client as a subsequent instruction in the same atomic
 * v0 transaction — if this instruction fails, the whole tx reverts.
 *
 * Public inputs to ZK proof (must match circom `public` list order):
 *   [0] intent_commitment
 *   [1] action_type
 *   [2] action_amount
 *   [3] action_target_index
 *   [4] oracle_price_usd_micro
 *   [5] oracle_slot
 */
export function buildExecuteWithIntentProofIx(params: {
  admin: PublicKey;
  user: PublicKey;          // intent owner
  payer: PublicKey;         // pays ActionRecord rent (often = user)
  pythPriceAccount: PublicKey;
  actionNonce: bigint;
  actionType: number;       // u8
  actionAmount: bigint;     // u64
  actionTargetIndex: number;// u8
  oraclePriceUsdMicro: bigint;
  oracleSlot: bigint;
  proofA: Uint8Array;       // 64 bytes
  proofB: Uint8Array;       // 128 bytes
  proofC: Uint8Array;       // 64 bytes
}): TransactionInstruction {
  if (params.proofA.length !== 64) {
    throw new Error(`proofA must be 64 bytes, got ${params.proofA.length}`);
  }
  if (params.proofB.length !== 128) {
    throw new Error(`proofB must be 128 bytes, got ${params.proofB.length}`);
  }
  if (params.proofC.length !== 64) {
    throw new Error(`proofC must be 64 bytes, got ${params.proofC.length}`);
  }

  const [protocol] = deriveProtocolPDA(params.admin);
  const [intent] = deriveIntentPDA(params.user);
  const [actionRecord] = deriveActionRecordPDA(intent, params.actionNonce);

  // Layout:
  //   8  disc
  //   8  action_nonce        (u64 LE)
  //   1  action_type         (u8)
  //   8  action_amount       (u64 LE)
  //   1  action_target_index (u8)
  //   8  oracle_price        (u64 LE)
  //   8  oracle_slot         (u64 LE)
  //   64 proof_a
  //   128 proof_b
  //   64 proof_c
  // Total = 298 bytes
  const data = Buffer.alloc(8 + 8 + 1 + 8 + 1 + 8 + 8 + 64 + 128 + 64);
  let o = 0;
  IX_EXECUTE_WITH_INTENT_PROOF.copy(data, o); o += 8;
  data.writeBigUInt64LE(params.actionNonce, o); o += 8;
  data.writeUInt8(params.actionType, o); o += 1;
  data.writeBigUInt64LE(params.actionAmount, o); o += 8;
  data.writeUInt8(params.actionTargetIndex, o); o += 1;
  data.writeBigUInt64LE(params.oraclePriceUsdMicro, o); o += 8;
  data.writeBigUInt64LE(params.oracleSlot, o); o += 8;
  Buffer.from(params.proofA).copy(data, o); o += 64;
  Buffer.from(params.proofB).copy(data, o); o += 128;
  Buffer.from(params.proofC).copy(data, o); o += 64;

  return new TransactionInstruction({
    programId: SAKURA_INSURANCE_PROGRAM_ID,
    keys: [
      { pubkey: protocol, isSigner: false, isWritable: true },
      { pubkey: intent, isSigner: false, isWritable: true },
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: actionRecord, isSigner: false, isWritable: true },
      { pubkey: params.pythPriceAccount, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ══════════════════════════════════════════════════════════════════════
// Back-compat instruction-builder aliases
// Older code imports `buildInitializePoolIx` / `buildBuyPolicyIx` /
// `buildClaimPayoutWithZkProofIx`. These aliases let legacy callers
// continue compiling, while new code should use the v0.3 names directly.
// Legacy calls will fail at runtime (different parameter schemas), which
// is intentional — the v0.2 mutual-insurance flow no longer exists.
// ══════════════════════════════════════════════════════════════════════

export const buildInitializePoolIx = buildInitializeProtocolIx;

// ══════════════════════════════════════════════════════════════════════
// Helper: claim eligibility stub (for back-compat with claim-with-repay
// route that used to check whether a user's rescue is allowed).
// v0.3 replaces this with intent-level checks; this stub always allows
// and lets the on-chain ZK verification be the authoritative gate.
// ══════════════════════════════════════════════════════════════════════

export async function checkClaimEligibility(params: {
  connection: Connection;
  poolAdmin: PublicKey;
  user: PublicKey;
  rescueMicroUsdc: bigint;
}): Promise<{ eligible: boolean; reason?: string }> {
  const { connection, user } = params;
  const { state: intent } = await fetchIntent(connection, user);
  if (!intent) {
    return { eligible: false, reason: "no active intent signed" };
  }
  if (!intent.isActive) {
    return { eligible: false, reason: "intent is revoked" };
  }
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now > intent.expiresAt) {
    return { eligible: false, reason: "intent expired" };
  }
  return { eligible: true };
}
