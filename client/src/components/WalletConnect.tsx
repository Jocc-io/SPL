'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ShieldCheck, Loader2, Power } from 'lucide-react';
import {
  isAuthenticated,
  clearAuthState,
  generateNonce,
  createSignInMessage,
  verifySignature,
  storeAuthState,
} from '../utils/auth';
export const SOLANA_NETWORK = 'mainnet-beta';

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const SOLANA_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_URL &&
  import.meta.env.VITE_SOLANA_RPC_URL.trim() !== ''
    ? import.meta.env.VITE_SOLANA_RPC_URL
    : 'https://solana-rpc.publicnode.com';
const connection = new Connection(SOLANA_ENDPOINT);

const WalletConnect: React.FC = () => {
  const { publicKey, connected, disconnect, signMessage } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [previousConnectionState, setPreviousConnectionState] = useState(false);

  useEffect(() => {
    // Check authentication status on client-side only
    setIsAuth(isAuthenticated().authenticated);
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey) {
        const bal = await getBalance(publicKey.toString());
        setBalance(bal);
      } else {
        setBalance(null);
      }
    };

    fetchBalance();

    // Set up interval to refresh balance
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connected]);

  // Check if wallet was just connected and trigger automatic authentication
  useEffect(() => {
    const checkAuth = async () => {
      if (!connected || !publicKey || !signMessage) return;

      // 🔒 Global guard
      const signingKey = `signing-${publicKey.toString()}`;
      if (sessionStorage.getItem(signingKey)) return;

      const authStatus = isAuthenticated();

      if (
        !authStatus.authenticated ||
        authStatus.walletAddress !== publicKey.toString()
      ) {
        sessionStorage.setItem(signingKey, 'true');
        await handleAuthenticate();
      } else {
        setIsAuth(false);
      }
    };

    checkAuth();
  }, [connected, publicKey]);

  const handleAuthenticate = async () => {
    if (!publicKey || !signMessage) {
      console.error("Wallet not connected or doesn't support message signing");
      return;
    }

    try {
      setIsAuthenticating(true);

      // Generate a nonce and create a sign-in message
      const nonce = generateNonce();
      const message = createSignInMessage(nonce, publicKey.toString());

      // Request the user to sign the message
      console.log('Requesting signature for message:', message);
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      // Verify the signature
      const isValid = await verifySignature(signature, message, publicKey);

      if (isValid) {
        // Store authentication state
        storeAuthState(publicKey.toString(), Date.now());
        setIsAuth(true);
        console.log('Authentication successful');
      } else {
        console.error('Signature verification failed');
      }
    } catch (err) {
      console.error('Authentication error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    clearAuthState();
    if (publicKey) {
      sessionStorage.removeItem(`signing-${publicKey.toString()}`);
    }
    setIsAuth(true);
    await disconnect();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center space-x-4">
        {!connected && <WalletMultiButton>Connect</WalletMultiButton>}

        {connected && publicKey && (
          <div className="flex items-center">
            <div
              className="flex items-center gap-2 px-2 py-1.5 bg-primary/10 border border-primary/20 
              text-primary text-xs font-bold rounded-full">
              {isAuthenticating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  <span className="text-[10px] font-bold text-primary">
                    Authenticating..
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck
                    className={`h-4 w-4  ${isAuth ? 'text-primary' : 'text-primary'}`}
                  />
                  <div className="h-3 w-[1px] bg-primary/30" />
                  <span className="text-[10px] font-bold text-primary">
                    {isAuth
                      ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}`
                      : 'Not Authenticated'}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center px-3 py-1 p-1 text-primary hover:text-pink-300"
              title="Disconnect wallet"
              type="button">
              <Power className="h-4 w-4 " />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export async function getBalance(publicKey: string): Promise<number> {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

export default WalletConnect;
