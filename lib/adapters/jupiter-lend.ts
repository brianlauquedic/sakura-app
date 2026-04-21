/**
 * lib/adapters/jupiter-lend.ts — Jupiter Lend (Earn + Borrow) adapter
 *
 * STATUS (2026-04-22): Same shape as lib/adapters/kamino.ts — currently
 * produces Memo-based audit-trail ixs; full CPI integration ships in a
 * follow-up commit using @jup-ag/lend SDK.
 *
 * Jupiter Lend launched Aug 2025 and reached $1.65B TVL by Oct 2025,
 * making it the #1 Solana lending product by Grid gridRank (88) — ahead
 * of Kamino (32). Both protocols ship side-by-side.
 *
 * SDK integration path (for follow-up commit):
 *   ```bash
 *   pnpm add @jup-ag/lend
 *   ```
 *   ```ts
 *   import { getDepositIxs, getWithdrawIxs } from "@jup-ag/lend/earn";
 *   import { getOperateIx } from "@jup-ag/lend/borrow";
 *
 *   // Earn (Lend/Withdraw on supply side):
 *   const ixs = await getDepositIxs({
 *     connection, owner, vaultMint: mint, amount
 *   });
 *
 *   // Borrow (collateralised Borrow / Repay):
 *   const ixs = await getOperateIx({
 *     connection, owner, marketMint, amount,
 *     operation: "borrow" | "repay" | "deposit-collateral" | "withdraw-collateral"
 *   });
 *   ```
 *
 * API endpoints (unsigned-tx preview): https://dev.jup.ag/docs/lend
 *
 * References:
 *   - Docs:   https://dev.jup.ag/docs/lend
 *   - SDK:    https://www.npmjs.com/package/@jup-ag/lend
 *   - GitHub: https://github.com/jup-ag/jupiter-lend
 */

import {
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

function buildJupiterLendActionMemo(
  user: PublicKey,
  action: "lend" | "borrow" | "repay" | "withdraw",
  mint: PublicKey,
  amountMicro: bigint
): TransactionInstruction {
  const payload =
    `sakura:v1:JupiterLend:${action}:` +
    `user=${user.toBase58()}:mint=${mint.toBase58()}:amount=${amountMicro}`;
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: user, isSigner: true, isWritable: false }],
    data: Buffer.from(payload, "utf8"),
  });
}

export interface JupiterLendActionParams {
  user: PublicKey;
  mint: PublicKey;
  amountMicro: bigint;
}

export async function buildJupiterLendLend(
  p: JupiterLendActionParams
): Promise<TransactionInstruction[]> {
  return [buildJupiterLendActionMemo(p.user, "lend", p.mint, p.amountMicro)];
}

export async function buildJupiterLendBorrow(
  p: JupiterLendActionParams
): Promise<TransactionInstruction[]> {
  return [buildJupiterLendActionMemo(p.user, "borrow", p.mint, p.amountMicro)];
}

export async function buildJupiterLendRepay(
  p: JupiterLendActionParams
): Promise<TransactionInstruction[]> {
  return [buildJupiterLendActionMemo(p.user, "repay", p.mint, p.amountMicro)];
}

export async function buildJupiterLendWithdraw(
  p: JupiterLendActionParams
): Promise<TransactionInstruction[]> {
  return [buildJupiterLendActionMemo(p.user, "withdraw", p.mint, p.amountMicro)];
}
