use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// Placeholder program ID — replaced by `solana-keygen pubkey` of the
// generated keypair file at build time. Must be base58-valid.
declare_id!("11111111111111111111111111111111");

/// Sakura Rescue Insurance Pool — v0.1
///
/// User-funded, LP-backed mutual rescue-capital market on Solana. See the
/// full design in `docs/INSURANCE-POOL-WHITEPAPER.md`. This program is
/// deliberately minimal and ships ONLY the core primitives that the
/// hackathon demo needs:
///
///   Pool side:
///     initialize_pool, lp_deposit, lp_withdraw
///   User side:
///     buy_policy, close_policy
///   Rescue side:
///     claim_payout      (called by registered Sakura agent at rescue time)
///
/// Out of v0.1 scope (see whitepaper §10):
///   - Dynamic premium pricing
///   - 2-of-3 admin multisig
///   - Rescue-count surcharge enforcement on-chain
///   - Tokenized pool shares as SPL tokens
///
/// Security invariants (checked on-chain):
///   I1  pool.total_shares changes monotonically with lp_deposit / lp_withdraw
///   I2  pool_vault.amount × total_shares is the invariant of LP share price;
///       share issuance uses `amount * total_shares / pool_usdc` (round down)
///   I3  lp_withdraw reverts if it would drop vault below min_reserve_bps
///   I4  claim_payout can only be signed by pool.admin_agent
///   I5  claim_payout replay protection: claim_record PDA seeded by
///       (policy, nonce) cannot be re-initialized
///   I6  policy.total_claimed + amount ≤ policy.coverage_cap_usdc
///   I7  Lapsed policies (now > paid_through + grace) reject claims
///   I8  Only policy.user can close_policy
#[program]
pub mod sakura_insurance {
    use super::*;

    // ──────────────────────────────────────────────────────────────────
    // ADMIN
    // ──────────────────────────────────────────────────────────────────

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        premium_bps: u16,      // bps/month of coverage_cap; default 10 = 0.10%/mo
        min_reserve_bps: u16,  // 2000 = 20% floor
    ) -> Result<()> {
        require!(premium_bps >= 1 && premium_bps <= 1_000, InsErr::InvalidParam);
        require!(min_reserve_bps <= 8_000, InsErr::InvalidParam);

        let pool = &mut ctx.accounts.pool;
        pool.admin = ctx.accounts.admin.key();
        pool.admin_agent = ctx.accounts.admin_agent.key();
        pool.usdc_mint = ctx.accounts.usdc_mint.key();
        pool.usdc_vault = ctx.accounts.usdc_vault.key();
        pool.total_shares = 0;
        pool.premium_bps = premium_bps;
        pool.min_reserve_bps = min_reserve_bps;
        pool.coverage_outstanding = 0;
        pool.paused = false;
        pool.bump = ctx.bumps.pool;

        emit!(PoolInitialized {
            admin: pool.admin,
            admin_agent: pool.admin_agent,
            premium_bps,
            min_reserve_bps,
        });
        Ok(())
    }

    pub fn rotate_admin_agent(ctx: Context<AdminOnly>, new_agent: Pubkey) -> Result<()> {
        ctx.accounts.pool.admin_agent = new_agent;
        emit!(AdminAgentRotated { new_agent });
        Ok(())
    }

    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.pool.paused = paused;
        emit!(PoolPauseToggled { paused });
        Ok(())
    }

    // ──────────────────────────────────────────────────────────────────
    // LP SIDE
    // ──────────────────────────────────────────────────────────────────

    /// LP deposits USDC, receives shares proportional to current vault value.
    /// First depositor: 1 share == 1 micro-USDC (anchors share price).
    pub fn lp_deposit(ctx: Context<LpDeposit>, amount_usdc: u64) -> Result<()> {
        require!(!ctx.accounts.pool.paused, InsErr::Paused);
        require!(amount_usdc > 0, InsErr::ZeroAmount);

        // Transfer USDC from LP → pool vault
        let cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.lp_usdc_ata.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.lp.to_account_info(),
            },
        );
        token::transfer(cpi, amount_usdc)?;

        // Compute shares to mint
        let vault_before = ctx.accounts.pool_vault.amount; // pre-transfer snapshot
        let shares_to_mint = if ctx.accounts.pool.total_shares == 0 || vault_before == 0 {
            amount_usdc
        } else {
            // shares = amount × total_shares / vault_before (round down)
            ((amount_usdc as u128)
                .checked_mul(ctx.accounts.pool.total_shares as u128)
                .ok_or(InsErr::Overflow)?
                / vault_before as u128) as u64
        };
        require!(shares_to_mint > 0, InsErr::ZeroShares);

        let pool = &mut ctx.accounts.pool;
        pool.total_shares = pool
            .total_shares
            .checked_add(shares_to_mint)
            .ok_or(InsErr::Overflow)?;

        let lp_pos = &mut ctx.accounts.lp_position;
        lp_pos.lp = ctx.accounts.lp.key();
        lp_pos.shares = lp_pos
            .shares
            .checked_add(shares_to_mint)
            .ok_or(InsErr::Overflow)?;
        lp_pos.deposited_at = Clock::get()?.unix_timestamp;
        lp_pos.bump = ctx.bumps.lp_position;

        emit!(LpDeposited {
            lp: lp_pos.lp,
            amount_usdc,
            shares_minted: shares_to_mint,
        });
        Ok(())
    }

    /// LP withdraws USDC by burning shares. Reverts if vault would drop
    /// below `min_reserve_bps × coverage_outstanding`.
    pub fn lp_withdraw(ctx: Context<LpWithdraw>, shares_to_burn: u64) -> Result<()> {
        require!(shares_to_burn > 0, InsErr::ZeroAmount);

        let lp_pos = &mut ctx.accounts.lp_position;
        require!(lp_pos.shares >= shares_to_burn, InsErr::InsufficientShares);

        let pool = &mut ctx.accounts.pool;
        let vault_balance = ctx.accounts.pool_vault.amount;
        let payout_usdc: u64 = ((shares_to_burn as u128)
            .checked_mul(vault_balance as u128)
            .ok_or(InsErr::Overflow)?
            / pool.total_shares as u128) as u64;
        require!(payout_usdc > 0, InsErr::ZeroAmount);

        // Enforce reserve floor AFTER payout:
        //   remaining_vault >= min_reserve_bps × coverage_outstanding / 10_000
        let remaining = vault_balance.checked_sub(payout_usdc).ok_or(InsErr::Overflow)?;
        let required_floor = (pool.coverage_outstanding as u128)
            .checked_mul(pool.min_reserve_bps as u128)
            .ok_or(InsErr::Overflow)?
            .checked_div(10_000)
            .ok_or(InsErr::Overflow)? as u64;
        require!(remaining >= required_floor, InsErr::ReserveFloorBreach);

        // Transfer USDC from vault → LP via PDA signer
        let admin = pool.admin;
        let bump = pool.bump;
        let seeds: &[&[u8]] = &[b"sakura_pool", admin.as_ref(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];
        let cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault.to_account_info(),
                to: ctx.accounts.lp_usdc_ata.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi, payout_usdc)?;

        // Update state
        lp_pos.shares = lp_pos.shares.checked_sub(shares_to_burn).ok_or(InsErr::Overflow)?;
        pool.total_shares = pool.total_shares.checked_sub(shares_to_burn).ok_or(InsErr::Overflow)?;

        emit!(LpWithdrawn {
            lp: lp_pos.lp,
            payout_usdc,
            shares_burned: shares_to_burn,
        });
        Ok(())
    }

    // ──────────────────────────────────────────────────────────────────
    // USER SIDE
    // ──────────────────────────────────────────────────────────────────

    /// Buy (or renew) an insurance policy. User pays USDC premium up front,
    /// `paid_through_unix` advances proportional to amount paid.
    pub fn buy_policy(
        ctx: Context<BuyPolicy>,
        premium_amount_usdc: u64,
        coverage_cap_usdc: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.paused, InsErr::Paused);
        require!(premium_amount_usdc > 0 && coverage_cap_usdc > 0, InsErr::ZeroAmount);

        // Minimum premium check: at least one month at the pool's rate.
        //   min_premium_month = premium_bps × coverage_cap / 10_000
        let premium_bps = ctx.accounts.pool.premium_bps as u128;
        let min_premium_month = ((coverage_cap_usdc as u128)
            .checked_mul(premium_bps)
            .ok_or(InsErr::Overflow)?
            / 10_000) as u64;
        require!(
            premium_amount_usdc >= min_premium_month,
            InsErr::PremiumTooLow
        );

        // Transfer premium to vault
        let cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_usdc_ata.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(cpi, premium_amount_usdc)?;

        let now = Clock::get()?.unix_timestamp;
        let policy = &mut ctx.accounts.policy;

        // Compute how many seconds the premium buys:
        //   days = premium × 30 / min_premium_month
        //   seconds = days × 86_400
        let seconds_funded: i64 = (((premium_amount_usdc as u128) * 30 * 86_400)
            / (min_premium_month as u128).max(1)) as i64;

        if policy.user == Pubkey::default() {
            policy.user = ctx.accounts.user.key();
            policy.coverage_cap_usdc = coverage_cap_usdc;
            policy.paid_through_unix = now.checked_add(seconds_funded).ok_or(InsErr::Overflow)?;
            policy.premium_paid_micro = premium_amount_usdc;
            policy.total_claimed = 0;
            policy.rescue_count = 0;
            policy.is_active = true;
            policy.bump = ctx.bumps.policy;

            // New policy: increase coverage_outstanding
            let pool = &mut ctx.accounts.pool;
            pool.coverage_outstanding = pool
                .coverage_outstanding
                .checked_add(coverage_cap_usdc)
                .ok_or(InsErr::Overflow)?;
        } else {
            // Renewal / top-up
            require!(policy.user == ctx.accounts.user.key(), InsErr::WrongUser);
            require!(policy.is_active, InsErr::PolicyInactive);

            // Coverage cap can only go UP on renewal (cannot shrink mid-policy).
            // To shrink, user closes + re-opens.
            require!(
                coverage_cap_usdc >= policy.coverage_cap_usdc,
                InsErr::CoverageCapShrink
            );
            if coverage_cap_usdc > policy.coverage_cap_usdc {
                let delta = coverage_cap_usdc - policy.coverage_cap_usdc;
                let pool = &mut ctx.accounts.pool;
                pool.coverage_outstanding = pool
                    .coverage_outstanding
                    .checked_add(delta)
                    .ok_or(InsErr::Overflow)?;
                policy.coverage_cap_usdc = coverage_cap_usdc;
            }

            // Extend paid_through from MAX(now, current paid_through)
            let base = policy.paid_through_unix.max(now);
            policy.paid_through_unix = base.checked_add(seconds_funded).ok_or(InsErr::Overflow)?;
            policy.premium_paid_micro = policy
                .premium_paid_micro
                .checked_add(premium_amount_usdc)
                .ok_or(InsErr::Overflow)?;
        }

        emit!(PolicyBought {
            user: policy.user,
            premium_amount_usdc,
            coverage_cap_usdc: policy.coverage_cap_usdc,
            paid_through: policy.paid_through_unix,
        });
        Ok(())
    }

    /// Close policy. Refund proportional to remaining paid_through time.
    /// `is_active = false` is set; coverage_outstanding is decremented.
    /// No further claims can land against this policy.
    pub fn close_policy(ctx: Context<ClosePolicy>) -> Result<()> {
        let policy = &mut ctx.accounts.policy;
        require!(policy.is_active, InsErr::PolicyInactive);

        let now = Clock::get()?.unix_timestamp;
        let remaining_sec = (policy.paid_through_unix - now).max(0);
        let paid_for_sec: i64 = ((policy.premium_paid_micro as u128) * 30 * 86_400
            / ((policy.coverage_cap_usdc as u128)
                .checked_mul(ctx.accounts.pool.premium_bps as u128)
                .ok_or(InsErr::Overflow)?
                / 10_000)
                .max(1)) as i64;

        let refund_usdc: u64 = if paid_for_sec > 0 {
            ((policy.premium_paid_micro as u128)
                .checked_mul(remaining_sec as u128)
                .ok_or(InsErr::Overflow)?
                / paid_for_sec as u128) as u64
        } else {
            0
        };

        // Transfer refund from vault → user
        if refund_usdc > 0 {
            let admin = ctx.accounts.pool.admin;
            let bump = ctx.accounts.pool.bump;
            let seeds: &[&[u8]] = &[b"sakura_pool", admin.as_ref(), &[bump]];
            let signer_seeds: &[&[&[u8]]] = &[seeds];
            let cpi = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.user_usdc_ata.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(cpi, refund_usdc)?;
        }

        // Decrement pool coverage_outstanding
        let pool = &mut ctx.accounts.pool;
        pool.coverage_outstanding = pool
            .coverage_outstanding
            .saturating_sub(policy.coverage_cap_usdc);

        policy.is_active = false;

        emit!(PolicyClosed {
            user: policy.user,
            refund_usdc,
            total_claimed: policy.total_claimed,
            rescue_count: policy.rescue_count,
        });
        Ok(())
    }

    // ──────────────────────────────────────────────────────────────────
    // RESCUE CLAIM
    // ──────────────────────────────────────────────────────────────────

    /// Sakura agent claims a payout from the pool on behalf of an insured
    /// user. Creates a ClaimRecord PDA to prevent replay.
    pub fn claim_payout(
        ctx: Context<ClaimPayout>,
        amount_usdc: u64,
        rescue_sig_hash: [u8; 32],
        claim_nonce: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.paused, InsErr::Paused);
        require!(amount_usdc > 0, InsErr::ZeroAmount);

        let policy = &mut ctx.accounts.policy;
        require!(policy.is_active, InsErr::PolicyInactive);

        let now = Clock::get()?.unix_timestamp;
        // 48h grace period after paid_through
        const GRACE_SEC: i64 = 48 * 3_600;
        require!(now <= policy.paid_through_unix + GRACE_SEC, InsErr::PolicyLapsed);

        let new_total = policy
            .total_claimed
            .checked_add(amount_usdc)
            .ok_or(InsErr::Overflow)?;
        require!(new_total <= policy.coverage_cap_usdc, InsErr::CoverageCapExceeded);

        // Pool vault must have enough USDC
        require!(
            ctx.accounts.pool_vault.amount >= amount_usdc,
            InsErr::VaultInsufficient
        );

        // Signer check: agent == pool.admin_agent
        require!(
            ctx.accounts.admin_agent.key() == ctx.accounts.pool.admin_agent,
            InsErr::NotAdminAgent
        );

        // Transfer USDC from pool vault → rescue destination
        let admin = ctx.accounts.pool.admin;
        let bump = ctx.accounts.pool.bump;
        let seeds: &[&[u8]] = &[b"sakura_pool", admin.as_ref(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];
        let cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault.to_account_info(),
                to: ctx.accounts.rescue_destination_ata.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi, amount_usdc)?;

        // Write claim record (PDA init already gives us replay protection —
        // a second attempt with the same nonce will fail with
        // "account already in use" at the init constraint level)
        let record = &mut ctx.accounts.claim_record;
        record.policy = policy.key();
        record.amount_usdc = amount_usdc;
        record.rescue_sig_hash = rescue_sig_hash;
        record.claim_nonce = claim_nonce;
        record.ts = now;
        record.bump = ctx.bumps.claim_record;

        // Update policy counters
        policy.total_claimed = new_total;
        policy.rescue_count = policy.rescue_count.checked_add(1).ok_or(InsErr::Overflow)?;

        emit!(ClaimPaid {
            user: policy.user,
            amount_usdc,
            total_claimed: new_total,
            rescue_count: policy.rescue_count,
            rescue_sig_hash,
        });
        Ok(())
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Accounts
// ══════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Pool::LEN,
        seeds = [b"sakura_pool", admin.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: the agent pubkey that will sign claim_payout. Stored only.
    pub admin_agent: UncheckedAccount<'info>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = pool,
        seeds = [b"sakura_vault", pool.key().as_ref()],
        bump,
    )]
    pub usdc_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"sakura_pool", pool.admin.as_ref()],
        bump = pool.bump,
        has_one = admin,
    )]
    pub pool: Account<'info, Pool>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct LpDeposit<'info> {
    #[account(
        mut,
        seeds = [b"sakura_pool", pool.admin.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init_if_needed,
        payer = lp,
        space = 8 + LpPosition::LEN,
        seeds = [b"sakura_lp", lp.key().as_ref()],
        bump,
    )]
    pub lp_position: Account<'info, LpPosition>,

    #[account(mut)]
    pub lp: Signer<'info>,

    #[account(
        mut,
        token::mint = pool.usdc_mint,
        constraint = lp_usdc_ata.owner == lp.key() @ InsErr::WrongOwner,
    )]
    pub lp_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = pool.usdc_vault,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LpWithdraw<'info> {
    #[account(
        mut,
        seeds = [b"sakura_pool", pool.admin.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"sakura_lp", lp.key().as_ref()],
        bump = lp_position.bump,
        has_one = lp,
    )]
    pub lp_position: Account<'info, LpPosition>,

    pub lp: Signer<'info>,

    #[account(
        mut,
        token::mint = pool.usdc_mint,
        constraint = lp_usdc_ata.owner == lp.key() @ InsErr::WrongOwner,
    )]
    pub lp_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, address = pool.usdc_vault)]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyPolicy<'info> {
    #[account(
        mut,
        seeds = [b"sakura_pool", pool.admin.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Policy::LEN,
        seeds = [b"sakura_policy", user.key().as_ref()],
        bump,
    )]
    pub policy: Account<'info, Policy>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        token::mint = pool.usdc_mint,
        constraint = user_usdc_ata.owner == user.key() @ InsErr::WrongOwner,
    )]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, address = pool.usdc_vault)]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePolicy<'info> {
    #[account(
        mut,
        seeds = [b"sakura_pool", pool.admin.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"sakura_policy", user.key().as_ref()],
        bump = policy.bump,
        has_one = user,
    )]
    pub policy: Account<'info, Policy>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        token::mint = pool.usdc_mint,
        constraint = user_usdc_ata.owner == user.key() @ InsErr::WrongOwner,
    )]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, address = pool.usdc_vault)]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(amount_usdc: u64, rescue_sig_hash: [u8; 32], claim_nonce: u64)]
pub struct ClaimPayout<'info> {
    #[account(
        mut,
        seeds = [b"sakura_pool", pool.admin.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"sakura_policy", policy.user.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, Policy>,

    /// Agent signer — must match `pool.admin_agent`.
    pub admin_agent: Signer<'info>,

    /// Payer for the new ClaimRecord account rent.
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ClaimRecord::LEN,
        seeds = [b"sakura_claim", policy.key().as_ref(), &claim_nonce.to_le_bytes()],
        bump,
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    #[account(mut, address = pool.usdc_vault)]
    pub pool_vault: Account<'info, TokenAccount>,

    #[account(mut, token::mint = pool.usdc_mint)]
    pub rescue_destination_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ══════════════════════════════════════════════════════════════════════════
// State
// ══════════════════════════════════════════════════════════════════════════

#[account]
pub struct Pool {
    pub admin: Pubkey,                // 32
    pub admin_agent: Pubkey,          // 32 (separate from admin so it can rotate)
    pub usdc_mint: Pubkey,            // 32
    pub usdc_vault: Pubkey,           // 32
    pub total_shares: u64,            // 8
    pub premium_bps: u16,             // 2
    pub min_reserve_bps: u16,         // 2
    pub coverage_outstanding: u64,    // 8 — sum of all active policies' coverage_cap
    pub paused: bool,                 // 1
    pub bump: u8,                     // 1
}
impl Pool {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 2 + 2 + 8 + 1 + 1;
}

#[account]
pub struct LpPosition {
    pub lp: Pubkey,                   // 32
    pub shares: u64,                  // 8
    pub deposited_at: i64,            // 8
    pub bump: u8,                     // 1
}
impl LpPosition {
    pub const LEN: usize = 32 + 8 + 8 + 1;
}

#[account]
pub struct Policy {
    pub user: Pubkey,                 // 32
    pub coverage_cap_usdc: u64,       // 8
    pub premium_paid_micro: u64,      // 8
    pub paid_through_unix: i64,       // 8
    pub total_claimed: u64,           // 8
    pub rescue_count: u64,            // 8
    pub is_active: bool,              // 1
    pub bump: u8,                     // 1
}
impl Policy {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct ClaimRecord {
    pub policy: Pubkey,               // 32
    pub amount_usdc: u64,             // 8
    pub rescue_sig_hash: [u8; 32],    // 32
    pub claim_nonce: u64,             // 8
    pub ts: i64,                      // 8
    pub bump: u8,                     // 1
}
impl ClaimRecord {
    pub const LEN: usize = 32 + 8 + 32 + 8 + 8 + 1;
}

// ══════════════════════════════════════════════════════════════════════════
// Events
// ══════════════════════════════════════════════════════════════════════════

#[event] pub struct PoolInitialized { pub admin: Pubkey, pub admin_agent: Pubkey, pub premium_bps: u16, pub min_reserve_bps: u16 }
#[event] pub struct AdminAgentRotated { pub new_agent: Pubkey }
#[event] pub struct PoolPauseToggled { pub paused: bool }
#[event] pub struct LpDeposited { pub lp: Pubkey, pub amount_usdc: u64, pub shares_minted: u64 }
#[event] pub struct LpWithdrawn { pub lp: Pubkey, pub payout_usdc: u64, pub shares_burned: u64 }
#[event] pub struct PolicyBought { pub user: Pubkey, pub premium_amount_usdc: u64, pub coverage_cap_usdc: u64, pub paid_through: i64 }
#[event] pub struct PolicyClosed { pub user: Pubkey, pub refund_usdc: u64, pub total_claimed: u64, pub rescue_count: u64 }
#[event] pub struct ClaimPaid { pub user: Pubkey, pub amount_usdc: u64, pub total_claimed: u64, pub rescue_count: u64, pub rescue_sig_hash: [u8; 32] }

// ══════════════════════════════════════════════════════════════════════════
// Errors
// ══════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum InsErr {
    #[msg("Amount must be > 0")]                        ZeroAmount,
    #[msg("Invalid parameter")]                         InvalidParam,
    #[msg("Pool is paused")]                            Paused,
    #[msg("Arithmetic overflow")]                       Overflow,
    #[msg("Share computation returned zero")]           ZeroShares,
    #[msg("Insufficient LP shares")]                    InsufficientShares,
    #[msg("Withdraw would breach reserve floor")]       ReserveFloorBreach,
    #[msg("Premium below monthly minimum")]             PremiumTooLow,
    #[msg("Policy authority mismatch")]                 WrongUser,
    #[msg("Policy is inactive")]                        PolicyInactive,
    #[msg("Coverage cap cannot shrink mid-policy")]     CoverageCapShrink,
    #[msg("Policy is lapsed beyond grace period")]      PolicyLapsed,
    #[msg("Coverage cap would be exceeded")]            CoverageCapExceeded,
    #[msg("Pool vault has insufficient USDC")]          VaultInsufficient,
    #[msg("Only the registered admin agent may claim")] NotAdminAgent,
    #[msg("Token account owner mismatch")]              WrongOwner,
}
