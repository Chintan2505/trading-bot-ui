import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronLeft, ChevronRight, Filter, X, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { getTrades, verifyTrade } from '@/services/api';

const formatPrice = (v) => (typeof v === 'number' ? `$${v.toFixed(2)}` : '--');
const formatPnl = (v) => {
  if (typeof v !== 'number') return '--';
  const sign = v >= 0 ? '+' : '';
  return `${sign}$${v.toFixed(2)}`;
};
const formatPnlPct = (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '');
const formatSignedPrice = (v) =>
  typeof v === 'number' ? `${v >= 0 ? '+' : ''}$${v.toFixed(4)}` : '--';

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
  const [verifyState, setVerifyState] = useState({});
  const [verifyDetails, setVerifyDetails] = useState({});
  const [modalTradeId, setModalTradeId] = useState(null); // opens details modal
  const LIMIT = 20;

  const handleVerify = useCallback(async (tradeId) => {
    setVerifyState((prev) => ({ ...prev, [tradeId]: 'loading' }));
    setModalTradeId(tradeId);
    try {
      const res = await verifyTrade(tradeId);
      if (!res.success) {
        setVerifyState((prev) => ({ ...prev, [tradeId]: 'error' }));
        setVerifyDetails((prev) => ({ ...prev, [tradeId]: { error: res.error } }));
        return;
      }
      setVerifyDetails((prev) => ({ ...prev, [tradeId]: res }));
      setVerifyState((prev) => ({ ...prev, [tradeId]: res.verified ? 'match' : 'mismatch' }));
    } catch (err) {
      setVerifyState((prev) => ({ ...prev, [tradeId]: 'error' }));
      setVerifyDetails((prev) => ({ ...prev, [tradeId]: { error: err.message } }));
    }
  }, []);

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
                  <th className="text-right px-3 py-2.5 font-semibold">Signal (Mid)</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Executed</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Slippage</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Fees</th>
                  <th className="text-right px-3 py-2.5 font-semibold">P&amp;L</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Status</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Verify</th>
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
                  const signalPrice =
                    t.signalPriceExec ??
                    t.signalPriceMid ??
                    t.entryAsk ??
                    t.entryMid ??
                    t.entryPrice;
                  const executedEntry = t.executedEntryPrice ?? t.entryPrice;
                  const executedExit = t.executedExitPrice ?? t.exitPrice;
                  const entrySlippage =
                    typeof t.slippageEntry === 'number'
                      ? t.slippageEntry
                      : typeof signalPrice === 'number' && typeof executedEntry === 'number'
                        ? executedEntry - signalPrice
                        : null;
                  const exitSlippage =
                    typeof t.slippageExit === 'number'
                      ? t.slippageExit
                      : typeof signalPrice === 'number' && typeof executedExit === 'number'
                        ? executedExit - signalPrice
                        : null;

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
                        {formatPrice(signalPrice)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-300">
                        <div className="flex flex-col items-end">
                          <span>{formatPrice(executedEntry)}</span>
                          {isClosed ? (
                            <span className="text-[10px] text-gray-500">{formatPrice(executedExit)}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        <div className="flex flex-col items-end">
                          <span className={typeof entrySlippage === 'number' ? (entrySlippage >= 0 ? 'text-bear' : 'text-bull') : 'text-gray-600'}>
                            {formatSignedPrice(entrySlippage)}
                          </span>
                          {isClosed ? (
                            <span className={typeof exitSlippage === 'number' ? `text-[10px] ${exitSlippage >= 0 ? 'text-bear/70' : 'text-bull/70'}` : 'text-[10px] text-gray-600'}>
                              {formatSignedPrice(exitSlippage)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        {isClosed && typeof t.fees === 'number' && t.fees > 0 ? (
                          <div className="flex flex-col items-end" title="Total Alpaca fees (entry + exit)">
                            <span className="text-bear/80">−${t.fees.toFixed(2)}</span>
                            {typeof t.entryPrice === 'number' && typeof t.qty === 'number' && t.entryPrice > 0 && (
                              <span className="text-[9px] text-gray-500">
                                {((t.fees / (t.entryPrice * t.qty)) * 100).toFixed(3)}%
                              </span>
                            )}
                          </div>  
                        ) : (
                          <span className="text-gray-600">{isClosed ? '$0.00' : '--'}</span>
                        )}
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
                      <td className="px-3 py-3 text-center">
                        {(() => {
                          const tid = t._id;
                          if (!tid || !t.orderId) {
                            return <span className="text-gray-700 text-[9px]">—</span>;
                          }
                          const state = verifyState[tid] || 'idle';
                          const details = verifyDetails[tid];
                          if (state === 'loading') {
                            return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 mx-auto" />;
                          }
                          if (state === 'match') {
                            return (
                              <button
                                onClick={() => handleVerify(tid)}
                                title={`Match: entry $${details?.alpaca?.filledAvgPrice?.toFixed?.(2) ?? '?'}, qty ${details?.alpaca?.filledQty ?? '?'}, fees $${details?.alpaca?.fees ?? 0}`}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-bull/15 hover:bg-bull/25 transition-colors"
                              >
                                <ShieldCheck className="w-3 h-3 text-bull" />
                                <span className="text-[9px] text-bull font-semibold">OK</span>
                              </button>
                            );
                          }
                          if (state === 'mismatch') {
                            const mismatches = details?.mismatches || [];
                            const tip = mismatches
                              .map((m) => `${m.field}: db=${m.db}, alpaca=${m.alpaca} (Δ ${m.diff})`)
                              .join(' | ');
                            return (
                              <button
                                onClick={() => handleVerify(tid)}
                                title={tip}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-bear/15 hover:bg-bear/25 transition-colors"
                              >
                                <ShieldAlert className="w-3 h-3 text-bear" />
                                <span className="text-[9px] text-bear font-semibold">{mismatches.length}</span>
                              </button>
                            );
                          }
                          if (state === 'error') {
                            return (
                              <button
                                onClick={() => handleVerify(tid)}
                                title={details?.error || 'Verify failed'}
                                className="text-[9px] text-yellow-500 hover:text-yellow-400"
                              >
                                retry
                              </button>
                            );
                          }
                          return (
                            <button
                              onClick={() => handleVerify(tid)}
                              title="Verify against Alpaca"
                              className="px-1.5 py-0.5 rounded text-[9px] text-gray-400 hover:text-white hover:bg-terminal-hover transition-colors border border-terminal-border"
                            >
                              verify
                            </button>
                          );
                        })()}
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

      {/* ── Verify details modal ── */}
      {modalTradeId && (
        <VerifyModal
          tradeId={modalTradeId}
          state={verifyState[modalTradeId]}
          details={verifyDetails[modalTradeId]}
          onClose={() => setModalTradeId(null)}
          onRetry={() => handleVerify(modalTradeId)}
        />
      )}
    </div>
  );
}

// ── Verify details drawer: slides down from top, click-outside closes ──
function VerifyModal({ tradeId, state, details, onClose, onRetry }) {
  // Mount animation: false on first render, flip to true on next tick
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(t);
  }, []);
  // Esc to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 250); // match transition duration
  };

  const stop = (e) => e.stopPropagation();
  const fmt = (v) => (typeof v === 'number' ? `$${v.toFixed(2)}` : '—');
  const fmtQty = (v) =>
    typeof v === 'number' ? v.toFixed(6).replace(/\.?0+$/, '') : '—';
  const fmtTs = (v) => (v ? format(new Date(v), 'MMM dd HH:mm:ss') : '—');

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${open ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        onClick={stop}
        className={`absolute top-0 left-0 right-0 bg-terminal-card border-b border-terminal-border shadow-2xl max-h-[85vh] overflow-y-auto transform transition-transform duration-250 ease-out ${open ? 'translate-y-0' : '-translate-y-full'}`}
      >
        {/* Header */}
        <div className="px-6 py-3 border-b border-terminal-border flex items-center justify-between sticky top-0 bg-terminal-card z-10">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-white">Trade Verification</span>
            {state === 'match' && (
              <span className="px-2 py-0.5 rounded text-[12px] font-bold bg-bull/15 text-bull flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> MATCH
              </span>
            )}
            {state === 'mismatch' && (
              <span className="px-2 py-0.5 rounded text-[12px] font-bold bg-bear/15 text-bear flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> {details?.mismatches?.length ?? '?'} MISMATCH
              </span>
            )}
            {state === 'loading' && (
              <span className="flex items-center gap-1 text-[12px] text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching Alpaca data…
              </span>
            )}
            {state === 'error' && (
              <span className="text-[12px] text-yellow-500">Error — check logs</span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-terminal-hover"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {state === 'loading' && (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-gold" />
          </div>
        )}
        {state === 'error' && (
          <div className="p-6">
            <p className="text-[14px] text-bear">{details?.error || 'Failed to verify'}</p>
            <button
              onClick={onRetry}
              className="mt-3 px-3 py-1.5 rounded bg-terminal-bg border border-terminal-border text-[13px] text-gray-300 hover:text-white"
            >
              Retry
            </button>
          </div>
        )}
        {(state === 'match' || state === 'mismatch') && details?.trade && details?.alpaca && (
          <div className="p-6 space-y-5 max-w-5xl mx-auto">
            {/* Side-by-side comparison */}
            <div className="grid grid-cols-3 gap-4 text-[13px] font-mono">
              <div className="text-[12px] uppercase text-gray-500 font-semibold">Field</div>
              <div className="text-[12px] uppercase text-gray-500 font-semibold">DB (TradeX)</div>
              <div className="text-[12px] uppercase text-gray-500 font-semibold">Alpaca</div>

              <ComparisonRow label="Side" dbVal={details.trade.decision} alpacaVal={details.trade.decision} />
              <ComparisonRow label="Symbol" dbVal={details.trade.symbol} alpacaVal={details.trade.symbol} />
              <ComparisonRow
                label="Entry Price"
                dbVal={fmt(details.trade.entryPrice)}
                alpacaVal={fmt(details.alpaca.entryPrice)}
                mismatch={details.mismatches?.some((m) => m.field === 'entryPrice')}
                delta={details.mismatches?.find((m) => m.field === 'entryPrice')?.diff}
              />
              <ComparisonRow
                label="Exit Price"
                dbVal={fmt(details.trade.exitPrice)}
                alpacaVal={fmt(details.alpaca.exitPrice)}
                mismatch={details.mismatches?.some((m) => m.field === 'exitPrice')}
                delta={details.mismatches?.find((m) => m.field === 'exitPrice')?.diff}
              />
              <ComparisonRow
                label="Quantity"
                dbVal={fmtQty(details.trade.qty)}
                alpacaVal={fmtQty(details.alpaca.entryQty)}
                mismatch={details.mismatches?.some((m) => m.field === 'qty')}
                delta={details.mismatches?.find((m) => m.field === 'qty')?.diff}
              />
              <ComparisonRow
                label="Fees (total)"
                dbVal={fmt(details.trade.fees)}
                alpacaVal={fmt(details.alpaca.fees)}
                mismatch={details.mismatches?.some((m) => m.field === 'fees')}
                delta={details.mismatches?.find((m) => m.field === 'fees')?.diff}
              />
              <ComparisonRow
                label="Gross P&L"
                dbVal={fmt(details.trade.pnl)}
                alpacaVal={fmt(details.alpaca.pnl)}
                mismatch={details.mismatches?.some((m) => m.field === 'pnl')}
                delta={details.mismatches?.find((m) => m.field === 'pnl')?.diff}
              />
              <ComparisonRow
                label="Net P&L"
                dbVal={fmt(details.trade.netPnl)}
                alpacaVal={fmt(details.alpaca.netPnl)}
              />
            </div>

            {/* Timing — DB vs Alpaca side-by-side */}
            <div className="pt-3 border-t border-terminal-border">
              <div className="grid grid-cols-3 gap-3 text-[13px] font-mono">
                <div className="text-[12px] uppercase text-gray-500 font-semibold">Time</div>
                <div className="text-[12px] uppercase text-gray-500 font-semibold">DB (TradeX)</div>
                <div className="text-[12px] uppercase text-gray-500 font-semibold">Alpaca</div>

                <div className="text-gray-500">Entry</div>
                <div className="text-gray-200">{fmtTs(details.trade.createdAt)}</div>
                <div className="text-gray-200">
                  {fmtTs(details.alpaca.entryFilledAt) || fmtTs(details.alpaca.entrySubmittedAt)}
                </div>

                <div className="text-gray-500">Exit</div>
                <div className="text-gray-200">{fmtTs(details.trade.closedAt)}</div>
                <div className="text-gray-200">{fmtTs(details.alpaca.exitFilledAt)}</div>

                <div className="text-gray-500">Order ID</div>
                <div className="text-gray-200">
                  entry: {details.alpaca.entryOrderId?.slice(0, 8) || '—'}
                </div>
                <div className="text-gray-200">
                  exit: {details.alpaca.exitOrderId?.slice(0, 8) || '—'}
                </div>
              </div>
            </div>

            {/* Mismatches */}
            {details.mismatches?.length > 0 && (
              <div className="pt-3 border-t border-terminal-border">
                <div className="text-[12px] uppercase text-bear font-semibold mb-2">
                  {details.mismatches.length} Mismatch{details.mismatches.length > 1 ? 'es' : ''}
                </div>
                <div className="space-y-1">
                  {details.mismatches.map((m, i) => (
                    <div key={i} className="text-[13px] font-mono text-gray-300 px-3 py-1.5 rounded bg-bear/5 border border-bear/20">
                      <span className="text-bear font-bold">{m.field}</span>
                      {' '}— DB: <span className="text-white">{m.db}</span>
                      {' '}→ Alpaca: <span className="text-white">{m.alpaca}</span>
                      {' '}<span className={m.diff >= 0 ? 'text-bull' : 'text-bear'}>
                        (Δ {m.diff >= 0 ? '+' : ''}{m.diff})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <button
                onClick={onRetry}
                className="px-3 py-1.5 rounded bg-terminal-bg border border-terminal-border text-[13px] text-gray-300 hover:text-white"
              >
                Re-verify
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonRow({ label, dbVal, alpacaVal, mismatch, delta }) {
  return (
    <>
      <div className="text-gray-500">{label}</div>
      <div className={mismatch ? 'text-bear' : 'text-gray-200'}>{dbVal}</div>
      <div className={mismatch ? 'text-bear' : 'text-gray-200'}>
        {alpacaVal}
        {mismatch && typeof delta === 'number' && (
          <span className="text-[11px] text-bear/70 ml-1">(Δ {delta >= 0 ? '+' : ''}{delta})</span>
        )}
      </div>
    </>
  );
}
