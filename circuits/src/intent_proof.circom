pragma circom 2.1.6;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";

/*
 * Sakura — Intent-Execution Proof Circuit (v0.3, Agentic Consumer Protocol)
 *
 * Proves that an AI agent's proposed on-chain action (public inputs) falls
 * within the bounds of a user-signed intent (private witness).
 *
 * This replaces the prior `liquidation_proof.circom` which proved a health-
 * factor inequality for a single use-case (liquidation rescue). The new
 * circuit proves the more general predicate:
 *
 *     action ⊆ user_signed_intent
 *
 * which covers lending, borrowing, repay, swap, yield-rebalance, and any
 * other DeFi primitive expressible as (action_type, amount, target).
 *
 * Public inputs (verified on-chain, must match circuit's `public` list):
 *   [0] intent_commitment        Poseidon-tree-hash of the full intent policy
 *   [1] action_type              0=borrow, 1=lend, 2=swap, 3=repay, ... (u8)
 *   [2] action_amount            token amount in micro-units (u64)
 *   [3] action_target_index      0=Kamino, 1=MarginFi, 2=Solend, ... (u8)
 *   [4] oracle_price_usd_micro   Pyth price at execution time (u64 micro-USD)
 *   [5] oracle_slot              Pyth publish slot (u64, verified on-chain)
 *
 * Private witness (known only to the prover):
 *   - max_amount                 per-action amount cap, from signed intent
 *   - max_usd_value              per-action USD value cap (u64 micro-USD)
 *   - allowed_protocols          bitmap u32 (bit i = protocol i allowed)
 *   - allowed_action_types       bitmap u32 (bit i = action type i allowed)
 *   - wallet_bytes               user wallet pubkey, 31-byte slice as field
 *   - nonce                      anti-replay nonce (u64)
 *   - intent_text_hash           Poseidon of the natural-language intent text
 *
 * Enforced constraints:
 *   C1  Poseidon tree commitment binds the proof to THIS specific signed intent:
 *           h1     = Poseidon(intent_text_hash, wallet_bytes, nonce)
 *           h2     = Poseidon(max_amount, max_usd_value, allowed_protocols)
 *           final  = Poseidon(h1, h2, allowed_action_types)
 *           final === intent_commitment
 *       A prover who tampers with ANY witness (wallet, cap, bitmap, intent text)
 *       breaks the Poseidon equality and cannot forge a valid proof.
 *
 *   C2  action_amount <= max_amount
 *       action cannot exceed the per-action size cap.
 *
 *   C3  bit[action_target_index] of allowed_protocols == 1
 *       action must target a protocol the user whitelisted.
 *
 *   C4  bit[action_type] of allowed_action_types == 1
 *       action must be of a type the user whitelisted.
 *
 *   C5  action_amount * oracle_price_usd_micro <= max_usd_value * 1_000_000
 *       total USD value of action doesn't exceed the policy's USD cap.
 *       (Multiplied by 1e6 on RHS because oracle_price is already in micro-USD
 *        granularity; this keeps everything in integer arithmetic.)
 *
 * RANGE CHECKS: all numeric inputs are Num2Bits-bounded to prevent a
 * malicious prover from substituting large field elements (mod BN254 p)
 * that wrap around and spuriously satisfy the bit-test or inequality
 * constraints.
 *
 * Groth16 verification on-chain via Solana's alt_bn128_pairing syscall.
 */
template IntentProof() {
    // ════════════════════════════════════════════════════════════════
    // PUBLIC INPUTS
    // ════════════════════════════════════════════════════════════════
    signal input intent_commitment;
    signal input action_type;
    signal input action_amount;
    signal input action_target_index;
    signal input oracle_price_usd_micro;
    signal input oracle_slot;

    // ════════════════════════════════════════════════════════════════
    // PRIVATE WITNESS
    // ════════════════════════════════════════════════════════════════
    signal input max_amount;
    signal input max_usd_value;
    signal input allowed_protocols;       // bitmap u32
    signal input allowed_action_types;    // bitmap u32
    signal input wallet_bytes;             // 31-byte pubkey slice
    signal input nonce;
    signal input intent_text_hash;

    // ────────────────────────────────────────────────────────────────
    // RANGE CHECKS (Num2Bits) — defense against field wraparound
    // ────────────────────────────────────────────────────────────────
    component rb_action_type = Num2Bits(8);
    rb_action_type.in <== action_type;

    component rb_action_amount = Num2Bits(64);
    rb_action_amount.in <== action_amount;

    component rb_action_target = Num2Bits(8);
    rb_action_target.in <== action_target_index;

    component rb_oracle_price = Num2Bits(64);
    rb_oracle_price.in <== oracle_price_usd_micro;

    component rb_oracle_slot = Num2Bits(64);
    rb_oracle_slot.in <== oracle_slot;

    component rb_max_amount = Num2Bits(64);
    rb_max_amount.in <== max_amount;

    component rb_max_usd = Num2Bits(64);
    rb_max_usd.in <== max_usd_value;

    component rb_protos = Num2Bits(32);
    rb_protos.in <== allowed_protocols;

    component rb_types = Num2Bits(32);
    rb_types.in <== allowed_action_types;

    component rb_wallet = Num2Bits(248);
    rb_wallet.in <== wallet_bytes;

    component rb_nonce = Num2Bits(64);
    rb_nonce.in <== nonce;

    // ════════════════════════════════════════════════════════════════
    // C1. INTENT COMMITMENT BINDING (Poseidon tree, 7 leaves)
    //
    //                    intent_commitment
    //                            │
    //                         h_final
    //                    Poseidon(3)
    //                 ┌──────┼──────┐
    //                h1     h2    allowed_action_types
    //           Poseidon Poseidon
    //          (text,    (max_amt,
    //           wallet,   max_usd,
    //           nonce)    allowed_protocols)
    // ════════════════════════════════════════════════════════════════
    component h1 = Poseidon(3);
    h1.inputs[0] <== intent_text_hash;
    h1.inputs[1] <== wallet_bytes;
    h1.inputs[2] <== nonce;

    component h2 = Poseidon(3);
    h2.inputs[0] <== max_amount;
    h2.inputs[1] <== max_usd_value;
    h2.inputs[2] <== allowed_protocols;

    component h_final = Poseidon(3);
    h_final.inputs[0] <== h1.out;
    h_final.inputs[1] <== h2.out;
    h_final.inputs[2] <== allowed_action_types;

    h_final.out === intent_commitment;

    // ════════════════════════════════════════════════════════════════
    // C2. action_amount <= max_amount
    // ════════════════════════════════════════════════════════════════
    component le_amount = LessEqThan(64);
    le_amount.in[0] <== action_amount;
    le_amount.in[1] <== max_amount;
    le_amount.out === 1;

    // ════════════════════════════════════════════════════════════════
    // C3. bit[action_target_index] of allowed_protocols == 1
    //
    // Approach: for each possible index i in 0..31, build an indicator
    // `eq_i = IsEqual(action_target_index, i)`. Exactly one eq_i == 1.
    // Multiply each eq_i by the corresponding bit rb_protos.out[i] and
    // sum — the sum equals the selected bit. Assert sum == 1.
    //
    // Also assert action_target_index < 32 to ensure indexation is valid.
    // ════════════════════════════════════════════════════════════════
    component lt_target_bound = LessThan(8);
    lt_target_bound.in[0] <== action_target_index;
    lt_target_bound.in[1] <== 32;
    lt_target_bound.out === 1;

    component proto_eq[32];
    signal proto_contrib[32];
    signal proto_sum[33];
    proto_sum[0] <== 0;
    for (var i = 0; i < 32; i++) {
        proto_eq[i] = IsEqual();
        proto_eq[i].in[0] <== action_target_index;
        proto_eq[i].in[1] <== i;
        proto_contrib[i] <== proto_eq[i].out * rb_protos.out[i];
        proto_sum[i + 1] <== proto_sum[i] + proto_contrib[i];
    }
    proto_sum[32] === 1;

    // ════════════════════════════════════════════════════════════════
    // C4. bit[action_type] of allowed_action_types == 1
    // Same pattern as C3.
    // ════════════════════════════════════════════════════════════════
    component lt_type_bound = LessThan(8);
    lt_type_bound.in[0] <== action_type;
    lt_type_bound.in[1] <== 32;
    lt_type_bound.out === 1;

    component type_eq[32];
    signal type_contrib[32];
    signal type_sum[33];
    type_sum[0] <== 0;
    for (var i = 0; i < 32; i++) {
        type_eq[i] = IsEqual();
        type_eq[i].in[0] <== action_type;
        type_eq[i].in[1] <== i;
        type_contrib[i] <== type_eq[i].out * rb_types.out[i];
        type_sum[i + 1] <== type_sum[i] + type_contrib[i];
    }
    type_sum[32] === 1;

    // ════════════════════════════════════════════════════════════════
    // C5. action_amount * oracle_price_usd_micro <= max_usd_value * 1e6
    //
    // action_amount is in token micro-units (e.g., 1 USDC = 1_000_000).
    // oracle_price_usd_micro is USD price per token, micro-granularity.
    // Their product = USD value of the action in (micro-USD × micro-units).
    //
    // To compare against max_usd_value (plain micro-USD), we multiply
    // max_usd_value by 1e6 to align scales.
    //
    // Bit budget:
    //   LHS = amount(≤64) × price(≤64) = ≤2^128
    //   RHS = max_usd(≤64) × 1e6(≤20)  = ≤2^84
    //   LessEqThan(128) covers both with margin.
    // ════════════════════════════════════════════════════════════════
    signal lhs_usd;
    lhs_usd <== action_amount * oracle_price_usd_micro;

    signal rhs_usd;
    rhs_usd <== max_usd_value * 1000000;

    component le_usd = LessEqThan(128);
    le_usd.in[0] <== lhs_usd;
    le_usd.in[1] <== rhs_usd;
    le_usd.out === 1;

    // ────────────────────────────────────────────────────────────────
    // oracle_slot is a public input but has no in-circuit constraint —
    // it's bound via the Groth16 IC linear combination. The on-chain
    // verifier re-reads the Pyth account at `oracle_slot` and confirms
    // `oracle_price_usd_micro` matches, plus that the slot is within
    // the freshness window (~150 slots). See claim_payout handler in
    // programs/sakura-insurance/src/lib.rs for that logic.
    // ────────────────────────────────────────────────────────────────
}

component main {
    public [
        intent_commitment,
        action_type,
        action_amount,
        action_target_index,
        oracle_price_usd_micro,
        oracle_slot
    ]
} = IntentProof();
