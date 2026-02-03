import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, ShieldCheck, ChevronDown, AlertCircle, Loader2, Lock, Send, Shield, Zap } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useGhostPay } from '../contexts/GhostPayContext';
import { Token } from '../types';
import { SUPPORTED_TOKENS } from '../constants';

// Validate Solana address
const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

export const SendForm: React.FC = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const {
    sendPrivatePayment,
    isLoading,
    error,
    isAuthenticated,
    isAuthenticating,
    authenticateTee,
    depositInfo,
    refreshDeposit,
    transferStatus,
    isTransferring
  } = useGhostPay();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'confirming' | 'sending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch token balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) return;

      try {
        if (selectedToken.symbol === 'SOL') {
          const bal = await connection.getBalance(publicKey);
          setTokenBalance(bal / LAMPORTS_PER_SOL);
        } else {
          // SPL Token balance
          try {
            const tokenAccount = getAssociatedTokenAddressSync(
              new PublicKey(selectedToken.mintAddress),
              publicKey,
              true,
              TOKEN_PROGRAM_ID
            );
            const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
            setTokenBalance(Number(accountInfo.value.uiAmount) || 0);
          } catch {
            setTokenBalance(0);
          }
        }
      } catch (e) {
        console.error('Failed to fetch balance:', e);
        setTokenBalance(0);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connection, selectedToken]);

  // Refresh deposit info when token changes
  useEffect(() => {
    if (publicKey && selectedToken.symbol !== 'SOL') {
      refreshDeposit(selectedToken.mintAddress);
    }
  }, [publicKey, selectedToken, refreshDeposit]);

  const handleSend = () => {
    if (!recipient || !amount) return;

    if (!isValidSolanaAddress(recipient)) {
      setErrorMessage('Invalid Solana address');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    if (selectedToken.symbol !== 'SOL' && !isAuthenticated) {
      setErrorMessage('Please authenticate with TEE first for private transfers');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setStatus('confirming');
    setErrorMessage('');
  };

  const confirmTransaction = async () => {
    setStatus('sending');
    setErrorMessage('');

    try {
      console.log('Starting private transfer...');
      console.log('Amount:', parseFloat(amount));
      console.log('Recipient:', recipient);
      console.log('Token:', selectedToken.mintAddress);
      console.log('Decimals:', selectedToken.decimals);
      console.log('Is authenticated:', isAuthenticated);

      const signature = await sendPrivatePayment(
        parseFloat(amount),
        recipient,
        selectedToken.mintAddress,
        selectedToken.decimals
      );

      console.log('Transfer successful, signature:', signature);
      setTxHash(signature);
      setStatus('success');

      setTimeout(() => {
        setRecipient('');
        setAmount('');
        setStatus('idle');
        setTxHash('');
      }, 5000);
    } catch (e: any) {
      console.error('Transfer error:', e);
      console.error('Error stack:', e.stack);
      setErrorMessage(e.message || 'Transaction failed');
      setStatus('error');

      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    }
  };

  // TEE Authentication required screen
  if (!isAuthenticated && selectedToken.symbol !== 'SOL') {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-fade-in-up text-center max-w-md mx-auto">
        <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mb-6 border border-primary-500/20">
          <Shield className="w-10 h-10 text-primary-500" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-3">TEE Authentication Required</h2>
        <p className="text-slate-400 mb-8 max-w-sm">
          To send private payments, you need to authenticate with the MagicBlock Trusted Execution Environment (TEE).
          This ensures your transactions are truly private.
        </p>

        <button
          onClick={authenticateTee}
          disabled={isAuthenticating}
          className="px-8 py-4 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-3 disabled:opacity-50"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Authenticate with TEE
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 mt-6 max-w-xs">
          You'll be asked to sign a message to verify your identity. No transaction fees are charged.
        </p>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-fade-in-up text-center">
        <div className="w-24 h-24 bg-primary-500/20 rounded-full flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping"></div>
          <Check className="w-10 h-10 text-primary-500 relative z-10" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">Private Payment Sent</h2>
        <p className="text-slate-400 mb-4 max-w-xs">
          Your transfer was executed privately inside the TEE. The recipient can now access the funds.
        </p>

        {txHash && (
          <a
            href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 hover:text-primary-300 text-sm font-mono mb-6 underline"
          >
            View on Explorer
          </a>
        )}

        <button
          onClick={() => setStatus('idle')}
          className="text-white hover:text-primary-400 font-medium transition-colors"
        >
          Send Another
        </button>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-fade-in-up text-center">
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">Transaction Failed</h2>
        <p className="text-slate-400 mb-8 max-w-xs">{errorMessage}</p>
        <button
          onClick={() => setStatus('idle')}
          className="text-white hover:text-primary-400 font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Confirmation/Sending state
  if (status === 'confirming' || status === 'sending' || isTransferring) {
    return (
      <div className="max-w-md mx-auto animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-full mb-4 border bg-primary-500/10 border-primary-500/20">
            <Lock className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            {isTransferring ? 'Processing Transfer' : 'Confirm Private Transfer'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Using MagicBlock TEE for privacy
          </p>
        </div>

        {/* Transfer Progress */}
        {transferStatus && (
          <div className="glass-card p-4 rounded-xl mb-6 border border-primary-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
              <span className="text-white font-medium">{transferStatus.step}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${transferStatus.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="glass-card p-6 rounded-2xl space-y-6 mb-8 border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Asset</span>
            <span className="text-white font-bold text-xl">{amount} {selectedToken.symbol}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-slate-500 mt-1">To</span>
            <div className="text-right">
              <div className="text-white font-mono text-xs break-all max-w-[200px]">
                {recipient.slice(0, 8)}...{recipient.slice(-8)}
              </div>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Lock className="w-3 h-3 text-primary-500" />
                <span className="text-xs text-primary-500">Private via TEE</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-white/10 pt-4">
            <span className="text-slate-500">Privacy</span>
            <span className="text-primary-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              TEE Protected
            </span>
          </div>
        </div>

        {!isTransferring && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStatus('idle')}
              className="py-4 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmTransaction}
              className="py-4 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-400 hover:scale-[1.02] transition-all shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] flex items-center justify-center gap-2"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default form state
  return (
    <div className="max-w-xl mx-auto h-full flex flex-col justify-center animate-fade-in-up">
      <div className="mb-10 text-center">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">Private Transfer</h2>
        <p className="text-slate-400">Send tokens privately using MagicBlock TEE. Transfers are encrypted and hidden from public view.</p>
      </div>

      {/* Private Balance Info */}
      {depositInfo && (
        <div className="glass-card p-4 rounded-xl mb-6 border border-primary-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-slate-400">Private Balance</span>
            </div>
            <span className="text-white font-bold">
              {depositInfo.amount.toFixed(2)} {selectedToken.symbol}
              {depositInfo.isDelegated && (
                <span className="ml-2 text-xs text-primary-400">(in TEE)</span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Token Selector */}
        <div className="group">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Token
          </label>
          <div className="flex gap-2">
            {SUPPORTED_TOKENS.map((token) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(token)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  selectedToken.symbol === token.symbol
                    ? 'bg-primary-500/10 border-primary-500 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className={`w-5 h-5 rounded-full ${token.symbol === 'SOL' ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gradient-to-br from-green-400 to-green-600'}`}></div>
                <span className="font-bold">{token.symbol}</span>
                {token.symbol !== 'SOL' && (
                  <Lock className="w-3 h-3 text-primary-500" />
                )}
              </button>
            ))}
          </div>
          {selectedToken.symbol === 'SOL' && (
            <p className="text-xs text-yellow-400 mt-2">
              Note: SOL transfers are public. Use USDC for private TEE transfers.
            </p>
          )}
        </div>

        {/* Recipient Input */}
        <div className="group">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-primary-500 transition-colors">
            Recipient Address
          </label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="Enter Solana wallet address"
            className="w-full bg-transparent border-2 border-white/10 rounded-xl text-sm p-4 text-white placeholder:text-white/20 outline-none focus:border-primary-500 transition-all font-mono"
          />
          {recipient && !isValidSolanaAddress(recipient) && (
            <p className="text-red-400 text-xs mt-2">Invalid Solana address</p>
          )}
        </div>

        {/* Amount Input */}
        <div className="group">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-primary-500 transition-colors">
            Amount
          </label>
          <div className="flex items-end gap-4 border-b-2 border-white/10 focus-within:border-primary-500 transition-colors py-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="flex-1 bg-transparent text-5xl py-2 text-white placeholder:text-white/10 outline-none font-display font-medium"
            />
            <div className="mb-3">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                <div className={`w-5 h-5 rounded-full ${selectedToken.symbol === 'SOL' ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gradient-to-br from-green-400 to-green-600'}`}></div>
                <span className="font-bold text-white">{selectedToken.symbol}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-sm text-slate-500">Balance: {tokenBalance.toFixed(4)} {selectedToken.symbol}</span>
            <button
              onClick={() => setAmount(Math.max(0, tokenBalance - 0.01).toFixed(4))}
              className="text-sm text-primary-500 hover:text-primary-400 font-medium uppercase"
            >
              Max
            </button>
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={
            !recipient ||
            !amount ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > tokenBalance ||
            !isValidSolanaAddress(recipient) ||
            isLoading
          }
          className={`w-full mt-8 py-5 rounded-full font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            !recipient || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > tokenBalance || !isValidSolanaAddress(recipient)
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-white text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
          }`}
        >
          <Lock className="w-5 h-5" />
          Review Private Transfer
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SendForm;
