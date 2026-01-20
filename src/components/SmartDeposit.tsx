'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, RefreshCw, Info, CheckCircle } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction } from '@solana/web3.js';
import { 
    createTransferInstruction, 
    getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { Buffer } from 'buffer';

// --- SETTINGS ---
const GHOST_POOL_WALLET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; 

// API ENDPOINTS
const JUPITER_QUOTE_API = '/api/jupiter'; 

const SOL_MINT = 'So11111111111111111111111111111111111111112';
// ✅ FIXED: Official Devnet USDC Address
const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

if (typeof window !== 'undefined') {
    window.Buffer = window.Buffer || Buffer;
}

export default function SmartDeposit() {
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();

  const [selectedToken, setSelectedToken] = useState<'USDC' | 'SOL'>('USDC');
  const [amount, setAmount] = useState<string>('');
  const [estimatedUSDC, setEstimatedUSDC] = useState<string | null>(null);
  const [quoteResponse, setQuoteResponse] = useState<any>(null);
   
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'swapping' | 'depositing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  // 1. PRICE FETCHING
  const fetchJupiterQuote = async (inputAmount: string) => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setEstimatedUSDC(null);
      setQuoteResponse(null);
      return;
    }
    setIsLoading(true);

    try {
      const amountInLamports = Math.floor(parseFloat(inputAmount) * 1_000_000_000);
      
      // Requesting quote from our Mock API
      const response = await axios.get(JUPITER_QUOTE_API, {
        params: {
          inputMint: SOL_MINT,
          outputMint: USDC_MINT,
          amount: amountInLamports,
          slippageBps: 50, 
        },
      });

      const data = response.data;
      
      if (!data || !data.outAmount) {
         throw new Error("Jupiter returned empty data.");
      }

      setQuoteResponse(data);
      const outAmount = data.outAmount;
      setEstimatedUSDC((parseInt(outAmount) / 1_000_000).toFixed(2));

    } catch (error: any) {
      console.error("Price Fetch Error:", error);
      setEstimatedUSDC(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedToken === 'SOL' && amount) fetchJupiterQuote(amount);
    }, 600);
    return () => clearTimeout(timer);
  }, [amount, selectedToken]);

  // 2. TRANSFER FUNCTION (With Balance Checks)
  const executeDepositToPool = async (usdcAmount: string) => {
      if (!publicKey) return;

      try {
          const recipientPubKey = new PublicKey(GHOST_POOL_WALLET);
          const usdcMintPubKey = new PublicKey(USDC_MINT);
          
          // Calculate amount (USDC has 6 decimals)
          const amountInMicroUSDC = Math.floor(parseFloat(usdcAmount) * 1_000_000);

          // Get ATA (Associated Token Accounts)
          const senderATA = await getAssociatedTokenAddress(usdcMintPubKey, publicKey);
          const recipientATA = await getAssociatedTokenAddress(usdcMintPubKey, recipientPubKey);

          // CHECK 1: Sender Balance
          try {
            const senderBalance = await connection.getTokenAccountBalance(senderATA);
            if (!senderBalance.value.uiAmount || senderBalance.value.uiAmount < parseFloat(usdcAmount)) {
                alert(`Insufficient Funds! You do not have enough Devnet USDC.\n\nPlease get some from the Official Solana Faucet.`);
                throw new Error("INSUFFICIENT_FUNDS");
            }
          } catch (e) {
             // If account doesn't exist
             alert("No USDC Account found in your wallet. Please request Devnet USDC first.");
             throw new Error("NO_USDC_ACCOUNT");
          }

          const transaction = new Transaction();

          // CHECK 2: Recipient Account (Create if not exists)
          const recipientInfo = await connection.getAccountInfo(recipientATA);
          if (!recipientInfo) {
              console.log("Recipient account missing, creating...");
              transaction.add(
                createAssociatedTokenAccountInstruction(
                    publicKey, 
                    recipientATA, 
                    recipientPubKey, 
                    usdcMintPubKey 
                )
              );
          }

          // Add Transfer Instruction
          transaction.add(
            createTransferInstruction(
                senderATA, 
                recipientATA, 
                publicKey, 
                amountInMicroUSDC, 
                [], 
                TOKEN_PROGRAM_ID
            )
          );

          // Get latest blockhash for stability
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = publicKey;

          const signature = await sendTransaction(transaction, connection);
          await connection.confirmTransaction(signature, 'confirmed');
          return signature;

      } catch (error: any) {
          console.error("Deposit Error Details:", error);
          if (error.message === "INSUFFICIENT_FUNDS" || error.message === "NO_USDC_ACCOUNT") {
              throw error; 
          }
          throw error;
      }
  };

  // 3. TRANSACTION MANAGER
  const handleSmartDeposit = async () => {
    if (!publicKey) {
        setVisible(true);
        return;
    }

    try {
        // USDC MODE
        if (selectedToken === 'USDC') {
            setStatus('depositing');
            setStatusMsg('Shielding USDC...');
            await executeDepositToPool(amount);
            setStatus('success');
            setStatusMsg('Transaction Successful!');
            return;
        }

        // SOL MODE (Mock Swap)
        if (selectedToken === 'SOL' && quoteResponse) {
            
            // Step 1: Simulate Swap
            setStatus('swapping');
            setStatusMsg('Swapping SOL -> USDC...');

            console.log("Mocking Swap transaction for Devnet...");
            // Simulate waiting time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 2: Execute Deposit
            setStatus('depositing');
            setStatusMsg('Shielding Funds...');
            
            await executeDepositToPool(estimatedUSDC || '0');

            setStatus('success');
            setStatusMsg('Shield Swap Successful!');
        }
    } catch (error) {
        console.error("Transaction Error:", error);
        setStatus('error');
        setStatusMsg('Transaction Failed.');
    } finally {
        if (status !== 'error') setTimeout(() => { setStatus('idle'); setStatusMsg(''); setAmount(''); }, 3000);
    }
  };

  const isButtonDisabled = (!!publicKey && !amount) || isLoading;

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl relative overflow-hidden">
       
      {status !== 'idle' && (
         <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md animate-in fade-in">
            {status === 'success' ? <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-bounce" /> : 
             status === 'error' ? <Info className="w-16 h-16 text-red-500 mb-4" /> : 
             <RefreshCw className="w-16 h-16 text-indigo-500 animate-spin mb-4" />}
            
            <h3 className="text-xl font-bold text-white mb-2">{status === 'swapping' ? 'Swapping Assets...' : statusMsg}</h3>
            {status === 'error' && <button onClick={() => setStatus('idle')} className="mt-4 px-4 py-2 bg-zinc-800 rounded text-white text-sm">Close</button>}
         </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-500" /> Ghost Shield
        </h2>
        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/30 border border-indigo-500/30 px-2 py-1 rounded-full uppercase tracking-wider">
          Privacy Layer
        </span>
      </div>

      <div className="space-y-6">
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button onClick={() => { setSelectedToken('USDC'); setAmount(''); }} className={`flex-1 py-3 text-sm font-medium rounded-lg ${selectedToken === 'USDC' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>USDC</button>
            <button onClick={() => { setSelectedToken('SOL'); setAmount(''); }} className={`flex-1 py-3 text-sm font-medium rounded-lg ${selectedToken === 'SOL' ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}>SOL (Auto-Swap)</button>
        </div>

        <div className="relative">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-5 text-3xl text-white focus:outline-none" />
            <span className="absolute right-4 bottom-5 text-zinc-500 font-bold text-sm">{selectedToken}</span>
        </div>

        {selectedToken === 'SOL' && (
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-400 text-xs">Jupiter Best Price</span>
              <div className="text-white font-bold text-lg font-mono">{isLoading ? "..." : `~${estimatedUSDC || '0.00'} USDC`}</div>
          </div>
        )}

        <button 
            onClick={handleSmartDeposit} 
            disabled={isButtonDisabled} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl mt-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!publicKey ? "Connect Wallet" : (selectedToken === 'SOL' ? 'Shield & Swap' : 'Shield Assets')}
        </button>
      </div>
    </div>
  );
}