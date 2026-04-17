/**
 * Groth16 ZK Proof Tests
 *
 * Tests the Poseidon-based Groth16-compatible proof system.
 * Critical properties: proof generation, self-verification, constraint violation
 * detection, nullifier uniqueness per wallet, tamper detection, memo payload
 * size bounds for on-chain anchoring.
 */

import { describe, it, expect } from "vitest";
import {
  generateRescueProof,
  verifyRescueProof,
  generateGhostRunProof,
  verifyGhostRunProof,
  generateVerificationKey,
  buildProofMemoPayload,
  type PrivateWitness,
} from "@/lib/groth16-verify";

const validWitness: PrivateWitness = {
  actualAmount: 500,
  healthFactor: 1.2,
  salt: "a".repeat(32),
  walletAddress: "7nZbhE6h5h2YkpNp3N9k8zU8kR4vTcXAfXQJiCBJwBDz",
};

describe("Groth16 Rescue Proof", () => {
  describe("proof generation", () => {
    it("generates valid proof when constraints satisfied", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      expect(bundle.verified).toBe(true);
      expect(bundle.proof.protocol).toBe("groth16");
      expect(bundle.proof.curve).toBe("bn128");
    });

    it("proof structure has all Groth16 elements", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      expect(bundle.proof.pi_a).toHaveLength(2);
      expect(bundle.proof.pi_b).toHaveLength(2);
      expect(bundle.proof.pi_b[0]).toHaveLength(2);
      expect(bundle.proof.pi_c).toHaveLength(2);
    });

    it("public signals contain commitment, max, threshold, nullifier", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      expect(bundle.publicSignals.commitmentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(bundle.publicSignals.nullifier).toMatch(/^[0-9a-f]{64}$/);
      expect(bundle.publicSignals.maxAmount).toBe("1000.000000");
      expect(bundle.publicSignals.triggerThreshold).toBe("1.500000");
    });

    it("proof digest is SHA-256", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      expect(bundle.proofDigest).toMatch(/^[0-9a-f]{64}$/);
      expect(bundle.poseidonDigest).toMatch(/^[0-9a-f]{64}$/);
    });

    it("metadata records constraint count and circuit", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      expect(bundle.metadata.circuit).toBe("sakura_rescue_v1");
      expect(bundle.metadata.constraints).toBe(4);
    });
  });

  describe("constraint enforcement", () => {
    it("throws when amount exceeds max", () => {
      const badWitness = { ...validWitness, actualAmount: 2000 };
      expect(() => generateRescueProof(badWitness, 1000, 1.5)).toThrow(/constraint violation/);
    });

    it("throws when healthFactor exceeds trigger threshold", () => {
      const badWitness = { ...validWitness, healthFactor: 1.9 };
      expect(() => generateRescueProof(badWitness, 1000, 1.5)).toThrow(/constraint violation/);
    });

    it("allows amount exactly at max (boundary)", () => {
      const boundaryWitness = { ...validWitness, actualAmount: 1000 };
      const bundle = generateRescueProof(boundaryWitness, 1000, 1.5);
      expect(bundle.verified).toBe(true);
    });

    it("allows healthFactor exactly at threshold (boundary)", () => {
      const boundaryWitness = { ...validWitness, healthFactor: 1.5 };
      const bundle = generateRescueProof(boundaryWitness, 1000, 1.5);
      expect(bundle.verified).toBe(true);
    });
  });

  describe("nullifier properties", () => {
    it("same wallet + same witness produces same nullifier", () => {
      const b1 = generateRescueProof(validWitness, 1000, 1.5);
      const b2 = generateRescueProof(validWitness, 1000, 1.5);
      expect(b1.publicSignals.nullifier).toBe(b2.publicSignals.nullifier);
    });

    it("different wallets produce different nullifiers", () => {
      const w1 = { ...validWitness, walletAddress: "A".repeat(44) };
      const w2 = { ...validWitness, walletAddress: "B".repeat(44) };
      const b1 = generateRescueProof(w1, 1000, 1.5);
      const b2 = generateRescueProof(w2, 1000, 1.5);
      expect(b1.publicSignals.nullifier).not.toBe(b2.publicSignals.nullifier);
    });

    it("different salts produce different nullifiers (different commitments)", () => {
      const w1 = { ...validWitness, salt: "a".repeat(32) };
      const w2 = { ...validWitness, salt: "b".repeat(32) };
      const b1 = generateRescueProof(w1, 1000, 1.5);
      const b2 = generateRescueProof(w2, 1000, 1.5);
      expect(b1.publicSignals.nullifier).not.toBe(b2.publicSignals.nullifier);
    });
  });

  describe("proof verification", () => {
    it("valid proof verifies", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      expect(verifyRescueProof(bundle.proof, bundle.publicSignals)).toBe(true);
    });

    it("tampered pi_a fails verification", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      const tamperedProof = {
        ...bundle.proof,
        pi_a: ["0".repeat(64), "0".repeat(64)] as [string, string],
      };
      expect(verifyRescueProof(tamperedProof, bundle.publicSignals)).toBe(false);
    });

    it("tampered pi_c fails verification", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      const tamperedProof = {
        ...bundle.proof,
        pi_c: ["f".repeat(64), "f".repeat(64)] as [string, string],
      };
      expect(verifyRescueProof(tamperedProof, bundle.publicSignals)).toBe(false);
    });

    it("tampered commitmentHash fails verification", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      const tamperedSignals = {
        ...bundle.publicSignals,
        commitmentHash: "0".repeat(64),
      };
      expect(verifyRescueProof(bundle.proof, tamperedSignals)).toBe(false);
    });

    it("mismatched nullifier fails verification", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      const tamperedSignals = {
        ...bundle.publicSignals,
        nullifier: "abc" + bundle.publicSignals.nullifier.slice(3),
      };
      expect(verifyRescueProof(bundle.proof, tamperedSignals)).toBe(false);
    });

    it("wrong protocol fails verification", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      const badProof = { ...bundle.proof, protocol: "plonk" as unknown as "groth16" };
      expect(verifyRescueProof(badProof, bundle.publicSignals)).toBe(false);
    });

    it("missing public signals fails verification", () => {
      const bundle = generateRescueProof(validWitness, 1000, 1.5);
      const emptySignals = {
        commitmentHash: "",
        maxAmount: "",
        triggerThreshold: "",
        nullifier: "",
      };
      expect(verifyRescueProof(bundle.proof, emptySignals)).toBe(false);
    });
  });

  describe("verification key", () => {
    it("produces deterministic verification key", () => {
      const vk1 = generateVerificationKey();
      const vk2 = generateVerificationKey();
      expect(vk1).toEqual(vk2);
    });

    it("verification key has 4 public inputs (4 IC + initial)", () => {
      const vk = generateVerificationKey();
      expect(vk.nPublic).toBe(4);
      expect(vk.IC).toHaveLength(5); // nPublic + 1 for offset
    });
  });
});

describe("Groth16 Ghost Run Proof", () => {
  it("generates verifiable ghost run proof", () => {
    const bundle = generateGhostRunProof(
      JSON.stringify({ action: "swap" }),
      JSON.stringify({ out: 100 }),
      "wallet_address_test"
    );
    expect(bundle.verified).toBe(true);
    expect(bundle.publicSignals.commitmentId).toMatch(/^GR-[0-9A-F]{8}$/);
  });

  it("different strategies produce different commitment IDs", () => {
    const b1 = generateGhostRunProof("strat1", "result1", "wallet");
    const b2 = generateGhostRunProof("strat2", "result2", "wallet");
    expect(b1.publicSignals.commitmentId).not.toBe(b2.publicSignals.commitmentId);
  });

  it("tampered ghost run proof fails verification", () => {
    const bundle = generateGhostRunProof("s", "r", "w");
    const tamperedProof = { ...bundle.proof, pi_a: ["0".repeat(64), "0".repeat(64)] as [string, string] };
    expect(verifyGhostRunProof(tamperedProof, bundle.publicSignals)).toBe(false);
  });

  it("valid ghost run proof verifies", () => {
    const bundle = generateGhostRunProof("s", "r", "w");
    expect(verifyGhostRunProof(bundle.proof, bundle.publicSignals)).toBe(true);
  });
});

describe("Memo Payload Builder", () => {
  it("fits within Solana Memo 566-byte limit", () => {
    const bundle = generateRescueProof(validWitness, 1000, 1.5);
    const payload = buildProofMemoPayload(bundle, "rescue");
    expect(Buffer.byteLength(payload, "utf8")).toBeLessThanOrEqual(566);
  });

  it("includes proof digest and nullifier", () => {
    const bundle = generateRescueProof(validWitness, 1000, 1.5);
    const payload = buildProofMemoPayload(bundle, "rescue");
    const parsed = JSON.parse(payload);
    expect(parsed.proof_digest).toBe(bundle.proofDigest);
    expect(parsed.nullifier).toBe(bundle.publicSignals.nullifier);
    expect(parsed.event).toBe("sakura_zk_proof_rescue");
  });

  it("ghost run variant uses correct event name", () => {
    const bundle = generateGhostRunProof("s", "r", "w");
    const payload = buildProofMemoPayload(bundle, "ghost_run");
    const parsed = JSON.parse(payload);
    expect(parsed.event).toBe("sakura_zk_proof_ghost_run");
  });
});
