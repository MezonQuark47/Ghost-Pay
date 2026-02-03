import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { DELEGATION_PROGRAM_ID } from '@magicblock-labs/ephemeral-rollups-sdk';

import { usePrivateRollupAuth } from '../hooks/use-private-rollup-auth';
import { useEphemeralConnection } from '../hooks/use-ephemeral-connection';
import { useProgram } from '../hooks/use-program';
import { usePrivateTransfer } from '../hooks/use-private-transfer';
import { DEPOSIT_PDA_SEED, VALIDATOR_PUBKEY } from '../lib/constants';
import { Transaction as TxHistory } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface DepositInfo {
  amount: number;
  isDelegated: boolean;
  rawAmount: BN;
}

interface TransferStatus {
  step: string;
  progress: number;
}

interface GhostPayContextType {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  transactions: TxHistory[];

  // TEE Authentication
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authenticateTee: () => Promise<void>;
  logoutTee: () => void;

  // Deposit Info
  depositInfo: DepositInfo | null;
  isLoadingDeposit: boolean;

  // Transfer Status
  transferStatus: TransferStatus | null;
  isTransferring: boolean;

  // Actions
  sendPrivatePayment: (amount: number, recipientAddress: string, tokenMint: string, decimals?: number) => Promise<string>;
  depositTokens: (tokenMint: string, amount: number, decimals?: number) => Promise<string>;
  withdrawTokens: (tokenMint: string, amount: number, decimals?: number) => Promise<string>;
  delegateDeposit: (tokenMint: string) => Promise<void>;
  undelegateDeposit: (tokenMint: string) => Promise<void>;
  refreshDeposit: (tokenMint: string) => Promise<void>;
  getBalance: () => Promise<number>;
  clearHistory: () => void;
}

const GhostPayContext = createContext<GhostPayContextType | undefined>(undefined);

export const useGhostPay = () => {
  const context = useContext(GhostPayContext);
  if (!context) {
    throw new Error('useGhostPay must be used within a GhostPayProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

// Maximum transactions to store in history
const MAX_TRANSACTION_HISTORY = 100;

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const GhostPayProvider: React.FC<Props> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();

  // TEE Authentication
  const {
    isAuthenticated,
    isAuthenticating,
    authenticate: teeAuthenticate,
    logout: teeLogout,
  } = usePrivateRollupAuth();

  const { ephemeralConnection } = useEphemeralConnection();
  const { program, ephemeralProgram, getDepositPda, getVaultPda } = useProgram();
  const { transfer: privateTransfer, withdraw: privateWithdraw, isTransferring, status: transferStatus } = usePrivateTransfer();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TxHistory[]>([]);

  // Deposit state
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [isLoadingDeposit, setIsLoadingDeposit] = useState(false);
  const [currentTokenMint, setCurrentTokenMint] = useState<string | null>(null);

  // Initialize when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      setIsInitialized(true);
      loadStoredData();
    } else {
      setIsInitialized(false);
      setDepositInfo(null);
    }
  }, [wallet.connected, wallet.publicKey]);

  // Load stored data from localStorage
  const loadStoredData = useCallback(async () => {
    if (!wallet.publicKey) return;

    const walletKey = wallet.publicKey.toBase58();

    try {
      // Load transaction history
      const storedTxs = localStorage.getItem(`ghostpay_txs_${walletKey}`);
      if (storedTxs) {
        const parsed = JSON.parse(storedTxs);
        setTransactions(parsed.slice(0, MAX_TRANSACTION_HISTORY).map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        })));
      }
    } catch (e) {
      console.error('Failed to load stored data:', e);
    }
  }, [wallet.publicKey]);

  // Save transaction to history
  const saveTransaction = useCallback((tx: TxHistory) => {
    if (!wallet.publicKey) return;

    setTransactions(prev => {
      const updated = [tx, ...prev].slice(0, MAX_TRANSACTION_HISTORY);
      localStorage.setItem(
        `ghostpay_txs_${wallet.publicKey!.toBase58()}`,
        JSON.stringify(updated)
      );
      return updated;
    });
  }, [wallet.publicKey]);

  // Clear transaction history
  const clearHistory = useCallback(() => {
    if (!wallet.publicKey) return;
    setTransactions([]);
    localStorage.removeItem(`ghostpay_txs_${wallet.publicKey.toBase58()}`);
  }, [wallet.publicKey]);

  // Get SOL balance
  const getBalance = useCallback(async (): Promise<number> => {
    if (!wallet.publicKey) return 0;

    try {
      const balance = await connection.getBalance(wallet.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (e) {
      console.error('Failed to get balance:', e);
      return 0;
    }
  }, [connection, wallet.publicKey]);

  // TEE Authentication
  const authenticateTee = useCallback(async () => {
    setError(null);
    try {
      await teeAuthenticate();
    } catch (e: any) {
      setError(e.message || 'Failed to authenticate with TEE');
      throw e;
    }
  }, [teeAuthenticate]);

  const logoutTee = useCallback(() => {
    teeLogout();
    setDepositInfo(null);
  }, [teeLogout]);

  // Refresh deposit info
  const refreshDeposit = useCallback(async (tokenMint: string) => {
    if (!wallet.publicKey || !program) return;

    setIsLoadingDeposit(true);
    setCurrentTokenMint(tokenMint);

    try {
      const tokenMintPk = new PublicKey(tokenMint);
      const depositPda = getDepositPda(wallet.publicKey, tokenMintPk);

      if (!depositPda) {
        setDepositInfo(null);
        return;
      }

      const depositAccount = await connection.getAccountInfo(depositPda);

      if (!depositAccount) {
        setDepositInfo(null);
        return;
      }

      const isDelegated = depositAccount.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID));
      let amount = new BN(0);

      if (isDelegated && ephemeralConnection) {
        // Get from TEE
        try {
          const ephemeralAccount = await ephemeralConnection.getAccountInfo(depositPda);
          if (ephemeralAccount) {
            const decoded = program.coder.accounts.decode('deposit', ephemeralAccount.data);
            amount = decoded.amount;
          }
        } catch (e) {
          console.log('Could not read from TEE:', e);
        }
      } else {
        const decoded = program.coder.accounts.decode('deposit', depositAccount.data);
        amount = decoded.amount;
      }

      setDepositInfo({
        amount: amount.toNumber() / Math.pow(10, 6), // Assuming 6 decimals
        isDelegated,
        rawAmount: amount,
      });
    } catch (e) {
      console.error('Failed to refresh deposit:', e);
      setDepositInfo(null);
    } finally {
      setIsLoadingDeposit(false);
    }
  }, [wallet.publicKey, program, connection, ephemeralConnection, getDepositPda]);

  // Deposit tokens
  const depositTokens = useCallback(async (
    tokenMint: string,
    amount: number,
    decimals: number = 6
  ): Promise<string> => {
    if (!wallet.publicKey || !program) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenMintPk = new PublicKey(tokenMint);
      const depositPda = getDepositPda(wallet.publicKey, tokenMintPk);
      const vaultPda = getVaultPda(tokenMintPk);

      if (!depositPda || !vaultPda) {
        throw new Error('Failed to derive PDAs');
      }

      // Check if deposit exists
      const depositAccount = await connection.getAccountInfo(depositPda);

      if (!depositAccount) {
        // Initialize deposit first
        await program.methods
          .initializeDeposit()
          .accountsPartial({
            payer: wallet.publicKey,
            user: wallet.publicKey,
            deposit: depositPda,
            tokenMint: tokenMintPk,
          })
          .rpc();
      }

      // Deposit tokens
      const sig = await program.methods
        .modifyBalance({
          amount: new BN(amount * Math.pow(10, decimals)),
          increase: true,
        })
        .accountsPartial({
          payer: wallet.publicKey,
          user: wallet.publicKey,
          vault: vaultPda,
          deposit: depositPda,
          tokenMint: tokenMintPk,
        })
        .rpc();

      saveTransaction({
        id: `tx-${Date.now()}`,
        type: 'send',
        amount,
        tokenSymbol: 'USDC',
        counterparty: 'Private Vault',
        timestamp: new Date(),
        status: 'success',
        txHash: sig,
      });

      await refreshDeposit(tokenMint);

      return sig;
    } catch (e: any) {
      setError(e.message || 'Failed to deposit');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [wallet.publicKey, program, connection, getDepositPda, getVaultPda, saveTransaction, refreshDeposit]);

  // Withdraw tokens
  const withdrawTokens = useCallback(async (
    tokenMint: string,
    amount: number,
    decimals: number = 6
  ): Promise<string> => {
    if (!wallet.publicKey || !isAuthenticated) {
      throw new Error('Wallet not connected or not authenticated with TEE');
    }

    setIsLoading(true);
    setError(null);

    try {
      const sig = await privateWithdraw(tokenMint, amount, decimals);

      saveTransaction({
        id: `tx-${Date.now()}`,
        type: 'receive',
        amount,
        tokenSymbol: 'USDC',
        counterparty: 'Private Vault',
        timestamp: new Date(),
        status: 'success',
        txHash: sig,
      });

      await refreshDeposit(tokenMint);

      return sig;
    } catch (e: any) {
      setError(e.message || 'Failed to withdraw');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [wallet.publicKey, isAuthenticated, privateWithdraw, saveTransaction, refreshDeposit]);

  // Delegate deposit to TEE
  const delegateDeposit = useCallback(async (tokenMint: string) => {
    if (!wallet.publicKey || !program) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenMintPk = new PublicKey(tokenMint);
      const depositPda = getDepositPda(wallet.publicKey, tokenMintPk);

      if (!depositPda) {
        throw new Error('Failed to derive deposit PDA');
      }

      await program.methods
        .delegate(wallet.publicKey, tokenMintPk)
        .accountsPartial({
          payer: wallet.publicKey,
          validator: VALIDATOR_PUBKEY,
          deposit: depositPda,
        })
        .rpc();

      await refreshDeposit(tokenMint);
    } catch (e: any) {
      setError(e.message || 'Failed to delegate');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [wallet.publicKey, program, getDepositPda, refreshDeposit]);

  // Undelegate deposit from TEE
  const undelegateDeposit = useCallback(async (tokenMint: string) => {
    if (!wallet.publicKey || !ephemeralProgram) {
      throw new Error('Wallet not connected or TEE not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenMintPk = new PublicKey(tokenMint);
      const depositPda = getDepositPda(wallet.publicKey, tokenMintPk);

      if (!depositPda) {
        throw new Error('Failed to derive deposit PDA');
      }

      await ephemeralProgram.methods
        .undelegate()
        .accountsPartial({
          sessionToken: null,
          user: wallet.publicKey,
          payer: wallet.publicKey,
          deposit: depositPda,
        })
        .rpc();

      // Wait for undelegation to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      await refreshDeposit(tokenMint);
    } catch (e: any) {
      setError(e.message || 'Failed to undelegate');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [wallet.publicKey, ephemeralProgram, getDepositPda, refreshDeposit]);

  // Send private payment (main function)
  const sendPrivatePayment = useCallback(async (
    amount: number,
    recipientAddress: string,
    tokenMint: string,
    decimals: number = 6
  ): Promise<string> => {
    if (!wallet.publicKey || !isAuthenticated) {
      throw new Error('Wallet not connected or not authenticated with TEE');
    }

    setIsLoading(true);
    setError(null);

    try {
      const sig = await privateTransfer(recipientAddress, tokenMint, amount, decimals);

      saveTransaction({
        id: `tx-${Date.now()}`,
        type: 'send',
        amount,
        tokenSymbol: 'USDC',
        counterparty: `${recipientAddress.slice(0, 4)}...${recipientAddress.slice(-4)}`,
        timestamp: new Date(),
        status: 'success',
        txHash: sig,
      });

      await refreshDeposit(tokenMint);

      return sig;
    } catch (e: any) {
      setError(e.message || 'Failed to send private payment');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [wallet.publicKey, isAuthenticated, privateTransfer, saveTransaction, refreshDeposit]);

  const value: GhostPayContextType = {
    isInitialized,
    isLoading,
    error,
    transactions,

    // TEE Auth
    isAuthenticated,
    isAuthenticating,
    authenticateTee,
    logoutTee,

    // Deposit
    depositInfo,
    isLoadingDeposit,

    // Transfer
    transferStatus,
    isTransferring,

    // Actions
    sendPrivatePayment,
    depositTokens,
    withdrawTokens,
    delegateDeposit,
    undelegateDeposit,
    refreshDeposit,
    getBalance,
    clearHistory,
  };

  return (
    <GhostPayContext.Provider value={value}>
      {children}
    </GhostPayContext.Provider>
  );
};

export default GhostPayProvider;
