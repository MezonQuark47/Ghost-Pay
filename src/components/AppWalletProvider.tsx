'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// CSS Import (Modern Yöntem)
import '@solana/wallet-adapter-react-ui/styles.css';

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const network = WalletAdapterNetwork.Devnet;

  // 🚀 GÜNCELLEME: Helius RPC Bağlantısı
  // .env dosyasında Helius linki varsa onu kullanır, yoksa varsayılan (yavaş) olana döner.
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_HELIUS_DEVNET_URL) {
        return process.env.NEXT_PUBLIC_HELIUS_DEVNET_URL;
    }
    return clusterApiUrl(network);
  }, [network]);

  // 🔒 Sadece Phantom Cüzdanı
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}