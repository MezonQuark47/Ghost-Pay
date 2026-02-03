export interface Token {
  symbol: string;
  name: string;
  mintAddress: string;
  balance: number;
  decimals: number;
  icon?: string;
}

export interface GhostVault {
  id: string;
  stealthAddress: string;
  amount: number;
  tokenSymbol: string;
  senderAlias?: string;
  detectedAt: Date;
  status: 'unclaimed' | 'sweeping' | 'claimed';
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'sweep';
  amount: number;
  tokenSymbol: string;
  counterparty: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'failed';
  txHash: string;
}

export interface UserProfile {
  walletAddress: string;
  ghostHandle?: string;
  stealthMetaAddress: string;
  isConnected: boolean;
}

export enum AppView {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS'
}

export interface DepositParams {
  amount: number;
  recipientGhostHandle: string;
  tokenSymbol: string;
}

export interface WithdrawalParams {
  vaultId: string;
  destination: string;
}
