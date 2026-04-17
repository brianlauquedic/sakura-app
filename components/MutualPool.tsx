"use client";

/**
 * MutualPool.tsx — headline product UI for Sakura Mutual v0.2.
 *
 * The hackathon narrative: "First insurance protocol where claims are
 * settled by math." User deposits premium + stake, locks in a ZK-binding
 * commitment to their lending position, and when the position drifts
 * toward liquidation, the agent submits a Groth16 proof to the on-chain
 * verifier, which atomically moves USDC from the pool to the user's ATA
 * and repays Kamino debt — all in one v0 transaction, no trust required.
 *
 * Three subordinate tech-layers (Nonce Guardian, Ghost Run, Liquidation
 * Shield) are tabs in `app/page.tsx`. This component is the keystone.
 */

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useLang } from "@/contexts/LanguageContext";
import { Connection, PublicKey } from "@solana/web3.js";

type PoolView = {
  admin: string;
  adminAgent: string;
  platformTreasury: string;
  usdcMint: string;
  usdcVault: string;
  totalStakesUsdc: number;
  coverageOutstandingUsdc: number;
  totalClaimsPaidUsdc: number;
  premiumBps: number;
  platformFeeBps: number;
  minStakeMultiplier: number;
  maxCoveragePerUserUsdc: number;
  waitingPeriodSec: number;
  paused: boolean;
};

type PolicyView = {
  user: string;
  coverageCapUsdc: number;
  premiumPaidUsdc: number;
  stakeUsdc: number;
  paidThrough: string;
  boughtAt: string;
  totalClaimedUsdc: number;
  remainingCoverageUsdc: number;
  rescueCount: number;
  commitmentHash: string;
  isActive: boolean;
};

type Status = {
  poolAdmin?: string;
  programId?: string;
  pool: PoolView | null;
  policy: PolicyView | null;
};

const INSURANCE_PROGRAM_ID =
  process.env.NEXT_PUBLIC_INSURANCE_PROGRAM_ID?.trim() ||
  "A91n9X4MxLaeV9NF1K3jC2yet5VhKjTj48wgWQCA7wka";

const POOL_ADMIN =
  process.env.NEXT_PUBLIC_INSURANCE_ADMIN?.trim() ||
  "2iCWnS1J8WYZn4reo9YD76qZiiZ39t2c1oGM3dyYwHNg";

export default function MutualPool({ isDemo }: { isDemo?: boolean }) {
  const { walletAddress } = useWallet();
  const { t } = useLang();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<
    | null
    | {
        txSig?: string;
        txBase64?: string;
        commitmentHash?: string;
        proof?: { a: string; b: string; c: string; publicSignals: string[] };
        error?: string;
      }
  >(null);
  const [claimLoading, setClaimLoading] = useState(false);

  // Poll pool/policy status
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const qs = walletAddress ? `?user=${walletAddress}` : "";
        const res = await fetch(`/api/insurance/status${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as Status;
        if (!cancelled) setStatus(json);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [walletAddress]);

  async function triggerDemoClaim() {
    if (!walletAddress) {
      setClaimResult({ error: "Connect wallet first." });
      return;
    }
    setClaimLoading(true);
    setClaimResult(null);
    try {
      // Demo values — real flow pulls these from live Kamino position + Pyth
      const body = {
        wallet: walletAddress,
        poolAdmin: POOL_ADMIN,
        obligationAddress: walletAddress, // demo — real value is Kamino obligation pubkey
        marketAddress: "",                // no Kamino repay in demo (pure ZK claim)
        rescueUsdc: 100,
        triggerHfBps: 10500,
        collateralAmount: "10000000000",  // 10 SOL in lamports
        debtUsdMicro: "1500000000",       // $1500 in micro-USD
        nonce: "1",
        oraclePriceUsdMicro: "180000000", // $180 SOL (demo)
        oracleSlot: "0",                  // will be updated in real flow
      };
      const res = await fetch("/api/insurance/claim-with-repay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setClaimResult({ error: json.error ?? "claim failed" });
      } else {
        setClaimResult({
          txBase64: json.txBase64,
          commitmentHash: json.commitmentHash,
          proof: json.proof,
        });
      }
    } catch (e) {
      setClaimResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setClaimLoading(false);
    }
  }

  const hasPolicy = !!status?.policy && status.policy.isActive;
  const poolReady = !!status?.pool && !status.pool.paused;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Headline narrative card */}
      <div
        style={{
          padding: 20,
          border: "1px solid var(--accent-mid)",
          background: "var(--accent-soft)",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "var(--accent)",
            marginBottom: 8,
          }}
        >
          SAKURA MUTUAL v0.2 · ZK-SETTLED INSURANCE
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 400,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            letterSpacing: "0.02em",
          }}
        >
          Claims are settled by <em style={{ color: "var(--accent)", fontStyle: "normal" }}>math</em>, not trust.
        </h2>
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Stake USDC, lock a Poseidon commitment to your Kamino position, and
          a Groth16 proof automatically releases a rescue payout when your
          health factor drifts below your chosen trigger. No human approvals,
          no discretion, no counter-party risk — just on-chain{" "}
          <code style={{ color: "var(--accent)" }}>alt_bn128_pairing</code>.
        </p>
      </div>

      {/* Pool state card */}
      <StateCard
        title="POOL STATE"
        loading={loading}
        err={err}
        empty={!status?.pool}
        emptyText={
          isDemo
            ? "Pool not yet initialized on devnet (demo mode)."
            : "Pool not yet initialized. Run `scripts/initialize-insurance-pool.ts`."
        }
      >
        {status?.pool && (
          <Grid
            rows={[
              ["Program", short(INSURANCE_PROGRAM_ID)],
              ["Pool Admin", short(status.pool.admin)],
              ["Total Stakes", `$${fmt(status.pool.totalStakesUsdc)}`],
              ["Coverage Outstanding", `$${fmt(status.pool.coverageOutstandingUsdc)}`],
              ["Claims Paid", `$${fmt(status.pool.totalClaimsPaidUsdc)}`],
              [
                "Premium / Platform Fee",
                `${(status.pool.premiumBps / 100).toFixed(2)}% / ${(status.pool.platformFeeBps / 100).toFixed(2)}%`,
              ],
              [
                "Min Stake Multiplier",
                `${(status.pool.minStakeMultiplier / 100).toFixed(2)}×`,
              ],
              [
                "Waiting Period",
                `${status.pool.waitingPeriodSec}s`,
              ],
              ["Paused", status.pool.paused ? "⚠️ yes" : "no"],
            ]}
          />
        )}
      </StateCard>

      {/* Policy state card */}
      <StateCard
        title="YOUR POLICY"
        loading={loading}
        err={err}
        empty={!hasPolicy}
        emptyText={
          walletAddress
            ? "You don't have an active policy. Buy one to be protected."
            : "Connect a wallet to see your policy."
        }
      >
        {status?.policy && (
          <Grid
            rows={[
              ["Active", status.policy.isActive ? "✓ yes" : "✗ no"],
              ["Coverage Cap", `$${fmt(status.policy.coverageCapUsdc)}`],
              ["Remaining Coverage", `$${fmt(status.policy.remainingCoverageUsdc)}`],
              ["Stake (refundable)", `$${fmt(status.policy.stakeUsdc)}`],
              ["Premium Paid", `$${fmt(status.policy.premiumPaidUsdc)}`],
              ["Commitment (ZK)", status.policy.commitmentHash.slice(0, 18) + "…"],
              ["Rescues Used", String(status.policy.rescueCount)],
              ["Valid Through", status.policy.paidThrough.slice(0, 10)],
            ]}
          />
        )}
      </StateCard>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <ActionButton
          disabled={!walletAddress || !poolReady || hasPolicy}
          onClick={() => {
            // Buy-policy flow is a separate route (not shipped yet).
            alert("buy_policy flow: see scripts/initialize-insurance-pool.ts for admin init; user buy UI wired in v0.3.");
          }}
          label="＋ Buy Policy"
          primary
        />
        <ActionButton
          disabled={!walletAddress || !hasPolicy || claimLoading}
          onClick={triggerDemoClaim}
          label={claimLoading ? "Proving…" : "⚡ Trigger ZK Rescue"}
        />
      </div>

      {/* Claim result */}
      {claimResult && (
        <div
          style={{
            padding: 16,
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--bg-card)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          {claimResult.error ? (
            <div style={{ color: "var(--red, #e66)" }}>✗ {claimResult.error}</div>
          ) : (
            <>
              <div style={{ color: "var(--green)", marginBottom: 8 }}>✓ Groth16 proof generated</div>
              <div>commitment: {claimResult.commitmentHash}</div>
              {claimResult.proof && (
                <>
                  <div>A (64B): {claimResult.proof.a.slice(0, 22)}…</div>
                  <div>B (128B): {claimResult.proof.b.slice(0, 22)}…</div>
                  <div>C (64B): {claimResult.proof.c.slice(0, 22)}…</div>
                  <div style={{ marginTop: 8, color: "var(--text-muted)" }}>
                    Public signals: {claimResult.proof.publicSignals.length} field elements
                  </div>
                </>
              )}
              <div style={{ marginTop: 8, color: "var(--accent)" }}>
                Sign the returned v0 tx with your wallet to submit on-chain.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── tiny subcomponents ─────────────────────────────────────────────────

function StateCard({
  title,
  loading,
  err,
  empty,
  emptyText,
  children,
}: {
  title: string;
  loading: boolean;
  err: string | null;
  empty: boolean;
  emptyText: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--bg-card)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "var(--text-muted)",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {loading && !children ? (
        <Skel />
      ) : err ? (
        <div style={{ fontSize: 12, color: "var(--red, #e66)" }}>✗ {err}</div>
      ) : empty ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{emptyText}</div>
      ) : (
        children
      )}
    </div>
  );
}

function Grid({ rows }: { rows: [string, string][] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(160px, 1fr) auto",
        rowGap: 6,
        columnGap: 16,
        fontSize: 12,
        fontFamily: "var(--font-mono)",
      }}
    >
      {rows.map(([k, v]) => (
        <Row key={k} k={k} v={v} />
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <div style={{ color: "var(--text-muted)" }}>{k}</div>
      <div style={{ color: "var(--text-primary)", textAlign: "right" }}>{v}</div>
    </>
  );
}

function ActionButton({
  onClick,
  label,
  primary,
  disabled,
}: {
  onClick: () => void;
  label: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 16px",
        borderRadius: 8,
        border: primary ? "1px solid var(--accent)" : "1px solid var(--border)",
        background: primary ? "var(--accent-soft)" : "var(--bg-card)",
        color: primary ? "var(--accent)" : "var(--text-primary)",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "0.04em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "var(--font-body)",
      }}
    >
      {label}
    </button>
  );
}

function Skel() {
  return (
    <div
      style={{
        height: 80,
        background: "linear-gradient(90deg, var(--bg-card), var(--border), var(--bg-card))",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.2s infinite",
        borderRadius: 6,
      }}
    />
  );
}

// ── utils ─────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function short(s: string): string {
  return s.length > 16 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}
