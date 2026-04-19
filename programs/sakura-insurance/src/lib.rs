use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use groth16_solana::groth16::Groth16Verifier;

mod zk_verifying_key;
use zk_verifying_key::VERIFYINGKEY;

declare_id!("AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp");

// ════════════════════════════════════════════════════════════════════════════
// Oracle bindings (hardcoded — prevents attacker-supplied fake Pyth accounts)
// ════════════════════════════════════════════════════════════════════════════

/// Pyth Pull Oracle Receiver program ID (same across mainnet & devnet).
pub const PYTH_RECEIVER_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");

/// Pyth SOL/USD price feed ID (32 bytes, big-endian).
/// SOL/USD = 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d
pub const EXPECTED_FEED_ID_SOL_USD: [u8; 32] = [
    0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
    0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
    0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc,
    0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
];

/// Sakura — The Agentic Consumer Protocol (v0.3)
///
/// An intent-execution protocol for Solana DeFi. Users sign an intent once
/// (natural language + structured policy bounds). AI agents (Claude Skills
/// via SAK) execute actions on the user's behalf, and every action is
/// gated by a Groth16 ZK proof that `action ⊆ user_signed_intent`.
///
/// Unlike the v0.2 mutual-insurance model which proved a single predicate
/// (HF < trigger) for a single use case (liquidation rescue), v0.3 proves
/// the general predicate for any DeFi action: lending, borrowing, repay,
/// swap, yield-rebalance, etc.
///
/// Program architecture:
///   IntentProtocol PDA  — global config (admin, fee params, paused flag)
///   Intent PDA          — user's signed intent (per-user, commitment-bound)
///   ActionRecord PDA    — per-action audit trail (seeded by intent+nonce)
///
/// Instruction set:
///   initialize_protocol       — admin setup (once per deployment)
///   rotate_admin              — admin key rotation
///   set_paused                — emergency stop
///   sign_intent               — user signs an intent, commits bounds
///   revoke_intent             — user revokes an active intent
///   execute_with_intent_proof — execute an action, ZK-gated on intent
///
/// Security invariants:
///   I1  ZK pairing check passes via Solana alt_bn128 syscall
///   I2  Poseidon-tree commitment binds intent to exact wallet, nonce, bounds
///   I3  action_amount, action_type, action_target_index are all constrained
///       by the circuit to be ⊂ intent's max_amount, allowed_types, allowed
///       protocols — enforced by circuit C2/C3/C4
///   I4  action USD value bounded by max_usd_value via oracle price (C5)
///   I5  Pyth account owner/feed_id/posted_slot verified on-chain
///   I6  ActionRecord PDA init prevents replay per (intent, action_nonce)
///   I7  Intent.is_active flag guards against using revoked intents
///   I8  Only admin may pause / rotate / adjust fee params
#[program]
pub mod sakura_insurance {
    use super::*;

    // ──────────────────────────────────────────────────────────────────
    // ADMIN
    // ──────────────────────────────────────────────────────────────────

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        execution_fee_bps: u16,    // bps per intent execution (e.g. 10 = 0.1%)
        platform_fee_bps: u16,     // bps of execution_fee that goes to treasury
    ) -> Result<()> {
        require!(execution_fee_bps <= 200, IntentErr::InvalidParam); // max 2%
        require!(platform_fee_bps <= 10_000, IntentErr::InvalidParam);

        let p = &mut ctx.accounts.protocol;
        p.admin = ctx.accounts.admin.key();
        p.usdc_mint = ctx.accounts.usdc_mint.key();
        p.fee_vault = ctx.accounts.fee_vault.key();
        p.platform_treasury = ctx.accounts.platform_treasury.key();
        p.execution_fee_bps = execution_fee_bps;
        p.platform_fee_bps = platform_fee_bps;
        p.total_intents_signed = 0;
        p.total_actions_executed = 0;
        p.paused = false;
        p.bump = ctx.bumps.protocol;

        emit!(ProtocolInitialized {
            admin: p.admin,
            execution_fee_bps,
            platform_fee_bps,
        });
        Ok(())
    }

    pub fn rotate_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
        ctx.accounts.protocol.admin = new_admin;
        emit!(AdminRotated { new_admin });
        Ok(())
    }

    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.protocol.paused = paused;
        emit!(ProtocolPauseToggled { paused });
        Ok(())
    }

    // ──────────────────────────────────────────────────────────────────
    // USER — sign / revoke intent
    // ──────────────────────────────────────────────────────────────────

    /// Sign an intent. Creates an `Intent` PDA holding the Poseidon-tree
    /// commitment over (intent_text_hash, wallet, nonce, max_amount,
    /// max_usd_value, allowed_protocols, allowed_action_types).
    ///
    /// The commitment is what the ZK proof will open against. The user
    /// keeps the underlying bounds as private witness — the on-chain
    /// commitment reveals nothing about max_amount, etc.
    pub fn sign_intent(
        ctx: Context<SignIntent>,
        intent_commitment: [u8; 32],
        expires_at: i64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol.paused, IntentErr::Paused);
        require!(intent_commitment != [0u8; 32], IntentErr::CommitmentMissing);

        let now = Clock::get()?.unix_timestamp;
        require!(expires_at > now, IntentErr::AlreadyExpired);
        require!(
            expires_at - now <= 365 * 24 * 3_600,
            IntentErr::InvalidParam
        );

        let intent = &mut ctx.accounts.intent;
        if intent.user == Pubkey::default() {
            // First-time signing
            intent.user = ctx.accounts.user.key();
            intent.signed_at = now;
            intent.actions_executed = 0;
        } else {
            // Rotating intent — same user must own existing PDA
            require!(intent.user == ctx.accounts.user.key(), IntentErr::WrongUser);
        }

        intent.intent_commitment = intent_commitment;
        intent.expires_at = expires_at;
        intent.is_active = true;
        intent.bump = ctx.bumps.intent;

        let protocol = &mut ctx.accounts.protocol;
        protocol.total_intents_signed = protocol
            .total_intents_signed
            .checked_add(1)
            .ok_or(IntentErr::Overflow)?;

        emit!(IntentSigned {
            user: intent.user,
            intent_commitment,
            expires_at,
            signed_at: now,
        });
        Ok(())
    }

    /// Revoke an active intent. After revocation, no more actions can be
    /// executed against this intent (Intent.is_active = false).
    pub fn revoke_intent(ctx: Context<RevokeIntent>) -> Result<()> {
        let intent = &mut ctx.accounts.intent;
        require!(intent.is_active, IntentErr::IntentInactive);
        intent.is_active = false;

        emit!(IntentRevoked {
            user: intent.user,
            actions_executed: intent.actions_executed,
        });
        Ok(())
    }

    // ──────────────────────────────────────────────────────────────────
    // EXECUTE — ZK-verified intent-bounded action
    // ──────────────────────────────────────────────────────────────────

    /// Execute an action gated by a Groth16 proof of `action ⊂ intent`.
    ///
    /// The actual DeFi action (Kamino borrow, MarginFi repay, Jupiter swap,
    /// etc.) is performed by subsequent instructions in the same atomic v0
    /// transaction. This instruction's role is purely POLICY VERIFICATION:
    ///   1. Verify the ZK proof via alt_bn128 pairing
    ///   2. Verify the oracle price matches Pyth at the claimed slot
    ///   3. Write an ActionRecord for audit
    ///
    /// If this instruction fails, the whole atomic tx reverts and the
    /// DeFi action never happens.
    ///
    /// Public inputs to the ZK verifier (must match circom `public` list):
    ///   [0] intent_commitment      (policy.intent_commitment)
    ///   [1] action_type            (u8)
    ///   [2] action_amount          (u64 micro-units)
    ///   [3] action_target_index    (u8)
    ///   [4] oracle_price_usd_micro (u64)
    ///   [5] oracle_slot            (u64)
    #[allow(clippy::too_many_arguments)]
    pub fn execute_with_intent_proof(
        ctx: Context<ExecuteWithIntentProof>,
        action_nonce: u64,
        action_type: u8,
        action_amount: u64,
        action_target_index: u8,
        oracle_price_usd_micro: u64,
        oracle_slot: u64,
        proof_a: [u8; 64],
        proof_b: [u8; 128],
        proof_c: [u8; 64],
    ) -> Result<()> {
        require!(!ctx.accounts.protocol.paused, IntentErr::Paused);

        let intent = &mut ctx.accounts.intent;
        require!(intent.is_active, IntentErr::IntentInactive);

        let now = Clock::get()?.unix_timestamp;
        require!(now <= intent.expires_at, IntentErr::IntentExpired);

        // ── Oracle freshness window: Pyth slot within last 150 (~60s) ──
        let current_slot = Clock::get()?.slot;
        require!(
            current_slot >= oracle_slot && current_slot - oracle_slot <= 150,
            IntentErr::OracleSlotStale
        );

        // ── Verify Pyth price matches what's on-chain at the claimed slot ──
        //
        // We parse the Pyth `PriceUpdateV2` account layout inline (same as
        // v0.2 claim path). This ensures oracle_price_usd_micro (which is a
        // public input to the ZK proof) cannot be forged — the on-chain
        // verifier cross-checks it against Pyth at oracle_slot.
        //
        // Layout (134 bytes for Full verification level):
        //    8  anchor_discriminator
        //   32  write_authority
        //    1  verification_level tag (0=Partial{+u8}, 1=Full)
        //   32  feed_id
        //    8  price (i64 LE)
        //    8  conf (u64 LE)
        //    4  exponent (i32 LE)
        //    8  publish_time
        //    8  prev_publish_time
        //    8  ema_price
        //    8  ema_conf
        //    8  posted_slot (u64 LE)
        {
            let acct = &ctx.accounts.pyth_price_account;

            // (a) Owner check — only real Pyth Receiver writes these accounts
            require!(
                acct.owner == &PYTH_RECEIVER_PROGRAM_ID,
                IntentErr::PythAccountInvalid
            );

            let data = acct.try_borrow_data()?;
            require!(
                data.len() >= 8 + 32 + 1 + 32 + 8 + 8 + 4 + 8 + 8 + 8 + 8 + 8,
                IntentErr::PythAccountInvalid
            );

            let mut o: usize = 8 + 32;
            let tag = data[o];
            o += 1;
            // tag = 0 → Partial(num_signatures: u8)  (extra byte)
            // tag = 1 → Full                         (no payload)
            if tag == 0 {
                o += 1;
            } else if tag != 1 {
                return err!(IntentErr::PythAccountInvalid);
            }

            // (b) feed_id check — must be SOL/USD
            let feed_id_slice = &data[o..o + 32];
            require!(
                feed_id_slice == EXPECTED_FEED_ID_SOL_USD.as_slice(),
                IntentErr::PythFeedIdMismatch
            );
            o += 32;

            let price_i64 = i64::from_le_bytes(
                data[o..o + 8].try_into().map_err(|_| error!(IntentErr::PythAccountInvalid))?,
            );
            o += 8;
            o += 8; // conf
            let exponent = i32::from_le_bytes(
                data[o..o + 4].try_into().map_err(|_| error!(IntentErr::PythAccountInvalid))?,
            );
            o += 4;
            o += 32; // publish_time + prev_publish_time + ema_price + ema_conf
            let posted_slot = u64::from_le_bytes(
                data[o..o + 8].try_into().map_err(|_| error!(IntentErr::PythAccountInvalid))?,
            );

            require!(posted_slot == oracle_slot, IntentErr::OraclePriceMismatch);
            require!(price_i64 > 0, IntentErr::OraclePriceMismatch);
            let price_abs = price_i64 as u64;

            // Scale Pyth price → micro-USD. exp usually -8, target scale 1e6
            //   price_micro = price_abs × 10^(6 + exp)
            let adj: i32 = 6 + exponent;
            let computed_micro: u64 = if adj >= 0 {
                let mul = 10u64
                    .checked_pow(adj as u32)
                    .ok_or(IntentErr::Overflow)?;
                price_abs.checked_mul(mul).ok_or(IntentErr::Overflow)?
            } else {
                let div = 10u64
                    .checked_pow((-adj) as u32)
                    .ok_or(IntentErr::Overflow)?;
                price_abs / div
            };

            // ±1 micro-USD tolerance for rounding
            let diff = if computed_micro > oracle_price_usd_micro {
                computed_micro - oracle_price_usd_micro
            } else {
                oracle_price_usd_micro - computed_micro
            };
            require!(diff <= 1, IntentErr::OraclePriceMismatch);
        }

        // ── Groth16 pairing verification via alt_bn128 syscall ──
        //
        // Public inputs MUST be in the exact order specified by the
        // circuit's `public` list in circuits/src/intent_proof.circom:
        //   [0] intent_commitment
        //   [1] action_type
        //   [2] action_amount
        //   [3] action_target_index
        //   [4] oracle_price_usd_micro
        //   [5] oracle_slot
        let pub0 = intent.intent_commitment;
        let mut pub1 = [0u8; 32];
        pub1[31] = action_type;
        let mut pub2 = [0u8; 32];
        pub2[24..32].copy_from_slice(&action_amount.to_be_bytes());
        let mut pub3 = [0u8; 32];
        pub3[31] = action_target_index;
        let mut pub4 = [0u8; 32];
        pub4[24..32].copy_from_slice(&oracle_price_usd_micro.to_be_bytes());
        let mut pub5 = [0u8; 32];
        pub5[24..32].copy_from_slice(&oracle_slot.to_be_bytes());
        let public_inputs = [pub0, pub1, pub2, pub3, pub4, pub5];

        let mut verifier = Groth16Verifier::new(
            &proof_a,
            &proof_b,
            &proof_c,
            &public_inputs,
            &VERIFYINGKEY,
        )
        .map_err(|_| error!(IntentErr::ZkProofMalformed))?;

        verifier
            .verify()
            .map_err(|_| error!(IntentErr::ZkProofInvalid))?;
        // ─────────────────────────────────────────────────────────────

        // ── Write ActionRecord for on-chain audit trail ──
        let record = &mut ctx.accounts.action_record;
        record.intent = intent.key();
        record.action_nonce = action_nonce;
        record.action_type = action_type;
        record.action_amount = action_amount;
        record.action_target_index = action_target_index;
        record.oracle_price_usd_micro = oracle_price_usd_micro;
        record.oracle_slot = oracle_slot;
        record.ts = now;
        // keccak256(proof_a || proof_c) as forensic fingerprint
        let mut fp_src = [0u8; 128];
        fp_src[..64].copy_from_slice(&proof_a);
        fp_src[64..].copy_from_slice(&proof_c);
        record.proof_fingerprint =
            anchor_lang::solana_program::keccak::hash(&fp_src).to_bytes();
        record.bump = ctx.bumps.action_record;

        intent.actions_executed = intent
            .actions_executed
            .checked_add(1)
            .ok_or(IntentErr::Overflow)?;

        let protocol = &mut ctx.accounts.protocol;
        protocol.total_actions_executed = protocol
            .total_actions_executed
            .checked_add(1)
            .ok_or(IntentErr::Overflow)?;

        // Optional: collect execution fee (if execution_fee_bps > 0)
        // action_amount × execution_fee_bps / 10_000 in USDC-equivalent
        // For MVP, we skip fee collection — it can be added by the client
        // via a separate transfer in the same atomic tx.

        emit!(ActionExecuted {
            intent: intent.key(),
            user: intent.user,
            action_type,
            action_amount,
            action_target_index,
            oracle_price_usd_micro,
            oracle_slot,
            action_nonce,
            actions_executed: intent.actions_executed,
        });
        Ok(())
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Accounts
// ══════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + IntentProtocol::LEN,
        seeds = [b"sakura_intent_v3", admin.key().as_ref()],
        bump,
    )]
    pub protocol: Box<Account<'info, IntentProtocol>>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = protocol,
        seeds = [b"sakura_fee_vault", protocol.key().as_ref()],
        bump,
    )]
    pub fee_vault: Box<Account<'info, TokenAccount>>,

    /// Platform treasury — receives platform fee cut
    #[account(mut, token::mint = usdc_mint)]
    pub platform_treasury: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"sakura_intent_v3", protocol.admin.as_ref()],
        bump = protocol.bump,
        has_one = admin,
    )]
    pub protocol: Account<'info, IntentProtocol>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct SignIntent<'info> {
    #[account(
        mut,
        seeds = [b"sakura_intent_v3", protocol.admin.as_ref()],
        bump = protocol.bump,
    )]
    pub protocol: Box<Account<'info, IntentProtocol>>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Intent::LEN,
        seeds = [b"sakura_intent_account", user.key().as_ref()],
        bump,
    )]
    pub intent: Box<Account<'info, Intent>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeIntent<'info> {
    #[account(
        mut,
        seeds = [b"sakura_intent_account", user.key().as_ref()],
        bump = intent.bump,
        has_one = user,
    )]
    pub intent: Box<Account<'info, Intent>>,

    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(action_nonce: u64)]
pub struct ExecuteWithIntentProof<'info> {
    #[account(
        mut,
        seeds = [b"sakura_intent_v3", protocol.admin.as_ref()],
        bump = protocol.bump,
    )]
    pub protocol: Box<Account<'info, IntentProtocol>>,

    #[account(
        mut,
        seeds = [b"sakura_intent_account", intent.user.as_ref()],
        bump = intent.bump,
    )]
    pub intent: Box<Account<'info, Intent>>,

    /// Payer sponsors rent for ActionRecord. Does NOT gate execution —
    /// the ZK proof is the only authority source.
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ActionRecord::LEN,
        seeds = [
            b"sakura_action",
            intent.key().as_ref(),
            &action_nonce.to_le_bytes(),
        ],
        bump,
    )]
    pub action_record: Box<Account<'info, ActionRecord>>,

    /// Pyth `PriceUpdateV2` account. Handler enforces:
    ///   • account.owner == PYTH_RECEIVER_PROGRAM_ID    (spoofing guard)
    ///   • price_message.feed_id == EXPECTED_FEED_ID_SOL_USD (wrong-asset guard)
    ///   • posted_slot == oracle_slot                   (replay guard)
    ///   • oracle_price_usd_micro ≈ price × 10^(6+exp)  (forgery guard)
    /// CHECK: owner + layout validated by handler
    pub pyth_price_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ══════════════════════════════════════════════════════════════════════════
// State
// ══════════════════════════════════════════════════════════════════════════

#[account]
pub struct IntentProtocol {
    pub admin: Pubkey,                   // 32
    pub usdc_mint: Pubkey,               // 32
    pub fee_vault: Pubkey,               // 32
    pub platform_treasury: Pubkey,       // 32
    pub total_intents_signed: u64,       // 8
    pub total_actions_executed: u64,     // 8
    pub execution_fee_bps: u16,          // 2
    pub platform_fee_bps: u16,           // 2
    pub paused: bool,                    // 1
    pub bump: u8,                        // 1
}
impl IntentProtocol {
    pub const LEN: usize = 32 * 4 + 8 * 2 + 2 * 2 + 1 + 1;
}

#[account]
pub struct Intent {
    pub user: Pubkey,                    // 32
    pub intent_commitment: [u8; 32],     // 32  Poseidon-tree(text,wallet,nonce,bounds...)
    pub signed_at: i64,                  // 8
    pub expires_at: i64,                 // 8
    pub actions_executed: u64,           // 8
    pub is_active: bool,                 // 1
    pub bump: u8,                        // 1
}
impl Intent {
    pub const LEN: usize = 32 + 32 + 8 * 3 + 1 + 1;
}

#[account]
pub struct ActionRecord {
    pub intent: Pubkey,                  // 32
    pub action_nonce: u64,               // 8
    pub action_type: u8,                 // 1
    pub action_amount: u64,              // 8
    pub action_target_index: u8,         // 1
    pub oracle_price_usd_micro: u64,     // 8
    pub oracle_slot: u64,                // 8
    pub ts: i64,                         // 8
    pub proof_fingerprint: [u8; 32],     // 32
    pub bump: u8,                        // 1
}
impl ActionRecord {
    pub const LEN: usize = 32 + 8 + 1 + 8 + 1 + 8 + 8 + 8 + 32 + 1;
}

// ══════════════════════════════════════════════════════════════════════════
// Events
// ══════════════════════════════════════════════════════════════════════════

#[event]
pub struct ProtocolInitialized {
    pub admin: Pubkey,
    pub execution_fee_bps: u16,
    pub platform_fee_bps: u16,
}

#[event]
pub struct AdminRotated {
    pub new_admin: Pubkey,
}

#[event]
pub struct ProtocolPauseToggled {
    pub paused: bool,
}

#[event]
pub struct IntentSigned {
    pub user: Pubkey,
    pub intent_commitment: [u8; 32],
    pub expires_at: i64,
    pub signed_at: i64,
}

#[event]
pub struct IntentRevoked {
    pub user: Pubkey,
    pub actions_executed: u64,
}

#[event]
pub struct ActionExecuted {
    pub intent: Pubkey,
    pub user: Pubkey,
    pub action_type: u8,
    pub action_amount: u64,
    pub action_target_index: u8,
    pub oracle_price_usd_micro: u64,
    pub oracle_slot: u64,
    pub action_nonce: u64,
    pub actions_executed: u64,
}

// ══════════════════════════════════════════════════════════════════════════
// Errors
// ══════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum IntentErr {
    #[msg("Invalid parameter")]                                 InvalidParam,
    #[msg("Protocol is paused")]                                Paused,
    #[msg("Arithmetic overflow")]                               Overflow,
    #[msg("Intent user mismatch")]                              WrongUser,
    #[msg("Intent is inactive / revoked")]                      IntentInactive,
    #[msg("Intent has expired")]                                IntentExpired,
    #[msg("Intent already expired")]                            AlreadyExpired,
    #[msg("Intent commitment must not be zero")]                CommitmentMissing,
    #[msg("Oracle slot too stale (>150 slots)")]                OracleSlotStale,
    #[msg("Groth16 proof malformed")]                           ZkProofMalformed,
    #[msg("Groth16 proof pairing check failed")]                ZkProofInvalid,
    #[msg("Pyth price account has invalid layout")]             PythAccountInvalid,
    #[msg("Pyth feed_id does not match expected SOL/USD feed")] PythFeedIdMismatch,
    #[msg("oracle_price / oracle_slot does not match Pyth")]    OraclePriceMismatch,
    #[msg("Token account owner mismatch")]                      WrongOwner,
}
