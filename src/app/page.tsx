'use client';

import SmartDeposit from '@/components/SmartDeposit';
import { motion, Variants } from 'framer-motion'; 
import { Shield, Ghost, Zap, Lock } from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.3 }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/30 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-600/20 blur-[100px] rounded-full mix-blend-screen"></div>
      </div>

      {/* HEADER */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center border-b border-zinc-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Ghost className="w-6 h-6 text-indigo-500" />
          <span>GhostPay</span>
        </div>
        <div>
             <span className="px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
              Solana Hackathon Submission
            </span>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-32 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* Main Headline */}
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 leading-tight">
            Your <span className="text-indigo-500 inline-block">Invisibility</span> Layer <br />
            on Solana.
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Secure your assets, erase your traces. GhostPay combines Solana's speed with privacy to make your transactions untraceable.
          </motion.p>

          {/* DEMO AREA */}
          <motion.div 
            variants={itemVariants}
            className="mt-16 relative"
          >
             {/* Background Glow */}
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl -z-10 scale-95 rounded-3xl"></div>
            
            <div className="flex justify-center">
                <SmartDeposit />
            </div>
            
            <p className="text-zinc-500 text-sm mt-6 font-mono">
              <Lock className="w-4 h-4 inline-block mr-1 align-text-bottom" />
              Devnet Demo Mode Active. Secure Encrypted Connection.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="relative z-10 container mx-auto px-6 py-24 border-t border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard 
                icon={<Shield className="w-8 h-8 text-indigo-500" />}
                title="Untraceable Transfers"
                desc="Breaks the on-chain link between sender and receiver, ensuring complete financial privacy."
            />
            <FeatureCard 
                icon={<Zap className="w-8 h-8 text-indigo-500" />}
                title="Lightning Fast & Cheap"
                desc="Leveraging Solana's power to execute private transactions in seconds with near-zero fees."
            />
            <FeatureCard 
                icon={<Lock className="w-8 h-8 text-indigo-500" />}
                title="Non-Custodial"
                desc="You always maintain control of your funds. Secure operations via audited smart contracts."
            />
        </div>
      </section>
      
      {/* FOOTER */}
      <footer className="relative z-10 py-8 text-center text-zinc-600 text-sm border-t border-zinc-900">
          <p>© 2024 GhostPay Project. Built for the Solana Ecosystem.</p>
      </footer>

    </main>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <motion.div 
            whileHover={{ y: -5, backgroundColor: "rgba(39, 39, 42, 0.5)" }}
            className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 transition-all duration-300 group"
        >
            <div className="mb-4 p-3 bg-zinc-800/50 rounded-xl inline-block group-hover:bg-indigo-900/30 transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-zinc-400 leading-relaxed">{desc}</p>
        </motion.div>
    )
}