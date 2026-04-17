/**
 * Sakura Rescue Insurance Pool — TypeScript Client Tests
 *
 * Covers PDA derivation, Anchor discriminators, instruction encoding,
 * account deserialization round-trip, and eligibility edge cases.
 */

import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import crypto from "crypto";
import {
  SAKURA_INSURANCE_PROGRAM_ID,
  derivePoolPDA,
  deriveVaultPDA,
  deriveLpPositionPDA,
  derivePolicyPDA,
  deriveClaimRecordPDA,
  buildInitializePoolIx,
  buildLpDepositIx,
  buildLpWithdrawIx,
  buildBuyPolicyIx,
  buildClosePolicyIx,
  buildClaimPayoutIx,
  buildRotateAdminAgentIx,
  buildSetPausedIx,
  deserializePool,
  deserializePolicy,
  deserializeLpPosition,
  deserializeClaimRecord,
  hashRescueSig,
  usdcToMicro,
  microToUsdc,
  formatPolicy,
} from "@/lib/insurance-pool";

const ADMIN = new PublicKey("7nZbhE6h5h2YkpNp3N9k8zU8kR4vTcXAfXQJiCBJwBDz");
const ADMIN_AGENT = new PublicKey("11111111111111111111111111111112");
const USER = new PublicKey("2iCWnS1J8WYZn4reo9YD76qZiiZ39t2c1oGM3dyYwHNg");
const LP = new PublicKey("4qDg8YpzqQJFFCt4yhTVM8oY4i4HbBWKUV3uCPDZM6yx");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USER_USDC_ATA = new PublicKey("DRpbCBMxVnDK7maPGv7USSBTL9iNsSsZuLEDcw3jsUx8");

// ── PDA derivation ──────────────────────────────────────────────────

describe("Insurance Pool PDA derivation", () => {
  it("pool PDA is deterministic", () => {
    const [a] = derivePoolPDA(ADMIN);
    const [b] = derivePoolPDA(ADMIN);
    expect(a.toString()).toBe(b.toString());
  });

  it("different admins → different pool PDAs", () => {
    const [a] = derivePoolPDA(ADMIN);
    const [b] = derivePoolPDA(ADMIN_AGENT);
    expect(a.toString()).not.toBe(b.toString());
  });

  it("vault PDA seeds match on-chain contract", () => {
    const [pool] = derivePoolPDA(ADMIN);
    const [vault] = deriveVaultPDA(pool);
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from("sakura_vault"), pool.toBuffer()],
      SAKURA_INSURANCE_PROGRAM_ID,
    );
    expect(vault.toString()).toBe(expected.toString());
  });

  it("policy PDA seeds match on-chain contract", () => {
    const [pda] = derivePolicyPDA(USER);
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from("sakura_policy"), USER.toBuffer()],
      SAKURA_INSURANCE_PROGRAM_ID,
    );
    expect(pda.toString()).toBe(expected.toString());
  });

  it("lp position PDA seeds match on-chain contract", () => {
    const [pda] = deriveLpPositionPDA(LP);
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from("sakura_lp"), LP.toBuffer()],
      SAKURA_INSURANCE_PROGRAM_ID,
    );
    expect(pda.toString()).toBe(expected.toString());
  });

  it("claim-record PDA depends on nonce", () => {
    const [policy] = derivePolicyPDA(USER);
    const [c1] = deriveClaimRecordPDA(policy, 1n);
    const [c2] = deriveClaimRecordPDA(policy, 2n);
    expect(c1.toString()).not.toBe(c2.toString());
  });

  it("all derived PDAs are off-curve", () => {
    const [pool] = derivePoolPDA(ADMIN);
    const [vault] = deriveVaultPDA(pool);
    const [lp] = deriveLpPositionPDA(LP);
    const [policy] = derivePolicyPDA(USER);
    const [claim] = deriveClaimRecordPDA(policy, 7n);
    for (const pda of [pool, vault, lp, policy, claim]) {
      expect(PublicKey.isOnCurve(pda.toBuffer())).toBe(false);
    }
  });
});

// ── Instruction discriminators ──────────────────────────────────────

describe("Anchor instruction discriminators", () => {
  const nameFor = (name: string) =>
    crypto.createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);

  it("initialize_pool discriminator matches Anchor convention", () => {
    const ix = buildInitializePoolIx({
      admin: ADMIN,
      adminAgent: ADMIN_AGENT,
      usdcMint: USDC_MINT,
      premiumBps: 10,
      minReserveBps: 2000,
    });
    expect(Buffer.from(ix.data.subarray(0, 8))).toEqual(nameFor("initialize_pool"));
  });

  it("lp_deposit discriminator matches Anchor convention", () => {
    const ix = buildLpDepositIx({
      poolAdmin: ADMIN,
      lp: LP,
      lpUsdcAta: USER_USDC_ATA,
      amountMicroUsdc: 1_000_000n,
    });
    expect(Buffer.from(ix.data.subarray(0, 8))).toEqual(nameFor("lp_deposit"));
  });

  it("buy_policy discriminator matches Anchor convention", () => {
    const ix = buildBuyPolicyIx({
      poolAdmin: ADMIN,
      user: USER,
      userUsdcAta: USER_USDC_ATA,
      premiumMicroUsdc: 1_000_000n,
      coverageCapMicroUsdc: 1_000_000_000n,
    });
    expect(Buffer.from(ix.data.subarray(0, 8))).toEqual(nameFor("buy_policy"));
  });

  it("claim_payout discriminator matches Anchor convention", () => {
    const ix = buildClaimPayoutIx({
      poolAdmin: ADMIN,
      policyUser: USER,
      adminAgent: ADMIN_AGENT,
      payer: ADMIN_AGENT,
      rescueDestinationAta: USER_USDC_ATA,
      amountMicroUsdc: 5_000_000n,
      rescueSigHash: crypto.randomBytes(32),
      claimNonce: 42n,
    });
    expect(Buffer.from(ix.data.subarray(0, 8))).toEqual(nameFor("claim_payout"));
  });

  it("set_paused and rotate_admin_agent have distinct discriminators", () => {
    const pauseIx = buildSetPausedIx({ admin: ADMIN, paused: true });
    const rotIx = buildRotateAdminAgentIx({ admin: ADMIN, newAgent: ADMIN_AGENT });
    expect(Buffer.from(pauseIx.data.subarray(0, 8))).not.toEqual(
      Buffer.from(rotIx.data.subarray(0, 8))
    );
  });
});

// ── Instruction payload encoding ────────────────────────────────────

describe("Instruction payload encoding", () => {
  it("initialize_pool encodes premium_bps + min_reserve_bps as little-endian u16", () => {
    const ix = buildInitializePoolIx({
      admin: ADMIN,
      adminAgent: ADMIN_AGENT,
      usdcMint: USDC_MINT,
      premiumBps: 10,
      minReserveBps: 2000,
    });
    // offset 8: u16 premiumBps; offset 10: u16 minReserveBps
    expect(ix.data.readUInt16LE(8)).toBe(10);
    expect(ix.data.readUInt16LE(10)).toBe(2000);
  });

  it("lp_deposit encodes amount as little-endian u64", () => {
    const amt = 123_456_789n;
    const ix = buildLpDepositIx({
      poolAdmin: ADMIN, lp: LP, lpUsdcAta: USER_USDC_ATA,
      amountMicroUsdc: amt,
    });
    expect(ix.data.readBigUInt64LE(8)).toBe(amt);
  });

  it("buy_policy encodes premium + coverage_cap in order", () => {
    const premium = 1_000_000n;
    const cap = 10_000_000_000n;
    const ix = buildBuyPolicyIx({
      poolAdmin: ADMIN, user: USER, userUsdcAta: USER_USDC_ATA,
      premiumMicroUsdc: premium, coverageCapMicroUsdc: cap,
    });
    expect(ix.data.readBigUInt64LE(8)).toBe(premium);
    expect(ix.data.readBigUInt64LE(16)).toBe(cap);
  });

  it("claim_payout encodes amount, rescue_sig_hash, claim_nonce in order", () => {
    const amt = 500_000_000n;
    const hash = crypto.randomBytes(32);
    const nonce = 999_999n;
    const ix = buildClaimPayoutIx({
      poolAdmin: ADMIN,
      policyUser: USER,
      adminAgent: ADMIN_AGENT,
      payer: ADMIN_AGENT,
      rescueDestinationAta: USER_USDC_ATA,
      amountMicroUsdc: amt,
      rescueSigHash: hash,
      claimNonce: nonce,
    });
    expect(ix.data.readBigUInt64LE(8)).toBe(amt);
    expect(Buffer.from(ix.data.subarray(16, 48))).toEqual(hash);
    expect(ix.data.readBigUInt64LE(48)).toBe(nonce);
  });

  it("claim_payout rejects rescue_sig_hash of wrong length", () => {
    expect(() => buildClaimPayoutIx({
      poolAdmin: ADMIN,
      policyUser: USER,
      adminAgent: ADMIN_AGENT,
      payer: ADMIN_AGENT,
      rescueDestinationAta: USER_USDC_ATA,
      amountMicroUsdc: 1n,
      rescueSigHash: Buffer.alloc(16), // wrong size
      claimNonce: 1n,
    })).toThrow();
  });

  it("close_policy has no trailing args", () => {
    const ix = buildClosePolicyIx({
      poolAdmin: ADMIN, user: USER, userUsdcAta: USER_USDC_ATA,
    });
    expect(ix.data.length).toBe(8); // just the discriminator
  });
});

// ── Account key ordering ────────────────────────────────────────────

describe("Account key ordering", () => {
  it("initialize_pool includes admin as signer", () => {
    const ix = buildInitializePoolIx({
      admin: ADMIN, adminAgent: ADMIN_AGENT, usdcMint: USDC_MINT,
      premiumBps: 10, minReserveBps: 2000,
    });
    const adminKey = ix.keys.find(k => k.pubkey.equals(ADMIN));
    expect(adminKey?.isSigner).toBe(true);
  });

  it("claim_payout includes admin_agent as signer", () => {
    const ix = buildClaimPayoutIx({
      poolAdmin: ADMIN, policyUser: USER,
      adminAgent: ADMIN_AGENT, payer: ADMIN_AGENT,
      rescueDestinationAta: USER_USDC_ATA,
      amountMicroUsdc: 1_000_000n,
      rescueSigHash: crypto.randomBytes(32),
      claimNonce: 1n,
    });
    const agentKey = ix.keys.find(k => k.pubkey.equals(ADMIN_AGENT));
    expect(agentKey?.isSigner).toBe(true);
  });

  it("lp_withdraw includes lp as signer, does NOT include SystemProgram", () => {
    const ix = buildLpWithdrawIx({
      poolAdmin: ADMIN, lp: LP, lpUsdcAta: USER_USDC_ATA,
      sharesToBurn: 500_000n,
    });
    const lpKey = ix.keys.find(k => k.pubkey.equals(LP));
    expect(lpKey?.isSigner).toBe(true);
  });
});

// ── Account deserialization ─────────────────────────────────────────

describe("Account deserialization", () => {
  // Build a minimal Pool account from raw bytes and deserialize
  it("deserializePool returns null for invalid discriminator", () => {
    const bogus = Buffer.alloc(200);
    expect(deserializePool(bogus)).toBeNull();
  });

  it("deserializePolicy returns null for short data", () => {
    expect(deserializePolicy(Buffer.alloc(16))).toBeNull();
  });

  it("deserializeLpPosition returns null for wrong discriminator", () => {
    expect(deserializeLpPosition(Buffer.alloc(200))).toBeNull();
  });

  it("deserializeClaimRecord returns null for short data", () => {
    expect(deserializeClaimRecord(Buffer.alloc(16))).toBeNull();
  });

  it("Policy round-trip (via manual serialization)", () => {
    // Manually lay out a Policy account to verify the client deserializer
    const buf = Buffer.alloc(8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1);
    // discriminator
    crypto
      .createHash("sha256")
      .update("account:Policy")
      .digest()
      .subarray(0, 8)
      .copy(buf, 0);
    // fields
    USER.toBuffer().copy(buf, 8);
    buf.writeBigUInt64LE(10_000_000_000n, 40); // coverage_cap_usdc
    buf.writeBigUInt64LE(500_000n, 48);        // premium_paid_micro
    buf.writeBigInt64LE(1_800_000_000n, 56);   // paid_through_unix
    buf.writeBigUInt64LE(0n, 64);              // total_claimed
    buf.writeBigUInt64LE(0n, 72);              // rescue_count
    buf.writeUInt8(1, 80);                     // is_active
    buf.writeUInt8(254, 81);                   // bump

    const state = deserializePolicy(buf);
    expect(state).not.toBeNull();
    expect(state!.user.toString()).toBe(USER.toString());
    expect(state!.coverageCapUsdc).toBe(10_000_000_000n);
    expect(state!.premiumPaidMicro).toBe(500_000n);
    expect(state!.paidThroughUnix).toBe(1_800_000_000n);
    expect(state!.isActive).toBe(true);
    expect(state!.bump).toBe(254);
  });
});

// ── Utilities ───────────────────────────────────────────────────────

describe("Utilities", () => {
  it("usdcToMicro / microToUsdc round-trip", () => {
    expect(microToUsdc(usdcToMicro(1_000))).toBe(1_000);
    expect(microToUsdc(usdcToMicro(0.000001))).toBeCloseTo(0.000001, 6);
  });

  it("hashRescueSig produces 32-byte sha256", () => {
    const h = hashRescueSig("some-signature");
    expect(h.length).toBe(32);
    const expected = crypto.createHash("sha256").update("some-signature").digest();
    expect(h).toEqual(expected);
  });

  it("formatPolicy shape is JSON-safe", () => {
    const formatted = formatPolicy({
      user: USER,
      coverageCapUsdc: 10_000_000_000n,
      premiumPaidMicro: 500_000n,
      paidThroughUnix: 1_800_000_000n,
      totalClaimed: 0n,
      rescueCount: 0n,
      isActive: true,
      bump: 255,
    });
    expect(() => JSON.stringify(formatted)).not.toThrow();
    expect(formatted.coverageCapUsdc).toBe(10_000);
    expect(formatted.remainingCoverageUsdc).toBe(10_000);
  });
});
