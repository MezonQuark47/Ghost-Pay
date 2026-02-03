import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, AlertCircle, Check, Loader2, Shield, Zap, Lock, Unlock, RefreshCw, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useGhostPay } from '../contexts/GhostPayContext';
import { SUPPORTED_TOKENS } from '../constants';
import { Token } from '../types';

export const ReceiveSection: React.FC = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const {
    isAuthenticated,
    isAuthenticating,
    authenticateTee,
    logoutTee,
    depositInfo,
    isLoadingDeposit,
    depositTokens,
    withdrawTokens,
    delegateDeposit,
    undelegateDeposit,
    refreshDeposit,
    isLoading,
    error,
    transferStatus,
  } = useGhostPay();

  const [selectedToken, setSelectedToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch token balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey || selectedToken.symbol === 'SOL') {
        setTokenBalance(0);
        return;
      }

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
  }, [publicKey, selectedToken, refreshDeposit, isAuthenticated]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    setLocalError(null);
    setSuccessMessage(null);

    try {
      await depositTokens(selectedToken.mintAddress, parseFloat(depositAmount), selectedToken.decimals);
      setSuccessMessage(`Deposited ${depositAmount} ${selectedToken.symbol} to private vault`);
      setDepositAmount('');
    } catch (e: any) {
      setLocalError(e.message || 'Deposit failed');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;

    setLocalError(null);
    setSuccessMessage(null);

    try {
      await withdrawTokens(selectedToken.mintAddress, parseFloat(withdrawAmount), selectedToken.decimals);
      setSuccessMessage(`Withdrew ${withdrawAmount} ${selectedToken.symbol} from private vault`);
      setWithdrawAmount('');
    } catch (e: any) {
      setLocalError(e.message || 'Withdrawal failed');
    }
  };

  const handleDelegate = async () => {
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await delegateDeposit(selectedToken.mintAddress);
      setSuccessMessage('Deposit delegated to TEE - your balance is now private');
    } catch (e: any) {
      setLocalError(e.message || 'Delegation failed');
    }
  };

  const handleUndelegate = async () => {
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await undelegateDeposit(selectedToken.mintAddress);
      setSuccessMessage('Deposit undelegated - your balance is now public');
    } catch (e: any) {
      setLocalError(e.message || 'Undelegation failed');
    }
  };

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto animate-fade-in-up">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto border border-primary-500/20">
              <Shield className="w-10 h-10 text-primary-500" />
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold text-white mb-3">Private Vault</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8">
            Authenticate with MagicBlock TEE to access your private vault. Deposit tokens to make them private,
            or withdraw to make them public again.
          </p>

          <button
            onClick={authenticateTee}
            disabled={isAuthenticating}
            className="px-8 py-4 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-3 mx-auto disabled:opacity-50"
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

          <div className="mt-8 p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-primary-400 mb-2">How it works</h4>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside text-left">
              <li>Authenticate with the TEE (sign a message)</li>
              <li>Deposit tokens to your private vault</li>
              <li>Delegate to TEE for privacy</li>
              <li>Send private transfers to anyone</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Main vault interface
  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-500" />
          Private Vault
        </h2>
        <button
          onClick={logoutTee}
          className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Token Selector */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
          Select Token
        </label>
        <div className="flex gap-2">
          {SUPPORTED_TOKENS.filter(t => t.symbol !== 'SOL').map((token) => (
            <button
              key={token.symbol}
              onClick={() => setSelectedToken(token)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                selectedToken.symbol === token.symbol
                  ? 'bg-primary-500/10 border-primary-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600"></div>
              <span className="font-bold">{token.symbol}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Wallet Balance</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {tokenBalance.toFixed(2)} <span className="text-sm text-slate-400">{selectedToken.symbol}</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-primary-500/20 bg-primary-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-primary-400 uppercase tracking-wider">Private Balance</span>
            <button
              onClick={() => refreshDeposit(selectedToken.mintAddress)}
              disabled={isLoadingDeposit}
              className="ml-auto"
            >
              <RefreshCw className={`w-3 h-3 text-slate-500 hover:text-white transition-colors ${isLoadingDeposit ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="text-2xl font-bold text-white">
            {depositInfo ? depositInfo.amount.toFixed(2) : '0.00'} <span className="text-sm text-slate-400">{selectedToken.symbol}</span>
          </div>
          {depositInfo?.isDelegated && (
            <div className="flex items-center gap-1 mt-1">
              <Shield className="w-3 h-3 text-primary-500" />
              <span className="text-xs text-primary-400">Protected by TEE</span>
            </div>
          )}
        </div>
      </div>

      {/* Delegation Status */}
      {depositInfo && depositInfo.amount > 0 && (
        <div className={`p-4 rounded-xl mb-6 flex items-center justify-between ${
          depositInfo.isDelegated
            ? 'bg-primary-500/10 border border-primary-500/20'
            : 'bg-yellow-500/10 border border-yellow-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {depositInfo.isDelegated ? (
              <>
                <Lock className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="text-white font-medium">Vault is Private</p>
                  <p className="text-xs text-slate-400">Your balance is hidden from public view</p>
                </div>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-white font-medium">Vault is Public</p>
                  <p className="text-xs text-slate-400">Delegate to TEE to make it private</p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={depositInfo.isDelegated ? handleUndelegate : handleDelegate}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              depositInfo.isDelegated
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-primary-500 text-white hover:bg-primary-400'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : depositInfo.isDelegated ? (
              <>
                <Unlock className="w-4 h-4" />
                Make Public
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Make Private
              </>
            )}
          </button>
        </div>
      )}

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

      {/* Error/Success Messages */}
      {(localError || error) && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-sm">{localError || error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="text-green-300 text-sm">{successMessage}</span>
        </div>
      )}

      {/* Deposit/Withdraw Tabs */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex-1">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 px-6 py-4 font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'deposit'
                ? 'bg-primary-500/10 text-primary-400 border-b-2 border-primary-500'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            <ArrowDown className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 px-6 py-4 font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'withdraw'
                ? 'bg-primary-500/10 text-primary-400 border-b-2 border-primary-500'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
            Withdraw
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'deposit' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Deposit tokens from your wallet to your private vault.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Amount to Deposit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent border-2 border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 outline-none focus:border-primary-500 transition-all"
                  />
                  <button
                    onClick={() => setDepositAmount(tokenBalance.toString())}
                    className="text-sm text-primary-500 hover:text-primary-400 font-medium px-3"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Available: {tokenBalance.toFixed(4)} {selectedToken.symbol}</p>
              </div>

              <button
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > tokenBalance || isLoading}
                className="w-full py-4 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ArrowDown className="w-5 h-5" />
                    Deposit to Vault
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Withdraw tokens from your private vault to your wallet.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Amount to Withdraw
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent border-2 border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 outline-none focus:border-primary-500 transition-all"
                  />
                  <button
                    onClick={() => setWithdrawAmount(depositInfo?.amount.toString() || '0')}
                    className="text-sm text-primary-500 hover:text-primary-400 font-medium px-3"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Available: {depositInfo?.amount.toFixed(4) || '0'} {selectedToken.symbol}</p>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (depositInfo?.amount || 0) || isLoading}
                className="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ArrowUp className="w-5 h-5" />
                    Withdraw to Wallet
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiveSection;
