"use client";

/**
 * ActionHistory.tsx — on-chain audit trail of the user's agent-executed actions.
 *
 * Fetches:
 *   - User's Intent PDA (active / expired / revoked)
 *   - All ActionRecord PDAs seeded by (intent, action_nonce), via
 *     `getProgramAccounts` with memcmp filter on the intent field.
 *
 * Rendered as a reverse-chronological feed — each row shows action type,
 * target protocol, amount, oracle price at the time, and a link to the
 * Solscan tx + a truncated keccak256 proof fingerprint.
 *
 * Intentionally simple: auto-refreshes every 15s via setInterval. No SWR
 * or server component — keeps the component self-contained for the demo.
 */

import { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useWallet } from "@/contexts/WalletContext";
import {
  ActionType,
  ProtocolId,
  SAKURA_INSURANCE_PROGRAM_ID,
  deriveIntentPDA,
  deserializeActionRecord,
  deserializeIntent,
  fetchIntent,
  type ActionRecordState,
  type IntentState,
} from "@/lib/insurance-pool";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";
const ACCT_ACTION_RECORD_DISCRIMINATOR_HEX = "action-record"; // resolved at runtime below

// Account discriminator for ActionRecord — computed once, cached.
let ACCT_DISC: Buffer | null = null;
async function getActionRecordDiscriminator(): Promise<Buffer> {
  if (ACCT_DISC) return ACCT_DISC;
  // Mirror of `sha256("account:ActionRecord").subarray(0, 8)` — but we can
  // also just pull it lazily from the lib via any helper. For simplicity
  // compute here with the Web Crypto API.
  const buf = new TextEncoder().encode("account:ActionRecord");
  const hash = await crypto.subtle.digest("SHA-256", buf);
  ACCT_DISC = Buffer.from(new Uint8Array(hash).slice(0, 8));
  return ACCT_DISC;
}

interface ActionRow {
  pda: string;
  state: ActionRecordState;
}

export default function ActionHistory() {
  const { walletAddress } = useWallet();
  const [intent, setIntent] = useState<IntentState | null>(null);
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const conn = new Connection(RPC, "confirmed");
      const user = new PublicKey(walletAddress);

      // 1. Intent PDA
      const { pda: intentPda, state: intentState } = await fetchIntent(conn, user);
      setIntent(intentState);

      if (!intentState) {
        setRows([]);
        return;
      }

      // 2. All ActionRecord PDAs for this intent, via getProgramAccounts
      //    filtered by (discriminator, intent pubkey at offset 8).
      const disc = await getActionRecordDiscriminator();
      const accounts = await conn.getProgramAccounts(
        SAKURA_INSURANCE_PROGRAM_ID,
        {
          commitment: "confirmed",
          filters: [
            { memcmp: { offset: 0, bytes: bs58Encode(disc) } },
            { memcmp: { offset: 8, bytes: intentPda.toBase58() } },
          ],
        }
      );

      const parsed: ActionRow[] = [];
      for (const { pubkey, account } of accounts) {
        const state = deserializeActionRecord(Buffer.from(account.data));
        if (state) parsed.push({ pda: pubkey.toBase58(), state });
      }
      // Most recent first (by ts)
      parsed.sort((a, b) => Number(b.state.ts - a.state.ts));
      setRows(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!walletAddress) {
    return (
      <div style={cardStyle}>
        <div style={titleStyle}>📜 Action History</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Connect a wallet to load your signed intent and executed actions.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={titleStyle}>📜 Action History</div>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            fontSize: 11,
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            borderRadius: 6,
            padding: "4px 8px",
            cursor: loading ? "wait" : "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {loading ? "↻" : "refresh"}
        </button>
      </div>

      <IntentSummary intent={intent} />

      {error && (
        <div style={{ fontSize: 11, color: "var(--red, #ff5555)", marginTop: 8 }}>
          ✗ {error}
        </div>
      )}

      {intent && rows.length === 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 10,
            fontStyle: "italic",
          }}
        >
          No agent actions executed against this intent yet.
        </div>
      )}

      {rows.length > 0 && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 380,
            overflowY: "auto",
          }}
        >
          {rows.map((r) => (
            <ActionRowView key={r.pda} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function IntentSummary({ intent }: { intent: IntentState | null }) {
  if (!intent) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        No active intent. Sign one above to grant your agent bounded execution.
      </div>
    );
  }
  const expiresMs = Number(intent.expiresAt) * 1000;
  const expired = expiresMs < Date.now();
  const active = intent.isActive && !expired;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto 1fr",
        gap: "4px 10px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 10,
      }}
    >
      <span style={metaLabel}>status</span>
      <span style={{ color: active ? "var(--green)" : "var(--text-muted)" }}>
        {intent.isActive
          ? expired
            ? "expired"
            : "active"
          : "revoked"}
      </span>
      <span style={metaLabel}>actions</span>
      <span>{intent.actionsExecuted.toString()}</span>

      <span style={metaLabel}>expires</span>
      <span>
        {new Date(expiresMs).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span style={metaLabel}>commitment</span>
      <span style={{ wordBreak: "break-all", opacity: 0.7 }}>
        0x{Buffer.from(intent.intentCommitment).toString("hex").slice(0, 16)}…
      </span>
    </div>
  );
}

function ActionRowView({ row }: { row: ActionRow }) {
  const s = row.state;
  const tsMs = Number(s.ts) * 1000;
  const priceUsd = Number(s.oraclePriceUsdMicro) / 1e6;
  return (
    <div
      style={{
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "8px 10px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "2px 10px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
      }}
    >
      <span style={{ color: "var(--accent)", fontWeight: 600 }}>
        {ActionType[s.actionType] ?? `action#${s.actionType}`} →{" "}
        {ProtocolId[s.actionTargetIndex] ?? `protocol#${s.actionTargetIndex}`}
      </span>
      <span style={{ color: "var(--text-muted)", textAlign: "right" }}>
        {new Date(tsMs).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span style={{ gridColumn: "1 / -1", color: "var(--text-muted)" }}>
        amount ={" "}
        <span style={{ color: "var(--text-primary)" }}>
          {(Number(s.actionAmount) / 1e6).toLocaleString()} micro-units
        </span>{" "}
        · oracle ${priceUsd.toFixed(2)} @ slot {s.oracleSlot.toString()} · fp{" "}
        0x{s.proofFingerprint.toString("hex").slice(0, 10)}…
      </span>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
};
const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "var(--text-primary)",
};
const metaLabel: React.CSSProperties = {
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 10,
};

// ── minimal base58 encoder for the memcmp filter ─────────────────────
// (the @solana/web3.js PublicKey input to getProgramAccounts memcmp
// expects base58; we base58-encode the 8-byte discriminator manually
// to avoid importing bs58.)

function bs58Encode(bytes: Buffer): string {
  const ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = "";
  while (n > 0n) {
    const rem = Number(n % 58n);
    n = n / 58n;
    out = ALPHABET[rem] + out;
  }
  // leading zero-bytes → leading '1's
  for (const b of bytes) {
    if (b === 0) out = "1" + out;
    else break;
  }
  return out;
}
