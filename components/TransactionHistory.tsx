import React from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ExternalLink, Inbox } from 'lucide-react';
import { useGhostPay } from '../contexts/GhostPayContext';
import { MOCK_TRANSACTIONS } from '../constants';

export const TransactionHistory: React.FC = () => {
  const { transactions } = useGhostPay();

  // Use real transactions if available, otherwise show mock data for demo
  const displayTransactions = transactions.length > 0 ? transactions : MOCK_TRANSACTIONS;

  if (displayTransactions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-fade-in-up">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Transactions Yet</h3>
        <p className="text-slate-500 max-w-xs text-center">
          Your transaction history will appear here once you send or receive assets.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-display font-bold text-white">History</h2>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
          {transactions.length > 0 ? 'Local Storage' : 'Demo Data'}
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-4 px-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
              <th className="pb-4 pl-4 font-medium">Type</th>
              <th className="pb-4 font-medium">Counterparty</th>
              <th className="pb-4 font-medium">Date</th>
              <th className="pb-4 pr-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {displayTransactions.map((tx) => (
              <tr key={tx.id} className="group hover:bg-white/5 transition-colors cursor-default">
                <td className="py-4 pl-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'send' ? 'bg-white/5 text-slate-300' : 'bg-primary-500/10 text-primary-400'
                    }`}>
                      {tx.type === 'send' && <ArrowUpRight className="w-4 h-4" />}
                      {tx.type === 'receive' && <ArrowDownLeft className="w-4 h-4" />}
                      {tx.type === 'sweep' && <RefreshCw className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="font-medium text-white capitalize">{tx.type}</span>
                      <div className={`text-xs mt-0.5 ${
                        tx.status === 'success' ? 'text-green-500' :
                        tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4">
                  <span className="text-slate-400 text-sm group-hover:text-white transition-colors">
                    {tx.counterparty}
                  </span>
                </td>
                <td className="py-4">
                  <div className="text-sm text-slate-500">
                    {tx.timestamp.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-600">
                    {tx.timestamp.toLocaleTimeString()}
                  </div>
                </td>
                <td className="py-4 pr-4 text-right">
                  <div className={`font-bold font-display ${
                    tx.type === 'send' ? 'text-white' : 'text-primary-400'
                  }`}>
                    {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.tokenSymbol}
                  </div>
                  {tx.txHash && (
                    <a
                      href={`https://explorer.solana.com/tx/${tx.txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-600 hover:text-primary-400 font-mono flex items-center justify-end gap-1 mt-1"
                    >
                      {tx.txHash.length > 20 ? `${tx.txHash.slice(0, 8)}...${tx.txHash.slice(-4)}` : tx.txHash}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionHistory;
