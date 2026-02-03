import { useCallback, useState } from 'react';
import { useProgram } from './use-program';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PAYMENTS_PROGRAM, VALIDATOR_PUBKEY, EPHEMERAL_RPC_URL } from '../lib/constants';

const IS_DEV = import.meta.env.DEV;
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import { PrivatePayments } from '../program/private_payments';
import PrivatePaymentsIdl from '../program/private_payments.json';
import {
  DELEGATION_PROGRAM_ID,
  GetCommitmentSignature,
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationRecordPdaFromDelegatedAccount,
  delegationMetadataPdaFromDelegatedAccount,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import { SessionTokenManager } from '@magicblock-labs/gum-sdk';
import { DepositAccount } from './use-deposit';

interface TransferStatus {
  step: string;
  progress: number;
}

async function initializeDeposit({
  program,
  user,
  tokenMint,
  depositPda,
  transaction,
}: {
  program: Program<PrivatePayments>;
  user: PublicKey;
  tokenMint: PublicKey;
  depositPda: PublicKey;
  transaction: Transaction;
}) {
  const initIx = await program.methods
    .initializeDeposit()
    .accountsPartial({
      payer: program.provider.publicKey,
      user,
      deposit: depositPda,
      tokenMint: tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const permission = permissionPdaFromAccount(depositPda);

  const createPermissionIx = await program.methods
    .createPermission()
    .accountsPartial({
      payer: program.provider.publicKey,
      user,
      deposit: depositPda,
      permission,
      permissionProgram: PERMISSION_PROGRAM_ID,
    })
    .preInstructions([initIx])
    .instruction();

  transaction.add(initIx);
  transaction.add(createPermissionIx);

  return transaction;
}

const TOKENS_STORAGE_KEY = 'ghostpay-tee-auth-tokens';

function getTokenFromStorage(walletPubkey: string | undefined): string | null {
  if (!walletPubkey) return null;
  try {
    const storedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (storedTokens) {
      const tokens = JSON.parse(storedTokens);
      const token = tokens[walletPubkey];
      if (token && token.expiresAt > Date.now()) {
        return token.token;
      }
    }
  } catch (e) {
    console.error('Error reading token from storage:', e);
  }
  return null;
}

export function usePrivateTransfer() {
  const { connection } = useConnection();
  const { program, getDepositPda, getVaultPda } = useProgram();
  const wallet = useAnchorWallet();
  const [isTransferring, setIsTransferring] = useState(false);
  const [status, setStatus] = useState<TransferStatus | null>(null);

  const transfer = useCallback(
    async (recipient: string, tokenMint: string, amount: number, decimals: number = 6) => {
      if (!wallet?.publicKey || !program || !connection) {
        throw new Error('Wallet not connected');
      }

      // Get auth token directly from localStorage
      const authToken = getTokenFromStorage(wallet.publicKey.toBase58());

      if (!authToken) {
        throw new Error('TEE not authenticated. Please authenticate first.');
      }

      // Create ephemeral connection and provider directly
      const ephemeralConnection = new Connection(`${EPHEMERAL_RPC_URL}?token=${authToken}`, 'confirmed');
      const ephemeralProvider = new AnchorProvider(ephemeralConnection, wallet, { commitment: 'confirmed' });
      const ephemeralProgram = new Program<PrivatePayments>(PrivatePaymentsIdl as any, ephemeralProvider);

      setIsTransferring(true);
      setStatus({ step: 'Preparing transfer...', progress: 10 });

      try {
        const tokenAmount = new BN(Math.pow(10, decimals) * amount);
        const recipientPk = new PublicKey(recipient);
        const tokenMintPk = new PublicKey(tokenMint);

        let preliminaryTx: Transaction | undefined;
        let mainnetTx: Transaction | undefined;

        const vaultPda = getVaultPda(tokenMintPk);
        if (!vaultPda) throw new Error('Failed to derive vault PDA');

        const senderDepositPda = getDepositPda(wallet.publicKey, tokenMintPk);
        if (!senderDepositPda) throw new Error('Failed to derive sender deposit PDA');

        setStatus({ step: 'Checking accounts...', progress: 20 });

        const senderDepositAccount = await connection.getAccountInfo(senderDepositPda);
        const ephemeralSenderDepositAccount = await ephemeralConnection.getAccountInfo(senderDepositPda);

        const senderIsDelegated = senderDepositAccount?.owner.equals(
          new PublicKey(DELEGATION_PROGRAM_ID),
        );

        // Compute amount to deposit
        let amountToDeposit = tokenAmount;
        const mainnetSenderDepositAmount = senderDepositAccount
          ? (program.coder.accounts.decode('deposit', senderDepositAccount.data) as DepositAccount).amount
          : new BN(0);
        const ephemeralSenderDepositAmount = ephemeralSenderDepositAccount
          ? (program.coder.accounts.decode('deposit', ephemeralSenderDepositAccount.data) as DepositAccount).amount
          : new BN(0);

        if (senderIsDelegated) {
          amountToDeposit = amountToDeposit.sub(ephemeralSenderDepositAmount);
        } else {
          amountToDeposit = amountToDeposit.sub(mainnetSenderDepositAmount);
        }

        setStatus({ step: 'Creating session...', progress: 30 });

        // Create session for ephemeral rollup
        const sessionKp = Keypair.generate();
        const sessionManager = new SessionTokenManager(wallet, connection);
        const sessionToken = PublicKey.findProgramAddressSync(
          [
            Buffer.from('session_token'),
            PAYMENTS_PROGRAM.toBuffer(),
            sessionKp.publicKey.toBuffer(),
            wallet.publicKey.toBuffer(),
          ],
          sessionManager.program.programId,
        )[0];

        const createSessionTx = await sessionManager.program.methods
          .createSession(true, null, null)
          .accountsPartial({
            sessionToken,
            sessionSigner: sessionKp.publicKey,
            authority: wallet.publicKey,
            targetProgram: PAYMENTS_PROGRAM,
          })
          .transaction();

        const revokeSessionTx = await sessionManager.program.methods
          .revokeSession()
          .accountsPartial({
            sessionToken,
            authority: wallet.publicKey,
          })
          .transaction();

        setStatus({ step: 'Initializing deposits...', progress: 40 });

        if (!senderDepositAccount) {
          mainnetTx = await initializeDeposit({
            program,
            user: wallet.publicKey,
            tokenMint: tokenMintPk,
            depositPda: senderDepositPda,
            transaction: new Transaction(),
          });
        } else if (senderIsDelegated && amountToDeposit.gt(new BN(0))) {
          // Need to undelegate first to add more tokens
          const undelegateIx = await ephemeralProgram.methods
            .undelegate()
            .accountsPartial({
              sessionToken,
              payer: sessionKp.publicKey,
              user: wallet.publicKey,
              deposit: senderDepositPda,
            })
            .instruction();
          preliminaryTx = new Transaction();
          preliminaryTx.add(undelegateIx);
        }

        // Check recipient deposit
        const recipientDepositPda = getDepositPda(recipientPk, tokenMintPk);
        if (!recipientDepositPda) throw new Error('Failed to derive recipient deposit PDA');

        const recipientDepositAccount = await connection.getAccountInfo(recipientDepositPda);
        const recipientIsDelegated = recipientDepositAccount?.owner.equals(
          new PublicKey(DELEGATION_PROGRAM_ID),
        );

        let recipientInitTx: Transaction | undefined;
        if (!recipientDepositAccount) {
          recipientInitTx = await initializeDeposit({
            program,
            user: recipientPk,
            tokenMint: tokenMintPk,
            depositPda: recipientDepositPda,
            transaction: new Transaction(),
          });
        }

        setStatus({ step: 'Depositing tokens...', progress: 50 });

        if (amountToDeposit.gt(new BN(0))) {
          const depositIx = await program.methods
            .modifyBalance({ amount: amountToDeposit, increase: true })
            .accountsPartial({
              payer: program.provider.publicKey,
              user: wallet.publicKey,
              vault: vaultPda,
              deposit: senderDepositPda,
              userTokenAccount: getAssociatedTokenAddressSync(
                tokenMintPk,
                wallet.publicKey,
                true,
                TOKEN_PROGRAM_ID,
              ),
              vaultTokenAccount: getAssociatedTokenAddressSync(
                tokenMintPk,
                vaultPda,
                true,
                TOKEN_PROGRAM_ID,
              ),
              tokenMint,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();
          mainnetTx = mainnetTx || new Transaction();
          mainnetTx.add(depositIx);
        }

        setStatus({ step: 'Delegating to TEE...', progress: 60 });

        // Delegate sender if needed
        if (!senderIsDelegated || preliminaryTx) {
          // Derive delegation accounts using MagicBlock SDK
          const senderBufferDeposit = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(senderDepositPda, PAYMENTS_PROGRAM);
          const senderDelegationRecordDeposit = delegationRecordPdaFromDelegatedAccount(senderDepositPda);
          const senderDelegationMetadataDeposit = delegationMetadataPdaFromDelegatedAccount(senderDepositPda);

          const delegateIx = await program.methods
            .delegate(wallet.publicKey, tokenMintPk)
            .accountsPartial({
              payer: wallet.publicKey,
              validator: VALIDATOR_PUBKEY,
              bufferDeposit: senderBufferDeposit,
              delegationRecordDeposit: senderDelegationRecordDeposit,
              delegationMetadataDeposit: senderDelegationMetadataDeposit,
              deposit: senderDepositPda,
              ownerProgram: PAYMENTS_PROGRAM,
              delegationProgram: DELEGATION_PROGRAM_ID,
            })
            .instruction();
          mainnetTx = mainnetTx || new Transaction();
          mainnetTx.add(delegateIx);
        }

        // Delegate recipient if needed
        if (!recipientIsDelegated) {
          // Derive delegation accounts using MagicBlock SDK
          const recipientBufferDeposit = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(recipientDepositPda, PAYMENTS_PROGRAM);
          const recipientDelegationRecordDeposit = delegationRecordPdaFromDelegatedAccount(recipientDepositPda);
          const recipientDelegationMetadataDeposit = delegationMetadataPdaFromDelegatedAccount(recipientDepositPda);

          const delegateIx = await program.methods
            .delegate(recipientPk, tokenMintPk)
            .accountsPartial({
              payer: wallet.publicKey,
              validator: VALIDATOR_PUBKEY,
              bufferDeposit: recipientBufferDeposit,
              delegationRecordDeposit: recipientDelegationRecordDeposit,
              delegationMetadataDeposit: recipientDelegationMetadataDeposit,
              deposit: recipientDepositPda,
              ownerProgram: PAYMENTS_PROGRAM,
              delegationProgram: DELEGATION_PROGRAM_ID,
            })
            .instruction();
          mainnetTx = mainnetTx || new Transaction();
          mainnetTx.add(delegateIx);
        }

        setStatus({ step: 'Executing private transfer...', progress: 70 });

        // Private transfer in TEE
        const ephemeralTx = await ephemeralProgram.methods
          .transferDeposit(tokenAmount)
          .accountsPartial({
            sessionToken,
            payer: sessionKp.publicKey,
            user: program.provider.publicKey,
            sourceDeposit: senderDepositPda,
            destinationDeposit: recipientDepositPda,
            tokenMint: tokenMintPk,
          })
          .signers([sessionKp])
          .transaction();

        const blockhash = (await connection.getLatestBlockhash()).blockhash;
        const ephemeralBlockhash = (await ephemeralConnection.getLatestBlockhash()).blockhash;

        // Build action queue
        const actions = [
          {
            name: 'createSessionTx',
            tx: createSessionTx,
            signedTx: createSessionTx,
            blockhash,
            connection,
          },
          {
            name: 'recipientInitTx',
            tx: recipientInitTx,
            signedTx: recipientInitTx,
            blockhash,
            connection,
            callback: () => new Promise(resolve => setTimeout(resolve, 3000)),
          },
          {
            name: 'preliminaryTx',
            tx: preliminaryTx,
            signedTx: preliminaryTx,
            blockhash: ephemeralBlockhash,
            connection: ephemeralConnection,
            callback: async (signature: string) => {
              let retries = 5;
              while (retries > 0) {
                try {
                  await GetCommitmentSignature(signature, ephemeralConnection);
                  break;
                } catch {
                  retries--;
                }
              }
              return new Promise(resolve => setTimeout(resolve, 1000));
            },
          },
          {
            name: 'mainnetTx',
            tx: mainnetTx,
            signedTx: mainnetTx,
            blockhash,
            connection,
          },
          {
            name: 'ephemeralTx',
            tx: ephemeralTx,
            signedTx: ephemeralTx,
            blockhash: ephemeralBlockhash,
            connection: ephemeralConnection,
            callback: (signature: string) => ephemeralConnection.confirmTransaction(signature),
          },
          {
            name: 'revokeSessionTx',
            tx: revokeSessionTx,
            signedTx: revokeSessionTx,
            blockhash,
            connection,
          },
        ]
          .filter(action => action.tx)
          .map(action => {
            const tx = action.tx!;
            tx.recentBlockhash = action.blockhash;
            tx.feePayer =
              action.blockhash === ephemeralBlockhash
                ? sessionKp.publicKey
                : program.provider.publicKey;
            return { ...action, tx };
          });

        setStatus({ step: 'Signing transactions...', progress: 80 });

        // Partial sign ephemeral transactions
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i];
          if (action.blockhash === ephemeralBlockhash || action.name === 'createSessionTx') {
            action.tx!.partialSign(sessionKp);
            actions[i].signedTx = action.tx!;
          }
        }

        // User signs mainnet transactions
        const userSignedActions = actions.filter(action => action.blockhash !== ephemeralBlockhash);
        const txs = userSignedActions.map(action => action.tx!);
        const signedTxs = await wallet.signAllTransactions(txs);

        for (let i = 0; i < actions.length; i++) {
          const action = actions[i];
          if (action.blockhash === ephemeralBlockhash) {
            action.tx!.sign(sessionKp);
            actions[i].signedTx = action.tx!;
          } else {
            actions[i].signedTx = signedTxs[userSignedActions.findIndex(a => a.name === action.name)];
          }
        }

        setStatus({ step: 'Broadcasting transactions...', progress: 90 });

        // Send all transactions
        let lastSignature = '';
        for (const action of actions) {
          if (IS_DEV) console.log(`Sending ${action.name} transaction`);
          const signature = await action.connection.sendRawTransaction(action.signedTx!.serialize(), {
            preflightCommitment: 'confirmed',
          });
          await action.connection.confirmTransaction(signature);
          await (action as any).callback?.(signature);
          lastSignature = signature;
        }

        setStatus({ step: 'Transfer complete!', progress: 100 });

        return lastSignature;
      } finally {
        setIsTransferring(false);
        setTimeout(() => setStatus(null), 2000);
      }
    },
    [wallet, program, connection, getDepositPda, getVaultPda],
  );

  const withdraw = useCallback(
    async (tokenMint: string, amount: number, decimals: number = 6) => {
      if (!wallet?.publicKey || !program || !connection) {
        throw new Error('Wallet not connected');
      }

      // Get auth token directly from localStorage
      const authToken = getTokenFromStorage(wallet.publicKey.toBase58());
      if (!authToken) {
        throw new Error('TEE not authenticated. Please authenticate first.');
      }

      // Create ephemeral connection and provider directly
      const ephemeralConnection = new Connection(`${EPHEMERAL_RPC_URL}?token=${authToken}`, 'confirmed');
      const ephemeralProvider = new AnchorProvider(ephemeralConnection, wallet, { commitment: 'confirmed' });
      const ephemeralProgram = new Program<PrivatePayments>(PrivatePaymentsIdl as any, ephemeralProvider);

      setIsTransferring(true);
      setStatus({ step: 'Preparing withdrawal...', progress: 10 });

      try {
        const tokenMintPk = new PublicKey(tokenMint);
        const vaultPda = getVaultPda(tokenMintPk);
        if (!vaultPda) throw new Error('Failed to derive vault PDA');

        const tokenAmount = new BN(Math.pow(10, decimals) * amount);

        const withdrawerDepositPda = getDepositPda(wallet.publicKey, tokenMintPk);
        if (!withdrawerDepositPda) throw new Error('Failed to derive deposit PDA');

        const withdrawerDepositAccount = await connection.getAccountInfo(withdrawerDepositPda);
        const isDelegated = withdrawerDepositAccount?.owner.equals(
          new PublicKey(DELEGATION_PROGRAM_ID),
        );

        setStatus({ step: 'Creating session...', progress: 30 });

        // Create session
        const sessionKp = Keypair.generate();
        const sessionManager = new SessionTokenManager(wallet, connection);
        const sessionToken = PublicKey.findProgramAddressSync(
          [
            Buffer.from('session_token'),
            PAYMENTS_PROGRAM.toBuffer(),
            sessionKp.publicKey.toBuffer(),
            wallet.publicKey.toBuffer(),
          ],
          sessionManager.program.programId,
        )[0];

        const createSessionTx = await sessionManager.program.methods
          .createSession(true, null, null)
          .accountsPartial({
            sessionToken,
            sessionSigner: sessionKp.publicKey,
            authority: wallet.publicKey,
            targetProgram: PAYMENTS_PROGRAM,
          })
          .transaction();

        const revokeSessionTx = await sessionManager.program.methods
          .revokeSession()
          .accountsPartial({
            sessionToken,
            authority: wallet.publicKey,
          })
          .transaction();

        let undelegateTx: Transaction | undefined;
        if (isDelegated) {
          setStatus({ step: 'Undelegating from TEE...', progress: 50 });

          const undelegateIx = await ephemeralProgram.methods
            .undelegate()
            .accountsPartial({
              sessionToken,
              payer: sessionKp.publicKey,
              user: wallet.publicKey,
              deposit: withdrawerDepositPda,
            })
            .instruction();

          undelegateTx = new Transaction();
          undelegateTx.add(undelegateIx);
        }

        setStatus({ step: 'Withdrawing tokens...', progress: 70 });

        const withdrawIx = await program.methods
          .modifyBalance({ amount: tokenAmount, increase: false })
          .accountsPartial({
            payer: program.provider.publicKey,
            user: wallet.publicKey,
            vault: vaultPda,
            deposit: withdrawerDepositPda,
            userTokenAccount: getAssociatedTokenAddressSync(
              tokenMintPk,
              wallet.publicKey,
              true,
              TOKEN_PROGRAM_ID,
            ),
            vaultTokenAccount: getAssociatedTokenAddressSync(
              tokenMintPk,
              vaultPda,
              true,
              TOKEN_PROGRAM_ID,
            ),
            tokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();

        const withdrawTx = new Transaction();
        withdrawTx.add(withdrawIx);

        const blockhash = (await connection.getLatestBlockhash()).blockhash;
        const ephemeralBlockhash = (await ephemeralConnection.getLatestBlockhash()).blockhash;

        withdrawTx.recentBlockhash = blockhash;
        withdrawTx.feePayer = program.provider.publicKey;

        let lastSignature = '';

        if (undelegateTx) {
          createSessionTx.recentBlockhash = blockhash;
          createSessionTx.feePayer = program.provider.publicKey;
          createSessionTx.partialSign(sessionKp);

          undelegateTx.recentBlockhash = ephemeralBlockhash;
          undelegateTx.feePayer = sessionKp.publicKey;

          revokeSessionTx.recentBlockhash = blockhash;
          revokeSessionTx.feePayer = program.provider.publicKey;

          undelegateTx.sign(sessionKp);

          setStatus({ step: 'Signing transactions...', progress: 80 });

          const [signedCreateSessionTx, signedWithdrawTx, signedRevokeSessionTx] =
            await wallet.signAllTransactions([createSessionTx, withdrawTx, revokeSessionTx]);

          setStatus({ step: 'Broadcasting...', progress: 90 });

          if (IS_DEV) console.log('Withdraw: Sending createSession transaction...');
          let signature = await connection.sendRawTransaction(signedCreateSessionTx.serialize());
          await connection.confirmTransaction(signature);

          if (IS_DEV) console.log('Withdraw: Sending undelegate transaction to TEE...');
          signature = await ephemeralConnection.sendRawTransaction(undelegateTx.serialize());

          // Wait for confirmation with retry logic
          let confirmed = false;
          for (let i = 0; i < 10; i++) {
            try {
              await ephemeralConnection.confirmTransaction(signature, 'confirmed');
              confirmed = true;
              break;
            } catch (e) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          // Wait for commitment with retry - but don't fail if we can't get it
          let committed = false;
          for (let i = 0; i < 5; i++) {
            try {
              await GetCommitmentSignature(signature, ephemeralConnection);
              committed = true;
              break;
            } catch (e: any) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }

          if (!committed) {
            // Check if the account is still delegated on mainnet
            const checkAccount = await connection.getAccountInfo(withdrawerDepositPda);
            const stillDelegated = checkAccount?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID));
            if (stillDelegated) {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }

          // Give time for state to propagate
          await new Promise(resolve => setTimeout(resolve, 3000));

          if (IS_DEV) console.log('Withdraw: Sending withdraw transaction...');
          signature = await connection.sendRawTransaction(signedWithdrawTx.serialize(), {
            skipPreflight: true,
          });
          await connection.confirmTransaction(signature);

          if (IS_DEV) console.log('Withdraw: Sending revokeSession transaction...');
          signature = await connection.sendRawTransaction(signedRevokeSessionTx.serialize());
          await connection.confirmTransaction(signature);

          lastSignature = signature;
        } else {
          setStatus({ step: 'Signing transaction...', progress: 80 });

          const [signedWithdrawTx] = await wallet.signAllTransactions([withdrawTx]);

          setStatus({ step: 'Broadcasting...', progress: 90 });

          const signature = await connection.sendRawTransaction(signedWithdrawTx.serialize(), {
            skipPreflight: true,
          });
          await connection.confirmTransaction(signature);
          lastSignature = signature;
        }

        setStatus({ step: 'Withdrawal complete!', progress: 100 });

        return lastSignature;
      } finally {
        setIsTransferring(false);
        setTimeout(() => setStatus(null), 2000);
      }
    },
    [wallet, program, connection, getDepositPda, getVaultPda],
  );

  return {
    transfer,
    withdraw,
    isTransferring,
    status,
  };
}
