use anchor_lang::prelude::*;
use anchor_spl::token::{
    self, Mint, Token, TokenAccount, Transfer
};

declare_id!("JocctLRx3n4Q4AUJo9QrMK2oznK3oihNMApy1qiV65t");

pub const JOCC_MINT: &str = "JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc";

pub const JOCC_FEE: u64 = 500_000_000_000;

#[program]
pub mod jocc {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        price: u64,
        amount: u64,
        start_time: i64,
        end_time: i64,
        website: Option<String>,
        twitter: Option<String>,
        discord: Option<String>,
    ) -> Result<()> {

        require!(start_time < end_time, SaleError::InvalidTime);
        require!(amount > 0, SaleError::InvalidAmount);

        let sale = &mut ctx.accounts.sale;

        // 🔒 Verify JOCC mint
        require!(
            ctx.accounts.jocc_mint.key().to_string() == JOCC_MINT,
            SaleError::InvalidFeeMint
        );

        // 🔒 Verify user JOCC account
        require!(
            ctx.accounts.user_jocc_account.mint == ctx.accounts.jocc_mint.key(),
            SaleError::InvalidFeeMint
        );
        require!(
            ctx.accounts.user_jocc_account.owner == ctx.accounts.authority.key(),
            SaleError::Unauthorized
        );
        require!(
            ctx.accounts.user_jocc_account.amount >= JOCC_FEE,
            SaleError::InsufficientFee
        );

        // 🔒 Transfer JOCC fee ON-CHAIN
        let fee_accounts = Transfer {
            from: ctx.accounts.user_jocc_account.to_account_info(),
            to: ctx.accounts.fee_recipient.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), fee_accounts),
            JOCC_FEE,
        )?;

        // 🔒 Verify seller token account
        require!(
            ctx.accounts.seller_token_account.owner == ctx.accounts.authority.key(),
            SaleError::Unauthorized
        );
        require!(
            ctx.accounts.seller_token_account.mint == ctx.accounts.mint.key(),
            SaleError::InvalidMint
        );

        sale.authority = ctx.accounts.authority.key();
        sale.mint = ctx.accounts.mint.key();
        sale.price = price;
        sale.amount = amount;
        sale.start_time = start_time;
        sale.end_time = end_time;
        sale.website = website;
        sale.twitter = twitter;
        sale.discord = discord;
        sale.vault = ctx.accounts.vault.key();
        sale.bump = ctx.bumps.sale;
        sale.total_sold = 0;

        // 🔒 Transfer sale tokens to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            amount,
        )?;

        Ok(())
    }

   pub fn buy(ctx: Context<Buy>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        
        let (sale_authority, sale_bump, sale_mint) = {
            let sale = &ctx.accounts.sale;
            require!(clock.unix_timestamp >= sale.start_time, SaleError::SaleNotStarted);
            require!(clock.unix_timestamp <= sale.end_time, SaleError::SaleEnded);
            
            let total_cost = amount
                .checked_mul(sale.price)
                .ok_or(SaleError::MathOverflow)?
                .checked_div(1_000_000_000)
                .ok_or(SaleError::MathOverflow)?;

            require!(total_cost > 0, SaleError::InvalidAmount);

            // Transfer SOL from buyer to seller
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &sale.authority,
                total_cost,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.seller.to_account_info(),
                ],
            )?;

            (sale.authority, sale.bump, sale.mint)
        };

        // Transfer Tokens from vault to buyer
        let seeds = &[
            b"sale".as_ref(),
            sale_authority.as_ref(),
            sale_mint.as_ref(),
            &[sale_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.sale.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        let sale = &mut ctx.accounts.sale;
        sale.total_sold = sale.total_sold.checked_add(amount).ok_or(SaleError::MathOverflow)?;

        Ok(())
    }
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let sale = &ctx.accounts.sale;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp > sale.end_time, SaleError::SaleNotEnded);
        require!(sale.authority == ctx.accounts.authority.key(), SaleError::Unauthorized);
        require!(ctx.accounts.vault.key() == sale.vault, SaleError::InvalidVault);

        let amount = ctx.accounts.vault.amount;

        let seeds = &[
            b"sale",
            sale.authority.as_ref(),
            sale.mint.as_ref(),
            &[sale.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.sale.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            ),
            amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 300,
        seeds = [b"sale", authority.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub sale: Account<'info, Sale>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = sale,
        seeds = [b"vault", sale.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    // 🔒 JOCC fee accounts
    pub jocc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_jocc_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub fee_recipient: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(
        mut,
        seeds = [b"sale", sale.authority.as_ref(), sale.mint.as_ref()],
        bump = sale.bump
    )]
    pub sale: Account<'info, Sale>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut, address = sale.authority)]
    pub seller: SystemAccount<'info>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        seeds = [b"sale", sale.authority.as_ref(), sale.mint.as_ref()],
        bump = sale.bump
    )]
    pub sale: Account<'info, Sale>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Sale {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub price: u64,
    pub amount: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub website: Option<String>,
    pub twitter: Option<String>,
    pub discord: Option<String>,
    pub vault: Pubkey,
    pub bump: u8,
    pub total_sold: u64,
}

#[error_code]
pub enum SaleError {
    #[msg("Sale not started")]
    SaleNotStarted,
    #[msg("Sale ended")]
    SaleEnded,
    #[msg("Sale not ended")]
    SaleNotEnded,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Not enough tokens available")]
    NotEnoughTokens,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid vault")]
    InvalidVault,
    #[msg("Invalid time range")]
    InvalidTime,
    #[msg("Invalid fee mint")]
    InvalidFeeMint,
    #[msg("Insufficient JOCC fee balance")]
    InsufficientFee,
}
