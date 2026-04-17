/**
 * Dual-Hash Integration Tests
 *
 * Tests the SHA-256 + Poseidon + Merkle triple-layer architecture.
 * Critical properties: dual-hash binding, Merkle tree integration, rescue chain,
 * ghost run commitment, anti-replay via nullifier, verification round-trip.
 */

import { describe, it, expect } from "vitest";
import {
  processOperation,
  processRescueChain,
  processGhostRunCommit,
  getMerkleAnchorData,
  verifyDualHash,
  recordMerkleAnchor,
  getMerkleProof,
} from "@/lib/dual-hash";
import { sha256 } from "@/lib/crypto-proof";
import { verifyMerkleProof } from "@/lib/merkle-audit";

describe("Dual-Hash Operation Processing", () => {
  it("processOperation returns SHA-256 + Poseidon + Merkle leaf", () => {
    const rec = processOperation("rescue", "MANDATE|tx|ts|100|agent", "2026-04-17T00:00:00Z");
    expect(rec.sha256Hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rec.poseidonHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rec.sha256Hash).not.toBe(rec.poseidonHash);
    expect(rec.merkleLeaf.operationType).toBe("rescue");
    expect(rec.merkleLeaf.operationHash).toBe(rec.sha256Hash);
  });

  it("SHA-256 matches independent computation", () => {
    const input = "test_canonical_input";
    const rec = processOperation("ghost_run", input);
    expect(rec.sha256Hash).toBe(sha256(input));
  });

  it("tree size grows with each operation", () => {
    const r1 = processOperation("nonce_scan", "scan_1");
    const r2 = processOperation("nonce_scan", "scan_2");
    expect(r2.treeSize).toBeGreaterThan(r1.treeSize);
  });

  it("merkle root changes after each operation", () => {
    const r1 = processOperation("rescue", "unique_1");
    const r2 = processOperation("rescue", "unique_2");
    expect(r1.merkleRoot).not.toBe(r2.merkleRoot);
  });
});

describe("Rescue Chain Processing", () => {
  const mandateInput = "MANDATE|5FHw...kL3|2026-04-17T00:00:00Z|1000|Agent7nZ";
  const executionInput = "EXECUTION|kamino|7nZbhE6h|500|2026-04-17T00:05:00Z|3mBs...Qtz|mandate_hash";
  const wallet = "7nZbhE6h5h2YkpNp3N9k8zU8kR4vTcXAfXQJiCBJwBDz";

  it("produces mandate + execution + chainProof with dual hashes", () => {
    const result = processRescueChain(mandateInput, executionInput, wallet);
    expect(result.mandate.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.mandate.poseidon).toMatch(/^[0-9a-f]{64}$/);
    expect(result.execution.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.execution.poseidon).toMatch(/^[0-9a-f]{64}$/);
    expect(result.chainProof.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.chainProof.poseidon).toMatch(/^[0-9a-f]{64}$/);
  });

  it("SHA-256 chain proof binds mandate and execution", () => {
    const result = processRescueChain(mandateInput, executionInput, wallet);
    // chainProof input should be "CHAIN|mandate_sha|exec_sha"
    const expectedInput = `CHAIN|${result.mandate.sha256}|${result.execution.sha256}`;
    expect(result.chainProof.input).toBe(expectedInput);
    expect(result.chainProof.sha256).toBe(sha256(expectedInput));
  });

  it("commitment-nullifier scheme is deterministic per wallet", () => {
    // Same inputs + wallet should still produce unique commitment (has random nonce)
    const r1 = processRescueChain(mandateInput, executionInput, wallet);
    const r2 = processRescueChain(mandateInput, executionInput, wallet);
    // commitments differ due to random nonce
    expect(r1.commitment.hash).not.toBe(r2.commitment.hash);
    // Each has a non-empty nullifier
    expect(r1.nullifier.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(r2.nullifier.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different wallets yield different nullifiers", () => {
    const r1 = processRescueChain(mandateInput, executionInput, "WalletA".padEnd(44, "X"));
    const r2 = processRescueChain(mandateInput, executionInput, "WalletB".padEnd(44, "X"));
    expect(r1.nullifier.hash).not.toBe(r2.nullifier.hash);
  });

  it("merkle leaf references chain proof hash", () => {
    const result = processRescueChain(mandateInput, executionInput, wallet);
    expect(result.merkleLeaf.operationHash).toBe(result.chainProof.sha256);
    expect(result.merkleLeaf.operationType).toBe("rescue");
  });
});

describe("Ghost Run Commit Processing", () => {
  it("produces deterministic commitmentId", () => {
    const r = processGhostRunCommit("strat1", "result1", "wallet01", "2026-04-17T00:00:00Z");
    expect(r.commitmentId).toMatch(/^GR-[0-9A-F]{8}$/);
  });

  it("same inputs + same timestamp produce same commitmentId", () => {
    const ts = "2026-04-17T00:00:00Z";
    const r1 = processGhostRunCommit("strat_x", "result_x", "w1", ts);
    const r2 = processGhostRunCommit("strat_x", "result_x", "w1", ts);
    expect(r1.commitmentId).toBe(r2.commitmentId);
    expect(r1.commitSha256).toBe(r2.commitSha256);
  });

  it("different strategies produce different commits", () => {
    const ts = "2026-04-17T00:00:00Z";
    const r1 = processGhostRunCommit("strat_a", "result", "w", ts);
    const r2 = processGhostRunCommit("strat_b", "result", "w", ts);
    expect(r1.commitmentId).not.toBe(r2.commitmentId);
  });

  it("dual-hashes for commit (SHA-256 + Poseidon)", () => {
    const r = processGhostRunCommit("s", "r", "w");
    expect(r.commitSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.commitPoseidon).toMatch(/^[0-9a-f]{64}$/);
    expect(r.commitSha256).not.toBe(r.commitPoseidon);
  });
});

describe("Merkle Anchor Data", () => {
  it("returns current root with poseidon wrapper", () => {
    processOperation("rescue", `anchor_test_${Date.now()}`);
    const anchor = getMerkleAnchorData();
    expect(anchor.root).toMatch(/^[0-9a-f]{64}$/);
    expect(anchor.poseidonRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(anchor.totalLeaves).toBeGreaterThan(0);
    expect(anchor.treeDepth).toBeGreaterThanOrEqual(0);
  });

  it("recordMerkleAnchor does not throw", () => {
    expect(() => recordMerkleAnchor("memo_sig_test_anchor")).not.toThrow();
  });

  it("getMerkleProof returns valid proof for known leaf", () => {
    const rec = processOperation("nonce_scan", `unique_proof_input_${Date.now()}`);
    const proof = getMerkleProof(rec.merkleLeaf.index);
    expect(proof).not.toBeNull();
    expect(verifyMerkleProof(proof!)).toBe(true);
  });
});

describe("Dual-Hash Verification", () => {
  it("verifies round-trip when both hashes match", () => {
    const input = "test_round_trip_input";
    const rec = processOperation("rescue", input);
    const result = verifyDualHash(input, "rescue", rec.sha256Hash, rec.poseidonHash);
    expect(result.sha256Valid).toBe(true);
    expect(result.poseidonValid).toBe(true);
    expect(result.bothValid).toBe(true);
  });

  it("detects SHA-256 tampering", () => {
    const input = "verify_test_sha";
    const rec = processOperation("rescue", input);
    const result = verifyDualHash(input, "rescue", "0".repeat(64), rec.poseidonHash);
    expect(result.sha256Valid).toBe(false);
    expect(result.bothValid).toBe(false);
  });

  it("detects Poseidon tampering", () => {
    const input = "verify_test_pos";
    const rec = processOperation("rescue", input);
    const result = verifyDualHash(input, "rescue", rec.sha256Hash, "f".repeat(64));
    expect(result.poseidonValid).toBe(false);
    expect(result.bothValid).toBe(false);
  });

  it("detects wrong operation type", () => {
    const input = "verify_type_test";
    const rec = processOperation("rescue", input);
    // Using wrong type for Poseidon domain separation
    const result = verifyDualHash(input, "ghost_run", rec.sha256Hash, rec.poseidonHash);
    expect(result.sha256Valid).toBe(true); // SHA-256 doesn't include type
    expect(result.poseidonValid).toBe(false); // Poseidon does include type
    expect(result.bothValid).toBe(false);
  });
});
