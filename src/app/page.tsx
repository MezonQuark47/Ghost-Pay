// src/app/page.tsx
"use client";

import { useState } from 'react';
import * as web3 from '@solana/web3.js';
// Make sure this path is correct based on your folder structure
import { getSharedSecret, deriveStealthKeypair } from '../utils/ghostCrypto'; 
import * as nacl from 'tweetnacl';
import bs58 from 'bs58'; 
import { Toaster, toast } from 'react-hot-toast';
import { Shield, Ghost, ArrowRight, Lock, Key, Wallet, Eye, EyeOff } from 'lucide-react';

// Solana Devnet Connection
const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

export default function Home() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [loading, setLoading] = useState(false);

  // Send States
  const [recipientPubkey, setRecipientPubkey] = useState('');
  const [amount, setAmount] = useState('');
  const [generatedData, setGeneratedData] = useState<{ ephemeralKey: string, stealthPub: string } | null>(null);

  // Receive States
  const [ephemeralKeyInput, setEphemeralKeyInput] = useState('');
  const [receiverPrivateKey, setReceiverPrivateKey] = useState('');
  const [stealthFound, setStealthFound] = useState<{ balance: number, stealthKey: web3.Keypair } | null>(null);
  const [showKey, setShowKey] = useState(false);

  // --- ALICE: SEND FUNCTION ---
  const handleSend = async () => {
    if (!recipientPubkey || !amount) return toast.error("Please fill in all fields.");
    setLoading(true);

    try {
      const solanaEphemeralKeypair = web3.Keypair.generate();
      
      const bobPubBytes = bs58.decode(recipientPubkey);
      const sharedSecret = getSharedSecret(solanaEphemeralKeypair.secretKey, bobPubBytes);
      
      if (!sharedSecret) throw new Error("Failed to generate Shared Secret. Invalid recipient address.");

      const stealthKeypair = deriveStealthKeypair(sharedSecret);
      const stealthPubkey = stealthKeypair.publicKey;
      
      setGeneratedData({
        ephemeralKey: bs58.encode(solanaEphemeralKeypair.publicKey.toBytes()),
        stealthPub: stealthPubkey.toBase58()
      });

      toast.success("Stealth Address Generated!");

    } catch (error: any) {
      console.error(error);
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- BOB: SCAN & WITHDRAW FUNCTION ---
  const handleScan = async () => {
    if (!ephemeralKeyInput || !receiverPrivateKey) return toast.error("Missing information.");
    setLoading(true);

    try {
      const bobPrivBytes = bs58.decode(receiverPrivateKey);
      const ephemPubBytes = bs58.decode(ephemeralKeyInput);
      
      const sharedSecret = getSharedSecret(bobPrivBytes, ephemPubBytes);
      if (!sharedSecret) throw new Error("Keys do not match.");

      const stealthKeypair = deriveStealthKeypair(sharedSecret);
      
      const balance = await connection.getBalance(stealthKeypair.publicKey);
      
      if (balance > 0) {
        setStealthFound({ balance: balance / web3.LAMPORTS_PER_SOL, stealthKey: stealthKeypair });
        toast.success(`Found ${balance / web3.LAMPORTS_PER_SOL} SOL in the Ghost Vault!`);
      } else {
        toast.error("No balance found at this address (0 SOL).");
        setStealthFound(null);
      }

    } catch (error: any) {
      toast.error("Scan error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!stealthFound || !receiverPrivateKey) return;
    setLoading(true);
    try {
        const bobKeypair = web3.Keypair.fromSecretKey(bs58.decode(receiverPrivateKey));
        
        const transaction = new web3.Transaction().add(
            web3.SystemProgram.transfer({
                fromPubkey: stealthFound.stealthKey.publicKey,
                toPubkey: bobKeypair.publicKey,
                lamports: (stealthFound.balance * web3.LAMPORTS_PER_SOL) - 5000, 
            })
        );

        const signature = await web3.sendAndConfirmTransaction(connection, transaction, [stealthFound.stealthKey]);
        
        toast.success(`Funds successfully swept!`, { duration: 5000 });
        console.log("Tx:", signature);
        setStealthFound(null);
    } catch (error: any) {
        toast.error("Withdrawal error: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-200 font-sans selection:bg-indigo-500/30 flex flex-col">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#171717', color: '#fff', border: '1px solid #333' } }} />
      
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Ghost className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Ghost Pay</span>
          </div>
          <div className="flex items-center gap-4">
             <a href="https://github.com/MezonQuark47/Ghost-Pay" target="_blank" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">GitHub</a>
             <div className="text-xs font-mono text-indigo-400 bg-indigo-950/30 px-3 py-1 rounded-full border border-indigo-500/20">
                Devnet v1.0
             </div>
          </div>
        </div>
      </nav>

      <main className="grow max-w-3xl mx-auto w-full px-6 py-12">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-extrabold text-white tracking-tight">
            Invisible <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-500">Payments</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed">
            Transfer funds on Solana without a trace. A mathematical privacy layer.
          </p>
        </div>

        <div className="bg-neutral-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl ring-1 ring-white/5">
          <div className="flex border-b border-white/5 bg-black/20">
            <button 
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-5 text-sm font-medium transition-all ${activeTab === 'send' ? 'bg-white/5 text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              Send (Alice)
            </button>
            <button 
              onClick={() => setActiveTab('receive')}
              className={`flex-1 py-5 text-sm font-medium transition-all ${activeTab === 'receive' ? 'bg-white/5 text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              Withdraw (Bob)
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'send' ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <label className="text-xs text-indigo-400 font-mono font-bold tracking-wider">RECIPIENT (PUBLIC KEY)</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={recipientPubkey}
                      onChange={(e) => setRecipientPubkey(e.target.value)}
                      placeholder="Recipient's wallet address..." 
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm group-hover:border-white/20"
                    />
                    <Wallet className="absolute right-4 top-4 text-gray-600 w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-indigo-400 font-mono font-bold tracking-wider">AMOUNT (SOL)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0" 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono text-sm hover:border-white/20"
                  />
                </div>

                <button 
                  onClick={handleSend}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-[0.98]"
                >
                  {loading ? 'Processing...' : <>Initiate Ghost Transfer <ArrowRight className="w-5 h-5" /></>}
                </button>

                {generatedData && (
                  <div className="mt-8 p-6 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-5 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-indigo-400 border-b border-indigo-500/20 pb-3">
                      <Shield className="w-5 h-5" /> 
                      <h3 className="font-bold">Transaction Ready</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] text-indigo-300 font-mono uppercase tracking-widest">Ephemeral Key (Share with Bob)</p>
                        <span className="text-[10px] text-gray-500 cursor-pointer hover:text-white" onClick={() => {navigator.clipboard.writeText(generatedData.ephemeralKey); toast.success("Copied!")}}>COPY</span>
                      </div>
                      <div className="bg-black/60 p-4 rounded-lg border border-indigo-500/10 font-mono text-xs break-all text-gray-300 select-all">
                        {generatedData.ephemeralKey}
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between items-end">
                        <p className="text-[10px] text-green-400 font-mono uppercase tracking-widest">Stealth Address (Send Funds Here)</p>
                        <span className="text-[10px] text-gray-500 cursor-pointer hover:text-white" onClick={() => {navigator.clipboard.writeText(generatedData.stealthPub); toast.success("Copied!")}}>COPY</span>
                      </div>
                      <div className="bg-black/60 p-4 rounded-lg border border-green-500/10 font-mono text-xs break-all text-green-100/70 select-all">
                        {generatedData.stealthPub}
                      </div>
                      <p className="text-xs text-center text-gray-500 mt-2">Please send <span className="text-white font-bold">{amount} SOL</span> from your wallet to the Stealth Address above.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-yellow-900/10 border border-yellow-600/20 p-4 rounded-xl flex items-start gap-3">
                    <Lock className="w-5 h-5 text-yellow-600/80 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-500/70 leading-relaxed">
                      Hackathon Demo: Private Key is required for client-side decryption. Do not use your main wallet.
                    </p>
                 </div>

                 <div className="space-y-2">
                  <label className="text-xs text-purple-400 font-mono font-bold tracking-wider">EPHEMERAL KEY</label>
                  <input 
                    type="text" 
                    value={ephemeralKeyInput}
                    onChange={(e) => setEphemeralKeyInput(e.target.value)}
                    placeholder="Key received from Alice..." 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-purple-500 transition-all font-mono text-sm hover:border-white/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-purple-400 font-mono font-bold tracking-wider">PRIVATE KEY (Base58)</label>
                  <div className="relative group">
                    <input 
                      type={showKey ? "text" : "password"}
                      value={receiverPrivateKey}
                      onChange={(e) => setReceiverPrivateKey(e.target.value)}
                      placeholder="Ex: 5M..." 
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-purple-500 transition-all font-mono text-sm group-hover:border-white/20"
                    />
                    <button 
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-4 top-4 text-gray-600 hover:text-white transition-colors"
                    >
                        {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleScan}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 active:scale-[0.98]"
                >
                  {loading ? 'Scanning...' : 'Scan for Ghost Vault'}
                </button>

                {stealthFound && (
                   <div className="mt-8 p-6 bg-green-950/20 border border-green-500/20 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <h3 className="text-green-400 font-bold">Balance Found</h3>
                        </div>
                        <span className="text-2xl font-mono text-white tracking-tighter">{stealthFound.balance} <span className="text-sm text-gray-500">SOL</span></span>
                     </div>
                     
                     <button 
                      onClick={handleWithdraw}
                      disabled={loading}
                      className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 active:scale-[0.98]"
                     >
                        Sweep to Main Wallet
                     </button>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <footer className="mt-12 text-center space-y-2">
          <p className="text-gray-600 text-sm">Ghost Pay Protocol © 2026</p>
          <p className="text-xs text-gray-700 font-mono">Built for Solana Hackathon</p>
        </footer>
      </main>
    </div>
  );
}