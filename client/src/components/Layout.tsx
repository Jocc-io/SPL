import { Link, useLocation } from 'wouter';
import WalletConnect from '@/components/WalletConnect';
import {
  Rocket,
  Plus,
  LayoutDashboard,
  Wallet as WalletIcon,
  Menu,
  Coins,
  X,
  RefreshCw,
  Drama,
  House,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { FaDiscord, FaLinkedin, FaTwitter, FaTelegram } from 'react-icons/fa';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      const updateBalance = async () => {
        try {
          const bal = await connection.getBalance(publicKey);
          setBalance(bal / LAMPORTS_PER_SOL);
        } catch (e) {
          console.error('Failed to fetch balance', e);
        }
      };
      updateBalance();
      const id = connection.onAccountChange(publicKey, (info) => {
        setBalance(info.lamports / LAMPORTS_PER_SOL);
      });
      return () => {
        connection.removeAccountChangeListener(id);
      };
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, connection]);

  const navItems = [
    { label: 'Home', href: '/', icon: House },
    { label: 'Marketplace', href: '/market', icon: Rocket },
    ...(connected
      ? [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }]
      : []),
    { label: 'Create Sale', href: '/create', icon: Plus },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full mx-auto border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group gap-1">
            <span className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary">
              SPL
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-1 text-xs font-medium transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <a
              className="flex items-center gap-1"
              href="https://jocc.io/create-token"
              rel="noopener noreferrer">
              <Plus className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium transition-colors text-gray-400 hover:text-foreground">
                Create Token
              </span>
            </a>
            <a
              className="flex items-center gap-1"
              href="https://jocc.io/create"
              rel="noopener noreferrer">
              <Plus className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium transition-colors text-gray-400 hover:text-foreground">
                Create NFT
              </span>
            </a>
            <a
              className="flex items-center gap-1"
              href="/HchjFTkJ4jkot745krvfD139UFo1NUonKzvkiruuSTF9"
              rel="noopener noreferrer">
              <Coins className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium transition-colors text-gray-400 hover:text-foreground">
                Buy JOCC
              </span>
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={() => window.location.reload()}
              title="Refresh page">
              <RefreshCw className="w-4 h-4 text-primary" />
            </Button>
            {connected && balance !== null && (
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 
              text-primary text-xs font-bold">
                <WalletIcon className="w-4 h-4" />
                {balance.toFixed(6)} SOL
              </div>
            )}
            <div className="">
              <WalletConnect />
            </div>

            <div className="md:hidden flex items-center gap-2">
              <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-primary/10">
                    {isOpen ? (
                      <X className="w-6 h-6" />
                    ) : (
                      <Menu className="w-6 h-6" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-background/95 backdrop-blur-md border-white/10 z-[100]m mt-2">
                  {connected && balance !== null && (
                    <div className=" sm:flex items-center gap-2 px-3 py-1.5 rounded-md border b-1 border-primary/20 text-primary text-xs">
                      Balance: {balance.toFixed(6)} SOL
                    </div>
                  )}
                  {navItems.map((item) => {
                    const isActive = location === item.href;
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={clsx(
                            'flex items-center gap-2 w-full cursor-pointer ',
                            isActive ? 'text-primary' : 'text-muted-foreground'
                          )}>
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuItem asChild>
                    <a
                      className="flex items-center gap-2 w-full cursor-pointer text-gray-400"
                      href="https://jocc.io/create-token"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsOpen(false)}>
                      <Plus className="w-4 h-4" />
                      <span>Create Token</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      className="flex items-center gap-2 w-full cursor-pointer text-gray-400"
                      href="https://jocc.io/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsOpen(false)}>
                      <Plus className="w-4 h-4" />
                      <span>Create NFT</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      className="flex items-center gap-2 w-full cursor-pointer text-gray-400"
                      href="/HchjFTkJ4jkot745krvfD139UFo1NUonKzvkiruuSTF9"
                      target="_self"
                      rel="noopener noreferrer"
                      onClick={() => setIsOpen(false)}>
                      <Coins className="w-4 h-4" />
                      <span>Buy JOCC</span>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {children}
      </main>

      <footer className="border-t border-white/5 bg-card/30">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left section (Copyright + Program) */}
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm order-2 md:order-1">
            {/* Program ID - middle in mobile */}
            <a
              href="https://solscan.io/account/JocctLRx3n4Q4AUJo9QrMK2oznK3oihNMApy1qiV65t"
              target="_blank"
              rel="noopener noreferrer"
              className="order-1 md:order-2 text-center hover:text-purple-500 transition-colors text-xs text-purple-300 opacity-60">
              Program ID: JocctLR...iV65t
            </a>

            {/* Copyright - bottom in mobile */}
            <p className="order-2 md:order-1">
              © 2026 spl - All Rights Reserved
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-6 order-1 md:order-2">
            <a
              href="https://www.linkedin.com/company/joccnft"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary transition-all hover:scale-110">
              <FaLinkedin className="w-4 h-4" />
            </a>

            <a
              href="https://x.com/joccspl"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary transition-all hover:scale-110">
              <FaTwitter className="w-4 h-4" />
            </a>

            <a
              href="https://discord.gg/jmMY8MrQCt"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary transition-all hover:scale-110">
              <FaDiscord className="w-4 h-4" />
            </a>

            <a
              href="https://t.me/joccnft"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary transition-all hover:scale-110">
              <FaTelegram className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
