import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Clock, Target, Shield, TrendingUp, TrendingDown, X, Pin, ChevronLeft, ChevronRight } from 'lucide-react';

const fmtPrice = (v) => (typeof v === 'number' ? `$${v.toFixed(2)}` : '—');
const fmtPnl = (v) => {
  if (typeof v !== 'number') return '—';
  return `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`;
};
const fmtPct = (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(3)}%` : '—');
const fmtQty = (v) => (typeof v === 'number' ? v.toFixed(6).replace(/\.?0+$/, '') : '—');

const EXIT_LABELS = {
  TP_HIT: { label: 'Take Profit Hit', color: 'text-bull', bg: 'bg-bull/10' },
  SL_HIT: { label: 'Stop Loss Hit', color: 'text-bear', bg: 'bg-bear/10' },
  MAX_HOLD: { label: 'Max Hold Time', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  MANUAL: { label: 'Manual Close', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  BREAK_EVEN: { label: 'Break Even', color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

export default function TradeHoverCard({ trade, pinned = false, onClose }) {
  // Collapsed state is only meaningful when pinned — hover cards always show full.
  // Persist user choice for pinned collapse across hovers.
  const [collapsed, setCollapsed] = useState(false);

  // Reset to expanded when switching to a different pinned trade
  useEffect(() => {
    if (!pinned) setCollapsed(false);
  }, [pinned, trade?._hoverKey]);

  if (!trade) return null;

  const isBuy = (trade.decision || trade.side) === 'BUY';
  const isClosed = (trade.status || 'OPEN') === 'CLOSED';
  const pnl = trade.pnl ?? 0;
  const pnlPositive = pnl >= 0;
  const exitMeta = trade.exitReason ? EXIT_LABELS[trade.exitReason] : null;
  const signalPrice =
    trade.signalPriceExec ??
    trade.signalPriceMid ??
    trade.entryAsk ??
    trade.entryMid ??
    trade.entryPrice;
  const executedEntry = trade.executedEntryPrice ?? trade.entryPrice;
  const executedExit = trade.executedExitPrice ?? trade.exitPrice;
  const entrySlippage =
    typeof trade.slippageEntry === 'number'
      ? trade.slippageEntry
      : typeof signalPrice === 'number' && typeof executedEntry === 'number'
        ? executedEntry - signalPrice
        : null;

  // ── Collapsed view: thin vertical strip on the right side ──
  if (collapsed && pinned) {
    return (
      <div
        className={`flex items-stretch gap-0 font-mono pointer-events-auto ${
          pnlPositive ? 'border-bull/40' : 'border-bear/40'
        }`}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expand pinned trade details"
          className={`flex flex-col items-center justify-center gap-1.5 px-2 py-2 bg-terminal-bg/95 backdrop-blur-md border rounded-lg shadow-lg hover:bg-terminal-hover transition-colors ${
            pinned ? 'border-gold ring-1 ring-gold/30' : 'border-gold/30'
          }`}
        >
          <ChevronLeft className="w-3 h-3 text-gold" />
          <Pin className="w-3 h-3 text-gold" />
          <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold ${
            isBuy ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
          }`}>
            {isBuy ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
          </span>
          {isClosed && (
            <div className={`text-[9px] font-bold ${pnlPositive ? 'text-bull' : 'text-bear'}`}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </div>
          )}
          {onClose && (
            <div
              role="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-terminal-hover transition-colors mt-1"
              title="Unpin"
            >
              <X className="w-3 h-3" />
            </div>
          )}
        </button>
      </div>
    );
  }

  // Duration
  let durationStr = '—';
  if (trade.createdAt && trade.closedAt) {
    const diffMs = new Date(trade.closedAt) - new Date(trade.createdAt);
    const seconds = Math.round(diffMs / 1000);
    if (seconds < 60) durationStr = `${seconds}s`;
    else if (seconds < 3600) durationStr = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    else durationStr = `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  const remainingPnl = trade.partialTaken && typeof pnl === 'number' && typeof trade.partialPnl === 'number'
    ? pnl - trade.partialPnl
    : null;

  return (
    <div
      className={`w-72 bg-terminal-bg/95 backdrop-blur-md border rounded-lg shadow-2xl shadow-black/50 overflow-hidden font-mono pointer-events-auto ${
        pinned ? 'border-gold ring-1 ring-gold/30' : 'border-gold/30'
      }`}
    >
      {/* Header */}
      <div className={`px-3 py-2 flex items-center justify-between border-b border-terminal-border ${
        isBuy ? 'bg-bull/5' : 'bg-bear/5'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            isBuy ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
          }`}>
            {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trade.decision || trade.side}
          </span>
          <span className="text-sm font-bold text-white">{trade.symbol}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isClosed ? (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">OPEN</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-500/20 text-gray-300">CLOSED</span>
          )}
          {trade.partialTaken && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400">PARTIAL</span>
          )}
          {pinned && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-terminal-hover transition-colors"
              title="Collapse to mini view"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-terminal-hover transition-colors"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* P&L Bar (only if closed) */}
      {isClosed && (
        <div className={`px-3 py-2 border-b border-terminal-border ${pnlPositive ? 'bg-bull/5' : 'bg-bear/5'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {pnlPositive ? <TrendingUp className="w-4 h-4 text-bull" /> : <TrendingDown className="w-4 h-4 text-bear" />}
              <span className="text-[9px] uppercase tracking-wider text-gray-500">Total P&L</span>
            </div>
            <div className={`flex items-baseline gap-1.5 ${pnlPositive ? 'text-bull' : 'text-bear'}`}>
              <span className="text-base font-bold">{fmtPnl(pnl)}</span>
              <span className="text-[10px]">{fmtPct(trade.pnlPct)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="p-3 space-y-2 text-[11px]">
        {/* Entry */}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">Signal
          </span>
          <span className="text-white font-semibold">{fmtPrice(signalPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gold inline-block" /> Entry
          </span>
          <span className="text-white font-semibold">{fmtPrice(executedEntry)}</span>
        </div>
        {typeof entrySlippage === 'number' && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Entry Slippage</span>
            <span className={entrySlippage >= 0 ? 'text-bear/80' : 'text-bull/80'}>
              {entrySlippage >= 0 ? '+' : ''}{entrySlippage.toFixed(4)}
            </span>
          </div>
        )}

        {/* Partial exit (if applicable) */}
        {trade.partialTaken && (
          <div className="px-2 py-1.5 rounded bg-yellow-500/5 border border-yellow-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-yellow-400/80 flex items-center gap-1 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Partial Close (50%)
              </span>
              <span className="text-yellow-400 font-semibold">{fmtPrice(trade.partialPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>Qty: {fmtQty(trade.partialQty)}</span>
              <span className={typeof trade.partialPnl === 'number' && trade.partialPnl >= 0 ? 'text-bull' : 'text-bear'}>
                {fmtPnl(trade.partialPnl)}
              </span>
            </div>
          </div>
        )}

        {/* Final Exit */}
        {isClosed && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${pnlPositive ? 'bg-bull' : 'bg-bear'} inline-block`} /> Exit
            </span>
            <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{fmtPrice(executedExit)}</span>
              {trade.partialTaken && typeof remainingPnl === 'number' && (
                <span className={`text-[10px] ${remainingPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                  ({fmtPnl(remainingPnl)})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-terminal-border my-1" />

        {/* TP */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500 flex items-center gap-1">
            <Target className="w-2.5 h-2.5 text-bull/70" /> Target (TP)
          </span>
          <span className="text-bull/80">{fmtPrice(trade.takeProfitPrice)}</span>
        </div>

        {/* SL */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 text-bear/70" /> Stop Loss
          </span>
          <span className="text-bear/80">{fmtPrice(trade.stopLossPrice)}</span>
        </div>

        {/* Qty */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">Quantity</span>
          <span className="text-gray-300">{fmtQty(trade.qty)}</span>
        </div>

        {/* Exit reason */}
        {exitMeta && (
          <div className={`px-2 py-1 rounded ${exitMeta.bg} flex items-center justify-between text-[10px]`}>
            <span className="text-gray-500">Exit Reason</span>
            <span className={`font-semibold ${exitMeta.color}`}>{exitMeta.label}</span>
          </div>
        )}

        {/* Timing */}
        <div className="pt-1 border-t border-terminal-border space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-500"><Clock className="w-3 h-3" /> Opened</span>
            <span className="text-gray-100 font-medium font-mono">{trade.createdAt ? format(new Date(trade.createdAt), 'MMM dd, HH:mm:ss') : '—'}</span>
          </div>
          {isClosed && (
            <>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-500"><Clock className="w-3 h-3" /> Closed</span>
                <span className="text-gray-100 font-medium font-mono">{trade.closedAt ? format(new Date(trade.closedAt), 'MMM dd, HH:mm:ss') : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="text-gray-200 font-medium font-mono">{durationStr}</span>
              </div>
            </>
          )}
        </div>

        {/* Hint */}
        {!pinned && (
          <div className="pt-1 border-t border-terminal-border">
            <p className="text-[9px] text-gold/60 text-center">💡 Click trade to pin</p>
          </div>
        )}
      </div>
    </div>
  );
}
