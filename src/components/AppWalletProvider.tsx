'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// CSS Import
import '@solana/wallet-adapter-react-ui/styles.css';

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const network = WalletAdapterNetwork.Devnet;

  // 🚀 GÜNCELLEME: Kurşun Geçirmez URL Kontrolü
  const endpoint = useMemo(() => {
    const heliusUrl = process.env.NEXT_PUBLIC_HELIUS_DEVNET_URL;

    // 1. Helius linki var mı VE geçerli bir link mi (http ile başlıyor mu?)
    if (heliusUrl && (heliusUrl.startsWith('http://') || heliusUrl.startsWith('https://'))) {
        return heliusUrl;
    }

    // 2. Yoksa veya hatalıysa, Solana'nın kendi public adresini kullan (Asla hata vermez)
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