/**
 * Dual-Layer Hash Engine — zERC20-inspired dual-hash architecture
 *
 * Every Sakura operation produces TWO hashes:
 *   1. SHA-256 hash chain (on-chain via Memo — universally verifiable)
 *   2. Poseidon hash (ZK-ready — can be used inside Groth16 circuits)
 *
 * Both hashes are bound to the same canonical input, creating a bridge
 * between traditional verification and zero-knowledge proof systems.
 *
 * Additionally, every operation is inserted into the Merkle audit tree
 * (stateless batch aggregation). The Merkle root is periodically
 * anchored on-chain, enabling O(log n) proof of any individual operation.
 *
 * Architecture (inspired by zERC20):
 *   On-chain layer:  SHA-256 hash chain → Solana Memo (cheap, universal)
 *   Off-chain layer: Poseidon Merkle tree → root anchored periodically (ZK-ready)
 */

import { sha256, generateCommitment, generateNullifier, chainProof } from "./crypto-proof";
import { poseidonHash, poseidonHashSingle, dualHashCommitment } from "./poseidon";
import { auditTree } from "./merkle-audit";
import type { MerkleLeaf, MerkleProof } from "./merkle-audit";

// ══════════════════════════════════════════════════════════════════
// Dual-Hash Operation Record
// ══════════════════════════════════════════════════════════════════

export interface DualHashRecord {
  // SHA-256 layer (on-chain, universally verifiable)
  sha256Hash: string;
  sha256Input: string;

  // Poseidon layer (ZK-ready, circuit-compatible)
  poseidonHash: string;

  // Merkle audit layer (stateless batch aggregation)
  merkleLeaf: MerkleLeaf;
  merkleRoot: string;
  treeSize: number;

  // Metadata
  operationType: "rescue" | "ghost_run" | "nonce_scan";
  timestamp: string;
}

/**
 * Process an operation through all three cryptographic layers.
 *
 * 1. Compute SHA-256 hash (for on-chain Memo)
 * 2. Compute Poseidon hash (for ZK circuits)
 * 3. Insert into Merkle audit tree (for batch verification)
 *
 * Returns a unified record that can be:
 * - Written to Solana Memo (SHA-256 + Poseidon hashes)
 * - Used to generate Merkle inclusion proofs
 * - Fed into a Groth16 circuit (Poseidon hash)
 */
export function processOperation(
  operationType: "rescue" | "ghost_run" | "nonce_scan",
  canonicalInput: string,
  timestamp: string = new Date().toISOString(),
): DualHashRecord {
  // Layer 1: SHA-256 (universal verification)
  const sha256Hash = sha256(canonicalInput);

  // Layer 2: Poseidon (ZK-ready)
  // Hash the canonical input with the operation type for domain separation
  const posHash = poseidonHash(operationType, canonicalInput);

  // Layer 3: Merkle audit tree (stateless batch aggregation)
  // The operation hash used for the leaf is the SHA-256 hash (linking both layers)
  const { leaf, root, treeSize } = auditTree.addOperation(
    operationType,
    sha256Hash,
    timestamp,
  );

  return {
    sha256Hash,
    sha256Input: canonicalInput,
    poseidonHash: posHash,
    merkleLeaf: leaf,
    merkleRoot: root,
    treeSize,
    operationType,
    timestamp,
  };
}

// ══════════════════════════════════════════════════════════════════
// Dual-Hash Rescue Chain
// ══════════════════════════════════════════════════════════════════

export interface DualHashRescueChain {
  // SHA-256 chain (existing v2 hash chain)
  mandate: { sha256: string; poseidon: string; input: string };
  execution: { sha256: string; poseidon: string; input: string };
  chainProof: { sha256: string; poseidon: string; input: string };

  // Merkle audit
  merkleLeaf: MerkleLeaf;
  merkleRoot: string;
  treeSize: number;

  // Commitment-Nullifier (zERC20-inspired anti-replay)
  commitment: { hash: string; nonce: string; preimage: string };
  nullifier: { hash: string; input: string };
}

/**
 * Full dual-hash rescue chain — the most comprehensive cryptographic proof.
 *
 * Combines:
 * - SHA-256 hash chain (mandate → execution → chain_proof) — universally verifiable
 * - Poseidon dual-hash for each step — ZK-circuit ready
 * - Merkle tree insertion — O(log n) batch verification
 * - Commitment-Nullifier — anti-replay protection
 */
export function processRescueChain(
  mandateInput: string,
  executionInput: string,
  walletAddress: string,
  timestamp: string = new Date().toISOString(),
): DualHashRescueChain {
  // SHA-256 layer
  const mandateSha = sha256(mandateInput);
  const executionSha = sha256(executionInput);
  const cp = chainProof(mandateSha, executionSha);

  // Poseidon layer (same inputs, ZK-friendly hash)
  const mandatePos = poseidonHashSingle(mandateInput);
  const executionPos = poseidonHashSingle(executionInput);
  const chainProofPos = poseidonHash(mandateSha, executionSha);

  // Merkle audit — insert the chain proof as the operation hash
  const { leaf, root, treeSize } = auditTree.addOperation(
    "rescue",
    cp.hash,
    timestamp,
  );

  // Commitment-Nullifier (zERC20-inspired)
  const commitment = generateCommitment("rescue", `${mandateSha}|${executionSha}`);
  const nullifier = generateNullifier(commitment.commitment, walletAddress);

  return {
    mandate: { sha256: mandateSha, poseidon: mandatePos, input: mandateInput },
    execution: { sha256: executionSha, poseidon: executionPos, input: executionInput },
    chainProof: { sha256: cp.hash, poseidon: chainProofPos, input: cp.input },
    merkleLeaf: leaf,
    merkleRoot: root,
    treeSize,
    commitment: { hash: commitment.commitment, nonce: commitment.nonce, preimage: commitment.preimage },
    nullifier: { hash: nullifier.nullifier, input: nullifier.input },
  };
}

// ══════════════════════════════════════════════════════════════════
// Dual-Hash Ghost Run
// ══════════════════════════════════════════════════════════════════

export interface DualHashGhostRun {
  commitSha256: string;
  commitPoseidon: string;
  strategySha256: string;
  resultSha256: string;
  commitInput: string;
  commitmentId: string;
  merkleLeaf: MerkleLeaf;
  merkleRoot: string;
  treeSize: number;
}

/**
 * Dual-hash Ghost Run pre-commitment.
 */
export function processGhostRunCommit(
  strategy: string,
  resultJson: string,
  wallet8: string,
  timestamp: string = new Date().toISOString(),
): DualHashGhostRun {
  const strategySha = sha256(strategy);
  const resultSha = sha256(resultJson);
  const commitInput = `GR_COMMIT|${strategySha}|${resultSha}|${wallet8}|${timestamp}`;
  const commitSha = sha256(commitInput);
  const commitPos = poseidonHash(strategySha, resultSha);
  const commitmentId = "GR-" + commitSha.slice(0, 8).toUpperCase();

  const { leaf, root, treeSize } = auditTree.addOperation(
    "ghost_run",
    commitSha,
    timestamp,
  );

  return {
    commitSha256: commitSha,
    commitPoseidon: commitPos,
    strategySha256: strategySha,
    resultSha256: resultSha,
    commitInput,
    commitmentId,
    merkleLeaf: leaf,
    merkleRoot: root,
    treeSize,
  };
}

// ══════════════════════════════════════════════════════════════════
// Merkle Anchor (stateless batch pattern)
// ══════════════════════════════════════════════════════════════════

/**
 * Get the current Merkle root and tree stats for anchoring to Solana Memo.
 * Call this before writing the batch anchor memo.
 */
export function getMerkleAnchorData(): {
  root: string;
  totalLeaves: number;
  treeDepth: number;
  poseidonRoot: string; // Poseidon hash of the SHA-256 root for ZK compatibility
} {
  const stats = auditTree.getStats();
  return {
    root: stats.currentRoot,
    totalLeaves: stats.totalLeaves,
    treeDepth: stats.treeDepth,
    poseidonRoot: poseidonHashSingle(stats.currentRoot),
  };
}

/**
 * Record that the current Merkle root has been anchored on-chain.
 */
export function recordMerkleAnchor(memoSig: string): void {
  auditTree.recordAnchor(memoSig);
}

/**
 * Get a Merkle inclusion proof for a specific operation.
 */
export function getMerkleProof(leafIndex: number): MerkleProof | null {
  return auditTree.getProof(leafIndex);
}

// ══════════════════════════════════════════════════════════════════
// Verification Helpers
// ══════════════════════════════════════════════════════════════════

/**
 * Verify a dual-hash record by recomputing both hashes from canonical input.
 */
export function verifyDualHash(
  canonicalInput: string,
  operationType: "rescue" | "ghost_run" | "nonce_scan",
  expectedSha256: string,
  expectedPoseidon: string,
): { sha256Valid: boolean; poseidonValid: boolean; bothValid: boolean } {
  const sha256Valid = sha256(canonicalInput) === expectedSha256;
  const poseidonValid = poseidonHash(operationType, canonicalInput) === expectedPoseidon;
  return { sha256Valid, poseidonValid, bothValid: sha256Valid && poseidonValid };
}
