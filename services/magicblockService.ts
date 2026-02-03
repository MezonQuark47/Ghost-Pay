/**
 * MagicBlock Service
 *
 * This service provides utility functions for interacting with MagicBlock's
 * Private Ephemeral Rollups (PERs). The actual blockchain interactions are
 * handled by the GhostPayContext.
 *
 * For component-level integration, use the useGhostPay() hook from GhostPayContext.
 */

import { GhostVault } from '../types';

// TEE Endpoints for MagicBlock PERs
export const TEE_ENDPOINTS = {
  TEE: { rpc: "https://tee.magicblock.app", ws: "wss://tee.magicblock.app" },
  US: { rpc: "https://devnet-us.magicblock.app", ws: "wss://devnet-us.magicblock.app" },
  EU: { rpc: "https://devnet-eu.magicblock.app", ws: "wss://devnet-eu.magicblock.app" },
  ASIA: { rpc: "https://devnet-as.magicblock.app", ws: "wss://devnet-as.magicblock.app" },
};

/**
 * Legacy mock function - kept for backwards compatibility
 * Use useGhostPay().scanForVaults() instead
 */
export const scanForGhostVaults = async (): Promise<GhostVault[]> => {
  console.warn('Using mock scanForGhostVaults. Use useGhostPay() hook for real implementation.');

  return new Promise((resolve) => {
    setTimeout(() => {
      const found = Math.random() > 0.5;
      if (found) {
        resolve([
          {
            id: `demo-vlt-${Date.now()}`,
            stealthAddress: 'GyP...9xQ',
            amount: parseFloat((Math.random() * 2).toFixed(2)),
            tokenSymbol: 'SOL',
            senderAlias: 'Anonymous',
            detectedAt: new Date(),
            status: 'unclaimed'
          }
        ]);
      } else {
        resolve([]);
      }
    }, 2500);
  });
};

/**
 * Legacy mock function - kept for backwards compatibility
 * Use useGhostPay().sweepVault() instead
 */
export const sweepVault = async (vaultId: string, destination: string): Promise<string> => {
  console.warn('Using mock sweepVault. Use useGhostPay() hook for real implementation.');
  console.log(`Sweeping vault ${vaultId} to ${destination}`);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`demo_tx_sweep_${Date.now()}`);
    }, 2000);
  });
};

/**
 * Verify TEE integrity before performing sensitive operations
 */
export const verifyTeeIntegrity = async (endpoint: string): Promise<boolean> => {
  try {
    const response = await fetch(`${endpoint}/health`);
    return response.ok;
  } catch (error) {
    console.error('TEE integrity check failed:', error);
    return false;
  }
};

/**
 * Get TEE explorer URL for transaction viewing
 */
export const getTeeExplorerUrl = (txSignature: string, authToken?: string): string => {
  const baseUrl = 'https://solscan.io/tx';
  if (authToken) {
    return `${baseUrl}/${txSignature}?cluster=custom&customUrl=${TEE_ENDPOINTS.TEE.rpc}?token=${authToken}`;
  }
  return `${baseUrl}/${txSignature}?cluster=devnet`;
};
