/**
 * Merkle Audit Tree Tests
 *
 * Tests the binary Merkle tree construction, proof generation, and verification.
 * Critical properties: root determinism, proof inclusion, tamper detection,
 * odd-leaf padding correctness, O(log n) proof size.
 */

import { describe, it, expect } from "vitest";
import MerkleAuditTree, {
  computeLeafHash,
  computeNodeHash,
  verifyMerkleProof,
  verifyLeafHash,
} from "@/lib/merkle-audit";

describe("Merkle Audit Tree", () => {
  describe("leaf hashing", () => {
    it("computeLeafHash is deterministic", () => {
      const h1 = computeLeafHash("rescue", "abc123", "2026-04-17T00:00:00Z");
      const h2 = computeLeafHash("rescue", "abc123", "2026-04-17T00:00:00Z");
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("different operationTypes produce different leaves", () => {
      const h1 = computeLeafHash("rescue", "hash", "ts");
      const h2 = computeLeafHash("ghost_run", "hash", "ts");
      expect(h1).not.toBe(h2);
    });

    it("verifyLeafHash detects tampering", () => {
      const tree = new MerkleAuditTree();
      const { leaf } = tree.addOperation("rescue", "op_hash", "2026-04-17T00:00:00Z");
      expect(verifyLeafHash(leaf)).toBe(true);

      const tampered = { ...leaf, operationHash: "tampered_hash" };
      expect(verifyLeafHash(tampered)).toBe(false);
    });
  });

  describe("node hashing", () => {
    it("computeNodeHash is deterministic", () => {
      expect(computeNodeHash("left", "right")).toBe(computeNodeHash("left", "right"));
    });

    it("order-sensitive (non-commutative)", () => {
      const h1 = computeNodeHash("a", "b");
      const h2 = computeNodeHash("b", "a");
      expect(h1).not.toBe(h2);
    });
  });

  describe("tree construction", () => {
    it("empty tree has deterministic root", () => {
      const tree1 = new MerkleAuditTree();
      const tree2 = new MerkleAuditTree();
      expect(tree1.computeRoot()).toBe(tree2.computeRoot());
    });

    it("single leaf tree has root equal to leaf hash", () => {
      const tree = new MerkleAuditTree();
      const { root, leaf } = tree.addOperation("rescue", "only_leaf", "ts1");
      // Single leaf: root IS the leaf hash (no parent level needed)
      expect(root).toBe(leaf.leafHash);
    });

    it("two leaves produce correct root", () => {
      const tree = new MerkleAuditTree();
      const { leaf: l1 } = tree.addOperation("rescue", "op1", "ts1");
      const { leaf: l2, root } = tree.addOperation("rescue", "op2", "ts2");
      expect(root).toBe(computeNodeHash(l1.leafHash, l2.leafHash));
    });

    it("four leaves produce correct balanced tree root", () => {
      const tree = new MerkleAuditTree();
      const leaves: string[] = [];
      for (let i = 0; i < 4; i++) {
        const { leaf } = tree.addOperation("rescue", `op${i}`, `ts${i}`);
        leaves.push(leaf.leafHash);
      }
      const expectedRoot = computeNodeHash(
        computeNodeHash(leaves[0], leaves[1]),
        computeNodeHash(leaves[2], leaves[3])
      );
      expect(tree.computeRoot()).toBe(expectedRoot);
    });

    it("tree grows monotonically", () => {
      const tree = new MerkleAuditTree();
      const roots: string[] = [];
      for (let i = 0; i < 5; i++) {
        const { root } = tree.addOperation("rescue", `op${i}`);
        roots.push(root);
      }
      // Each new op should change the root
      for (let i = 1; i < roots.length; i++) {
        expect(roots[i]).not.toBe(roots[i - 1]);
      }
    });
  });

  describe("proof generation & verification", () => {
    it("proof for single leaf verifies", () => {
      const tree = new MerkleAuditTree();
      tree.addOperation("rescue", "op0", "ts0");
      const proof = tree.getProof(0);
      expect(proof).not.toBeNull();
      expect(verifyMerkleProof(proof!)).toBe(true);
    });

    it("proof verifies for each leaf in 4-leaf tree", () => {
      const tree = new MerkleAuditTree();
      for (let i = 0; i < 4; i++) {
        tree.addOperation("rescue", `op${i}`, `ts${i}`);
      }
      for (let i = 0; i < 4; i++) {
        const proof = tree.getProof(i);
        expect(proof).not.toBeNull();
        expect(verifyMerkleProof(proof!)).toBe(true);
      }
    });

    it("proof verifies in 8-leaf tree", () => {
      const tree = new MerkleAuditTree();
      for (let i = 0; i < 8; i++) {
        tree.addOperation("rescue", `op${i}`, `ts${i}`);
      }
      const proof = tree.getProof(5);
      expect(proof).not.toBeNull();
      expect(verifyMerkleProof(proof!)).toBe(true);
      // 8 leaves → 3 siblings (log2(8) = 3)
      expect(proof!.siblings).toHaveLength(3);
    });

    it("proof has O(log n) siblings", () => {
      const tree = new MerkleAuditTree();
      for (let i = 0; i < 16; i++) {
        tree.addOperation("rescue", `op${i}`, `ts${i}`);
      }
      const proof = tree.getProof(0);
      expect(proof!.siblings).toHaveLength(4); // log2(16) = 4
    });

    it("returns null for out-of-range leaf index", () => {
      const tree = new MerkleAuditTree();
      tree.addOperation("rescue", "op0", "ts0");
      expect(tree.getProof(-1)).toBeNull();
      expect(tree.getProof(99)).toBeNull();
    });

    it("tampered root causes verification to fail", () => {
      const tree = new MerkleAuditTree();
      for (let i = 0; i < 4; i++) {
        tree.addOperation("rescue", `op${i}`, `ts${i}`);
      }
      const proof = tree.getProof(1);
      const tampered = { ...proof!, root: "0".repeat(64) };
      expect(verifyMerkleProof(tampered)).toBe(false);
    });

    it("tampered leaf causes verification to fail", () => {
      const tree = new MerkleAuditTree();
      for (let i = 0; i < 4; i++) {
        tree.addOperation("rescue", `op${i}`, `ts${i}`);
      }
      const proof = tree.getProof(0);
      const tampered = {
        ...proof!,
        leaf: { ...proof!.leaf, leafHash: "f".repeat(64) },
      };
      expect(verifyMerkleProof(tampered)).toBe(false);
    });

    it("tampered sibling causes verification to fail", () => {
      const tree = new MerkleAuditTree();
      for (let i = 0; i < 4; i++) {
        tree.addOperation("rescue", `op${i}`, `ts${i}`);
      }
      const proof = tree.getProof(2);
      const badProof = JSON.parse(JSON.stringify(proof));
      badProof.siblings[0].hash = "0".repeat(64);
      expect(verifyMerkleProof(badProof)).toBe(false);
    });
  });

  describe("odd-leaf padding", () => {
    it("handles 3 leaves (odd count) correctly", () => {
      const tree = new MerkleAuditTree();
      for (let i = 0; i < 3; i++) {
        tree.addOperation("rescue", `op${i}`, `ts${i}`);
      }
      for (let i = 0; i < 3; i++) {
        const proof = tree.getProof(i);
        expect(verifyMerkleProof(proof!)).toBe(true);
      }
    });

    it("handles 5 leaves (odd count) correctly", () => {
      const tree = new MerkleAuditTree();
      for (let i = 0; i < 5; i++) {
        tree.addOperation("rescue", `op${i}`, `ts${i}`);
      }
      for (let i = 0; i < 5; i++) {
        const proof = tree.getProof(i);
        expect(verifyMerkleProof(proof!)).toBe(true);
      }
    });
  });

  describe("mixed operation types", () => {
    it("mixes rescue/ghost_run/nonce_scan operations", () => {
      const tree = new MerkleAuditTree();
      tree.addOperation("rescue", "r1");
      tree.addOperation("ghost_run", "g1");
      tree.addOperation("nonce_scan", "n1");
      tree.addOperation("rescue", "r2");

      const stats = tree.getStats();
      expect(stats.totalLeaves).toBe(4);
      const leaves = tree.getLeaves();
      expect(leaves.map(l => l.operationType)).toEqual([
        "rescue",
        "ghost_run",
        "nonce_scan",
        "rescue",
      ]);
    });
  });

  describe("anchor recording", () => {
    it("records anchor after adding operations", () => {
      const tree = new MerkleAuditTree();
      tree.addOperation("rescue", "op0");
      tree.addOperation("rescue", "op1");
      tree.recordAnchor("memo_sig_abc123");

      const stats = tree.getStats();
      expect(stats.anchors).toHaveLength(1);
      expect(stats.anchors[0].anchoredAt).toBe("memo_sig_abc123");
      expect(stats.anchors[0].leafCount).toBe(2);
    });
  });
});
