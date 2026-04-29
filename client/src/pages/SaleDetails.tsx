'use client';

import { useParams, Link } from 'wouter';
import { useSale, useBuyTokens, useWithdraw } from '@/hooks/use-solana-program';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  Wallet,
  Lock,
  Clock,
  Globe,
  CircleAlert,
  History,
} from 'lucide-react';
import { FaDiscord, FaTwitter } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isPast, isFuture } from 'date-fns';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { SendTransactionError } from '@solana/web3.js';
import { Progress } from '@/components/ui/progress';

export default function SaleDetails({
  address: propsAddress,
}: {
  address?: string;
}) {
  const { address: paramsAddress } = useParams();
  const address = propsAddress ?? paramsAddress;
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [solBalance, setSolBalance] = useState<number>(0);
  const { data: sale, isLoading } = useSale(address || '');
  const buyTokens = useBuyTokens();
  const withdraw = useWithdraw();
  const { toast } = useToast();

  const [buyAmount, setBuyAmount] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [purchaseHistory, setPurchaseHistory] = useState<
    { signature: string; amount: string; time: number }[]
  >([]);

  const start = sale ? new Date(sale.account.startTime * 1000) : null;
  const end = sale ? new Date(sale.account.endTime * 1000) : null;
  const hasEnded = end ? isPast(end) : false;

  useEffect(() => {
    if (!sale) return;

    const decimals = sale.mintInfo?.decimals || 9;
    const currentSold = Number(sale.account.totalSold) / 10 ** decimals;
  }, [sale]);

  useEffect(() => {
    if (connected && publicKey && sale) {
      const fetchTokenBalance = async () => {
        try {
          const mintPubkey = new PublicKey(sale.account.mint);
          const ata = await getAssociatedTokenAddress(mintPubkey, publicKey);
          const account = await getAccount(connection, ata);
          const balance =
            Number(account.amount) / 10 ** (sale.mintInfo?.decimals || 0);
          setTokenBalance(balance.toLocaleString());
        } catch (e) {
          console.warn(
            "Failed to fetch token balance (account likely doesn't exist)",
            e
          );
          setTokenBalance('0');
        }
      };
      fetchTokenBalance();
    }
  }, [connected, publicKey, sale, connection]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setSolBalance(0);
      return;
    }

    const fetchSolBalance = async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        setSolBalance(lamports / 1e9);
      } catch (err) {
        console.error('Failed to fetch SOL balance', err);
        setSolBalance(0);
      }
    };

    fetchSolBalance();
  }, [connected, publicKey, connection]);

  useEffect(() => {
    if (!address || !connection || !sale) return;

    const fetchHistory = async () => {
      try {
        const pubkey = new PublicKey(address);
        const signatures = await connection.getSignaturesForAddress(pubkey, {
          limit: 10,
        });
        const history = signatures.map((sig) => ({
          signature: sig.signature,
          amount: 'Unknown', // On-chain parsing is complex without specific IDL parsing for txs
          time: sig.blockTime || 0,
        }));
        setPurchaseHistory(history);
      } catch (e) {
        console.error('Failed to fetch purchase history', e);
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [address, connection, sale]);

  useEffect(() => {
    if (!start || !end) return;

    const timer = setInterval(() => {
      const now = new Date();
      const target = isFuture(start) ? start : end;
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        if (isPast(end)) setTimeLeft('Ended');
        else setTimeLeft('Started');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [start, end]);

  if (isLoading || !sale || !start || !end) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading sale details...</p>
      </div>
    );
  }

  const isOwner =
    sale && publicKey ? publicKey.toString() === sale.account.authority : false;
  const decimals = sale?.mintInfo?.decimals || 9;
  const priceSol = sale ? Number(sale.account.price) / 1e9 : 0;

  const availableAmount = sale?.account.vaultBalance
    ? Number(sale.account.vaultBalance) / 10 ** decimals
    : sale
      ? Number(sale.account.amount) / 10 ** decimals
      : 0;

  const tokensSold = sale ? Number(sale.account.totalSold) / 10 ** decimals : 0;

  const isLive = start && end ? isPast(start) && isFuture(end) : false;

  const totalAmount = sale ? Number(sale.account.amount) / 10 ** decimals : 0;
  const progress = totalAmount > 0 ? (tokensSold / totalAmount) * 100 : 0;
  const MIN_TOTAL_COST = 0.000000001;

  const handleBuy = () => {
    const totalCost = buyAmount * priceSol;

    if (totalCost < MIN_TOTAL_COST) {
      toast({
        title: 'Invalid Amount',
        description: `Total cost must be at least ${MIN_TOTAL_COST} SOL`,
        variant: 'destructive',
      });
      return;
    }
    if (!connected) return;

    if (solBalance < totalCost) {
      toast({
        title: 'Insufficient Balance',
        description:
          'Your SOL balance is not enough to complete this purchase.',
        variant: 'destructive',
      });
      return;
    }

    buyTokens.mutate(
      { sale, amountTokens: buyAmount },
      {
        onSuccess: () => {
          toast({
            title: 'Purchase Successful!',
            description: `You bought ${buyAmount} tokens.`,
          });
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        },
        onError: (err: any) => {
          let message = 'Transaction failed';
          if (err?.message?.includes('amount must be greater than zero')) {
            message = 'Amount must be greater than zero';
          }
          toast({
            title: 'Purchase Failed',
            description: message,
            variant: 'destructive',
          });

          if (err instanceof SendTransactionError) {
            const logs = err.logs || [];

            if (logs.some((l) => l.includes('already in use'))) {
              message = 'Sale already exists';
            } else if (
              logs.some(
                (l) =>
                  l.includes('insufficient funds') ||
                  l.includes('InsufficientFunds')
              )
            ) {
              message = 'Insufficient balance to complete this transaction';
            } else if (
              logs.some(
                (l) =>
                  l.includes('blockhash not found') ||
                  l.includes('Transaction simulation failed')
              )
            ) {
              message = 'Network error. Please check your Solana network';
            }
          } else if (
            err?.message?.includes('User rejected') ||
            err?.message?.includes('rejected the request')
          ) {
            message = 'Transaction was cancelled by the user';
          } else if (
            err?.message?.includes('amount must be greater than zero') ||
            err?.message?.includes('invalid amount')
          ) {
            message = 'Amount must be greater than zero';
          } else if (
            err?.message?.includes('insufficient funds') ||
            err?.message?.includes('balance too low')
          ) {
            message = 'You do not have enough balance';
          } else if (
            err?.message?.includes('wrong network') ||
            err?.message?.includes('network mismatch')
          ) {
            message = 'Please switch to the correct Solana network';
          } else if (
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

  const handleWithdraw = () => {
    withdraw.mutate(
      { sale },
      {
        onSuccess: () => {
          toast({
            title: 'Withdrawal Successful!',
            description: 'Unsold tokens returned to your wallet.',
          });
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        },
        onError: (err) => {
          toast({
            title: 'Withdrawal Failed',
            description: err.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const shortMint = `${sale.account.mint.slice(0, 8)}...${sale.account.mint.slice(-8)}`;
  const shortAuthority = `${sale.account.authority.slice(0, 8)}...${sale.account.authority.slice(-8)}`;

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-8 px-2 md:px-0">
      <Link
        href="/market"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors py-2 md:mb-1 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
              <div className="flex flex-col bg-black/20 py-3 rounded-xl md:rounded-2xl w-full md:w-fit">
                <div className="flex flex-col md:flex-row items-center justify-center py-2 px-3 md:px-20 rounded-lg">
                  <h1
                    className="text-transparent text-2xl md:text-3xl font-bold font-display 
                    tracking-tight bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary">
                    {sale.mintInfo?.name || 'Token Sale'}
                  </h1>
                </div>
              </div>
              {(sale.account.website ||
                sale.account.twitter ||
                sale.account.discord) && (
                <div className="flex flex-row gap-2 items-center justify-center pt-0 lg:pt-5 rounded-lg">
                  {sale.account.website && (
                    <a
                      href={sale.account.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 border border-white/5 hover:border-primary/50 transition-colors text-sm">
                      <Globe className="w-5 h-5 text-primary" />
                    </a>
                  )}
                  {sale.account.twitter && (
                    <a
                      href={sale.account.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 border border-white/5 hover:border-primary/50 transition-colors text-sm">
                      <FaTwitter className="w-5 h-5 text-primary" />
                    </a>
                  )}
                  {sale.account.discord && (
                    <a
                      href={sale.account.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 border border-white/5 hover:border-primary/50 transition-colors text-sm">
                      <FaDiscord className="w-5 h-5 text-primary" />
                    </a>
                  )}
                </div>
              )}
              <div
                className="flex items-center justify-between text-sm gap-4 font-mono text-muted-foreground bg-black/20 
                px-4 md:px-16 py-3 md:py-4 rounded-xl md:rounded-2xl w-full md:w-fit mt-4">
                <div className="text-xs md:text-sm text-muted-foreground">
                  Price
                </div>
                <div className="text-sm md:text-sm font-bold text-primary">
                  {priceSol} SOL
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4">
              <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-background/50 border border-white/5">
                <a
                  className="flex items-center gap-2 hover:text-green-500 transition-colors text-xs 
                  font-mono text-muted-foreground break-all"
                  href={`https://solscan.io/token/${sale.account.mint}`}
                  target="_blank"
                  rel="noopener noreferrer">
                  <span className="text-primary/70">Mint:</span>
                  <span className="truncate">{shortMint}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-background/50 border border-white/5">
                <a
                  className="flex items-center gap-2 hover:text-green-500 transition-colors text-xs font-mono text-muted-foreground break-all"
                  href={`https://solscan.io/account/${sale.account.authority}`}
                  target="_blank"
                  rel="noopener noreferrer">
                  <span className="text-primary/70">Creator:</span>
                  <span className="truncate">{shortAuthority}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <div
                className="flex items-center gap-2 hover:text-green-500 transition-colors text-xs font-mono text-muted-foreground break-all
              rounded-xl md:rounded-2xl bg-background/50 border border-white/5 p-3 md:p-">
                <div className="text-xs md:text-sm text-primary/70 mb-1">
                  Liquidity
                </div>
                <div className="text-sm font-mono text-muted-foreground break-all">
                  Manual
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4">
              <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-background/50 border border-white/5">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">
                  Available Tokens
                </div>
                <div className="text-md md:text-lg text-muted-foreground font-bold">
                  {availableAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 9,
                    maximumFractionDigits: 9,
                  })}
                </div>
              </div>
              <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-background/50 border border-white/5">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">
                  Tokens Sold
                </div>
                <div className="text-md md:text-lg text-muted-foreground font-bold">
                  {tokensSold.toLocaleString(undefined, {
                    minimumFractionDigits: 9,
                    maximumFractionDigits: 9,
                  })}
                </div>
              </div>
              {connected && (
                <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-background/50 border border-white/5">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-md md:text-lg text-muted-foreground font-bold ">
                    {tokenBalance} {sale.mintInfo?.symbol || 'TKN'}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between p-3 rounded-lg bg-background/30">
                  <span className="text-xs md:text-sm text-muted-foreground">
                    Start Time
                  </span>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    {start.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-background/30">
                  <span className="text-xs md:text-sm text-muted-foreground">
                    End Time
                  </span>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    {end.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div
            className="bg-gradient-to-b from-card to-background border border-primary/20 rounded-2xl md:rounded-3xl 
          p-4 lg:p-4 shadow-2xl md:sticky md:top-24">
            <h2 className="text-lg md:text-xl text-muted-foreground font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Buy Tokens
            </h2>
            <p className="text-muted-foreground text-xs md:text-xs flex items-center gap-2 m-2">
              <CircleAlert className="w-3 h-3 text-red-500" />
              Make your research before investment
            </p>
            {(() => {
              const isLive =
                start && end ? isPast(start) && isFuture(end) : false;
              return (
                isLive && (
                  <div className="space-y-4">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(Number(e.target.value))}
                      className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-lg font-bold"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total Cost:</span>
                      <span className="font-bold text-primary">
                        {(buyAmount * priceSol).toFixed(9)} SOL
                      </span>
                    </div>

                    {buyAmount <= 0 && (
                      <div className="text-[11px] text-red-500 mt-1">
                        Amount must be greater than zero
                      </div>
                    )}

                    {connected &&
                      buyAmount > 0 &&
                      buyAmount * priceSol > 0 &&
                      solBalance < buyAmount * priceSol && (
                        <div className="text-[11px] text-red-500 mt-2">
                          Insufficient SOL balance
                        </div>
                      )}

                    <button
                      onClick={handleBuy}
                      disabled={
                        !connected ||
                        buyTokens.isPending ||
                        buyAmount <= 0 ||
                        buyAmount * priceSol <= 0 ||
                        availableAmount <= 0 ||
                        solBalance < buyAmount * priceSol
                      }
                      className="w-full py-3 rounded-xl font-bold bg-primary text-white flex items-center justify-center gap-2 disabled:opacity-50">
                      {buyTokens.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : !connected ? (
                        'Connect to buy'
                      ) : availableAmount <= 0 ? (
                        'Sold Out'
                      ) : (
                        <>Buy Now</>
                      )}
                    </button>
                  </div>
                )
              );
            })()}
            <div className="px-2 md:px-6 mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Progress
                </span>
                <span className="text-xs font-bold text-primary">
                  {progress.toFixed(2)}%
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            <div className="flex items-center justify-between mt-4 px-6 py-3 gap-8 rounded-xl bg-background/30 border border-white/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-4 h-4" />
                {(() => {
                  const isLive =
                    start && end ? isPast(start) && isFuture(end) : false;
                  return isLive
                    ? 'Time Left'
                    : isFuture(start)
                      ? 'Starts In'
                      : 'Status';
                })()}
              </div>
              <div className="text-xs font-mono font-bold text-primary">
                {timeLeft}
              </div>
            </div>
          </div>
          {isOwner && hasEnded && availableAmount > 0 && (
            <div className="bg-card border border-destructive/20 rounded-3xl p-4 lg:p-8 shadow-xl mt-4 lg:mt-12">
              <h3 className="text-xl text-muted-foreground font-bold mb-4">
                Owner Actions
              </h3>
              <button
                onClick={handleWithdraw}
                disabled={withdraw.isPending}
                className="px-6 py-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
                {withdraw.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Withdraw Unsold Tokens
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="bg-card border border-white/5 rounded-2xl md:rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg md:text-xl text-muted-foreground font-bold flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-primary" />
          Recent Transactions
        </h2>
        <div className="space-y-4">
          {purchaseHistory.length > 0 ? (
            purchaseHistory.map((tx) => (
              <div
                key={tx.signature}
                className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-white/5 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-mono text-muted-foreground">
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </div>
                    <div className="text-xs text-muted-foreground/60">
                      {new Date(tx.time * 1000).toLocaleString()}
                    </div>
                  </div>
                </div>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white/5 text-primary transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent transactions found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
