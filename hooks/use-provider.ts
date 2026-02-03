import { AnchorProvider } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { useMemo, useEffect } from 'react';
import { useEphemeralConnection } from './use-ephemeral-connection';

export function useProvider() {
  const { connection } = useConnection();
  const { ephemeralConnection, refreshToken } = useEphemeralConnection();
  const wallet = useAnchorWallet();

  // Refresh token when wallet changes
  useEffect(() => {
    if (wallet?.publicKey) {
      refreshToken();
    }
  }, [wallet?.publicKey, refreshToken]);

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
  }, [connection, wallet]);

  const ephemeralProvider = useMemo(() => {
    console.log('useProvider - creating ephemeralProvider, ephemeralConnection:', !!ephemeralConnection, 'wallet:', !!wallet);
    if (!wallet || !ephemeralConnection) return null;
    return new AnchorProvider(ephemeralConnection, wallet, {
      commitment: 'confirmed',
    });
  }, [ephemeralConnection, wallet]);

  return { provider, ephemeralProvider, refreshToken };
}
