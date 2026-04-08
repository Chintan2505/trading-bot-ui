import React from 'react';
import { History, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function TradeHistoryView({
  trades,
  stats,
  loading,
  page,
  setPage,
  total,
  totalPages,
  filters,
  handleFilterChange,
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-gold" />
          <div>
            <h1 className="text-lg font-bold text-white">Trade History</h1>
            <p className="text-[12px] text-gray-500">{total} total bot trades</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-6 py-3 border-b border-terminal-border flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Total</span>
            <div className="text-sm font-mono font-bold text-gray-300">{stats.totalTrades}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Buy</span>
            <div className="text-sm font-mono font-bold text-bull">{stats.buyCount}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Sell</span>
            <div className="text-sm font-mono font-bold text-bear">{stats.sellCount}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Hold</span>
            <div className="text-sm font-mono font-bold text-gray-300">{stats.holdCount}</div>
          </div>
        </div>
      )}

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

      {/* Table */}
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
                {['Date', 'Symbol', 'Decision', 'RSI', 'Order ID'].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {trades.map((trade, i) => (
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
                  <td className="py-2.5 px-3 text-[11px] font-mono text-gray-600">{trade.orderId || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-terminal-border">
            <span className="text-[11px] text-gray-500">
              Page {page} of {totalPages}
            </span>
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
    </div>
  );
}
