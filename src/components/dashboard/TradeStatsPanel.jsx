import React, { useState } from 'react';

const fmt = (v) => (typeof v === 'number' ? (v >= 0 ? `+$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`) : '--');
const fmtPct = (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '--');
const pnlColor = (v) => (typeof v === 'number' ? (v >= 0 ? 'text-bull' : 'text-bear') : 'text-gray-500');

const PERIODS = ['today', 'last7Days', 'last30Days', 'allTime'];
const PERIOD_LABELS = { today: 'Today', last7Days: '7 Days', last30Days: '30 Days', allTime: 'All Time' };

export default function TradeStatsPanel({ stats }) {
  const [period, setPeriod] = useState('today');

  if (!stats) return null;

  const s = stats[period];
  if (!s) return null;

  return (
    <div className="space-y-3">
      {/* Period tabs */}
      <div className="flex rounded-lg overflow-hidden border border-terminal-border">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase transition-all ${
              period === p
                ? 'bg-gold/20 text-gold'
                : 'bg-terminal-bg text-gray-500 hover:text-gray-300'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Main P&L */}
      <div className="p-3 rounded-lg bg-terminal-bg border border-terminal-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Net P&L</span>
          <span className={`text-lg font-bold font-mono ${pnlColor(s.totalPnl)}`}>
            {fmt(s.totalPnl)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[9px] text-gray-500">Win Rate</div>
            <div className={`text-sm font-bold font-mono ${s.winRate >= 50 ? 'text-bull' : 'text-bear'}`}>
              {fmtPct(s.winRate)}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">Trades</div>
            <div className="text-sm font-bold font-mono text-white">
              {s.total}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">W / L</div>
            <div className="text-sm font-mono">
              <span className="text-bull font-bold">{s.wins}</span>
              <span className="text-gray-600"> / </span>
              <span className="text-bear font-bold">{s.losses}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
          <div className="text-[8px] text-gray-500 uppercase">Best Trade</div>
          <div className={`text-xs font-bold font-mono ${pnlColor(s.bestPnl)}`}>{fmt(s.bestPnl)}</div>
        </div>
        <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
          <div className="text-[8px] text-gray-500 uppercase">Worst Trade</div>
          <div className={`text-xs font-bold font-mono ${pnlColor(s.worstPnl)}`}>{fmt(s.worstPnl)}</div>
        </div>
        <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
          <div className="text-[8px] text-gray-500 uppercase">Avg P&L</div>
          <div className={`text-xs font-bold font-mono ${pnlColor(s.avgPnl)}`}>{fmt(s.avgPnl)}</div>
        </div>
        <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
          <div className="text-[8px] text-gray-500 uppercase">Open Now</div>
          <div className="text-xs font-bold font-mono text-white">{stats.openTrades ?? 0}</div>
        </div>
      </div>

      {/* AI vs ALGO accuracy */}
      {(s.aiTrades > 0 || s.algoTrades > 0) && (
        <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
          <div className="text-[9px] text-gray-500 uppercase font-semibold mb-1.5">Accuracy by Mode</div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {s.algoTrades > 0 && (
              <div>
                <div className="text-[8px] text-gold">📊 ALGO</div>
                <div className={`text-xs font-bold font-mono ${s.algoWinRate >= 50 ? 'text-bull' : 'text-bear'}`}>
                  {fmtPct(s.algoWinRate)}
                </div>
                <div className="text-[8px] text-gray-600">{s.algoTrades} trades</div>
              </div>
            )}
            {s.aiTrades > 0 && (
              <div>
                <div className="text-[8px] text-blue-400">🤖 AI</div>
                <div className={`text-xs font-bold font-mono ${s.aiWinRate >= 50 ? 'text-bull' : 'text-bear'}`}>
                  {fmtPct(s.aiWinRate)}
                </div>
                <div className="text-[8px] text-gray-600">{s.aiTrades} trades</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exit breakdown */}
      {stats.exitBreakdown && (
        <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
          <div className="text-[9px] text-gray-500 uppercase font-semibold mb-1.5">How Trades Closed</div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'TP_HIT', label: 'TP', color: 'text-bull bg-bull/10' },
              { key: 'SL_HIT', label: 'SL', color: 'text-bear bg-bear/10' },
              { key: 'BREAK_EVEN', label: 'BE', color: 'text-yellow-400 bg-yellow-400/10' },
              { key: 'MANUAL', label: 'Manual', color: 'text-gray-400 bg-gray-400/10' },
              { key: 'MAX_HOLD', label: 'Time', color: 'text-gray-400 bg-gray-400/10' },
            ].map(({ key, label, color }) => {
              const count = stats.exitBreakdown[key] || 0;
              if (count === 0) return null;
              return (
                <span key={key} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${color}`}>
                  {label}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
