// src/app/page.tsx
"use client";

import { useState } from 'react';
import * as web3 from '@solana/web3.js';
import { getSharedSecret, deriveStealthKeypair } from '../utils/ghostCrypto'; 
import bs58 from 'bs58'; 
import { Toaster, toast } from 'react-hot-toast';
import { Shield, Ghost, ArrowRight, Lock, Key, Wallet, Eye, EyeOff, Sparkles, Copy, CheckCircle } from 'lucide-react';

const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

export default function Home() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [loading, setLoading] = useState(false);

  // States
  const [recipientPubkey, setRecipientPubkey] = useState('');
  const [amount, setAmount] = useState('');
  const [generatedData, setGeneratedData] = useState<{ ephemeralKey: string, stealthPub: string } | null>(null);
  const [ephemeralKeyInput, setEphemeralKeyInput] = useState('');
  const [receiverPrivateKey, setReceiverPrivateKey] = useState('');
  const [stealthFound, setStealthFound] = useState<{ balance: number, stealthKey: web3.Keypair } | null>(null);
  const [showKey, setShowKey] = useState(false);

  // --- Logic remains the same ---
  const handleSend = async () => {
    if (!recipientPubkey || !amount) return toast.error("Please fill in all fields.");
    setLoading(true);
    try {
      const solanaEphemeralKeypair = web3.Keypair.generate();
      const bobPubBytes = bs58.decode(recipientPubkey);
      const sharedSecret = getSharedSecret(solanaEphemeralKeypair.secretKey, bobPubBytes);
      if (!sharedSecret) throw new Error("Invalid recipient address.");
      const stealthKeypair = deriveStealthKeypair(sharedSecret);
      setGeneratedData({
        ephemeralKey: bs58.encode(solanaEphemeralKeypair.publicKey.toBytes()),
        stealthPub: stealthKeypair.publicKey.toBase58()
      });
      toast.success("Stealth Address Generated!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!ephemeralKeyInput || !receiverPrivateKey) return toast.error("Missing credentials.");
    setLoading(true);
    try {
      const bobPrivBytes = bs58.decode(receiverPrivateKey);
      const ephemPubBytes = bs58.decode(ephemeralKeyInput);
      const sharedSecret = getSharedSecret(bobPrivBytes, ephemPubBytes);
      if (!sharedSecret) throw new Error("Key mismatch.");
      const stealthKeypair = deriveStealthKeypair(sharedSecret);
      const balance = await connection.getBalance(stealthKeypair.publicKey);
      if (balance > 0) {
        setStealthFound({ balance: balance / web3.LAMPORTS_PER_SOL, stealthKey: stealthKeypair });
        toast.success(`Found ${balance / web3.LAMPORTS_PER_SOL} SOL!`);
      } else {
        toast.error("No funds found (0 SOL).");
        setStealthFound(null);
      }
    } catch (error: any) {
      toast.error(error.message);
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
        toast.success(`Funds swept successfully!`);
        console.log("Tx:", signature);
        setStealthFound(null);
    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setLoading(false);
    }
  };

  // --- UI COMPONENTS ---
  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-slate-300 flex flex-col">
      <Toaster position="bottom-center" toastOptions={{ style: { background: 'rgba(0,0,0,0.8)', color: '#fff', border: '1px solid #333', backdropFilter: 'blur(10px)' } }} />
      
      {/* Background Ambience */}
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      {/* Navbar */}
      <nav className="w-full z-50 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer">
            {/* V4 DÜZELTME: bg-linear-to-tr */}
            <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-500/20 to-purple-500/20 border border-white/10 group-hover:border-indigo-500/50 transition-all duration-500">
              <Ghost className="text-indigo-400 w-6 h-6 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">GHOST PAY</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">Privacy Protocol</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <a href="https://github.com/MezonQuark47/Ghost-Pay" target="_blank" className="text-sm text-gray-400 hover:text-white transition-colors tracking-wide">Documentation</a>
             <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs font-mono text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Devnet Active
             </div>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="grow flex items-center justify-center py-20 px-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Hero Text */}
          <div className="space-y-8 animate-in slide-in-from-left duration-700 fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Solana Hackathon 2026
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight">
              Privacy is <br />
              {/* V4 DÜZELTME: bg-linear-to-r ve bg-size */}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-size-[200%_auto] animate-pulse">Luxury.</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              Experience the next generation of anonymous payments. 
              Mathematical secrecy meets elegant design on the Solana blockchain.
            </p>
            
            <div className="flex items-center gap-8 pt-4">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">0s</span>
                <span className="text-xs text-gray-500 uppercase tracking-widest">Latency</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">100%</span>
                <span className="text-xs text-gray-500 uppercase tracking-widest">Anonymity</span>
              </div>
            </div>
          </div>

          {/* Right Side: The Interactive Card */}
          <div className="relative">
             {/* Decorative Elements behind card */}
             {/* V4 DÜZELTME: bg-linear-to-r */}
             <div className="absolute -inset-1 bg-linear-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-20" />
             
             <div className="glass-panel relative rounded-[1.5rem] p-1 overflow-hidden backdrop-blur-2xl">
                {/* Tab Switcher */}
                <div className="flex p-1 bg-black/40 rounded-t-[1.3rem]">
                  <button 
                    onClick={() => setActiveTab('send')}
                    className={`flex-1 py-4 text-sm font-medium rounded-xl transition-all duration-300 ${activeTab === 'send' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                  >
                    Send
                  </button>
                  <button 
                    onClick={() => setActiveTab('receive')}
                    className={`flex-1 py-4 text-sm font-medium rounded-xl transition-all duration-300 ${activeTab === 'receive' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                  >
                    Receive
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {activeTab === 'send' ? (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-indigo-300 font-semibold pl-1">Recipient Public Key</label>
                        <div className="relative">
                          <input 
                            value={recipientPubkey}
                            onChange={(e) => setRecipientPubkey(e.target.value)}
                            className="w-full glass-input rounded-xl px-4 py-4 text-white text-sm font-mono placeholder:text-gray-600 focus:outline-none"
                            placeholder="Solana Address..."
                          />
                          <Wallet className="absolute right-4 top-4 text-gray-600 w-4 h-4" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-indigo-300 font-semibold pl-1">Amount</label>
                        <input 
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full glass-input rounded-xl px-4 py-4 text-white text-sm font-mono placeholder:text-gray-600 focus:outline-none"
                          placeholder="0.00 SOL"
                        />
                      </div>

                      <button 
                        onClick={handleSend}
                        disabled={loading}
                        /* V4 DÜZELTME: bg-linear-to-r */
                        className="w-full bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                      >
                        {loading ? <span className="animate-pulse">Processing...</span> : <>Generate Stealth Transfer <ArrowRight className="w-4 h-4" /></>}
                      </button>

                      {generatedData && (
                        <div className="mt-4 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-4">
                          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider border-b border-white/5 pb-2">
                            <Shield className="w-3 h-3" /> Secure Payload Ready
                          </div>
                          
                          <div className="space-y-3">
                             <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                    <span>EPHEMERAL KEY (Safe to share)</span>
                                    <button onClick={() => {navigator.clipboard.writeText(generatedData.ephemeralKey); toast.success("Copied")}} className="hover:text-white"><Copy className="w-3 h-3" /></button>
                                </div>
                                <div className="bg-black/50 p-3 rounded-lg text-[10px] font-mono text-gray-300 break-all border border-white/5">
                                    {generatedData.ephemeralKey}
                                </div>
                             </div>
                             <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                    <span>STEALTH ADDRESS (Destination)</span>
                                    <button onClick={() => {navigator.clipboard.writeText(generatedData.stealthPub); toast.success("Copied")}} className="hover:text-white"><Copy className="w-3 h-3" /></button>
                                </div>
                                <div className="bg-black/50 p-3 rounded-lg text-[10px] font-mono text-emerald-400/80 break-all border border-emerald-500/10">
                                    {generatedData.stealthPub}
                                </div>
                             </div>
                          </div>
                          <p className="text-center text-[10px] text-indigo-200/60">
                             Send <span className="text-white">{amount} SOL</span> to the address above manually.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                       <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-3">
                          {/* V4 DÜZELTME: shrink-0 */}
                          <Lock className="w-4 h-4 text-orange-400/70 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-orange-200/60 leading-relaxed">
                            <strong>Client-Side Decryption:</strong> Your private key never leaves this browser. Used locally to derive the stealth secret.
                          </p>
                       </div>

                       <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-purple-300 font-semibold pl-1">Ephemeral Key</label>
                        <input 
                          value={ephemeralKeyInput}
                          onChange={(e) => setEphemeralKeyInput(e.target.value)}
                          className="w-full glass-input rounded-xl px-4 py-4 text-white text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
                          placeholder="Paste key from sender..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-purple-300 font-semibold pl-1">Private Key</label>
                        <div className="relative">
                            <input 
                            type={showKey ? "text" : "password"}
                            value={receiverPrivateKey}
                            onChange={(e) => setReceiverPrivateKey(e.target.value)}
                            className="w-full glass-input rounded-xl px-4 py-4 text-white text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
                            placeholder="Your Main Wallet Key..."
                            />
                            <button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-4 text-gray-500 hover:text-white">
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                      </div>

                      <button 
                        onClick={handleScan}
                        disabled={loading}
                        /* V4 DÜZELTME: bg-linear-to-r */
                        className="w-full bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-purple-500/25"
                      >
                         {loading ? 'Scanning Blockchain...' : 'Locate Ghost Funds'}
                      </button>

                      {stealthFound && (
                        <div className="mt-4 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-4 animate-in zoom-in">
                            <div className="w-12 h-12 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">{stealthFound.balance} SOL</h3>
                                <p className="text-xs text-emerald-400/70 uppercase tracking-widest">Unclaimed Balance</p>
                            </div>
                            <button 
                                onClick={handleWithdraw}
                                className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-colors"
                            >
                                Sweep to Wallet
                            </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}