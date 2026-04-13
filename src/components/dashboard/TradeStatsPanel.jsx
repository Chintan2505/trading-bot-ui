import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Trophy, Target, Shield,
  BarChart3, Crosshair, Clock, Zap, AlertTriangle,
} from 'lucide-react';

const fmt = (v) => (typeof v === 'number' ? (v >= 0 ? `+$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`) : '$0.00');
const fmtPct = (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '0.0%');
const pnlColor = (v) => (typeof v === 'number' && v > 0 ? 'text-bull' : typeof v === 'number' && v < 0 ? 'text-bear' : 'text-gray-500');
const pnlBg = (v) => (typeof v === 'number' && v > 0 ? 'bg-bull/5 border-bull/20' : typeof v === 'number' && v < 0 ? 'bg-bear/5 border-bear/20' : 'bg-terminal-bg border-terminal-border');

const PERIODS = ['today', 'last7Days', 'last30Days', 'allTime'];
const PERIOD_LABELS = { today: 'Today', last7Days: '7 Days', last30Days: '30 Days', allTime: 'All Time' };

const StatCard = ({ icon: Icon, label, value, valueClass, subValue, iconColor = 'text-gray-500' }) => (
  <div className="p-2.5 rounded-lg bg-terminal-bg/80 border border-terminal-border hover:border-terminal-border/80 transition-colors">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={`w-3 h-3 ${iconColor}`} />
      <span className="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">{label}</span>
    </div>
    <div className={`text-sm font-bold font-mono ${valueClass || 'text-white'}`}>{value}</div>
    {subValue && <div className="text-[9px] text-gray-600 font-mono mt-0.5">{subValue}</div>}
  </div>
);

export default function TradeStatsPanel({ stats }) {
  const [period, setPeriod] = useState('today');

  if (!stats) return null;
  const s = stats[period];
  if (!s) return null;

  const winRate = s.winRate ?? 0;
  const winRateColor = winRate >= 60 ? 'text-bull' : winRate >= 40 ? 'text-yellow-400' : 'text-bear';

  return (
    <div className="space-y-2.5">
      {/* Period tabs */}
      <div className="flex rounded-lg overflow-hidden border border-terminal-border">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wide transition-all ${
              period === p
                ? 'bg-gold/15 text-gold border-b-2 border-gold'
                : 'bg-terminal-bg text-gray-600 hover:text-gray-400 hover:bg-terminal-card/50'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Net P&L Hero Card */}
      <div className={`p-3 rounded-xl border ${pnlBg(s.totalPnl)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(s.totalPnl ?? 0) >= 0
              ? <div className="w-8 h-8 rounded-lg bg-bull/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-bull" /></div>
              : <div className="w-8 h-8 rounded-lg bg-bear/10 flex items-center justify-center"><TrendingDown className="w-4 h-4 text-bear" /></div>
            }
            <div>
              <div className="text-[9px] text-gray-500 uppercase font-semibold">Net P&L</div>
              <div className={`text-xl font-bold font-mono ${pnlColor(s.totalPnl)}`}>{fmt(s.totalPnl)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold font-mono ${winRateColor}`}>{fmtPct(winRate)}</div>
            <div className="text-[9px] text-gray-500">win rate</div>
          </div>
        </div>

        {/* W/L/Trades bar */}
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] text-gray-400">{s.total} trades</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-bull">{s.wins}W</span>
            <span className="text-[10px] text-gray-600">/</span>
            <span className="text-[10px] font-bold text-bear">{s.losses}L</span>
          </div>
          {s.total > 0 && (
            <div className="flex-1 h-1.5 rounded-full bg-terminal-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-bull to-bull/70 transition-all"
                style={{ width: `${winRate}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Trophy}
          label="Best Trade"
          value={fmt(s.bestPnl)}
          valueClass={pnlColor(s.bestPnl)}
          iconColor="text-yellow-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Worst Trade"
          value={fmt(s.worstPnl)}
          valueClass={pnlColor(s.worstPnl)}
          iconColor="text-red-400"
        />
        <StatCard
          icon={Target}
          label="Avg P&L"
          value={fmt(s.avgPnl)}
          valueClass={pnlColor(s.avgPnl)}
          iconColor="text-blue-400"
        />
        <StatCard
          icon={Zap}
          label="Open Now"
          value={stats.openTrades ?? 0}
          valueClass={stats.openTrades > 0 ? 'text-blue-400' : 'text-gray-500'}
          iconColor="text-blue-400"
        />
      </div>

      {/* AI Accuracy */}
      {s.aiTrades > 0 && (
        <div className="p-2.5 rounded-lg bg-terminal-bg/80 border border-terminal-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Crosshair className="w-3 h-3 text-blue-400" />
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">AI Accuracy</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-lg font-bold font-mono ${s.aiWinRate >= 50 ? 'text-bull' : 'text-bear'}`}>
              {fmtPct(s.aiWinRate)}
            </div>
            <div className="text-[9px] text-gray-500">{s.aiTrades} trades by AI</div>
            {s.aiTrades > 0 && (
              <div className="flex-1 h-1.5 rounded-full bg-terminal-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400/70"
                  style={{ width: `${s.aiWinRate}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exit Breakdown */}
      {stats.exitBreakdown && Object.values(stats.exitBreakdown).some(v => v > 0) && (
        <div className="p-2.5 rounded-lg bg-terminal-bg/80 border border-terminal-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="w-3 h-3 text-gray-400" />
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Exit Breakdown</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'TP_HIT', label: 'TP Hit', icon: '🎯', color: 'text-bull bg-bull/10 border-bull/20' },
              { key: 'SL_HIT', label: 'SL Hit', icon: '🛑', color: 'text-bear bg-bear/10 border-bear/20' },
              { key: 'BREAK_EVEN', label: 'Break Even', icon: '⚖️', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
              { key: 'MANUAL', label: 'Manual', icon: '✋', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
            ].map(({ key, label, icon, color }) => {
              const count = stats.exitBreakdown[key] || 0;
              if (count === 0) return null;
              return (
                <span key={key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-bold ${color}`}>
                  <span>{icon}</span>
                  <span>{label}</span>
                  <span className="opacity-70">{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
