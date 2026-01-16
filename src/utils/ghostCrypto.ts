// src/utils/ghostCrypto.ts
import * as web3 from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import * as ed2curve from 'ed2curve';

// Calculate Shared Secret (ECDH)
export const getSharedSecret = (
  myPrivateKey: Uint8Array, 
  theirPublicKey: Uint8Array 
): Uint8Array | null => {
  try {
    // Convert Ed25519 keys to Curve25519 for encryption
    const myCurveSecret = ed2curve.convertSecretKey(myPrivateKey);
    const theirCurvePublic = ed2curve.convertPublicKey(theirPublicKey);

    if (!myCurveSecret || !theirCurvePublic) {
      throw new Error("Key conversion failed. Invalid keys provided.");
    }

    // Generate Shared Secret
    return nacl.box.before(theirCurvePublic, myCurveSecret);
  } catch (e) {
    console.error("Shared Secret Error:", e);
    return null;
  }
};

// Derive Stealth Address
export const deriveStealthKeypair = (sharedSecret: Uint8Array): web3.Keypair => {
  // Hash the Shared Secret to create a deterministic seed
  // Using the first 32 bytes for simplicity in this hackathon demo
  const seed = sharedSecret.slice(0, 32); 
  return web3.Keypair.fromSeed(seed);
};