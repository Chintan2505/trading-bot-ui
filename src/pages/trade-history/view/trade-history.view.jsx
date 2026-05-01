import React, { useState } from 'react';
import {
  History, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown,
} from 'lucide-react';

const fmtMoney = (v) => `${v >= 0 ? '+' : ''}$${(v ?? 0).toFixed(2)}`;
const fmtPct = (v) => (v == null ? '--' : `${v.toFixed(1)}%`);

function FlatTable({ trades, loading, page, setPage, total, totalPages, filters, handleFilterChange }) {
  return (
    <>
      {/* Filters */}
      <div className="px-6 py-3 border-b border-terminal-border flex items-center gap-3">
        <input
          type="text"
          value={filters.symbol}
          onChange={(e) => handleFilterChange('symbol', e.target.value.toUpperCase())}
          placeholder="Filter by symbol..."
          className="bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-[12px] text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50 w-40"
        />
        <select
          value={filters.decision}
          onChange={(e) => handleFilterChange('decision', e.target.value)}
          className="bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
        >
          <option value="">All Decisions</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
          <option value="HOLD">HOLD</option>
        </select>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-terminal-card animate-shimmer" />
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <History className="w-12 h-12 mb-3 text-gray-700" />
            <p className="text-sm font-medium">No trades found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-terminal-border">
                {['Date', 'Symbol', 'Decision', 'RSI', 'P&L', 'Order ID'].map(h => (
                  <th key={h} className="text-left text-[12px] uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {trades.map((trade, i) => {
                const pnl = trade.pnl ?? null;
                return (
                  <tr key={trade._id || i} className="hover:bg-terminal-hover/50 transition-colors">
                    <td className="py-2.5 px-3 text-[12px] font-mono text-gray-400">
                      {new Date(trade.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-sm font-semibold text-white">{trade.symbol}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          trade.decision === 'BUY' ? 'bg-bull/15 text-bull' : trade.decision === 'SELL' ? 'bg-bear/15 text-bear' : 'bg-gray-800 text-gray-500'
                        }`}>
                          {trade.decision === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : trade.decision === 'SELL' ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </div>
                        <span className={`text-[11px] font-bold ${
                          trade.decision === 'BUY' ? 'text-bull' : trade.decision === 'SELL' ? 'text-bear' : 'text-gray-500'
                        }`}>
                          {trade.decision}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-sm font-mono text-gray-300">{trade.rsi?.toFixed(2) ?? '--'}</td>
                    <td className={`py-2.5 px-3 text-[12px] font-mono font-bold ${
                      pnl == null ? 'text-gray-600' : pnl >= 0 ? 'text-bull' : 'text-bear'
                    }`}>
                      {pnl == null ? '--' : fmtMoney(pnl)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono text-gray-600">{trade.orderId || '--'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-terminal-border">
            <span className="text-[11px] text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-terminal-border hover:bg-terminal-hover disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-terminal-border hover:bg-terminal-hover disabled:opacity-30 transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SymbolCard({ s, isExpanded, onToggle, trades, loadTrades }) {
  const isProfit = s.totalPnl >= 0;

  const handleToggle = () => {
    if (!isExpanded) loadTrades(s.symbol);
    onToggle(s.symbol);
  };

  return (
    <div className="border border-terminal-border rounded-lg overflow-hidden bg-terminal-card/30">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-terminal-hover/30 transition-colors text-left"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        <div className="flex-1 grid grid-cols-7 gap-3 items-center">
          <div className="font-bold text-white text-sm">{s.symbol}</div>
          <div className="text-[11px] font-mono">
            <div className="text-gray-500 uppercase tracking-wider text-[11px]">Trades</div>
            <div className="text-gray-300">{s.total} <span className="text-gray-600">({s.open} open)</span></div>
          </div>
          <div className="text-[11px] font-mono">
            <div className="text-gray-500 uppercase tracking-wider text-[11px]">Win Rate</div>
            <div className={`font-bold ${s.winRate >= 50 ? 'text-bull' : 'text-bear'}`}>
              {fmtPct(s.winRate)} <span className="text-gray-600">({s.wins}W/{s.losses}L)</span>
            </div>
          </div>
          <div className="text-[11px] font-mono">
            <div className="text-gray-500 uppercase tracking-wider text-[11px]">Total P&L</div>
            <div className={`font-bold flex items-center gap-1 ${isProfit ? 'text-bull' : 'text-bear'}`}>
              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {fmtMoney(s.totalPnl)}
            </div>
          </div>
          <div className="text-[11px] font-mono">
            <div className="text-gray-500 uppercase tracking-wider text-[11px]">Avg P&L</div>
            <div className={s.avgPnl >= 0 ? 'text-bull' : 'text-bear'}>{fmtMoney(s.avgPnl)}</div>
          </div>
          <div className="text-[11px] font-mono">
            <div className="text-gray-500 uppercase tracking-wider text-[11px]">AI Acc.</div>
            <div className="text-gray-300">{fmtPct(s.aiWinRate)} <span className="text-gray-600">({s.aiTrades})</span></div>
          </div>
          <div className="text-[11px] font-mono">
            <div className="text-gray-500 uppercase tracking-wider text-[11px]">Algo Acc.</div>
            <div className="text-gray-300">{fmtPct(s.algoWinRate)} <span className="text-gray-600">({s.algoTrades})</span></div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-terminal-border bg-terminal-bg/40">
          {/* Extra stats row */}
          <div className="px-4 py-2 border-b border-terminal-border/50 grid grid-cols-6 gap-3 text-[12px] font-mono">
            <div>
              <span className="text-gray-500">Best: </span>
              <span className="text-bull font-bold">{fmtMoney(s.bestPnl)}</span>
            </div>
            <div>
              <span className="text-gray-500">Worst: </span>
              <span className="text-bear font-bold">{fmtMoney(s.worstPnl)}</span>
            </div>
            <div>
              <span className="text-gray-500">TP Hit: </span>
              <span className="text-bull">{s.exitTpHit}</span>
            </div>
            <div>
              <span className="text-gray-500">SL Hit: </span>
              <span className="text-bear">{s.exitSlHit}</span>
            </div>
            <div>
              <span className="text-gray-500">Manual: </span>
              <span className="text-gray-300">{s.exitManual}</span>
            </div>
            <div>
              <span className="text-gray-500">Last: </span>
              <span className="text-gray-400">{s.lastTradeAt ? new Date(s.lastTradeAt).toLocaleDateString() : '--'}</span>
            </div>
          </div>

          {/* Trades list */}
          {!trades ? (
            <div className="px-4 py-6 text-center text-[11px] text-gray-500">Loading trades…</div>
          ) : trades.length === 0 ? (
            <div className="px-4 py-6 text-center text-[11px] text-gray-500">No trades.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-terminal-border/50">
                  {['Date', 'Side', 'Qty', 'Entry', 'Exit', 'P&L', 'Exit Reason', 'By'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-wider text-gray-600 font-semibold py-2 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/30">
                {trades.map(t => {
                  const pnl = t.pnl ?? null;
                  return (
                    <tr key={t._id} className="hover:bg-terminal-hover/30">
                      <td className="py-2 px-3 text-[11px] font-mono text-gray-400">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[12px] font-bold ${
                          t.decision === 'BUY' ? 'text-bull' : t.decision === 'SELL' ? 'text-bear' : 'text-gray-500'
                        }`}>{t.decision}</span>
                      </td>
                      <td className="py-2 px-3 text-[11px] font-mono text-gray-400">{t.qty ?? '--'}</td>
                      <td className="py-2 px-3 text-[11px] font-mono text-gray-300">{t.entryPrice ? `$${t.entryPrice.toFixed(2)}` : '--'}</td>
                      <td className="py-2 px-3 text-[11px] font-mono text-gray-300">{t.exitPrice ? `$${t.exitPrice.toFixed(2)}` : '--'}</td>
                      <td className={`py-2 px-3 text-[11px] font-mono font-bold ${
                        pnl == null ? 'text-gray-600' : pnl >= 0 ? 'text-bull' : 'text-bear'
                      }`}>
                        {pnl == null ? '--' : fmtMoney(pnl)}
                      </td>
                      <td className="py-2 px-3 text-[12px] font-mono text-gray-500">{t.exitReason || (t.status === 'OPEN' ? 'OPEN' : '--')}</td>
                      <td className="py-2 px-3 text-[12px] font-mono text-gray-500">{t.executedBy || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function BySymbolList({ symbolStats, symbolTrades, loadSymbolTrades, loading }) {
  const [expanded, setExpanded] = useState(new Set());
  const onToggle = (sym) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym); else next.add(sym);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="px-6 py-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-terminal-card animate-shimmer" />
        ))}
      </div>
    );
  }
  if (symbolStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600">
        <History className="w-12 h-12 mb-3 text-gray-700" />
        <p className="text-sm font-medium">No trades yet</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-2">
      {symbolStats.map(s => (
        <SymbolCard
          key={s.symbol}
          s={s}
          isExpanded={expanded.has(s.symbol)}
          onToggle={onToggle}
          trades={symbolTrades[s.symbol]}
          loadTrades={loadSymbolTrades}
        />
      ))}
    </div>
  );
}

export default function TradeHistoryView({
  view, setView,
  trades, stats,
  symbolStats, symbolTrades, loadSymbolTrades,
  loading,
  page, setPage, total, totalPages,
  filters, handleFilterChange,
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-gold" />
          <div>
            <h1 className="text-lg font-bold text-white">Trade History</h1>
            <p className="text-[12px] text-gray-500">
              {view === 'flat' ? `${total} total bot trades` : `${symbolStats.length} symbols traded`}
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-terminal-card border border-terminal-border rounded-lg">
          <button
            onClick={() => setView('flat')}
            className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${
              view === 'flat' ? 'bg-gold/15 text-gold' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Flat List
          </button>
          <button
            onClick={() => setView('symbol')}
            className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${
              view === 'symbol' ? 'bg-gold/15 text-gold' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            By Symbol
          </button>
        </div>
      </div>

      {/* Stats bar (flat view only) */}
      {view === 'flat' && stats && (
        <div className="px-6 py-3 border-b border-terminal-border flex items-center gap-6">
          <div>
            <span className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold">Total</span>
            <div className="text-sm font-mono font-bold text-gray-300">{stats.allTime?.total ?? 0}</div>
          </div>
          <div>
            <span className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold">Win Rate</span>
            <div className="text-sm font-mono font-bold text-bull">{fmtPct(stats.allTime?.winRate)}</div>
          </div>
          <div>
            <span className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold">Total P&L</span>
            <div className={`text-sm font-mono font-bold ${(stats.allTime?.totalPnl ?? 0) >= 0 ? 'text-bull' : 'text-bear'}`}>
              {fmtMoney(stats.allTime?.totalPnl ?? 0)}
            </div>
          </div>
          <div>
            <span className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold">Open</span>
            <div className="text-sm font-mono font-bold text-gray-300">{stats.openTrades ?? 0}</div>
          </div>
        </div>
      )}

      {view === 'flat' ? (
        <FlatTable
          trades={trades}
          loading={loading}
          page={page}
          setPage={setPage}
          total={total}
          totalPages={totalPages}
          filters={filters}
          handleFilterChange={handleFilterChange}
        />
      ) : (
        <BySymbolList
          symbolStats={symbolStats}
          symbolTrades={symbolTrades}
          loadSymbolTrades={loadSymbolTrades}
          loading={loading}
        />
      )}
    </div>
  );
}
