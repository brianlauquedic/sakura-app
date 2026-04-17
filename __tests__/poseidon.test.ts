/**
 * Poseidon Hash Tests
 *
 * Tests the BN254 scalar field Poseidon implementation.
 * Critical properties: determinism, field validity, collision resistance,
 * domain separation via string inputs.
 */

import { describe, it, expect } from "vitest";
import {
  poseidonHash,
  poseidonHashSingle,
  dualHashCommitment,
  BN254_FIELD_MODULUS,
} from "@/lib/poseidon";

describe("Poseidon Hash (BN254)", () => {
  describe("output format", () => {
    it("returns 64-character hex string", () => {
      const hash = poseidonHash("a", "b");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).toHaveLength(64);
    });

    it("single-input variant returns 64-character hex", () => {
      const hash = poseidonHashSingle("test");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("output is always in BN254 field", () => {
      const modulus = BigInt("0x" + BN254_FIELD_MODULUS);
      const hashes = [
        poseidonHash("alpha", "beta"),
        poseidonHash("", ""),
        poseidonHash("0".repeat(1000), "1".repeat(1000)),
      ];
      for (const h of hashes) {
        const val = BigInt("0x" + h);
        expect(val < modulus).toBe(true);
      }
    });
  });

  describe("determinism", () => {
    it("same inputs always produce same hash", () => {
      const h1 = poseidonHash("sakura", "rescue");
      const h2 = poseidonHash("sakura", "rescue");
      const h3 = poseidonHash("sakura", "rescue");
      expect(h1).toBe(h2);
      expect(h2).toBe(h3);
    });

    it("single-input determinism", () => {
      expect(poseidonHashSingle("foo")).toBe(poseidonHashSingle("foo"));
    });
  });

  describe("input sensitivity", () => {
    it("different inputs produce different hashes", () => {
      const h1 = poseidonHash("a", "b");
      const h2 = poseidonHash("a", "c");
      expect(h1).not.toBe(h2);
    });

    it("order matters (non-commutative)", () => {
      const h1 = poseidonHash("a", "b");
      const h2 = poseidonHash("b", "a");
      expect(h1).not.toBe(h2);
    });

    it("single-char difference produces totally different hash (avalanche)", () => {
      const h1 = poseidonHash("1000.00", "1.5");
      const h2 = poseidonHash("1000.01", "1.5");
      expect(h1).not.toBe(h2);
      // Check that at least half the characters differ (rough avalanche check)
      let diff = 0;
      for (let i = 0; i < 64; i++) if (h1[i] !== h2[i]) diff++;
      expect(diff).toBeGreaterThan(20);
    });
  });

  describe("edge cases", () => {
    it("handles empty strings", () => {
      const h = poseidonHash("", "");
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it("handles very long inputs", () => {
      const long = "x".repeat(10_000);
      const h = poseidonHash(long, long);
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it("handles unicode/emoji inputs", () => {
      const h1 = poseidonHash("日本語", "テスト");
      const h2 = poseidonHash("🌸", "💎");
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
      expect(h2).toMatch(/^[0-9a-f]{64}$/);
      expect(h1).not.toBe(h2);
    });

    it("distinguishes empty from null-equivalent inputs", () => {
      const h1 = poseidonHash("", "");
      const h2 = poseidonHash("0", "0");
      expect(h1).not.toBe(h2);
    });
  });

  describe("dualHashCommitment", () => {
    it("returns both SHA-256 and Poseidon hashes", () => {
      const result = dualHashCommitment("test_input");
      expect(result.sha256Hash).toMatch(/^[0-9a-f]{64}$/);
      expect(result.poseidonHash).toMatch(/^[0-9a-f]{64}$/);
      expect(result.input).toBe("test_input");
    });

    it("SHA-256 and Poseidon of same input differ", () => {
      const result = dualHashCommitment("same_input");
      expect(result.sha256Hash).not.toBe(result.poseidonHash);
    });

    it("SHA-256 matches known vector", () => {
      const result = dualHashCommitment("");
      expect(result.sha256Hash).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      );
    });
  });
});
