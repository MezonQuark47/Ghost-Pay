import { PublicKey, clusterApiUrl } from '@solana/web3.js';

// GhostPay Program (deployed to devnet)
export const GHOST_PAY_PROGRAM_ID = new PublicKey("3vVvYt4ryppt979B7CFHxKS4a4ibunnEzbgTs4Nd5zTm");

// MagicBlock PERs Programs
export const PERMISSION_PROGRAM_ID = new PublicKey("ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1");
export const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

// TEE Validators
export const TEE_VALIDATORS = {
  TEE: new PublicKey("FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA"),
  US: new PublicKey("MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd"),
  EU: new PublicKey("MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e"),
  ASIA: new PublicKey("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57"),
};

// TEE Endpoints
export const TEE_ENDPOINTS = {
  TEE: { rpc: "https://tee.magicblock.app", ws: "wss://tee.magicblock.app" },
  US: { rpc: "https://devnet-us.magicblock.app", ws: "wss://devnet-us.magicblock.app" },
  EU: { rpc: "https://devnet-eu.magicblock.app", ws: "wss://devnet-eu.magicblock.app" },
  ASIA: { rpc: "https://devnet-as.magicblock.app", ws: "wss://devnet-as.magicblock.app" },
};

// Network Configuration
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = clusterApiUrl('devnet');
export const WS_ENDPOINT = RPC_ENDPOINT.replace('https', 'wss');

// Token Mints
export const TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
};

// Default TEE Region
export const DEFAULT_TEE_REGION = 'TEE';
