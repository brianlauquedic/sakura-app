/**
 * lib/adapters/kamino.ts — Kamino Lending adapter
 *
 * STATUS (2026-04-22): CPI integration in progress. This file currently
 * produces Memo-based ixs with full action parameters so the on-chain
 * audit trail works end-to-end. Full CPI instructions require the
 * `@kamino-finance/klend-sdk` integration below.
 *
 * Why not yet finished: Kamino's SDK uses the new `@solana/kit` type
 * system (`Address`, `Rpc`, `TransactionSigner`). Our codebase uses
 * classic `@solana/web3.js` (`PublicKey`, `Connection`,
 * `TransactionInstruction`). Bridging requires ~300 LOC of type-shim,
 * kit RPC client bootstrapping, and per-ix conversion. Planned for a
 * dedicated commit after Jito + Raydium + Jupiter Lend ship.
 *
 * SDK integration path (for future commit):
 *   ```ts
 *   import { KaminoMarket, KaminoAction } from "@kamino-finance/klend-sdk";
 *   import { fromLegacyPublicKey } from "@solana/compat";
 *   import { createSolanaRpc } from "@solana/kit";
 *
 *   const rpc = createSolanaRpc(rpcUrl);
 *   const marketAddress = fromLegacyPublicKey(KAMINO_MAIN_MARKET);
 *   const market = await KaminoMarket.load(rpc, marketAddress, SLOT_DURATION_MS);
 *   const obligation = await market.getUserVanillaObligation(ownerAddress);
 *   const action = await KaminoAction.buildDepositTxns(
 *     market, amount, mintAddress, signerStub, obligation,
 *     true, undefined, 0, true, false
 *   );
 *   // action.computeBudgetIxs, setupIxs, lendingIxs, cleanupIxs
 *   // are Array<Instruction> (kit type) — convert each to TransactionInstruction.
 *   ```
 *
 * Mainnet constants:
 *   Program:       KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
 *   Main Market:   7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF
 *   USDC Reserve:  D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59 (main market)
 *   SOL Reserve:   d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q (main market)
 *
 * References:
 *   - Kamino SDK: https://github.com/Kamino-Finance/klend-sdk
 *   - Kamino API: https://api.kamino.finance/openapi/json
 *   - Main market: https://api.kamino.finance/kamino-market/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF
 */

import {
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

export const KAMINO_LEND_PROGRAM_ID = new PublicKey(
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
);
export const KAMINO_MAIN_MARKET = new PublicKey(
  "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"
);
export const KAMINO_MAIN_USDC_RESERVE = new PublicKey(
  "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59"
);
export const KAMINO_MAIN_SOL_RESERVE = new PublicKey(
  "d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q"
);

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

/** Audit-trail-shaped Memo that encodes the intended Kamino action.
 *  Replace with buildKaminoDepositIx (etc.) once klend-sdk is wired in. */
function buildKaminoActionMemo(
  user: PublicKey,
  action: "lend" | "borrow" | "repay" | "withdraw",
  mint: PublicKey,
  amountMicro: bigint
): TransactionInstruction {
  const payload =
    `sakura:v1:Kamino:${action}:` +
    `user=${user.toBase58()}:mint=${mint.toBase58()}:amount=${amountMicro}`;
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: user, isSigner: true, isWritable: false }],
    data: Buffer.from(payload, "utf8"),
  });
}

// ── Public API (stable contract — implementation switches from Memo to
//    SDK-driven CPI without changing the signatures below) ────────────

export interface KaminoActionParams {
  user: PublicKey;
  mint: PublicKey;
  amountMicro: bigint;
}

export async function buildKaminoLend(
  p: KaminoActionParams
): Promise<TransactionInstruction[]> {
  return [buildKaminoActionMemo(p.user, "lend", p.mint, p.amountMicro)];
}

export async function buildKaminoBorrow(
  p: KaminoActionParams
): Promise<TransactionInstruction[]> {
  return [buildKaminoActionMemo(p.user, "borrow", p.mint, p.amountMicro)];
}

export async function buildKaminoRepay(
  p: KaminoActionParams
): Promise<TransactionInstruction[]> {
  return [buildKaminoActionMemo(p.user, "repay", p.mint, p.amountMicro)];
}

export async function buildKaminoWithdraw(
  p: KaminoActionParams
): Promise<TransactionInstruction[]> {
  return [buildKaminoActionMemo(p.user, "withdraw", p.mint, p.amountMicro)];
}
