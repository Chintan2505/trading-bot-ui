import React from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const formatPrice = (v) => (typeof v === 'number' ? `$${v.toFixed(2)}` : '--');
const formatPnl = (v) => {
  if (typeof v !== 'number') return '--';
  const sign = v >= 0 ? '+' : '';
  return `${sign}$${v.toFixed(2)}`;
};
const formatPnlPct = (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '');

const STATUS_STYLES = {
  OPEN: 'bg-blue-500/10 text-blue-400',
  CLOSED: 'bg-gray-500/10 text-gray-300',
  FILLED: 'bg-blue-500/10 text-blue-400',
  NEW: 'bg-yellow-500/10 text-yellow-400',
  REJECTED: 'bg-red-500/10 text-red-400',
  CANCELLED: 'bg-gray-500/10 text-gray-400',
};

const EXIT_REASON_LABEL = {
  TP_HIT: 'TP',
  SL_HIT: 'SL',
  MAX_HOLD: 'TIME',
  MANUAL: 'MAN',
  REVERSE_SIGNAL: 'REV',
  BREAK_EVEN: 'BE',
};

const EXECUTED_BY_STYLES = {
  ai: 'bg-blue-500/10 text-blue-400',
  manual: 'bg-gray-500/10 text-gray-400',
};

const EXECUTED_BY_LABEL = {
  ai: '🤖 AI',
  manual: '🧪 TEST',
};

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
              <th className="text-left px-3 py-2.5 font-semibold">Date & Time</th>
              <th className="text-left px-3 py-2.5 font-semibold">Symbol</th>
              <th className="text-left px-3 py-2.5 font-semibold">Side</th>
              <th className="text-center px-3 py-2.5 font-semibold">Source</th>
              <th className="text-right px-3 py-2.5 font-semibold">Entry</th>
              <th className="text-right px-3 py-2.5 font-semibold">Exit</th>
              <th className="text-right px-3 py-2.5 font-semibold">P&amp;L</th>
              <th className="text-center px-3 py-2.5 font-semibold">Status</th>
              <th className="text-right px-3 py-2.5 font-semibold">Order ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => {
              const isBuy = log.decision === 'BUY';
              const status = log.status || 'OPEN';
              const isClosed = status === 'CLOSED';
              const pnlPositive = (log.pnl ?? 0) >= 0;
              const exitTag = log.exitReason ? EXIT_REASON_LABEL[log.exitReason] : null;

              return (
                <tr
                  key={log.id}
                  className={`border-b border-terminal-border/50 transition-colors hover:bg-terminal-hover ${
                    idx === 0 ? 'bg-terminal-card/50' : ''
                  }`}
                >
                  <td className="px-3 py-3 font-mono text-xs text-gray-400">
                    <div>{format(new Date(log.timestamp), 'dd MMM yyyy')}</div>
                    <div className="text-[10px] text-gray-600">{format(new Date(log.timestamp), 'HH:mm:ss')}</div>
                  </td>
                  <td className="px-3 py-3 font-medium text-white text-xs">
                    {log.symbol || '--'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                      isBuy ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
                    }`}>
                      {isBuy
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />
                      }
                      {log.decision}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${EXECUTED_BY_STYLES[log.executedBy] || 'bg-gray-500/10 text-gray-400'}`}>
                      {EXECUTED_BY_LABEL[log.executedBy] || log.executedBy || 'TEST'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-gray-300">
                    {formatPrice(log.entryPrice)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-gray-300">
                    {isClosed ? formatPrice(log.exitPrice) : <span className="text-gray-600">--</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">
                    {isClosed ? (
                      <div className="flex flex-col items-end">
                        <span className={pnlPositive ? 'text-bull font-semibold' : 'text-bear font-semibold'}>
                          {formatPnl(log.pnl)}
                        </span>
                        <span className={`text-[10px] ${pnlPositive ? 'text-bull/70' : 'text-bear/70'}`}>
                          {formatPnlPct(log.pnlPct)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600">--</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[status] || 'bg-gray-500/10 text-gray-400'}`}>
                        {status}
                      </span>
                      {exitTag && (
                        <span className="text-[9px] text-gray-500 font-mono">{exitTag}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
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
