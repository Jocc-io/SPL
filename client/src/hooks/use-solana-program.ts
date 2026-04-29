'use client';

import { useMemo } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMint } from '@solana/spl-token';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import idlJson from '@/lib/idl.json';
import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';

// Types
export interface SaleAccount {
  authority: PublicKey;
  mint: PublicKey;
  price: BN;
  amount: BN;
  startTime: BN;
  endTime: BN;
  website?: string;
  twitter?: string;
  discord?: string;
  totalSold: BN;
  bump: number;
}

export interface ParsedSale {
  publicKey: PublicKey;
  account: {
    authority: string;
    mint: string;
    price: string;
    amount: string;
    startTime: number;
    endTime: number;
    website?: string;
    twitter?: string;
    discord?: string;
    totalSold: string;
    vaultBalance?: string;
  };
  mintInfo?: {
    decimals: number;
    name?: string;
    symbol?: string;
  };
}

const PROGRAM_ID = new PublicKey('JocctLRx3n4Q4AUJo9QrMK2oznK3oihNMApy1qiV65t');
const JOCC_MINT = new PublicKey('JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc');
const JOCC_FEE = new BN('500000000000'); // 500 JOCC with 9 decimals
const JOCC_FEE_RECIPIENT = new PublicKey(
  'ZjqhG3g5KR8VZKRqoS7JgXrTjDLqVrxX2xourXnuFee'
); // Fee recipient wallet

export function useSolanaProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    const provider = wallet
      ? new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
      : new AnchorProvider(
          connection,
          {
            publicKey: PublicKey.default,
            signTransaction: async () => {
              throw new Error('Read-only');
            },
            signAllTransactions: async () => {
              throw new Error('Read-only');
            },
          } as any,
          AnchorProvider.defaultOptions()
        );

    return new Program(idlJson as any, provider);
  }, [connection, wallet]);

  return program;
}

// === QUERIES ===
export function useSales() {
  const program = useSolanaProgram();
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['sales', 'all'],
    queryFn: async () => {
      console.log('Fetching all sales...');
      try {
        // @ts-ignore - IDL typing issues
        const accounts = await program.account.sale.all();

        // Transform and fetch mint info for decimals and metadata
        const umi = createUmi(connection.rpcEndpoint);
        const parsedSales = await Promise.all(
          accounts.map(async (acc: any) => {
            let decimals = 0;
            let name = '';
            let symbol = '';
            const mintAddress = acc.account.mint.toString();
            let vaultBalance = '0';

            try {
              const mintInfo = await getMint(connection, acc.account.mint);
              decimals = mintInfo.decimals;

              // Fetch vault balance
              const [vaultPda] = await PublicKey.findProgramAddress(
                [Buffer.from('vault'), acc.publicKey.toBuffer()],
                program.programId
              );

              try {
                const balance =
                  await connection.getTokenAccountBalance(vaultPda);
                vaultBalance = balance.value.amount;
              } catch (e) {
                console.warn('Failed to fetch vault balance', e);
              }

              try {
                // Use a smaller timeout or more robust check if needed
                const asset = await fetchDigitalAsset(
                  umi,
                  umiPublicKey(mintAddress)
                );
                name =
                  asset.metadata.name.replace(/\0/g, '').trim() ||
                  mintAddress.slice(0, 8);
                symbol =
                  asset.metadata.symbol.replace(/\0/g, '').trim() || 'TKN';
              } catch (metaErr) {
                console.warn(
                  'Failed to fetch Metaplex metadata, falling back to address',
                  metaErr
                );
                name = mintAddress.slice(0, 8);
                symbol = 'TKN';
              }
            } catch (e) {
              console.error('Failed to fetch mint info', e);
            }

            const totalSoldBN = new BN(acc.account.totalSold || 0);

            return {
              publicKey: acc.publicKey,
              account: {
                authority: acc.account.authority.toString(),
                mint: mintAddress,
                price: acc.account.price.toString(),
                amount: acc.account.amount.toString(),
                startTime: acc.account.startTime.toNumber(),
                endTime: acc.account.endTime.toNumber(),
                website: acc.account.website || undefined,
                twitter: acc.account.twitter || undefined,
                discord: acc.account.discord || undefined,
                totalSold: totalSoldBN.toString(),
                vaultBalance: vaultBalance,
              },
              mintInfo: { decimals, name, symbol },
            };
          })
        );

        return parsedSales as ParsedSale[];
      } catch (e) {
        console.error('Error in useSales queryFn:', e);
        return [];
      }
    },
    staleTime: 0,
  });
}

export function useSale(address: string) {
  const program = useSolanaProgram();
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['sale', address],
    queryFn: async () => {
      try {
        const pubkey = new PublicKey(address);
        // @ts-ignore
        const account = await program.account.sale.fetch(pubkey);

        // Fetch mint info
        const mintInfo = await getMint(connection, account.mint);
        const mintAddress = account.mint.toString();
        let name = mintAddress.slice(0, 8);
        let symbol = 'TKN';
        let vaultBalance = '0';

        // Fetch vault balance
        const [vaultPda] = await PublicKey.findProgramAddress(
          [Buffer.from('vault'), pubkey.toBuffer()],
          program.programId
        );

        try {
          const balance = await connection.getTokenAccountBalance(vaultPda);
          vaultBalance = balance.value.amount;
        } catch (e) {
          console.warn('Failed to fetch vault balance', e);
        }

        try {
          const umi = createUmi(connection.rpcEndpoint);
          const asset = await fetchDigitalAsset(umi, umiPublicKey(mintAddress));
          name =
            asset.metadata.name.replace(/\0/g, '').trim() ||
            mintAddress.slice(0, 8);
          symbol = asset.metadata.symbol.replace(/\0/g, '').trim() || 'TKN';
        } catch (e) {
          console.warn('Metaplex metadata fetch failed', e);
        }

        const totalSoldBN = new BN(account.totalSold || 0);

        return {
          publicKey: pubkey,
          account: {
            authority: account.authority.toString(),
            mint: mintAddress,
            price: account.price.toString(),
            amount: account.amount.toString(),
            startTime: account.startTime.toNumber(),
            endTime: account.endTime.toNumber(),
            website: account.website || undefined,
            twitter: account.twitter || undefined,
            discord: account.discord || undefined,
            totalSold: totalSoldBN.toString(),
            vaultBalance: vaultBalance,
          },
          mintInfo: { decimals: mintInfo.decimals, name, symbol },
        } as ParsedSale;
      } catch (e) {
        console.error('Error fetching sale:', e);
        throw e;
      }
    },
    enabled: !!address,
    staleTime: 0,
  });
}

// === MUTATIONS ===
export function useCreateSale() {
  const program = useSolanaProgram();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      tokenMint: string;
      priceSol: number;
      amountTokens: number;
      startTime: number;
      endTime: number;
      website?: string;
      twitter?: string;
      discord?: string;
    }) => {
      console.log('[v0] Mutation start with input:', input);
      if (!wallet) throw new Error('Wallet not connected');

      const mint = new PublicKey(input.tokenMint);
      const mintInfo = await getMint(connection, mint);

      const priceLamports = new BN(input.priceSol * 1e9);
      const amountRaw = new BN(input.amountTokens * 10 ** mintInfo.decimals);

      const [salePda] = await PublicKey.findProgramAddress(
        [Buffer.from('sale'), wallet.publicKey.toBuffer(), mint.toBuffer()],
        program.programId
      );

      const [vaultPda] = await PublicKey.findProgramAddress(
        [Buffer.from('vault'), salePda.toBuffer()],
        program.programId
      );

      const userAta = await import('@solana/spl-token').then((spl) =>
        spl.getAssociatedTokenAddress(mint, wallet.publicKey)
      );

      const spl = await import('@solana/spl-token');

      // Get user's JOCC token account
      const userJoccAta = await spl.getAssociatedTokenAddress(
        JOCC_MINT,
        wallet.publicKey
      );

      // Get fee recipient JOCC token account
      const feeRecipientJoccAta = await spl.getAssociatedTokenAddress(
        JOCC_MINT,
        JOCC_FEE_RECIPIENT
      );

      console.log('[v0] Creating sale PDA...', {
        sale: salePda.toString(),
        vault: vaultPda.toString(),
        mint: mint.toString(),
        price: priceLamports.toString(),
        amount: amountRaw.toString(),
        website: input.website,
        twitter: input.twitter,
        discord: input.discord,
      });

      console.log('[v0] JOCC fee details:', {
        userJoccAta: userJoccAta.toString(),
        feeRecipientJoccAta: feeRecipientJoccAta.toString(),
        joccMint: JOCC_MINT.toString(),
        fee: JOCC_FEE.toString(),
      });

      // @ts-ignore
      const initInstruction = await program.methods
        .initialize(
          priceLamports,
          amountRaw,
          new BN(input.startTime),
          new BN(input.endTime),
          input.website || null,
          input.twitter || null,
          input.discord || null
        )
        .accounts({
          sale: salePda,
          authority: wallet.publicKey,
          mint: mint,
          vault: vaultPda,
          sellerTokenAccount: userAta,
          joccMint: JOCC_MINT,
          userJoccAccount: userJoccAta,
          feeRecipient: feeRecipientJoccAta,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      const transaction = new (await import('@solana/web3.js')).Transaction();
      transaction.add(initInstruction);

      console.log('[v0] Sending transaction...');
      const tx = await program.provider.sendAndConfirm!(transaction);

      console.log('[v0] Sale created with tx:', tx);
      return tx;
    },
    onSuccess: async () => {
      console.log(
        '[v0] Sale mutation onSuccess fired, invalidating and refetching sales'
      );
      // Invalidate both lists and individual sales
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      await queryClient.refetchQueries({ queryKey: ['sales'] });
      console.log('[v0] Sales cache invalidated and refetched');
    },
  });
}

export function useBuyTokens() {
  const program = useSolanaProgram();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sale,
      amountTokens,
    }: {
      sale: ParsedSale;
      amountTokens: number;
    }) => {
      if (!wallet) throw new Error('Wallet not connected');

      const salePubkey = new PublicKey(sale.publicKey);
      const mint = new PublicKey(sale.account.mint);

      const decimals = sale.mintInfo?.decimals || 0;
      const amountRaw = new BN(amountTokens * 10 ** decimals);

      const [vaultPda] = await PublicKey.findProgramAddress(
        [Buffer.from('vault'), salePubkey.toBuffer()],
        program.programId
      );

      const buyerAta = await import('@solana/spl-token').then((spl) =>
        spl.getAssociatedTokenAddress(mint, wallet.publicKey)
      );

      // Create ATA if it doesn't exist
      const spl = await import('@solana/spl-token');
      const transaction = new (await import('@solana/web3.js')).Transaction();

      const accountInfo = await connection.getAccountInfo(buyerAta);
      if (!accountInfo) {
        transaction.add(
          spl.createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            buyerAta,
            wallet.publicKey,
            mint
          )
        );
      }

      const sellerPubkey = new PublicKey(sale.account.authority);

      // @ts-ignore
      const buyInstruction = await program.methods
        .buy(amountRaw)
        .accounts({
          sale: salePubkey,
          buyer: wallet.publicKey,
          buyerTokenAccount: buyerAta,
          vault: vaultPda,
          seller: sellerPubkey,
          systemProgram: SystemProgram.programId,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
        })
        .instruction();

      transaction.add(buyInstruction);

      try {
        const tx = await program.provider.sendAndConfirm!(transaction);
        return tx;
      } catch (e: any) {
        console.error('Purchase failed with error:', e);
        if (e.logs) {
          console.error('Transaction logs:', e.logs);
        }
        if (e.message?.includes('insufficient lamports')) {
          const match = e.message.match(/need (\d+)/);
          const needed = match
            ? (Number.parseInt(match[1]) / 1e9).toFixed(4)
            : 'more';
          throw new Error(
            `Insufficient SOL. You need approximately ${needed} SOL to complete this purchase.`
          );
        }
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['sale'] });
    },
  });
}

export function useWithdraw() {
  const program = useSolanaProgram();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sale }: { sale: ParsedSale }) => {
      if (!wallet) throw new Error('Wallet not connected');

      const salePubkey = new PublicKey(sale.publicKey);
      const mint = new PublicKey(sale.account.mint);

      const [vaultPda] = await PublicKey.findProgramAddress(
        [Buffer.from('vault'), salePubkey.toBuffer()],
        program.programId
      );

      const sellerAta = await import('@solana/spl-token').then((spl) =>
        spl.getAssociatedTokenAddress(mint, wallet.publicKey)
      );

      // @ts-ignore
      const tx = await program.methods
        .withdraw()
        .accounts({
          sale: salePubkey,
          authority: wallet.publicKey,
          vault: vaultPda,
          sellerTokenAccount: sellerAta,
          tokenProgram: await import('@solana/spl-token').then(
            (spl) => spl.TOKEN_PROGRAM_ID
          ),
        })
        .rpc();

      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['sale'] });
    },
  });
}
