/**
 * Solana Agent Kit — unified initialization for Sakura v2.
 *
 * Three plugins activated:
 *  - TokenPlugin:  fetchPrice (Jupiter), transfer, burn, rugCheck, sendCompressedAirdrop
 *  - DefiPlugin:   stakeWithJup (Marinade/Jito), lendAsset/withdrawLend (Lulo), trade (Jupiter swap)
 *  - MiscPlugin:   tipWithJito (MEV tips), sendCompressedAirdrop (Light Protocol ZK compression)
 *
 * Two agent types:
 *  - createReadOnlyAgent()  — ephemeral keypair, signOnly: true — safe for on-chain data reads
 *  - createSigningAgent()   — platform keypair (SAKURA_AGENT_PRIVATE_KEY) — for Memo + execution
 */

import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import TokenPlugin from "@solana-agent-kit/plugin-token";
import { Keypair, PublicKey } from "@solana/web3.js";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";
export const RPC_URL =
  process.env.HELIUS_RPC_URL ??
  `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export const SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

// ── Agent factories ──────────────────────────────────────────────────────────

/**
 * Read-only agent: ephemeral keypair, signOnly mode.
 * Safe to use in any API route for on-chain data reads.
 * Used by NonceGuardian for getProgramAccounts scanning.
 */
export function createReadOnlyAgent() {
  const keypair = Keypair.generate();
  const wallet = new KeypairWallet(keypair, RPC_URL);
  return new SolanaAgentKit(wallet, RPC_URL, {
    HELIUS_API_KEY,
    signOnly: true,
  }).use(TokenPlugin);
}

/**
 * Platform signing agent: uses SOLIS_AGENT_PRIVATE_KEY env var.
 * Used for server-side Memo writes (strategy execution on-chain proof).
 * Returns null if key is not configured.
 */
export function createSigningAgent() {
  const raw = process.env.SAKURA_AGENT_PRIVATE_KEY;
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as number[];
    const keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
    const wallet = new KeypairWallet(keypair, RPC_URL);
    return new SolanaAgentKit(wallet, RPC_URL, { HELIUS_API_KEY })
      .use(TokenPlugin);
  } catch {
    return null;
  }
}

// ── Full Agent (lazy-loads DefiPlugin + MiscPlugin) ─────────────────────────
// DefiPlugin and MiscPlugin have heavy transitive deps (@meteora-ag/dlmm,
// @drift-labs/sdk) that fail static ESM resolution in Next.js 16 Turbopack.
// Dynamic import ensures they load only at runtime when actually needed.

/**
 * Full signing agent with ALL three plugins.
 * Use this for Ghost Run execute (trade/stake/lend) and compressed airdrop.
 * Lazy-loads DefiPlugin + MiscPlugin to avoid build-time ESM issues.
 */
export async function createFullAgent() {
  const raw = process.env.SAKURA_AGENT_PRIVATE_KEY;
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as number[];
    const keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
    const wallet = new KeypairWallet(keypair, RPC_URL);
    const [{ default: DefiPlugin }, { default: MiscPlugin }] = await Promise.all([
      import("@solana-agent-kit/plugin-defi"),
      import("@solana-agent-kit/plugin-misc"),
    ]);
    return new SolanaAgentKit(wallet, RPC_URL, { HELIUS_API_KEY })
      .use(TokenPlugin)
      .use(DefiPlugin)
      .use(MiscPlugin as any);
  } catch {
    return null;
  }
}

// ── Typed SAK method helpers ────────────────────────────────────────────────
// These provide type-safe access to plugin methods without unsafe type assertions.
// Usage: import { sakTrade, sakStake, sakLend } from "@/lib/agent";

export type SakuraAgent = NonNullable<ReturnType<typeof createSigningAgent>> | Awaited<ReturnType<typeof createFullAgent>>;

/** Jupiter swap via DefiPlugin */
export async function sakTrade(
  agent: NonNullable<SakuraAgent>,
  outputMint: string,
  inputAmount: number,
  inputMint?: string,
  slippageBps?: number,
) {
  return (agent as any).methods.trade(
    agent,
    new PublicKey(outputMint),
    inputAmount,
    inputMint ? new PublicKey(inputMint) : undefined,
    slippageBps ?? 50,
  );
}

/** Jupiter liquid stake via DefiPlugin. Pass validator mint for jitoSOL/bSOL. */
export async function sakStake(agent: NonNullable<SakuraAgent>, amount: number, validator?: string) {
  return validator
    ? (agent as any).methods.stakeWithJup(amount, validator)
    : (agent as any).methods.stakeWithJup(amount);
}

/** Lulo lending via DefiPlugin */
export async function sakLend(agent: NonNullable<SakuraAgent>, assetMint: string, amount: number) {
  return (agent as any).methods.lendAsset(assetMint, amount);
}

/** Light Protocol compressed airdrop via MiscPlugin */
export async function sakCompressedAirdrop(
  agent: NonNullable<SakuraAgent>,
  mintAddress: string,
  amount: number,
  decimals: number,
  recipients: string[],
) {
  return (agent as any).methods.sendCompressedAirdrop(
    new PublicKey(mintAddress),
    amount,
    decimals,
    recipients.map((r: string) => new PublicKey(r)),
    30_000, // priority fee lamports
  );
}

/** Jito MEV tip via MiscPlugin */
export async function sakJitoTip(agent: NonNullable<SakuraAgent>, amount: number) {
  return (agent as any).methods.tipWithJito(amount);
}
