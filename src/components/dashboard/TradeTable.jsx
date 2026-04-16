import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { getTrades } from '@/services/api';

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
  CANCELLED: 'bg-gray-500/10 text-gray-400',
};

const EXIT_REASON_LABEL = {
  TP_HIT: 'TP',
  SL_HIT: 'SL',
  MAX_HOLD: 'TIME',
  MANUAL: 'MAN',
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

export default function TradeTable({ liveLogs = [] }) {
  const [trades, setTrades] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    decision: '',
    executedBy: '',
    exitReason: '',
    startDate: '',
    endDate: '',
  });
  const LIMIT = 20;

  const fetchTrades = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const res = await getTrades(p, LIMIT, params);
      if (res?.success) {
        setTrades(res.trades || []);
        setTotalPages(res.totalPages || 1);
        setTotal(res.total || 0);
        setPage(p);
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    }
    setLoading(false);
  }, [filters]);

  // Load on mount and when filters change
  useEffect(() => {
    fetchTrades(1);
  }, [fetchTrades]);

  // Refresh when a live trade comes in (from socket)
  useEffect(() => {
    if (liveLogs.length > 0) {
      fetchTrades(page);
    }
  }, [liveLogs.length]);

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const clearFilters = () => {
    setFilters({ status: '', decision: '', executedBy: '', exitReason: '', startDate: '', endDate: '' });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Merge live socket trades (OPEN) on top of API trades
  const allTrades = [...trades];
  // Add any live OPEN trades that aren't in the API results
  liveLogs.forEach(live => {
    if (live.status === 'OPEN' && !allTrades.find(t => t.orderId === live.orderId)) {
      allTrades.unshift(live);
    }
  });

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-terminal-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Trade History</h3>
          <span className="text-[9px] font-mono text-gray-600 bg-terminal-bg px-1.5 py-0.5 rounded">{total} total</span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-[9px] text-bear hover:text-bear/80 transition-colors">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              showFilters || hasActiveFilters ? 'bg-gold/15 text-gold' : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-hover'
            }`}
          >
            <Filter className="w-3 h-3" />
            Filter{hasActiveFilters ? ` (${Object.values(filters).filter(v => v).length})` : ''}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-2.5 border-b border-terminal-border bg-terminal-card/30">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <div>
              <label className="text-[8px] text-gray-600 uppercase block mb-0.5">Status</label>
              <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-gold/50">
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-600 uppercase block mb-0.5">Side</label>
              <select value={filters.decision} onChange={e => handleFilterChange('decision', e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-gold/50">
                <option value="">All</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-600 uppercase block mb-0.5">Source</label>
              <select value={filters.executedBy} onChange={e => handleFilterChange('executedBy', e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-gold/50">
                <option value="">All</option>
                <option value="ai">AI</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-600 uppercase block mb-0.5">Exit Reason</label>
              <select value={filters.exitReason} onChange={e => handleFilterChange('exitReason', e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-gold/50">
                <option value="">All</option>
                <option value="TP_HIT">TP Hit</option>
                <option value="SL_HIT">SL Hit</option>
                <option value="BREAK_EVEN">Break Even</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div>
              <label className="text-[8px] text-gray-600 uppercase block mb-0.5">From</label>
              <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="text-[8px] text-gray-600 uppercase block mb-0.5">To</label>
              <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {allTrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <div className="w-12 h-12 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-center mb-3">
            <Minus className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium">{hasActiveFilters ? 'No trades match filters' : 'No trades yet'}</p>
          <p className="text-xs text-gray-700 mt-1">{hasActiveFilters ? 'Try adjusting your filters' : 'Enable auto-trading to see activity here'}</p>
        </div>
      ) : (
        <>
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
                {allTrades.map((log, idx) => {
                  const t = log;
                  const isBuy = (t.decision || t.side) === 'BUY';
                  const status = t.status || 'OPEN';
                  const isClosed = status === 'CLOSED';
                  const pnl = t.pnl ?? 0;
                  const pnlPositive = pnl >= 0;
                  const exitTag = t.exitReason ? EXIT_REASON_LABEL[t.exitReason] : null;
                  const ts = t.createdAt || t.timestamp;

                  return (
                    <tr
                      key={t._id || t.id || idx}
                      className={`border-b border-terminal-border/50 transition-colors hover:bg-terminal-hover ${
                        idx === 0 ? 'bg-terminal-card/50' : ''
                      }`}
                    >
                      <td className="px-3 py-3 font-mono text-[13px] text-gray-100 font-medium">
                        <div>{ts ? format(new Date(ts), 'dd MMM yyyy') : '--'}</div>
                        <div className="text-[12px] text-gray-300 font-medium">{ts ? format(new Date(ts), 'HH:mm:ss') : ''}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-white text-xs">
                        {t.symbol || '--'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                          isBuy ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
                        }`}>
                          {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {t.decision || t.side}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${EXECUTED_BY_STYLES[t.executedBy] || 'bg-gray-500/10 text-gray-400'}`}>
                          {EXECUTED_BY_LABEL[t.executedBy] || 'TEST'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-300">
                        {formatPrice(t.entryPrice)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-300">
                        {isClosed ? formatPrice(t.exitPrice) : <span className="text-gray-600">--</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        {isClosed ? (
                          <div className="flex flex-col items-end">
                            <span className={pnlPositive ? 'text-bull font-semibold' : 'text-bear font-semibold'}>
                              {formatPnl(t.pnl)}
                            </span>
                            <span className={`text-[10px] ${pnlPositive ? 'text-bull/70' : 'text-bear/70'}`}>
                              {formatPnlPct(t.pnlPct)}
                            </span>
                            {t.partialTaken && (
                              <span className="text-[9px] text-yellow-500 mt-0.5" title={`Partial: ${formatPnl(t.partialPnl)} @ ${formatPrice(t.partialPrice)} (${t.partialQty} qty)`}>
                                📐 Partial: {formatPnl(t.partialPnl)}
                              </span>
                            )}
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
                          {t.partialTaken && (
                            <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-400">PARTIAL TP</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-mono text-[10px] text-gray-600 bg-terminal-bg px-1.5 py-0.5 rounded">
                          {t.orderId ? t.orderId.substring(0, 10) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-2.5 border-t border-terminal-border flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                Page {page} of {totalPages} ({total} trades)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchTrades(page - 1)}
                  disabled={page <= 1}
                  className="p-1 rounded hover:bg-terminal-hover text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => fetchTrades(p)}
                      className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${
                        p === page ? 'bg-gold/20 text-gold' : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-hover'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchTrades(page + 1)}
                  disabled={page >= totalPages}
                  className="p-1 rounded hover:bg-terminal-hover text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="absolute inset-0 bg-terminal-bg/50 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
