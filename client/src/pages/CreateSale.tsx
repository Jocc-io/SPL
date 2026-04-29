'use client';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateSale } from '@/hooks/use-solana-program';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Coins, DollarSign } from 'lucide-react';
import { createSaleSchema } from '@shared/schema';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useLocation } from 'wouter';
import { SendTransactionError } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

type FormData = z.infer<typeof createSaleSchema>;

export default function CreateSale() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [saleExists, setSaleExists] = useState(false);
  const [, setCheckingSale] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createSale = useCreateSale();
  const [solBalance, setSolBalance] = useState<number>(0);
  const [joccBalance, setJoccBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const JOCC_MINT = new PublicKey(
    'JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc'
  );

  useEffect(() => {
    if (!connected || !publicKey) {
      setSolBalance(0);
      setJoccBalance(0);
      return;
    }

    const fetchBalances = async () => {
      try {
        // ✅ SOL Balance
        const lamports = await connection.getBalance(publicKey);
        setSolBalance(lamports / 1e9);

        // ✅ JOCC Balance
        try {
          const ata = await getAssociatedTokenAddress(JOCC_MINT, publicKey);
          const account = await getAccount(connection, ata);
          const balance = Number(account.amount) / 1e9;
          setJoccBalance(balance);
        } catch {
          setJoccBalance(0);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchBalances();
  }, [connected, publicKey, connection]);

  const form = useForm<FormData>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      price: 0.1,
      amount: 1000,
      liquidity: 'manual',
    },
  });
  const watchedAmountValue = form.watch('amount') || 0;
  const watchedAmount = BigInt(Math.floor(watchedAmountValue));
  const watchedTokenMint = form.watch('tokenMint');

  const PROGRAM_ID = new PublicKey(
    'JocctLRx3n4Q4AUJo9QrMK2oznK3oihNMApy1qiV65t'
  );

  const checkIfSaleExists = async (mintAddress: string) => {
    if (!publicKey || !mintAddress) return false;

    try {
      const mint = new PublicKey(mintAddress);

      const [salePda] = await PublicKey.findProgramAddress(
        [Buffer.from('sale'), publicKey.toBuffer(), mint.toBuffer()],
        PROGRAM_ID
      );

      const account = await connection.getAccountInfo(salePda);
      return account !== null;
    } catch (err) {
      console.error('Error checking sale existence:', err);
      return false;
    }
  };

  const onSubmit = (data: FormData) => {
    toast({
      title: 'Attention!',
      description:
        'Sale will be created on Mainnet, not possible to create several sales for the same token',
    });

    // Convert string dates to unix timestamps (seconds)
    const startTime = Math.floor(new Date(data.startTime).getTime() / 1000);
    const endTime = Math.floor(new Date(data.endTime).getTime() / 1000);

    createSale.mutate(
      {
        tokenMint: data.tokenMint,
        priceSol: data.price,
        amountTokens: Math.floor(data.amount),
        startTime,
        endTime,
        website: data.website,
        twitter: data.twitter,
        discord: data.discord,
      },
      {
        onSuccess: () => {
          console.log('Sale creation succeeded, invalidation should have run');
          toast({
            title: 'Sale Created Successfully!',
            description: 'Your token sale is now live on Solana.',
          });
          setTimeout(() => {
            console.log('Navigating to market after refetch');
            setLocation('/market');
          }, 500);
        },
        onError: (err: any) => {
          let message = 'Transaction failed';

          // 1️⃣ SendTransactionError (Solana)
          if (err instanceof SendTransactionError) {
            const logs = err.logs || [];

            // Sale already exists
            if (logs.some((l) => l.includes('already in use'))) {
              message = 'Sale already exists';
            }

            // Insufficient SOL balance
            else if (
              logs.some(
                (l) =>
                  l.includes('insufficient funds') ||
                  l.includes('InsufficientFunds')
              )
            ) {
              message = 'Insufficient balance to complete this transaction';
            }

            // Network / cluster mismatch
            else if (
              logs.some(
                (l) =>
                  l.includes('blockhash not found') ||
                  l.includes('Transaction simulation failed')
              )
            ) {
              message = 'Network error. Please check your Solana network';
            }
          }

          // 2️⃣ User cancelled transaction
          else if (
            err?.message?.includes('User rejected') ||
            err?.message?.includes('rejected the request')
          ) {
            message = 'Transaction was cancelled by the user';
          }

          // 3️⃣ Amount <= 0
          else if (
            err?.message?.includes('amount must be greater than zero') ||
            err?.message?.includes('invalid amount')
          ) {
            message = 'Amount must be greater than zero';
          }

          // 4️⃣ Insufficient balance (generic)
          else if (
            err?.message?.includes('insufficient funds') ||
            err?.message?.includes('balance too low')
          ) {
            message = 'You do not have enough balance';
          }

          // 5️⃣ Wrong network (wallet connected to wrong cluster)
          else if (
            err?.message?.includes('wrong network') ||
            err?.message?.includes('network mismatch')
          ) {
            message = 'Please switch to the correct Solana network';
          }

          // 6️⃣ Timeout / RPC issues
          else if (
            err?.message?.includes('timeout') ||
            err?.message?.includes('RPC')
          ) {
            message = 'Network is busy. Please try again later';
          }

          toast({
            title: 'Creation Failed',
            description: message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!connected) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Coins className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold font-display">Connect Wallet</h2>
        <p className="text-muted-foreground max-w-md">
          You need to connect your Solana wallet to create a new sale.
        </p>
        <WalletMultiButton />
      </div>
    );
  }
  const CREATION_FEE_JOCC = 500;
  const MIN_SOL_FOR_FEES = 0.008;

  const insufficientSol = solBalance < MIN_SOL_FOR_FEES;
  const insufficientJocc = joccBalance < CREATION_FEE_JOCC;

  const cannotCreate =
    createSale.isPending ||
    insufficientSol ||
    insufficientJocc ||
    saleExists ||
    watchedAmount > tokenBalance;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10 text-center">
        <h1
          className="text-transparent text-3xl md:text-5xl font-bold font-display tracking-tight bg-clip-text bg-gradient-to-r 
        from-primary via-purple-400 to-secondary">
          Create Token Sale
        </h1>
        <p className="text-muted-foreground text-xs">
          Configure your sale parameters. Ensure you have the tokens in your
          wallet.
        </p>
      </div>

      <div className="bg-card border border-white/5 rounded-3xl p-4 lg:p-8 shadow-xl">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Token Details
            </label>
            <div className="space-y-2">
              <label className="text-sm font-medium">Token Mint Address</label>
              <input
                {...form.register('tokenMint')}
                placeholder="Ex: 7eykd...sd5sd"
                onBlur={async (e) => {
                  const mint = e.target.value;
                  if (!mint) return;

                  setCheckingSale(true);

                  const exists = await checkIfSaleExists(mint);
                  setSaleExists(exists);

                  try {
                    const mintPubkey = new PublicKey(mint);
                    const ata = await getAssociatedTokenAddress(
                      mintPubkey,
                      publicKey!
                    );
                    const account = await getAccount(connection, ata);
                    const balance = Number(account.amount);
                    setTokenBalance(balance);
                  } catch {
                    setTokenBalance(0);
                  }

                  setCheckingSale(false);
                }}
                className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
              />

              {saleExists && (
                <p className="text-xs text-red-500 text-start ml-2">
                  Sale already exists for this token, Try from another wallet.
                </p>
              )}

              {form.formState.errors.tokenMint && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.tokenMint.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Price (SOL per Token)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  {...form.register('price', { valueAsNumber: true })}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                />
                {form.formState.errors.price && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" />
                  Amount to Sell
                </label>
                <input
                  type="number"
                  {...form.register('amount', { valueAsNumber: true })}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                />
                {form.formState.errors.amount && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.amount.message}
                  </p>
                )}
                {watchedTokenMint && watchedAmount > tokenBalance && (
                  <p className="text-xs text-red-500 text-start ml-2">
                    You do not have enough tokens to sell this amount
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Schedule
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  {...form.register('startTime')}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all [color-scheme:dark]"
                />
                {form.formState.errors.startTime && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  End Time
                </label>
                <input
                  type="datetime-local"
                  {...form.register('endTime')}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all [color-scheme:dark]"
                />
                {form.formState.errors.endTime && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.endTime.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Liquidity Mode
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manual option - enabled */}
              <label className="flex items-center p-4 rounded-xl border border-white/10 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                <input
                  type="radio"
                  value="manual"
                  {...form.register('liquidity')}
                  className="w-4 h-4 cursor-pointer"
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">Manual</p>
                  <p className="text-xs text-muted-foreground">
                    You control when to withdraw raised SOL
                  </p>
                </div>
              </label>

              {/* Automatic option - disabled with coming soon */}
              <label className="flex items-center p-4 rounded-xl border border-white/10 bg-white/5 opacity-50 cursor-not-allowed">
                <input
                  type="radio"
                  value="automatic"
                  disabled
                  className="w-4 h-4 cursor-not-allowed"
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">Automatic</p>
                  <p className="text-xs text-muted-foreground">
                    Liquidity is automatically provided
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Coming Soon
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Project Socials (Optional)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Website URL</label>
                <input
                  {...form.register('website')}
                  placeholder="https://yourwebsite.com"
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                />
                {form.formState.errors.website && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.website.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Twitter URL</label>
                <input
                  {...form.register('twitter')}
                  placeholder="https://twitter.com/yourhandle"
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                />
                {form.formState.errors.twitter && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.twitter.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Discord URL</label>
                <input
                  {...form.register('discord')}
                  placeholder="https://discord.gg/yourhandle"
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                />
                {form.formState.errors.discord && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.discord.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-primary text-sm">
                  Creation Fee: 500 $JOCC
                </p>
                <p className="font-bold text-gray-500 text-xs">
                  + Network fee ≈ 0.008 SOL
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <h4 className="text-sm font-bold text-green-500 mb-1">
                  Zero Platform Cut
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The platform does not deduct any percentage from your sale.
                  You receive the total amount raised.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <h4 className="text-sm font-bold text-blue-500 mb-1">
                  Instant Distribution
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Buyers receive tokens and sellers receive SOL immediately upon
                  transaction. No waiting periods.
                </p>
              </div>
            </div>
          </div>

          {insufficientSol && (
            <p className="text-xs text-red-500 text-start ml-2">
              Not enough SOL to pay network fees ≈ 0.008 SOL
            </p>
          )}

          {insufficientJocc && (
            <p className="text-xs text-red-500 text-start ml-2">
              You need 500 JOCC to create a sale
            </p>
          )}

          <button
            type="submit"
            disabled={cannotCreate}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200">
            {createSale.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Initializing Sale...
              </span>
            ) : (
              'Create Sale'
            )}
          </button>

          <p className="text-sm text-center text-muted-foreground">
            Transaction fees apply. Tokens will be transferred to a program
            vault.
          </p>
        </form>
      </div>
    </div>
  );
}
