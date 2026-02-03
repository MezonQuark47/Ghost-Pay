import { Connection } from '@solana/web3.js';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { EPHEMERAL_RPC_URL } from '../lib/constants';

const TOKENS_STORAGE_KEY = 'ghostpay-tee-auth-tokens';
const TOKENS_CHANGE_EVENT = 'ghostpay-tee-auth-tokens-changed';

function getTokenFromStorage(walletPubkey: string | undefined): string | null {
  if (!walletPubkey) return null;
  try {
    const storedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (storedTokens) {
      const tokens = JSON.parse(storedTokens);
      const token = tokens[walletPubkey];
      if (token && token.expiresAt > Date.now()) {
        return token.token;
      }
    }
  } catch (e) {
    console.error('Error reading token from storage:', e);
  }
  return null;
}

export function useEphemeralConnection() {
  const wallet = useAnchorWallet();
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Read token from storage
  const refreshToken = useCallback(() => {
    const token = getTokenFromStorage(wallet?.publicKey?.toBase58());
    console.log('useEphemeralConnection - refreshing token:', token ? 'found' : 'not found');
    setAuthToken(token);
  }, [wallet?.publicKey]);

  // Initial load and listen for changes
  useEffect(() => {
    refreshToken();

    const handleTokenChange = () => {
      console.log('useEphemeralConnection - token change event received');
      refreshToken();
    };

    window.addEventListener(TOKENS_CHANGE_EVENT, handleTokenChange);
    window.addEventListener('storage', handleTokenChange);

    return () => {
      window.removeEventListener(TOKENS_CHANGE_EVENT, handleTokenChange);
      window.removeEventListener('storage', handleTokenChange);
    };
  }, [refreshToken]);

  const ephemeralConnection = useMemo(() => {
    if (authToken && typeof authToken === 'string') {
      console.log('Creating ephemeral connection with token');
      return new Connection(`${EPHEMERAL_RPC_URL}?token=${authToken}`, 'confirmed');
    }
    console.log('No authToken, ephemeralConnection is null');
    return null;
  }, [authToken]);

  return { ephemeralConnection, refreshToken };
}
