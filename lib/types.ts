import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export interface DepositAccount {
  user: PublicKey;
  tokenMint: PublicKey;
  amount: BN;
}

export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: number;
}

export interface TransferStatus {
  step: string;
  progress: number;
}
