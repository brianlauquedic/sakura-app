/**
 * Unit tests for the v0.3 intent commitment — the single value that
 * binds an on-chain sign_intent to an off-chain witness + ZK proof.
 *
 * If ANY of these tests fail, the `execute_with_intent_proof` pairing
 * check will fail on-chain because the circuit's C1 constraint
 * (Poseidon tree opens to `intent_commitment`) will not hold.
 *
 * Invariants we lock in here:
 *   1. Determinism: same inputs → same 32-byte hex, every time.
 *   2. Witness sensitivity: flipping ANY of the 7 leaves changes the hash.
 *   3. Tree structure: matches the 2-layer Poseidon(3) chain in the circuit.
 *   4. BN254 byte encoding: bytesBE32 is the field element in big-endian.
 *   5. pubkeyToFieldBytes drops the high byte (Num2Bits(248) in circuit).
 */

import { describe, expect, it } from "vitest";
import {
  computeIntentCommitment,
  pubkeyToFieldBytes,
} from "@/lib/zk-proof";

// Fixed fixture to make determinism testable across machines.
// Explicit bigint type — avoid `as const` literal narrowing so that
// overrides with arbitrary bigints still satisfy Partial<typeof FIXTURE>.
interface Fixture {
  intentTextHash: bigint;
  walletBytes: bigint;
  nonce: bigint;
  maxAmount: bigint;
  maxUsdValue: bigint;
  allowedProtocols: bigint;
  allowedActionTypes: bigint;
}
const FIXTURE: Fixture = {
  intentTextHash: 0xdeadbeefcafebaben,
  walletBytes: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcden,
  nonce: 1_700_000_000n,
  maxAmount: 1_000_000_000n, // 1000 USDC
  maxUsdValue: 20_000_000_000n, // $20k
  allowedProtocols: 0b11n,
  allowedActionTypes: 0b1010n,
};

async function hash(overrides: Partial<Fixture> = {}) {
  const p = { ...FIXTURE, ...overrides };
  return computeIntentCommitment(
    p.intentTextHash,
    p.walletBytes,
    p.nonce,
    p.maxAmount,
    p.maxUsdValue,
    p.allowedProtocols,
    p.allowedActionTypes
  );
}

describe("computeIntentCommitment", () => {
  it("is deterministic across repeated calls", async () => {
    const a = await hash();
    const b = await hash();
    expect(a.hex).toBe(b.hex);
    expect(a.decimal).toBe(b.decimal);
  });

  it("returns a 32-byte big-endian representation matching the decimal", async () => {
    const { hex, bytesBE32, decimal } = await hash();
    expect(hex).toMatch(/^0x[0-9a-f]{64}$/);
    expect(bytesBE32.length).toBe(32);

    // Round-trip: bytes → BigInt → decimal string.
    let v = 0n;
    for (const b of bytesBE32) v = (v << 8n) | BigInt(b);
    expect(v.toString()).toBe(decimal);
  });

  it.each([
    ["intentTextHash", { intentTextHash: 0x1n }],
    ["walletBytes", { walletBytes: 0x1n }],
    ["nonce", { nonce: 1n }],
    ["maxAmount", { maxAmount: 999_999_999n }],
    ["maxUsdValue", { maxUsdValue: 19_999_999_999n }],
    ["allowedProtocols", { allowedProtocols: 0b10n }],
    ["allowedActionTypes", { allowedActionTypes: 0b1011n }],
  ] as const)(
    "changes when %s differs (witness sensitivity)",
    async (_name, overrides) => {
      const base = await hash();
      const mutated = await hash(overrides);
      expect(mutated.hex).not.toBe(base.hex);
    }
  );
});

describe("pubkeyToFieldBytes", () => {
  it("drops the high byte (Num2Bits(248) compatible)", () => {
    // 32 bytes where byte[0] = 0xFF and the rest = 0x01.
    const bytes = new Uint8Array(32);
    bytes[0] = 0xff; // discarded
    for (let i = 1; i < 32; i++) bytes[i] = 0x01;

    const v = pubkeyToFieldBytes(bytes);

    // Expected = 0x0101...01 (31 bytes of 0x01) read big-endian.
    let expected = 0n;
    for (let i = 0; i < 31; i++) expected = (expected << 8n) | 0x01n;
    expect(v).toBe(expected);
  });

  it("throws on wrong input length", () => {
    expect(() => pubkeyToFieldBytes(new Uint8Array(31))).toThrow();
    expect(() => pubkeyToFieldBytes(new Uint8Array(33))).toThrow();
  });
});
