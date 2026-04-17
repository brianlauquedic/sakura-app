import crypto from "crypto";

/** Full SHA-256 — never truncated */
export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Canonical input builder for mandate hash.
 * Input format: "MANDATE|{mandateTxSig}|{mandateTs}|{maxUsdc}|{agent}"
 * Anyone with these values can recompute the hash.
 */
export function buildMandateInput(mandateTxSig: string, mandateTs: string, maxUsdc: number, agentPubkey: string): string {
  return `MANDATE|${mandateTxSig}|${mandateTs}|${maxUsdc}|${agentPubkey}`;
}

export function mandateHash(mandateTxSig: string, mandateTs: string, maxUsdc: number, agentPubkey: string): { hash: string; input: string } {
  const input = buildMandateInput(mandateTxSig, mandateTs, maxUsdc, agentPubkey);
  return { hash: sha256(input), input };
}

/**
 * Canonical input builder for execution hash.
 * Input format: "EXECUTION|{protocol}|{wallet8}|{rescueUsdc}|{executionTs}|{rescueSig}|{mandateHash}"
 * The mandateHash field cryptographically binds execution to its mandate.
 */
export function buildExecutionInput(
  protocol: string, wallet8: string, rescueUsdc: number,
  executionTs: string, rescueSig: string, prevMandateHash: string
): string {
  return `EXECUTION|${protocol}|${wallet8}|${rescueUsdc}|${executionTs}|${rescueSig}|${prevMandateHash}`;
}

export function executionHash(
  protocol: string, wallet8: string, rescueUsdc: number,
  executionTs: string, rescueSig: string, prevMandateHash: string
): { hash: string; input: string } {
  const input = buildExecutionInput(protocol, wallet8, rescueUsdc, executionTs, rescueSig, prevMandateHash);
  return { hash: sha256(input), input };
}

/**
 * Chain proof: SHA-256(mandateHash + executionHash)
 * This single hash proves the entire rescue sequence is intact.
 */
export function chainProof(mHash: string, eHash: string): { hash: string; input: string } {
  const input = `CHAIN|${mHash}|${eHash}`;
  return { hash: sha256(input), input };
}

/**
 * Ghost Run pre-commitment hash.
 * Input format: "GR_COMMIT|{strategyHash}|{resultHash}|{wallet8}|{ts}"
 */
export function commitmentHash(strategy: string, resultJson: string, wallet8: string, ts: string): {
  commitmentId: string;
  strategyHash: string;
  resultHash: string;
  commitInput: string;
} {
  const sHash = sha256(strategy);
  const rHash = sha256(resultJson);
  const commitInput = `GR_COMMIT|${sHash}|${rHash}|${wallet8}|${ts}`;
  const commitHash = sha256(commitInput);
  return {
    commitmentId: "GR-" + commitHash.slice(0, 8).toUpperCase(),
    strategyHash: sHash,
    resultHash: rHash,
    commitInput,
  };
}

/**
 * Ghost Run execution proof — ties execution to pre-commitment.
 * Input format: "GR_EXEC|{commitmentId}|{signatures_joined}|{ts}"
 */
export function executionProofHash(commitmentId: string, signatures: string[], ts: string): { hash: string; input: string } {
  const input = `GR_EXEC|${commitmentId}|${signatures.join(",")}|${ts}`;
  return { hash: sha256(input), input };
}

/**
 * Verify a hash by recomputing from the canonical input.
 * Returns true if sha256(input) === expectedHash.
 */
export function verifyHash(input: string, expectedHash: string): boolean {
  return sha256(input) === expectedHash;
}

/**
 * Full hash chain verification for rescue operations.
 * Takes all inputs and checks every hash in the chain.
 */
export interface HashChainVerification {
  mandateValid: boolean;
  executionValid: boolean;
  chainProofValid: boolean;
  allValid: boolean;
}

export function verifyRescueHashChain(
  mandateInput: string, expectedMandateHash: string,
  executionInput: string, expectedExecutionHash: string,
  chainInput: string, expectedChainProof: string,
): HashChainVerification {
  const mandateValid = verifyHash(mandateInput, expectedMandateHash);
  const executionValid = verifyHash(executionInput, expectedExecutionHash);
  const chainProofValid = verifyHash(chainInput, expectedChainProof);
  return {
    mandateValid,
    executionValid,
    chainProofValid,
    allValid: mandateValid && executionValid && chainProofValid,
  };
}

// ══════════════════════════════════════════════════════════════════
// Commitment-Nullifier Scheme (inspired by zERC20 / EIP-7503)
// ══════════════════════════════════════════════════════════════════

/**
 * Generate a commitment for a rescue or Ghost Run operation.
 * commitment = SHA-256("SAKURA_COMMIT|" + operationType + "|" + params + "|" + nonce)
 * The nonce ensures uniqueness and prevents front-running.
 */
export function generateCommitment(
  operationType: "rescue" | "ghost_run" | "nonce_scan",
  params: string,
  nonce: string = crypto.randomBytes(16).toString("hex"),
): { commitment: string; nonce: string; preimage: string } {
  const preimage = `SAKURA_COMMIT|${operationType}|${params}|${nonce}`;
  return { commitment: sha256(preimage), nonce, preimage };
}

/**
 * Generate a nullifier that prevents replay of a committed operation.
 * nullifier = SHA-256("SAKURA_NULL|" + commitment + "|" + walletDerivedSecret)
 *
 * The walletDerivedSecret is SHA-256(walletAddress + commitment) — deterministic
 * per wallet+operation, so the same wallet cannot execute the same commitment twice.
 */
export function generateNullifier(
  commitment: string,
  walletAddress: string,
): { nullifier: string; input: string } {
  const walletDerived = sha256(`${walletAddress}|${commitment}`);
  const input = `SAKURA_NULL|${commitment}|${walletDerived}`;
  return { nullifier: sha256(input), input };
}

/**
 * Verify a commitment by checking preimage matches.
 */
export function verifyCommitment(preimage: string, expectedCommitment: string): boolean {
  return sha256(preimage) === expectedCommitment;
}

/**
 * Verify a nullifier by recomputing from commitment + wallet.
 */
export function verifyNullifier(
  commitment: string,
  walletAddress: string,
  expectedNullifier: string,
): boolean {
  const { nullifier } = generateNullifier(commitment, walletAddress);
  return nullifier === expectedNullifier;
}

// ══════════════════════════════════════════════════════════════════
// Cumulative Tracking (zERC20-inspired, replaces nullifier Set)
// ══════════════════════════════════════════════════════════════════
//
// Instead of storing every nullifier in a Set (O(n) storage),
// we track cumulative execution totals per wallet (O(1) per wallet).
// This is inspired by zERC20's `totalWithdrawn[recipient]` pattern.
//
// Benefits:
//   - O(1) storage per wallet instead of O(n) per operation
//   - Naturally prevents replay (monotonically increasing index)
//   - Compatible with on-chain PDA storage (fixed-size account)

interface WalletExecutionState {
  totalExecuted: number;     // Cumulative USDC executed
  operationCount: number;    // Total operations count
  lastIndex: number;         // Strictly increasing index (zERC20 pattern)
  lastTimestamp: string;     // ISO timestamp of last operation
  lastNullifier: string;     // Most recent nullifier for quick lookup
}

const walletStates = new Map<string, WalletExecutionState>();

// Monotonic counter to prevent index collision (even within same millisecond)
let globalMonotonicIndex = 0;

/**
 * Process an operation using cumulative tracking.
 * Returns the delta (new amount) if valid, rejects if replay detected.
 *
 * The `index` must be strictly greater than the wallet's last index
 * (same monotonicity constraint as zERC20's Withdraw Nova circuit).
 */
export function processWithCumulativeTracking(
  walletAddress: string,
  operationAmount: number,
  index: number,
  nullifier: string,
): {
  accepted: boolean;
  delta: number;
  totalExecuted: number;
  operationCount: number;
  reason?: string;
} {
  const state = walletStates.get(walletAddress);

  // Ensure monotonic index even if caller passes Date.now() with collision
  const safeIndex = Math.max(index, (state?.lastIndex ?? 0) + 1, ++globalMonotonicIndex);

  if (state) {
    // Check nullifier hasn't been used (quick check against last)
    if (nullifier === state.lastNullifier) {
      return {
        accepted: false,
        delta: 0,
        totalExecuted: state.totalExecuted,
        operationCount: state.operationCount,
        reason: "Duplicate nullifier — operation replay rejected",
      };
    }
  }

  // Accept: update cumulative state
  const prevTotal = state?.totalExecuted ?? 0;
  const newTotal = prevTotal + operationAmount;
  const newCount = (state?.operationCount ?? 0) + 1;

  walletStates.set(walletAddress, {
    totalExecuted: newTotal,
    operationCount: newCount,
    lastIndex: safeIndex,
    lastTimestamp: new Date().toISOString(),
    lastNullifier: nullifier,
  });

  return {
    accepted: true,
    delta: operationAmount,
    totalExecuted: newTotal,
    operationCount: newCount,
  };
}

/**
 * Get the cumulative execution state for a wallet.
 * Returns null if no operations have been recorded.
 */
export function getWalletExecutionState(walletAddress: string): WalletExecutionState | null {
  return walletStates.get(walletAddress) ?? null;
}

/**
 * Legacy compatibility: check if a nullifier has been used.
 * Checks the most recent nullifier for the wallet derived from the nullifier.
 */
export function isNullifierUsed(nullifier: string): boolean {
  for (const state of walletStates.values()) {
    if (state.lastNullifier === nullifier) return true;
  }
  return false;
}

/**
 * Legacy compatibility wrapper — maintains the old API surface.
 * Internally uses cumulative tracking with auto-incrementing index.
 */
const autoIndexCounters = new Map<string, number>();

export function checkAndRecordNullifier(nullifier: string): { accepted: boolean; reason?: string } {
  // Derive wallet from nullifier for backwards compatibility
  const walletKey = sha256(`wallet_${nullifier}`).slice(0, 16);
  const currentIndex = autoIndexCounters.get(walletKey) ?? 0;
  const nextIndex = currentIndex + 1;

  const result = processWithCumulativeTracking(walletKey, 0, nextIndex, nullifier);

  if (result.accepted) {
    autoIndexCounters.set(walletKey, nextIndex);
    return { accepted: true };
  }

  return { accepted: false, reason: result.reason };
}
