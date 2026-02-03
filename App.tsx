import React, { useState, useEffect } from 'react';
import { Ghost, Send, Download, Settings, History, ArrowRight, Shield, Zap } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect } from './components/WalletConnect';
import { SendForm } from './components/SendForm';
import { ReceiveSection } from './components/ReceiveSection';
import { TransactionHistory } from './components/TransactionHistory';
import { AppView } from './types';

const App: React.FC = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const [currentView, setCurrentView] = useState<AppView>(AppView.SEND);
  const [scrolled, setScrolled] = useState(false);

  // Effect for header blur on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDisconnect = () => {
    disconnect();
  };

  const navItems = [
    { id: AppView.SEND, label: 'Transfer', icon: Send },
    { id: AppView.RECEIVE, label: 'Registry', icon: Download },
    { id: AppView.HISTORY, label: 'Ledger', icon: History },
    { id: AppView.SETTINGS, label: 'Config', icon: Settings },
  ];

  // Derive ghost handle from public key
  const ghostHandle = publicKey
    ? `ghost_${publicKey.toBase58().slice(0, 6).toLowerCase()}`
    : 'ghost_anon';

  // Derive stealth meta address placeholder
  const stealthMetaAddress = publicKey
    ? `st_sol_${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-6)}`
    : 'st_sol_...';

  return (
    <div className="min-h-screen relative text-slate-200 font-sans selection:bg-primary-500/30 selection:text-white overflow-hidden">

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1]">
        {/* Deep Gradient Base */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[#090312] to-[#020005]"></div>

        {/* Animated Aurora Blobs - Adjusted for Purple Theme */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-accent-pink/10 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || connected ? 'bg-background/80 backdrop-blur-xl border-b border-white/5 py-3' : 'py-6 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

          {/* Enhanced Logo */}
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setCurrentView(AppView.SEND)}>
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity duration-500"></div>
              <div className="relative w-11 h-11 bg-gradient-to-br from-surface to-black border border-white/10 rounded-full flex items-center justify-center shadow-inner">
                <Ghost className="w-5 h-5 text-primary-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-display font-bold text-xl tracking-wide text-white leading-none">
                GHOST
              </span>
              <span className="text-[9px] font-mono tracking-[0.3em] text-primary-400 uppercase opacity-80 group-hover:tracking-[0.4em] transition-all">
                Protocol
              </span>
            </div>
          </div>

          <WalletConnect
            isConnected={connected}
            address={publicKey?.toBase58() || ''}
            onConnect={() => {}}
            onDisconnect={handleDisconnect}
          />
        </div>
      </header>

      {/* Content */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex flex-col">
        {!connected ? (
          /* Hero Landing Section */
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto animate-fade-in-up">

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs font-medium text-primary-300 mb-8 backdrop-blur-md animate-float shadow-[0_0_15px_-5px_rgba(139,92,246,0.4)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              Live on Solana Devnet
            </div>

            <h1 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 mb-8 leading-[1.1]">
              The Invisible Layer <br /> of Solana.
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
              Send and receive assets privately with stealth addresses.
              Powered by MagicBlock's Private Ephemeral Rollups (PERs) and Intel TDX.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <WalletConnect
                isConnected={false}
                address=""
                onConnect={() => {}}
                onDisconnect={() => {}}
              />
            </div>

            {/* Feature Grid for Landing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full">
              {[
                { icon: Shield, title: "Stealth Addresses", desc: "One-time addresses derived for every transaction." },
                { icon: Zap, title: "TEE Privacy", desc: "MagicBlock PERs with Intel TDX encryption." },
                { icon: Settings, title: "Non-Custodial", desc: "You own your keys. You own your privacy." }
              ].map((feature, i) => (
                <div key={i} className="glass-card p-6 rounded-2xl text-left border-t border-white/5 hover:border-primary-500/30 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/0 to-transparent group-hover:via-primary-500/50 transition-all duration-700"></div>
                  <feature.icon className="w-8 h-8 text-primary-500 mb-4 group-hover:scale-110 group-hover:text-primary-400 transition-all duration-500" />
                  <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

          </div>
        ) : (
          /* Dashboard Layout */
          <div className="flex-1 flex flex-col md:flex-row gap-8 animate-fade-in-up">

            {/* Sidebar / Navigation */}
            <aside className="w-full md:w-64 flex flex-col gap-4">
              {/* User Card */}
              <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-2">My Ghost Identity</div>
                  <div className="font-display font-bold text-white text-lg">@{ghostHandle}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-1">{stealthMetaAddress}</div>
                </div>
              </div>

              {/* Nav Buttons */}
              <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`flex items-center gap-3 px-5 py-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group shrink-0 md:w-full ${
                      currentView === item.id
                        ? 'bg-white text-black shadow-[0_0_20px_-5px_rgba(139,92,246,0.4)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-black' : 'text-slate-400 group-hover:text-white'}`} />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              <div className="glass-card rounded-3xl p-1 min-h-[600px] border border-white/5 shadow-[0_0_50px_-20px_rgba(0,0,0,0.5)]">
                <div className="bg-[#0c0514]/80 backdrop-blur-md rounded-[20px] w-full h-full p-6 md:p-10 relative">
                  {currentView === AppView.SEND && <SendForm />}
                  {currentView === AppView.RECEIVE && <ReceiveSection />}
                  {currentView === AppView.HISTORY && <TransactionHistory />}
                  {currentView === AppView.SETTINGS && (
                    <div className="max-w-xl mx-auto space-y-8 animate-fade-in-up">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Protocol Configuration</h2>
                        <p className="text-slate-400 text-sm">Manage your encryption keys and visibility.</p>
                      </div>
                      <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary-500/20 transition-colors">
                          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Connected Wallet</label>
                          <div className="font-mono text-primary-400 text-sm break-all">{publicKey?.toBase58()}</div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary-500/20 transition-colors">
                          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Network</label>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-white font-medium">Devnet</span>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary-500/20 transition-colors">
                          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Ghost Handle</label>
                          <div className="font-mono text-white">@{ghostHandle}</div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary-500/20 transition-colors">
                          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Stealth Meta-Address</label>
                          <div className="font-mono text-xs text-primary-400 break-all">{stealthMetaAddress}</div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary-500/20 transition-colors">
                          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Privacy Engine</label>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                            <span className="text-white font-medium">MagicBlock PERs + Intel TDX</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

    </div>
  );
};

export default App;
