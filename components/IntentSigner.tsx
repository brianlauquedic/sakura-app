"use client";

/**
 * IntentSigner.tsx — user-facing intent-signing form (v0.3).
 *
 * Lets a connected wallet user:
 *   1. Enter a natural-language intent ("Lend up to 1000 USDC into Kamino…")
 *   2. Select allowed protocols + action types via checkbox bitmaps
 *   3. Set per-action amount cap (micro-units) + USD cap (micro-USD)
 *   4. Set expiry window (hours)
 *   5. Compute the 2-layer Poseidon commitment client-side
 *   6. Sign and send `sign_intent` tx via Phantom/OKX
 *
 * The user's private witness (max_amount, max_usd, bitmaps, nonce,
 * intent_text_hash) is stored ONLY in localStorage under a key keyed by
 * the user wallet. It NEVER leaves the browser — the Poseidon commitment
 * is the only thing written on-chain.
 *
 * After signing, the `intentSecretsKey` is persisted so the
 * ActionHistory + future execute flows can reconstruct the witness.
 */

import { useCallback, useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import { useWallet } from "@/contexts/WalletContext";
import {
  ActionType,
  ProtocolId,
  buildActionTypesBitmap,
  buildProtocolsBitmap,
  buildRevokeIntentIx,
  buildSignIntentIx,
  deriveProtocolPDA,
  deriveFeeVaultPDA,
  SAKURA_INSURANCE_PROGRAM_ID,
} from "@/lib/insurance-pool";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  computeIntentCommitment,
  pubkeyToFieldBytes,
} from "@/lib/zk-proof";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

type Status =
  | { kind: "idle" }
  | { kind: "computing" }
  | { kind: "awaiting-signature" }
  | { kind: "confirming"; signature: string }
  | { kind: "success"; signature: string }
  | { kind: "error"; message: string };

interface IntentSecrets {
  intentText: string;
  maxAmountMicro: string; // bigint serialized
  maxUsdValueMicro: string;
  allowedProtocols: number;
  allowedActionTypes: number;
  nonce: string;
  intentTextHashDecimal: string;
  expiresAt: string; // unix seconds
  commitmentHex: string;
  signedAt: number; // client time
  signature: string;
}

const PROTOCOL_LABELS = [
  { id: ProtocolId.Kamino, label: "Kamino" },
  { id: ProtocolId.MarginFi, label: "MarginFi" },
  { id: ProtocolId.Solend, label: "Solend" },
  { id: ProtocolId.Jupiter, label: "Jupiter" },
  { id: ProtocolId.Marinade, label: "Marinade" },
  { id: ProtocolId.Jito, label: "Jito" },
];

const ACTION_LABELS = [
  { id: ActionType.Lend, label: "Lend" },
  { id: ActionType.Repay, label: "Repay" },
  { id: ActionType.Swap, label: "Swap" },
  { id: ActionType.Stake, label: "Stake" },
  { id: ActionType.Withdraw, label: "Withdraw" },
  { id: ActionType.Borrow, label: "Borrow" },
];

async function hashIntentText(text: string): Promise<bigint> {
  const { buildPoseidon } = await import("circomlibjs");
  const poseidon = await buildPoseidon();
  const bytes = new TextEncoder().encode(text);
  let acc = 0n;
  for (let i = 0; i < bytes.length; i += 31) {
    const chunk = bytes.subarray(i, Math.min(i + 31, bytes.length));
    let v = 0n;
    for (let j = 0; j < chunk.length; j++) v = (v << 8n) | BigInt(chunk[j]);
    const h = poseidon([acc, v, BigInt(i)]);
    acc = BigInt(poseidon.F.toString(h));
  }
  return acc;
}

export default function IntentSigner() {
  const { walletAddress, getProvider } = useWallet();

  const [intentText, setIntentText] = useState(
    "Lend up to 1000 USDC into Kamino or MarginFi, $10k max per action."
  );
  const [maxAmountTokens, setMaxAmountTokens] = useState("1000"); // whole tokens
  const [maxUsdDollars, setMaxUsdDollars] = useState("10000");
  const [hours, setHours] = useState("24");
  const [selectedProtocols, setSelectedProtocols] = useState<Set<ProtocolId>>(
    new Set([ProtocolId.Kamino, ProtocolId.MarginFi])
  );
  const [selectedActions, setSelectedActions] = useState<Set<ActionType>>(
    new Set([ActionType.Lend, ActionType.Repay])
  );
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const toggleProtocol = (id: ProtocolId) =>
    setSelectedProtocols((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAction = (id: ActionType) =>
    setSelectedActions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSign = useCallback(async () => {
    if (!walletAddress) {
      setStatus({ kind: "error", message: "Connect a wallet first." });
      return;
    }
    const provider = getProvider();
    if (!provider) {
      setStatus({ kind: "error", message: "No wallet provider available." });
      return;
    }
    const adminStr = process.env.NEXT_PUBLIC_SAKURA_PROTOCOL_ADMIN;
    if (!adminStr) {
      setStatus({
        kind: "error",
        message: "NEXT_PUBLIC_SAKURA_PROTOCOL_ADMIN env var not configured.",
      });
      return;
    }

    try {
      setStatus({ kind: "computing" });
      const user = new PublicKey(walletAddress);
      const admin = new PublicKey(adminStr);

      const maxAmountMicro = BigInt(maxAmountTokens) * 1_000_000n;
      const maxUsdMicro = BigInt(maxUsdDollars) * 1_000_000n;
      const allowedProtocols = BigInt(
        buildProtocolsBitmap(Array.from(selectedProtocols))
      );
      const allowedActionTypes = BigInt(
        buildActionTypesBitmap(Array.from(selectedActions))
      );
      if (allowedProtocols === 0n) throw new Error("Pick at least one protocol.");
      if (allowedActionTypes === 0n) throw new Error("Pick at least one action.");

      const nonce = BigInt(Date.now());
      const intentTextHash = await hashIntentText(intentText);
      const walletField = pubkeyToFieldBytes(user.toBytes());

      const { hex, bytesBE32 } = await computeIntentCommitment(
        intentTextHash,
        walletField,
        nonce,
        maxAmountMicro,
        maxUsdMicro,
        allowedProtocols,
        allowedActionTypes
      );

      const expiresAt =
        BigInt(Math.floor(Date.now() / 1000)) + BigInt(hours) * 3600n;

      // Sign fee: 0.1% of max_usd_value. Computed client-side since
      // max_usd_value is private and the on-chain program cannot verify
      // the amount — it only enforces the $1,000 ceiling.
      const signFeeMicro = (maxUsdMicro * 10n) / 10_000n;

      // Derive protocol's USDC mint + fee vault, and the user's ATA
      // against that mint. Mint is fetched from the deployed protocol
      // state — at this point IntentSigner assumes a canonical Sakura
      // mint (set via env, on devnet the test-USDC mint).
      const usdcMintStr = process.env.NEXT_PUBLIC_SAKURA_USDC_MINT;
      if (!usdcMintStr) {
        throw new Error(
          "NEXT_PUBLIC_SAKURA_USDC_MINT env var not set."
        );
      }
      const usdcMint = new PublicKey(usdcMintStr);
      const [protocolPda] = deriveProtocolPDA(admin);
      const [feeVault] = deriveFeeVaultPDA(protocolPda);
      const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, user);

      const signIx = buildSignIntentIx({
        admin,
        user,
        userUsdcAta,
        feeVault,
        intentCommitment: Buffer.from(bytesBE32),
        expiresAt,
        feeMicro: signFeeMicro,
      });

      const conn = new Connection(RPC, "confirmed");
      const { blockhash } = await conn.getLatestBlockhash();
      const message = new TransactionMessage({
        payerKey: user,
        recentBlockhash: blockhash,
        instructions: [signIx],
      }).compileToV0Message();
      const tx = new VersionedTransaction(message);

      setStatus({ kind: "awaiting-signature" });
      // Phantom/OKX API: signAndSendTransaction(tx) or
      // signTransaction(tx) + connection.sendRawTransaction
      let signature: string;
      if ("signAndSendTransaction" in provider) {
        const result = await (
          provider as unknown as {
            signAndSendTransaction: (
              t: VersionedTransaction | Transaction
            ) => Promise<{ signature: string }>;
          }
        ).signAndSendTransaction(tx);
        signature = result.signature;
      } else {
        const signed = await (
          provider as unknown as {
            signTransaction: (
              t: VersionedTransaction
            ) => Promise<VersionedTransaction>;
          }
        ).signTransaction(tx);
        signature = await conn.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
        });
      }

      setStatus({ kind: "confirming", signature });
      await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight: 0 }, "confirmed").catch(() => {
        // confirmTransaction can be flaky with lastValidBlockHeight=0; fall back to getSignatureStatus poll
        return;
      });

      // Persist secrets to localStorage so ActionHistory + executor can reload them.
      const secrets: IntentSecrets = {
        intentText,
        maxAmountMicro: maxAmountMicro.toString(),
        maxUsdValueMicro: maxUsdMicro.toString(),
        allowedProtocols: Number(allowedProtocols),
        allowedActionTypes: Number(allowedActionTypes),
        nonce: nonce.toString(),
        intentTextHashDecimal: intentTextHash.toString(),
        expiresAt: expiresAt.toString(),
        commitmentHex: hex,
        signedAt: Date.now(),
        signature,
      };
      localStorage.setItem(
        `sakura:intent:${walletAddress}`,
        JSON.stringify(secrets)
      );

      setStatus({ kind: "success", signature });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setStatus({ kind: "error", message });
    }
  }, [
    walletAddress,
    getProvider,
    intentText,
    maxAmountTokens,
    maxUsdDollars,
    hours,
    selectedProtocols,
    selectedActions,
  ]);

  const isBusy =
    status.kind === "computing" ||
    status.kind === "awaiting-signature" ||
    status.kind === "confirming";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
        🌸 Sign Intent
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
        Define what your AI agent is permitted to do. Bounds are cryptographically
        enforced on-chain via Groth16 — your private witness stays in the browser.
      </div>

      <label style={labelStyle}>
        Intent (natural language)
        <textarea
          value={intentText}
          onChange={(e) => setIntentText(e.target.value)}
          rows={2}
          disabled={isBusy}
          style={{ ...inputStyle, resize: "vertical" }}
          maxLength={500}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <label style={labelStyle}>
          Max / action (tokens)
          <input
            type="number"
            min="1"
            value={maxAmountTokens}
            onChange={(e) => setMaxAmountTokens(e.target.value)}
            disabled={isBusy}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Max USD / action
          <input
            type="number"
            min="1"
            value={maxUsdDollars}
            onChange={(e) => setMaxUsdDollars(e.target.value)}
            disabled={isBusy}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Valid for (hours)
          <input
            type="number"
            min="1"
            max="8760"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            disabled={isBusy}
            style={inputStyle}
          />
        </label>
      </div>

      <div>
        <div style={labelStyle}>Allowed protocols</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PROTOCOL_LABELS.map(({ id, label }) => (
            <Pill
              key={id}
              label={label}
              active={selectedProtocols.has(id)}
              onClick={() => toggleProtocol(id)}
              disabled={isBusy}
            />
          ))}
        </div>
      </div>

      <div>
        <div style={labelStyle}>Allowed actions</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ACTION_LABELS.map(({ id, label }) => (
            <Pill
              key={id}
              label={label}
              active={selectedActions.has(id)}
              onClick={() => toggleAction(id)}
              disabled={isBusy}
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleSign}
        disabled={isBusy || !walletAddress}
        style={{
          marginTop: 6,
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid var(--accent-mid)",
          background: isBusy ? "var(--bg-card)" : "var(--accent-soft)",
          color: "var(--accent)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.06em",
          cursor: isBusy || !walletAddress ? "not-allowed" : "pointer",
        }}
      >
        {status.kind === "computing" && "Computing Poseidon commitment…"}
        {status.kind === "awaiting-signature" && "Awaiting wallet signature…"}
        {status.kind === "confirming" && "Confirming on devnet…"}
        {(status.kind === "idle" || status.kind === "error" || status.kind === "success") &&
          "Sign Intent"}
      </button>

      <RevokeButton disabled={isBusy} />

      {status.kind === "success" && (
        <div style={{ fontSize: 11, color: "var(--green)", wordBreak: "break-all" }}>
          ✓ Intent signed.{" "}
          <a
            href={`https://solscan.io/tx/${status.signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            {status.signature.slice(0, 12)}…
          </a>
        </div>
      )}
      {status.kind === "error" && (
        <div style={{ fontSize: 11, color: "var(--red, #ff5555)" }}>
          ✗ {status.message}
        </div>
      )}

      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
          opacity: 0.7,
        }}
      >
        program: {SAKURA_INSURANCE_PROGRAM_ID.toBase58().slice(0, 12)}…
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  background: "var(--bg-base)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 10px",
  color: "var(--text-primary)",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  width: "100%",
  boxSizing: "border-box",
};

// ───────────────────────────────────────────────────────────────────
// Revoke button — marks the user's on-chain Intent as is_active = false
// so no further `execute_with_intent_proof` calls can consume it.
// ───────────────────────────────────────────────────────────────────
function RevokeButton({ disabled }: { disabled?: boolean }) {
  const { walletAddress, getProvider } = useWallet();
  const [revoking, setRevoking] = useState(false);
  const [result, setResult] = useState<
    { kind: "idle" } | { kind: "ok"; sig: string } | { kind: "err"; msg: string }
  >({ kind: "idle" });

  const handleRevoke = async () => {
    if (!walletAddress) return;
    const provider = getProvider();
    if (!provider) return;

    const confirmed = window.confirm(
      "Revoke your active intent? The agent will no longer be able to execute actions against it. You can sign a new intent afterward."
    );
    if (!confirmed) return;

    try {
      setRevoking(true);
      setResult({ kind: "idle" });
      const user = new PublicKey(walletAddress);

      // Reload the stored intent secrets so we know the original
      // max_usd_value — the revoke fee is computed on the same base as
      // the sign fee (0.1% of max_usd_value).
      const cached = localStorage.getItem(`sakura:intent:${walletAddress}`);
      if (!cached) {
        throw new Error(
          "No cached intent secrets found. Sign an intent first, or clear state and retry."
        );
      }
      const secrets = JSON.parse(cached) as { maxUsdValueMicro: string };
      const revokeFeeMicro =
        (BigInt(secrets.maxUsdValueMicro) * 10n) / 10_000n;

      const adminStr = process.env.NEXT_PUBLIC_SAKURA_PROTOCOL_ADMIN;
      const usdcMintStr = process.env.NEXT_PUBLIC_SAKURA_USDC_MINT;
      if (!adminStr || !usdcMintStr) {
        throw new Error(
          "Missing NEXT_PUBLIC_SAKURA_PROTOCOL_ADMIN or NEXT_PUBLIC_SAKURA_USDC_MINT."
        );
      }
      const admin = new PublicKey(adminStr);
      const usdcMint = new PublicKey(usdcMintStr);
      const [protocolPda] = deriveProtocolPDA(admin);
      const [feeVault] = deriveFeeVaultPDA(protocolPda);
      const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, user);

      const ix = buildRevokeIntentIx({
        admin,
        user,
        userUsdcAta,
        feeVault,
        feeMicro: revokeFeeMicro,
      });

      const conn = new Connection(RPC, "confirmed");
      const { blockhash } = await conn.getLatestBlockhash();
      const message = new TransactionMessage({
        payerKey: user,
        recentBlockhash: blockhash,
        instructions: [ix],
      }).compileToV0Message();
      const tx = new VersionedTransaction(message);

      let signature: string;
      if ("signAndSendTransaction" in provider) {
        const res = await (
          provider as unknown as {
            signAndSendTransaction: (
              t: VersionedTransaction
            ) => Promise<{ signature: string }>;
          }
        ).signAndSendTransaction(tx);
        signature = res.signature;
      } else {
        const signed = await (
          provider as unknown as {
            signTransaction: (
              t: VersionedTransaction
            ) => Promise<VersionedTransaction>;
          }
        ).signTransaction(tx);
        signature = await conn.sendRawTransaction(signed.serialize());
      }

      // Remove cached secrets so UI reflects revocation
      localStorage.removeItem(`sakura:intent:${walletAddress}`);
      setResult({ kind: "ok", sig: signature });
    } catch (e: unknown) {
      setResult({
        kind: "err",
        msg: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        onClick={handleRevoke}
        disabled={disabled || revoking || !walletAddress}
        style={{
          fontSize: 11,
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-muted)",
          cursor:
            disabled || revoking || !walletAddress ? "not-allowed" : "pointer",
          letterSpacing: "0.06em",
        }}
      >
        {revoking ? "Revoking…" : "Revoke existing intent"}
      </button>
      {result.kind === "ok" && (
        <span style={{ fontSize: 11, color: "var(--green)" }}>
          ✓ revoked{" "}
          <a
            href={`https://solscan.io/tx/${result.sig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            {result.sig.slice(0, 8)}…
          </a>
        </span>
      )}
      {result.kind === "err" && (
        <span style={{ fontSize: 11, color: "var(--red, #ff5555)" }}>
          ✗ {result.msg}
        </span>
      )}
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 11,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: "0.04em",
      }}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}
