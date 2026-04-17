use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp");

/// Sakura Liquidation Shield — On-chain Rescue Mandate Program
///
/// Stores rescue mandates as PDAs: each wallet has one active mandate that
/// authorizes the Sakura agent to execute emergency debt repayment up to a
/// pre-approved USDC ceiling when health factor drops below threshold.
///
/// Architecture:
///   1. User calls `create_mandate` → PDA stores (agent, max_usdc, trigger_hf)
///   2. Agent monitors health factor off-chain (via Kamino/MarginFi SDK)
///   3. When HF drops below threshold, agent calls `execute_rescue`
///   4. Program verifies: caller == mandate.agent, amount <= remaining ceiling
///   5. Transfers USDC from user's ATA to protocol repay vault via CPI
///   6. Records cumulative rescued amount and count on-chain
///
/// Security invariants:
///   - Only the authorized agent can execute rescue (signer check)
///   - Rescue amount is bounded by `max_usdc - total_rescued` (ceiling check)
///   - User can close mandate anytime to revoke agent authority
///   - PDA seeds ensure one mandate per wallet (no duplicates)
#[program]
pub mod sakura_mandate {
    use super::*;

    /// Create a rescue mandate PDA for the caller's wallet.
    ///
    /// The mandate authorizes `agent` to transfer up to `max_usdc` (in micro-USDC)
    /// when the user's lending position health factor drops below `trigger_hf_bps`.
    pub fn create_mandate(
        ctx: Context<CreateMandate>,
        max_usdc: u64,
        trigger_hf_bps: u16, // Health factor * 100, e.g., 150 = 1.50
    ) -> Result<()> {
        require!(max_usdc > 0, SakuraError::ZeroAmount);
        require!(
            trigger_hf_bps >= 101 && trigger_hf_bps <= 300,
            SakuraError::InvalidThreshold
        );

        let mandate = &mut ctx.accounts.mandate;
        mandate.authority = ctx.accounts.authority.key();
        mandate.agent = ctx.accounts.agent.key();
        mandate.max_usdc = max_usdc;
        mandate.trigger_hf_bps = trigger_hf_bps;
        mandate.total_rescued = 0;
        mandate.rescue_count = 0;
        mandate.created_at = Clock::get()?.unix_timestamp;
        mandate.last_rescue_at = 0;
        mandate.is_active = true;
        mandate.bump = ctx.bumps.mandate;

        emit!(MandateCreated {
            authority: mandate.authority,
            agent: mandate.agent,
            max_usdc,
            trigger_hf_bps,
            created_at: mandate.created_at,
        });

        msg!(
            "Sakura: Mandate created | wallet={} agent={} max_usdc={} trigger_hf={}",
            mandate.authority,
            mandate.agent,
            max_usdc,
            trigger_hf_bps,
        );

        Ok(())
    }

    /// Execute a rescue: transfer USDC from user's ATA to repay vault.
    ///
    /// Caller MUST be the authorized agent. Amount is bounded by remaining ceiling.
    /// The program does NOT verify health factor on-chain (it's off-chain data from
    /// lending protocols); the agent is trusted to trigger only when HF < threshold.
    /// On-chain invariant: amount <= max_usdc - total_rescued.
    pub fn execute_rescue(
        ctx: Context<ExecuteRescue>,
        rescue_amount: u64,       // micro-USDC to transfer
        reported_hf_bps: u16,     // Agent-reported health factor (for audit log)
        proof_hash: [u8; 32],     // SHA-256 hash of off-chain proof bundle
    ) -> Result<()> {
        // Read immutable state first for security checks + CPI
        let is_active = ctx.accounts.mandate.is_active;
        let max_usdc = ctx.accounts.mandate.max_usdc;
        let total_rescued = ctx.accounts.mandate.total_rescued;
        let authority_key = ctx.accounts.mandate.authority;
        let bump = ctx.accounts.mandate.bump;

        // Security checks
        require!(is_active, SakuraError::MandateInactive);
        require!(rescue_amount > 0, SakuraError::ZeroAmount);

        let remaining = max_usdc
            .checked_sub(total_rescued)
            .ok_or(SakuraError::Overflow)?;
        require!(rescue_amount <= remaining, SakuraError::ExceedsCeiling);

        // Execute USDC transfer: user ATA → repay vault
        // The PDA is the delegate authority over user's USDC ATA
        let seeds = &[
            b"sakura_mandate",
            authority_key.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_usdc_ata.to_account_info(),
                to: ctx.accounts.repay_vault.to_account_info(),
                authority: ctx.accounts.mandate.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, rescue_amount)?;

        // Update state (mutable borrow now safe — CPI done)
        let mandate = &mut ctx.accounts.mandate;
        mandate.total_rescued = mandate.total_rescued
            .checked_add(rescue_amount)
            .ok_or(SakuraError::Overflow)?;
        mandate.rescue_count = mandate
            .rescue_count
            .checked_add(1)
            .ok_or(SakuraError::Overflow)?;
        mandate.last_rescue_at = Clock::get()?.unix_timestamp;

        emit!(RescueExecuted {
            authority: mandate.authority,
            agent: mandate.agent,
            rescue_amount,
            total_rescued: mandate.total_rescued,
            rescue_count: mandate.rescue_count,
            reported_hf_bps,
            proof_hash,
            timestamp: mandate.last_rescue_at,
        });

        msg!(
            "Sakura: Rescue #{} | amount={} total={}/{} hf_bps={}",
            mandate.rescue_count,
            rescue_amount,
            mandate.total_rescued,
            mandate.max_usdc,
            reported_hf_bps,
        );

        Ok(())
    }

    /// Update mandate parameters (only authority can call).
    pub fn update_mandate(
        ctx: Context<UpdateMandate>,
        new_max_usdc: Option<u64>,
        new_trigger_hf_bps: Option<u16>,
    ) -> Result<()> {
        let mandate = &mut ctx.accounts.mandate;

        if let Some(max) = new_max_usdc {
            require!(max >= mandate.total_rescued, SakuraError::CeilingBelowRescued);
            mandate.max_usdc = max;
        }

        if let Some(hf) = new_trigger_hf_bps {
            require!(hf >= 101 && hf <= 300, SakuraError::InvalidThreshold);
            mandate.trigger_hf_bps = hf;
        }

        emit!(MandateUpdated {
            authority: mandate.authority,
            max_usdc: mandate.max_usdc,
            trigger_hf_bps: mandate.trigger_hf_bps,
        });

        Ok(())
    }

    /// Close mandate and reclaim rent (only authority can call).
    /// Revokes agent's rescue authority immediately.
    pub fn close_mandate(_ctx: Context<CloseMandate>) -> Result<()> {
        emit!(MandateClosed {
            authority: _ctx.accounts.authority.key(),
        });
        msg!("Sakura: Mandate closed | wallet={}", _ctx.accounts.authority.key());
        Ok(())
    }
}

// ══════════════════════════════════════════════════════════════════
// Accounts
// ══════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct CreateMandate<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 2 + 8 + 1 + 8 + 8 + 1 + 1, // 109 bytes + discriminator
        seeds = [b"sakura_mandate", authority.key().as_ref()],
        bump,
    )]
    pub mandate: Account<'info, RescueMandate>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Agent public key — stored in mandate, verified on execute_rescue
    pub agent: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteRescue<'info> {
    #[account(
        mut,
        seeds = [b"sakura_mandate", mandate.authority.as_ref()],
        bump = mandate.bump,
        has_one = agent,
    )]
    pub mandate: Account<'info, RescueMandate>,

    /// Agent signer — must match mandate.agent
    pub agent: Signer<'info>,

    /// User's USDC token account (source)
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = mandate, // PDA is the delegate
    )]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    /// Repay vault (destination — e.g., Kamino/MarginFi repay account)
    #[account(mut)]
    pub repay_vault: Account<'info, TokenAccount>,

    /// USDC mint address
    /// CHECK: Validated by token account constraints
    pub usdc_mint: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateMandate<'info> {
    #[account(
        mut,
        seeds = [b"sakura_mandate", authority.key().as_ref()],
        bump = mandate.bump,
        has_one = authority,
    )]
    pub mandate: Account<'info, RescueMandate>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseMandate<'info> {
    #[account(
        mut,
        seeds = [b"sakura_mandate", authority.key().as_ref()],
        bump = mandate.bump,
        has_one = authority,
        close = authority,
    )]
    pub mandate: Account<'info, RescueMandate>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

// ══════════════════════════════════════════════════════════════════
// State
// ══════════════════════════════════════════════════════════════════

#[account]
pub struct RescueMandate {
    /// Wallet owner who created this mandate
    pub authority: Pubkey,         // 32 bytes
    /// Authorized rescue agent
    pub agent: Pubkey,             // 32 bytes
    /// Maximum cumulative USDC authorized (micro-USDC, 6 decimals)
    pub max_usdc: u64,             // 8 bytes
    /// Health factor trigger threshold (bps, e.g., 150 = HF 1.50)
    pub trigger_hf_bps: u16,      // 2 bytes
    /// Cumulative USDC rescued so far
    pub total_rescued: u64,        // 8 bytes
    /// Number of rescue operations executed
    pub rescue_count: u8,          // 1 byte
    /// Unix timestamp of mandate creation
    pub created_at: i64,           // 8 bytes
    /// Unix timestamp of last rescue execution
    pub last_rescue_at: i64,       // 8 bytes
    /// Whether mandate is still active
    pub is_active: bool,           // 1 byte
    /// PDA bump seed
    pub bump: u8,                  // 1 byte
}

// ══════════════════════════════════════════════════════════════════
// Events (indexed on-chain for explorers and analytics)
// ══════════════════════════════════════════════════════════════════

#[event]
pub struct MandateCreated {
    pub authority: Pubkey,
    pub agent: Pubkey,
    pub max_usdc: u64,
    pub trigger_hf_bps: u16,
    pub created_at: i64,
}

#[event]
pub struct RescueExecuted {
    pub authority: Pubkey,
    pub agent: Pubkey,
    pub rescue_amount: u64,
    pub total_rescued: u64,
    pub rescue_count: u8,
    pub reported_hf_bps: u16,
    pub proof_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct MandateUpdated {
    pub authority: Pubkey,
    pub max_usdc: u64,
    pub trigger_hf_bps: u16,
}

#[event]
pub struct MandateClosed {
    pub authority: Pubkey,
}

// ══════════════════════════════════════════════════════════════════
// Errors
// ══════════════════════════════════════════════════════════════════

#[error_code]
pub enum SakuraError {
    #[msg("Rescue amount must be greater than zero")]
    ZeroAmount,

    #[msg("Trigger health factor must be between 1.01 (101) and 3.00 (300)")]
    InvalidThreshold,

    #[msg("Rescue amount exceeds remaining mandate ceiling")]
    ExceedsCeiling,

    #[msg("Mandate is not active")]
    MandateInactive,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("New ceiling cannot be below already-rescued amount")]
    CeilingBelowRescued,
}
