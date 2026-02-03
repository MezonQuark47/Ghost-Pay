import { DELEGATION_PROGRAM_ID } from '@magicblock-labs/ephemeral-rollups-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BN } from '@coral-xyz/anchor';

import { DEPOSIT_PDA_SEED, EPHEMERAL_RPC_URL } from '../lib/constants';
import { useEphemeralConnection } from './use-ephemeral-connection';
import { useProgram } from './use-program';

export interface DepositAccount {
  user: PublicKey;
  tokenMint: PublicKey;
  amount: BN;
}

export function useDeposit(user?: PublicKey | string, tokenMint?: PublicKey | string) {
  const { program } = useProgram();
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const [ephemeralDeposit, setEphemeralDeposit] = useState<DepositAccount | null>(null);
  const [mainnetDeposit, setMainnetDeposit] = useState<DepositAccount | null>(null);
  const [isDelegated, setIsDelegated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const deposit = useMemo(() => {
    return isDelegated ? ephemeralDeposit : mainnetDeposit;
  }, [ephemeralDeposit, mainnetDeposit, isDelegated]);

  const depositPda = useMemo(() => {
    if (!program || !user || !tokenMint) return null;
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(DEPOSIT_PDA_SEED),
        new PublicKey(user).toBuffer(),
        new PublicKey(tokenMint).toBuffer(),
      ],
      program.programId,
    )[0];
  }, [program, user, tokenMint]);

  const getDeposit = useCallback(async () => {
    if (!user || !program || !depositPda) return;

    setIsLoading(true);
    setEphemeralDeposit(null);
    setMainnetDeposit(null);

    try {
      let depositAccount = await connection.getAccountInfo(depositPda);

      if (depositAccount) {
        const mainnetDepositData = program.coder.accounts.decode('deposit', depositAccount.data);
        setMainnetDeposit(mainnetDepositData);

        if (depositAccount.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
          setIsDelegated(true);

          // Try to get ephemeral deposit
          try {
            const ephemeralAccount = await ephemeralConnection?.getAccountInfo(depositPda);
            if (ephemeralAccount) {
              const ephemeralDepositData = program.coder.accounts.decode('deposit', ephemeralAccount.data);
              setEphemeralDeposit(ephemeralDepositData);
            }
          } catch (error) {
            console.log('Ephemeral connection error:', error);
          }
        } else {
          setIsDelegated(false);
        }
      }
    } catch (error) {
      console.log('getDeposit error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tokenMint, user, program, depositPda, connection, ephemeralConnection]);

  // Initialize
  useEffect(() => {
    getDeposit();
  }, [getDeposit]);

  // Request permission when delegated
  useEffect(() => {
    if (isDelegated && depositPda) {
      fetch(`${EPHEMERAL_RPC_URL}/permission?pubkey=${depositPda.toBase58()}`).catch(() => {});
    }
  }, [depositPda, isDelegated]);

  return {
    deposit,
    mainnetDeposit,
    ephemeralDeposit,
    depositPda,
    isDelegated,
    isLoading,
    refresh: getDeposit,
    accessDenied: isDelegated && !ephemeralDeposit,
  };
}
