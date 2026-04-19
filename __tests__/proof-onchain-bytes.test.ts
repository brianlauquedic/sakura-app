/**
 * Unit tests for `proofToOnchainBytes` — the security-critical encoder
 * that translates a snarkjs Groth16 proof into the exact byte layout the
 * on-chain `groth16-solana` verifier expects.
 *
 * Two invariants are load-bearing:
 *
 *   (1) A.y is NEGATED mod BN254_P before serialization.
 *       The light-protocol crate stores alpha_g1 positive in the VK and
 *       expects the caller to submit `-A`. Forgetting this produces an
 *       opaque pairing-check failure on-chain that costs ~116k CU to
 *       diagnose. A regression here silently breaks every execute.
 *
 *   (2) pi_b (G2) is written with (x.c1, x.c0, y.c1, y.c0) — snarkjs
 *       stores Fq2 as [c0, c1] but ark-bn254 / groth16-solana expect
 *       the reverse. Swapping the swap-order has the same signature
 *       (still 128B, still passes typechecks) but breaks pairing.
 *
 * Both properties were confirmed by on-chain devnet testing (program
 * AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp). These tests prevent
 * regression without needing another devnet round-trip.
 */

import { describe, expect, it } from "vitest";
import { proofToOnchainBytes, type Groth16Proof } from "@/lib/zk-proof";

const BN254_P =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function bytesToBigint(bytes: Uint8Array): bigint {
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  return v;
}

// Tiny non-zero proof — we're testing the encoder, not the math.
const FIXTURE: Groth16Proof = {
  pi_a: ["111", "222", "1"],
  pi_b: [
    ["1001", "1002"],
    ["2001", "2002"],
    ["1", "0"],
  ],
  pi_c: ["333", "444", "1"],
  protocol: "groth16",
  curve: "bn128",
};

describe("proofToOnchainBytes", () => {
  it("produces exact 64 / 128 / 64 byte lengths", () => {
    const { proofA, proofB, proofC } = proofToOnchainBytes(FIXTURE);
    expect(proofA.length).toBe(64);
    expect(proofB.length).toBe(128);
    expect(proofC.length).toBe(64);
  });

  it("writes A.x as the raw x value (first 32 bytes, big-endian)", () => {
    const { proofA } = proofToOnchainBytes(FIXTURE);
    expect(bytesToBigint(proofA.slice(0, 32))).toBe(111n);
  });

  it("writes A.y as BN254_P − y (negation — light-protocol convention)", () => {
    const { proofA } = proofToOnchainBytes(FIXTURE);
    const written = bytesToBigint(proofA.slice(32, 64));
    expect(written).toBe(BN254_P - 222n);
  });

  it("swaps Fq2 components in B: writes (x.c1, x.c0, y.c1, y.c0)", () => {
    const { proofB } = proofToOnchainBytes(FIXTURE);
    // pi_b[0] = [c0="1001", c1="1002"] → chunks: 1002, 1001
    expect(bytesToBigint(proofB.slice(0, 32))).toBe(1002n); // x.c1
    expect(bytesToBigint(proofB.slice(32, 64))).toBe(1001n); // x.c0
    // pi_b[1] = [c0="2001", c1="2002"] → chunks: 2002, 2001
    expect(bytesToBigint(proofB.slice(64, 96))).toBe(2002n); // y.c1
    expect(bytesToBigint(proofB.slice(96, 128))).toBe(2001n); // y.c0
  });

  it("writes C without any negation (raw x, y)", () => {
    const { proofC } = proofToOnchainBytes(FIXTURE);
    expect(bytesToBigint(proofC.slice(0, 32))).toBe(333n);
    expect(bytesToBigint(proofC.slice(32, 64))).toBe(444n);
  });

  it("is deterministic across repeated calls", () => {
    const r1 = proofToOnchainBytes(FIXTURE);
    const r2 = proofToOnchainBytes(FIXTURE);
    expect(r1.proofA).toEqual(r2.proofA);
    expect(r1.proofB).toEqual(r2.proofB);
    expect(r1.proofC).toEqual(r2.proofC);
  });

  it("handles y=0 without producing a negative value (mod P)", () => {
    // Edge case: negation of 0 mod P is 0. A bug here would give -0
    // which serializes as all-zeros OR wraps past P.
    const zeroY: Groth16Proof = {
      ...FIXTURE,
      pi_a: ["111", "0", "1"],
    };
    const { proofA } = proofToOnchainBytes(zeroY);
    expect(bytesToBigint(proofA.slice(32, 64))).toBe(0n);
  });
});
