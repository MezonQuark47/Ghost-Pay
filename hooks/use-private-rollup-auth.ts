import { getAuthToken, SESSION_DURATION } from '@magicblock-labs/ephemeral-rollups-sdk';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { EPHEMERAL_RPC_URL } from '../lib/constants';

const TOKENS_STORAGE_KEY = 'ghostpay-tee-auth-tokens';
const TOKENS_CHANGE_EVENT = 'ghostpay-tee-auth-tokens-changed';
const IS_DEV = import.meta.env.DEV;

type AuthToken = { token: string; expiresAt: number };

export function usePrivateRollupAuth() {
  const wallet = useAnchorWallet();
  const { signMessage } = useWallet();
  const [tokens, setTokensState] = useState<Record<string, AuthToken>>({});
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const isMountedRef = useRef(true);

  const authToken = useMemo(() => {
    const pk = wallet?.publicKey?.toBase58();
    if (pk) {
      const token = tokens[pk] ?? null;
      if (token?.expiresAt > Date.now()) {
        return token.token;
      }
    }
    return null;
  }, [tokens, wallet]);

  const isAuthenticated = !!authToken;

  useEffect(() => {
    isMountedRef.current = true;

    const handleTokenChange = (e: CustomEvent) => {
      if (isMountedRef.current && e.detail && typeof e.detail === 'object') {
        setTokensState(e.detail);
      }
    };

    window.addEventListener(TOKENS_CHANGE_EVENT, handleTokenChange as EventListener);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(TOKENS_CHANGE_EVENT, handleTokenChange as EventListener);
    };
  }, []);

  // Load tokens from localStorage
  useEffect(() => {
    if (Object.keys(tokens).length === 0) {
      try {
        const storedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens);
          setTokensState(parsedTokens);
        }
      } catch (error) {
        console.error('Error loading TEE auth tokens:', error);
      }
    }
  }, [tokens]);

  const setTokens = useCallback(
    (
      newTokens:
        | Record<string, AuthToken>
        | ((prev: Record<string, AuthToken>) => Record<string, AuthToken>),
    ) => {
      if (!isMountedRef.current) return;

      setTokensState(prevTokens => {
        const updatedTokens = typeof newTokens === 'function' ? newTokens(prevTokens) : newTokens;
        try {
          localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(updatedTokens));
          const event = new CustomEvent(TOKENS_CHANGE_EVENT, { detail: updatedTokens });
          window.dispatchEvent(event);
        } catch (error) {
          console.error('Error saving TEE auth tokens:', error);
        }
        return updatedTokens;
      });
    },
    [],
  );

  const authenticate = useCallback(async () => {
    if (!wallet || !signMessage) {
      throw new Error('Wallet not connected or does not support message signing');
    }

    setIsAuthenticating(true);

    try {
      if (IS_DEV) {
        console.log('Starting TEE authentication...');
      }

      const expiresAt = Date.now() + SESSION_DURATION;
      const result = await getAuthToken(EPHEMERAL_RPC_URL, wallet.publicKey, signMessage);

      if (!result || !result.token) {
        throw new Error('No token received from TEE');
      }

      setTokens(oldTokens => ({
        ...oldTokens,
        [wallet.publicKey.toBase58()]: { token: result.token, expiresAt },
      }));

      if (IS_DEV) {
        console.log('TEE Authentication successful');
      }
      return result.token;
    } catch (error: any) {
      console.error('TEE Authentication error:', error.message);
      throw new Error(`TEE Authentication failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAuthenticating(false);
    }
  }, [wallet, signMessage, setTokens]);

  const logout = useCallback(() => {
    if (!wallet?.publicKey) return;

    setTokens(oldTokens => {
      const updated = { ...oldTokens };
      delete updated[wallet.publicKey.toBase58()];
      return updated;
    });
  }, [wallet, setTokens]);

  return {
    authToken,
    isAuthenticated,
    isAuthenticating,
    authenticate,
    logout
  };
}
