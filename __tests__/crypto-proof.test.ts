/**
 * Unit tests for the cryptographic proof layer.
 *
 * These tests verify:
 *   1. SHA-256 hash determinism and canonical input format
 *   2. Hash chain integrity (mandate → execution → chain proof)
 *   3. Commitment-nullifier scheme correctness
 *   4. Cumulative tracking monotonicity and replay prevention
 *   5. Ghost Run commitment binding
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  sha256,
  mandateHash,
  executionHash,
  chainProof,
  commitmentHash,
  executionProofHash,
  verifyHash,
  verifyRescueHashChain,
  generateCommitment,
  generateNullifier,
  verifyCommitment,
  verifyNullifier,
  processWithCumulativeTracking,
  getWalletExecutionState,
} from "@/lib/crypto-proof";

// ── SHA-256 Determinism ─────────────────────────────────────────────

describe("sha256", () => {
  it("produces consistent 64-char hex output", () => {
    const hash = sha256("hello");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(sha256("hello")); // deterministic
  });

  it("produces different hashes for different inputs", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });

  it("matches known SHA-256 vector", () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

// ── Hash Chain ──────────────────────────────────────────────────────

describe("Hash Chain", () => {
  const mandateTxSig = "5abc123def456";
  const mandateTs = "2026-04-14T12:00:00.000Z";
  const maxUsdc = 1000;
  const agentPubkey = "AgentPubkey11111111111111111111111111111111";

  it("mandateHash produces canonical input format", () => {
    const result = mandateHash(mandateTxSig, mandateTs, maxUsdc, agentPubkey);
    expect(result.input).toBe(`MANDATE|${mandateTxSig}|${mandateTs}|${maxUsdc}|${agentPubkey}`);
    expect(result.hash).toHaveLength(64);
  });

  it("executionHash includes previous mandate hash", () => {
    const mResult = mandateHash(mandateTxSig, mandateTs, maxUsdc, agentPubkey);
    const eResult = executionHash("kamino", "wallet12", 500, "2026-04-14T12:01:00Z", "rescueSig123", mResult.hash);
    expect(eResult.input).toContain(mResult.hash);
    expect(eResult.hash).toHaveLength(64);
  });

  it("chainProof binds mandate and execution", () => {
    const mResult = mandateHash(mandateTxSig, mandateTs, maxUsdc, agentPubkey);
    const eResult = executionHash("kamino", "wallet12", 500, "2026-04-14T12:01:00Z", "rescueSig123", mResult.hash);
    const cResult = chainProof(mResult.hash, eResult.hash);
    expect(cResult.input).toBe(`CHAIN|${mResult.hash}|${eResult.hash}`);
    expect(cResult.hash).toHaveLength(64);
  });

  it("full chain verifies correctly", () => {
    const m = mandateHash(mandateTxSig, mandateTs, maxUsdc, agentPubkey);
    const e = executionHash("kamino", "wallet12", 500, "2026-04-14T12:01:00Z", "rescueSig123", m.hash);
    const c = chainProof(m.hash, e.hash);

    const result = verifyRescueHashChain(m.input, m.hash, e.input, e.hash, c.input, c.hash);
    expect(result.allValid).toBe(true);
    expect(result.mandateValid).toBe(true);
    expect(result.executionValid).toBe(true);
    expect(result.chainProofValid).toBe(true);
  });

  it("tampered chain proof fails verification", () => {
    const m = mandateHash(mandateTxSig, mandateTs, maxUsdc, agentPubkey);
    const e = executionHash("kamino", "wallet12", 500, "2026-04-14T12:01:00Z", "rescueSig123", m.hash);
    const c = chainProof(m.hash, e.hash);

    // Tamper with mandate hash
    const result = verifyRescueHashChain(m.input, "0".repeat(64), e.input, e.hash, c.input, c.hash);
    expect(result.allValid).toBe(false);
    expect(result.mandateValid).toBe(false);
  });
});

// ── Ghost Run Commitment ────────────────────────────────────────────

describe("Ghost Run Commitment", () => {
  it("produces deterministic commitment ID", () => {
    const a = commitmentHash("swap SOL→USDC", '{"result":1}', "wallet12", "2026-04-14T12:00:00Z");
    const b = commitmentHash("swap SOL→USDC", '{"result":1}', "wallet12", "2026-04-14T12:00:00Z");
    expect(a.commitmentId).toBe(b.commitmentId);
    expect(a.commitmentId).toMatch(/^GR-[A-F0-9]{8}$/);
  });

  it("different strategies produce different commitments", () => {
    const a = commitmentHash("swap SOL→USDC", '{"r":1}', "wallet12", "2026-04-14T12:00:00Z");
    const b = commitmentHash("stake SOL", '{"r":1}', "wallet12", "2026-04-14T12:00:00Z");
    expect(a.commitmentId).not.toBe(b.commitmentId);
  });

  it("execution proof binds to commitment", () => {
    const commit = commitmentHash("strategy", '{"r":1}', "wallet12", "2026-04-14T12:00:00Z");
    const exec = executionProofHash(commit.commitmentId, ["sig1", "sig2"], "2026-04-14T12:01:00Z");
    expect(exec.input).toContain(commit.commitmentId);
    expect(verifyHash(exec.input, exec.hash)).toBe(true);
  });
});

// ── Commitment-Nullifier Scheme ─────────────────────────────────────

describe("Commitment-Nullifier", () => {
  it("generateCommitment with explicit nonce is deterministic", () => {
    const a = generateCommitment("rescue", "wallet|1000", "fixed_nonce_123");
    const b = generateCommitment("rescue", "wallet|1000", "fixed_nonce_123");
    expect(a.commitment).toBe(b.commitment);
    expect(a.preimage).toBe(b.preimage);
  });

  it("generateCommitment without nonce produces unique values", () => {
    const a = generateCommitment("rescue", "wallet|1000");
    const b = generateCommitment("rescue", "wallet|1000");
    expect(a.commitment).not.toBe(b.commitment); // random nonce
  });

  it("verifyCommitment succeeds with correct preimage", () => {
    const c = generateCommitment("ghost_run", "params", "nonce123");
    expect(verifyCommitment(c.preimage, c.commitment)).toBe(true);
  });

  it("verifyCommitment fails with wrong preimage", () => {
    const c = generateCommitment("ghost_run", "params", "nonce123");
    expect(verifyCommitment("wrong_preimage", c.commitment)).toBe(false);
  });

  it("nullifier is deterministic per wallet+commitment", () => {
    const c = generateCommitment("rescue", "params", "nonce");
    const n1 = generateNullifier(c.commitment, "wallet_A");
    const n2 = generateNullifier(c.commitment, "wallet_A");
    expect(n1.nullifier).toBe(n2.nullifier);
  });

  it("different wallets produce different nullifiers", () => {
    const c = generateCommitment("rescue", "params", "nonce");
    const n1 = generateNullifier(c.commitment, "wallet_A");
    const n2 = generateNullifier(c.commitment, "wallet_B");
    expect(n1.nullifier).not.toBe(n2.nullifier);
  });

  it("verifyNullifier succeeds with correct inputs", () => {
    const c = generateCommitment("rescue", "params", "nonce");
    const n = generateNullifier(c.commitment, "wallet_A");
    expect(verifyNullifier(c.commitment, "wallet_A", n.nullifier)).toBe(true);
  });
});

// ── Cumulative Tracking ─────────────────────────────────────────────

describe("Cumulative Tracking", () => {
  const testWallet = `test_wallet_${Date.now()}_${Math.random()}`;

  it("first operation is accepted", () => {
    const wallet = `${testWallet}_first`;
    const result = processWithCumulativeTracking(wallet, 100, 1, "null_1");
    expect(result.accepted).toBe(true);
    expect(result.delta).toBe(100);
    expect(result.totalExecuted).toBe(100);
    expect(result.operationCount).toBe(1);
  });

  it("cumulative total increases monotonically", () => {
    const wallet = `${testWallet}_cumul`;
    processWithCumulativeTracking(wallet, 100, 1, "null_a");
    const r2 = processWithCumulativeTracking(wallet, 200, 2, "null_b");
    expect(r2.totalExecuted).toBe(300);
    expect(r2.operationCount).toBe(2);
  });

  it("duplicate nullifier is rejected", () => {
    const wallet = `${testWallet}_dupl`;
    processWithCumulativeTracking(wallet, 100, 1, "same_null");
    const r2 = processWithCumulativeTracking(wallet, 200, 2, "same_null");
    expect(r2.accepted).toBe(false);
    expect(r2.reason).toContain("replay");
  });

  it("index collision is auto-resolved by globalMonotonicIndex", () => {
    const wallet = `${testWallet}_idx`;
    const r1 = processWithCumulativeTracking(wallet, 50, 1000, "null_x");
    // Same index — should still succeed because safeIndex auto-increments
    const r2 = processWithCumulativeTracking(wallet, 50, 1000, "null_y");
    expect(r1.accepted).toBe(true);
    expect(r2.accepted).toBe(true);

    const state = getWalletExecutionState(wallet);
    expect(state!.lastIndex).toBeGreaterThan(1000);
  });
});
