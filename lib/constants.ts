import { PublicKey } from '@solana/web3.js';

// MagicBlock TEE Ephemeral Rollup URL
export const EPHEMERAL_RPC_URL = 'https://tee.magicblock.app';

// MagicBlock Validator Public Key
export const VALIDATOR_PUBKEY = new PublicKey('FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA');

// Private Payments Program ID (deployed on devnet)
export const PAYMENTS_PROGRAM = new PublicKey('EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS');

// MagicBlock Delegation Program ID
export const DELEGATION_PROGRAM_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');

// PDA Seeds
export const DEPOSIT_PDA_SEED = 'deposit';
export const VAULT_PDA_SEED = 'vault';

// Solana Devnet RPC
export const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
