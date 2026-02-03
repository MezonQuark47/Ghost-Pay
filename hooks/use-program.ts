import { BN, Program } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useCallback, useMemo } from 'react';
import {
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationRecordPdaFromDelegatedAccount,
  delegationMetadataPdaFromDelegatedAccount,
} from '@magicblock-labs/ephemeral-rollups-sdk';

import { VAULT_PDA_SEED, DEPOSIT_PDA_SEED, DELEGATION_PROGRAM_ID, PAYMENTS_PROGRAM } from '../lib/constants';
import { PrivatePayments } from '../program/private_payments';
import PrivatePaymentsIdl from '../program/private_payments.json';
import { useProvider } from './use-provider';

export function useProgram() {
  const { provider, ephemeralProvider, refreshToken } = useProvider();

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program<PrivatePayments>(PrivatePaymentsIdl as any, provider);
  }, [provider]);

  const ephemeralProgram = useMemo(() => {
    if (!ephemeralProvider) return null;
    return new Program<PrivatePayments>(PrivatePaymentsIdl as any, ephemeralProvider);
  }, [ephemeralProvider]);

  const wallet = useAnchorWallet();

  const getDepositPda = useCallback(
    (user: PublicKey, tokenMint: PublicKey) => {
      if (!program?.programId) return null;
      return PublicKey.findProgramAddressSync(
        [Buffer.from(DEPOSIT_PDA_SEED), user.toBuffer(), tokenMint.toBuffer()],
        program.programId,
      )[0];
    },
    [program],
  );

  const getVaultPda = useCallback(
    (tokenMint: PublicKey) => {
      if (!program?.programId) return null;
      return PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_PDA_SEED), tokenMint.toBuffer()],
        program.programId,
      )[0];
    },
    [program],
  );

  const initializeDeposit = useCallback(
    async (user: PublicKey, tokenMint: PublicKey) => {
      if (!program?.provider.publicKey || !wallet) return null;

      const deposit = getDepositPda(user, tokenMint);
      if (!deposit) return null;

      const initIx = await program.methods
        .initializeDeposit()
        .accountsPartial({
          payer: program.provider.publicKey,
          user,
          deposit,
          tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const permission = permissionPdaFromAccount(deposit);

      await program.methods
        .createPermission()
        .accountsPartial({
          payer: program.provider.publicKey,
          user,
          deposit,
          permission,
          permissionProgram: PERMISSION_PROGRAM_ID,
        })
        .preInstructions([initIx])
        .rpc();

      return deposit;
    },
    [program, wallet, getDepositPda],
  );

  const modifyDeposit = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number, isIncrease: boolean, decimals: number = 6) => {
      if (!program?.provider.publicKey) return null;

      const deposit = getDepositPda(user, tokenMint);
      const vault = getVaultPda(tokenMint);
      if (!deposit || !vault) return null;

      await program.methods
        .modifyBalance({
          amount: new BN(amount * Math.pow(10, decimals)),
          increase: isIncrease,
        })
        .accountsPartial({
          payer: program.provider.publicKey,
          user,
          vault,
          deposit,
          userTokenAccount: getAssociatedTokenAddressSync(
            tokenMint,
            program.provider.publicKey,
            true,
            TOKEN_PROGRAM_ID,
          ),
          vaultTokenAccount: getAssociatedTokenAddressSync(
            tokenMint,
            vault,
            true,
            TOKEN_PROGRAM_ID,
          ),
          tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return deposit;
    },
    [program, getDepositPda, getVaultPda],
  );

  const deposit = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number, decimals?: number) => {
      return modifyDeposit(user, tokenMint, amount, true, decimals);
    },
    [modifyDeposit],
  );

  const withdraw = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number, decimals?: number) => {
      return modifyDeposit(user, tokenMint, amount, false, decimals);
    },
    [modifyDeposit],
  );

  const transfer = useCallback(
    async (tokenMint: PublicKey, amount: number, to: PublicKey, delegated: boolean, decimals: number = 6) => {
      const usedProgram = delegated ? ephemeralProgram : program;
      if (!usedProgram?.provider.publicKey) return null;

      const sourceDeposit = getDepositPda(usedProgram.provider.publicKey, tokenMint);
      const destinationDeposit = getDepositPda(to, tokenMint);
      if (!sourceDeposit || !destinationDeposit) return null;

      await usedProgram.methods
        .transferDeposit(new BN(amount * Math.pow(10, decimals)))
        .accountsPartial({
          sessionToken: null,
          payer: usedProgram.provider.publicKey,
          user: usedProgram.provider.publicKey,
          sourceDeposit,
          destinationDeposit,
          tokenMint,
        })
        .rpc();
    },
    [program, ephemeralProgram, getDepositPda],
  );

  const delegate = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, validator?: PublicKey) => {
      if (!program?.provider.publicKey) return null;

      const deposit = getDepositPda(user, tokenMint);
      if (!deposit) return null;

      // Derive delegation accounts using MagicBlock SDK
      const bufferDeposit = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(deposit, PAYMENTS_PROGRAM);
      const delegationRecordDeposit = delegationRecordPdaFromDelegatedAccount(deposit);
      const delegationMetadataDeposit = delegationMetadataPdaFromDelegatedAccount(deposit);

      console.log('Delegate accounts:', {
        payer: program.provider.publicKey.toBase58(),
        validator: validator?.toBase58(),
        bufferDeposit: bufferDeposit.toBase58(),
        delegationRecordDeposit: delegationRecordDeposit.toBase58(),
        delegationMetadataDeposit: delegationMetadataDeposit.toBase58(),
        deposit: deposit.toBase58(),
        ownerProgram: PAYMENTS_PROGRAM.toBase58(),
        delegationProgram: DELEGATION_PROGRAM_ID.toBase58(),
      });

      await program.methods
        .delegate(user, tokenMint)
        .accountsPartial({
          payer: program.provider.publicKey,
          validator,
          bufferDeposit,
          delegationRecordDeposit,
          delegationMetadataDeposit,
          deposit,
          ownerProgram: PAYMENTS_PROGRAM,
          delegationProgram: DELEGATION_PROGRAM_ID,
        })
        .rpc();
    },
    [program, getDepositPda],
  );

  const undelegate = useCallback(
    async (tokenMint: PublicKey) => {
      if (!ephemeralProgram?.provider.publicKey) return null;

      const deposit = getDepositPda(ephemeralProgram.provider.publicKey, tokenMint);
      if (!deposit) return null;

      await ephemeralProgram.methods
        .undelegate()
        .accountsPartial({
          sessionToken: null,
          user: ephemeralProgram.provider.publicKey,
          payer: ephemeralProgram.provider.publicKey,
          deposit,
        })
        .rpc();
    },
    [ephemeralProgram, getDepositPda],
  );

  return {
    program,
    ephemeralProgram,
    getDepositPda,
    getVaultPda,
    initializeDeposit,
    deposit,
    withdraw,
    transfer,
    delegate,
    undelegate,
    refreshToken,
  };
}
