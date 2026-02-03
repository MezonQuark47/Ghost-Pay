import { Token, Transaction } from './types';

export const SOL_TOKEN: Token = {
  symbol: 'SOL',
  name: 'Solana',
  mintAddress: 'So11111111111111111111111111111111111111112',
  balance: 0,
  decimals: 9,
};

// Devnet USDC (for testing with MagicBlock TEE)
export const USDC_TOKEN: Token = {
  symbol: 'USDC',
  name: 'USD Coin (Devnet)',
  mintAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  balance: 0,
  decimals: 6,
};

export const SUPPORTED_TOKENS: Token[] = [USDC_TOKEN, SOL_TOKEN];

// MagicBlock TEE Constants (re-exported from lib/constants)
export { EPHEMERAL_RPC_URL, VALIDATOR_PUBKEY, PAYMENTS_PROGRAM } from './lib/constants';

// Demo transactions for display when no real transactions exist
export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-tx-1',
    type: 'send',
    amount: 0.5,
    tokenSymbol: 'SOL',
    counterparty: '@ghost_demo',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: 'success',
    txHash: 'demo...hash1'
  },
  {
    id: 'demo-tx-2',
    type: 'receive',
    amount: 1.0,
    tokenSymbol: 'SOL',
    counterparty: 'Anonymous',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    status: 'success',
    txHash: 'demo...hash2'
  },
];

// Ghost Handle Registry (in production, this would be on-chain)
export const MOCK_GHOST_HANDLE = "ghost_satoshi";
export const MOCK_STEALTH_META_ADDRESS = "st_sol_7x9...2mPq8z";
