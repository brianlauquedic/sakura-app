/**
 * lib/adapters/raydium.ts — Raydium swap adapter (direct route)
 *
 * Uses Raydium's own HTTP API to build a swap transaction, then decodes
 * it back into unsigned `TransactionInstruction[]` so the executor can
 * compose them into an atomic v0 tx alongside Sakura's
 * `execute_with_intent_proof` gate.
 *
 * Why Raydium direct (not just Jupiter)?
 *   - Resilience: if Jupiter's API/routing degrades, Raydium direct is a
 *     working fallback (Raydium is Jupiter's #1 underlying DEX anyway).
 *   - MEV-resistance: single-hop to a known pool avoids routing variance.
 *   - Capital efficiency: skips aggregator fees / extra accounts for
 *     tokens where Raydium has deep pools (SOL/USDC, SOL/USDT, etc.).
 *
 * API flow (mirrors Jupiter's pattern in lib/sak-executor.ts):
 *   1. GET  /compute/swap-base-in  → quote with routePlan
 *   2. POST /transaction/swap-base-in → base64 v0 transaction
 *   3. Deserialize tx → extract instructions + ALT addresses
 *   4. Fetch ALT accounts via connection, return unsigned bundle
 *
 * References:
 *   - https://docs.raydium.io (CPMM program: CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C)
 *   - https://transaction-v1.raydium.io (public transaction builder API)
 */

import {
  AddressLookupTableAccount,
  Connection,
  MessageV0,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";

const RAYDIUM_TX_API = "https://transaction-v1.raydium.io";

// ── Canonical Raydium program IDs (kept exported for typed callers) ──
export const RAYDIUM_CPMM_PROGRAM_ID = new PublicKey(
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
);
export const RAYDIUM_AMM_V4_PROGRAM_ID = new PublicKey(
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);
export const RAYDIUM_CLMM_PROGRAM_ID = new PublicKey(
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
);
/** Raydium's router program — the canonical entrypoint for the
 *  transaction-v1 API. Wraps CPMM/AMM v4/CLMM via CPI. */
export const RAYDIUM_ROUTER_PROGRAM_ID = new PublicKey(
  "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS"
);

interface RaydiumQuoteResponse {
  id: string;
  success: boolean;
  version: string;
  data: {
    swapType: "BaseIn";
    inputMint: string;
    outputMint: string;
    inputAmount: string;
    outputAmount: string;
    otherAmountThreshold: string;
    slippageBps: number;
    priceImpactPct: number;
    routePlan: Array<{
      poolId: string;
      inputMint: string;
      outputMint: string;
      feeRate: number;
      feeAmount: string;
    }>;
  };
  msg?: string;
}

interface RaydiumTxResponse {
  id: string;
  success: boolean;
  data: Array<{ transaction: string }>;
  msg?: string;
}

/**
 * Build a Raydium swap: caller-supplied input mint + amount, output mint.
 *
 * Returns unsigned instructions + ALTs so the executor can wrap them in
 * an atomic v0 tx with the ZK-gate ix.
 *
 * @param computeUnitPriceMicroLamports priority fee — 20_000 is reasonable
 *        for mainnet congestion; `0` skips the ComputeBudget setPrice ix.
 */
export async function buildRaydiumSwapIxs(params: {
  connection: Connection;
  user: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: bigint;
  slippageBps?: number;
  computeUnitPriceMicroLamports?: number;
}): Promise<{
  instructions: TransactionInstruction[];
  addressLookupTables: AddressLookupTableAccount[];
  estimatedOutputAmount: bigint;
  priceImpactPct: number;
  routePoolIds: string[];
}> {
  const slippageBps = params.slippageBps ?? 50;
  const priorityFee = params.computeUnitPriceMicroLamports ?? 20_000;

  // 1. Quote
  const qs = new URLSearchParams({
    inputMint: params.inputMint.toBase58(),
    outputMint: params.outputMint.toBase58(),
    amount: params.inputAmount.toString(),
    slippageBps: slippageBps.toString(),
    txVersion: "V0",
  });
  const quoteRes = await fetch(`${RAYDIUM_TX_API}/compute/swap-base-in?${qs}`);
  if (!quoteRes.ok) {
    throw new Error(
      `Raydium quote failed: ${quoteRes.status} ${await quoteRes.text()}`
    );
  }
  const quote = (await quoteRes.json()) as RaydiumQuoteResponse;
  if (!quote.success || !quote.data) {
    throw new Error(
      `Raydium quote error: ${quote.msg ?? "no route / unknown failure"}`
    );
  }

  // 2. Build tx
  const txRes = await fetch(`${RAYDIUM_TX_API}/transaction/swap-base-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // Raydium's Cloudflare edge rejects Node `fetch` POSTs without
      // browser-shaped headers. Origin + Referer + a real-looking UA
      // gets us past bot detection. (Plain curl works because it sends
      // these implicitly; Node fetch does not.)
      Origin: "https://raydium.io",
      Referer: "https://raydium.io/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15.7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      computeUnitPriceMicroLamports: String(priorityFee),
      swapResponse: quote,
      txVersion: "V0",
      wallet: params.user.toBase58(),
      wrapSol: true,
      unwrapSol: true,
      inputAccount: null,
      outputAccount: null,
    }),
  });
  if (!txRes.ok) {
    throw new Error(
      `Raydium swap tx build failed: ${txRes.status} ${await txRes.text()}`
    );
  }
  const txJson = (await txRes.json()) as RaydiumTxResponse;
  if (!txJson.success || !txJson.data?.length) {
    throw new Error(
      `Raydium tx response malformed: ${txJson.msg ?? "no tx returned"}`
    );
  }

  // 3. Decode the first (and usually only) tx; unwrap its instructions
  //    and ALT addresses so they can be composed into our atomic tx.
  //    Raydium may return multiple txs for complex routes — we only
  //    support single-tx routes here; refuse multi-tx and caller can
  //    fall back to Jupiter.
  if (txJson.data.length > 1) {
    throw new Error(
      `Raydium returned ${txJson.data.length} txs (multi-tx route); ` +
        `Sakura's atomic gate only supports single-tx swaps — fall back to Jupiter for this pair`
    );
  }
  const rawTx = Buffer.from(txJson.data[0].transaction, "base64");
  const vtx = VersionedTransaction.deserialize(rawTx);
  if (!(vtx.message instanceof MessageV0)) {
    throw new Error(
      `Raydium returned non-V0 tx; check txVersion parameter (got ${vtx.message.version})`
    );
  }
  const msg = vtx.message;

  // 4. Fetch ALT account data for the tx's lookup tables
  const altKeys = msg.addressTableLookups.map((l) => l.accountKey);
  const addressLookupTables: AddressLookupTableAccount[] = [];
  for (const key of altKeys) {
    const info = await params.connection.getAddressLookupTable(key);
    if (!info.value) {
      throw new Error(`ALT not found on-chain: ${key.toBase58()}`);
    }
    addressLookupTables.push(info.value);
  }

  // 5. Decompile message into TransactionInstruction[] using resolved
  //    account keys (static + ALT-expanded). We re-use web3.js's own
  //    getAccountKeys() helper which resolves ALTs properly.
  const accountKeys = msg.getAccountKeys({ addressLookupTableAccounts: addressLookupTables });
  const instructions: TransactionInstruction[] = msg.compiledInstructions.map((ci) => {
    const programId = accountKeys.get(ci.programIdIndex);
    if (!programId) {
      throw new Error(
        `Raydium tx referenced programIdIndex ${ci.programIdIndex} but account keys resolver returned undefined`
      );
    }
    return new TransactionInstruction({
      programId,
      keys: ci.accountKeyIndexes.map((idx) => {
        const pubkey = accountKeys.get(idx);
        if (!pubkey) {
          throw new Error(
            `Raydium tx referenced account index ${idx} but resolver returned undefined`
          );
        }
        return {
          pubkey,
          isSigner: msg.isAccountSigner(idx),
          isWritable: msg.isAccountWritable(idx),
        };
      }),
      data: Buffer.from(ci.data),
    });
  });

  return {
    instructions,
    addressLookupTables,
    estimatedOutputAmount: BigInt(quote.data.outputAmount),
    priceImpactPct: quote.data.priceImpactPct,
    routePoolIds: quote.data.routePlan.map((r) => r.poolId),
  };
}
