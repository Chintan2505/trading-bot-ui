import React from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function TradeTable({ logs }) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600">
        <div className="w-12 h-12 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-center mb-3">
          <Minus className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium">No trades yet</p>
        <p className="text-xs text-gray-700 mt-1">Enable auto-trading to see activity here</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-terminal-border">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Trade History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-terminal-border">
              <th className="text-left px-4 py-2.5 font-semibold">Time</th>
              <th className="text-left px-4 py-2.5 font-semibold">Symbol</th>
              <th className="text-left px-4 py-2.5 font-semibold">Side</th>
              <th className="text-right px-4 py-2.5 font-semibold">RSI</th>
              <th className="text-right px-4 py-2.5 font-semibold">Strength</th>
              <th className="text-right px-4 py-2.5 font-semibold">Order ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => {
              const isBuy = log.decision === 'BUY';
              return (
                <tr
                  key={log.id}
                  className={`border-b border-terminal-border/50 transition-colors hover:bg-terminal-hover ${
                    idx === 0 ? 'bg-terminal-card/50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {format(new Date(log.timestamp), 'HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3 font-medium text-white text-xs">
                    {log.symbol || '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                      isBuy
                        ? 'bg-bull/10 text-bull'
                        : 'bg-bear/10 text-bear'
                    }`}>
                      {isBuy
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />
                      }
                      {log.decision}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    <span className={
                      parseFloat(log.rsi) < 30 ? 'text-bull' : parseFloat(log.rsi) > 70 ? 'text-bear' : 'text-gray-400'
                    }>
                      {log.rsi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-sm ${
                            i < (log.strength || 0) ? 'bg-gold' : 'bg-terminal-border'
                          }`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-[10px] text-gray-600 bg-terminal-bg px-1.5 py-0.5 rounded">
                      {log.orderId ? log.orderId.substring(0, 10) : 'N/A'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
