import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, Loader2, Power } from 'lucide-react';

interface WalletConnectProps {
  isConnected: boolean;
  address: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  isConnected,
  address,
  onConnect,
  onDisconnect
}) => {
  const { publicKey, connecting, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = async () => {
    await disconnect();
    onDisconnect();
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 8) return addr;
    return `${addr.slice(0, 4)}..${addr.slice(-4)}`;
  };

  // Show connected state
  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse shadow-[0_0_10px_#8b5cf6]"></div>
          <span className="text-xs font-mono text-primary-400">Devnet</span>
        </div>

        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary-500/30 px-4 py-2 rounded-full transition-all group"
        >
          <div className="w-2 h-2 bg-primary-500 rounded-full group-hover:shadow-[0_0_10px_#8b5cf6] transition-shadow"></div>
          <span className="font-mono text-sm text-white">{formatAddress(publicKey.toBase58())}</span>
          <Power className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
        </button>
      </div>
    );
  }

  // Show connecting state
  if (connecting) {
    return (
      <button
        disabled
        className="px-6 py-2.5 bg-white/50 text-black rounded-full font-bold text-sm flex items-center gap-2"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Connecting...
      </button>
    );
  }

  // Show connect button
  return (
    <button
      onClick={handleConnect}
      className="px-6 py-2.5 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-transform flex items-center gap-2"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
};

export default WalletConnect;
