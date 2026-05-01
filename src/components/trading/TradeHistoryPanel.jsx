import React, { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Pin,
  Loader2,
} from "lucide-react";
import { getTrades } from "@/services/api";

const fmtPrice = (v) => (typeof v === "number" ? `$${v.toFixed(2)}` : "—");
const fmtPnl = (v) => {
  if (typeof v !== "number") return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}$${v.toFixed(2)}`;
};
const fmtPct = (v) =>
  typeof v === "number" ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "";

const EXIT_LABELS = {
  TP_HIT: "TP",
  SL_HIT: "SL",
  MAX_HOLD: "TIME",
  MANUAL: "MAN",
  BREAK_EVEN: "BE",
};

const PAGE_SIZE = 30;

export default function TradeHistoryPanel({
  symbol,
  liveLogs = [],
  onHoverTrade,
  onLeaveTrade,
  onClickTrade,
  hoveredTradeId,
  pinnedTradeId,
}) {
  const [trades, setTrades] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef();
  const sentinelRef = useRef(); // intersection observer target

  // Fetch a specific page — page 1 replaces, page 2+ appends
  const fetchPage = useCallback(
    async (pageNum, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const params = {};
        if (symbol) params.symbol = symbol;
        const res = await getTrades(pageNum, PAGE_SIZE, params);
        if (res?.success) {
          if (append) {
            setTrades((prev) => {
              // Deduplicate by _id
              const existingIds = new Set(prev.map((t) => t._id));
              const newTrades = (res.trades || []).filter(
                (t) => !existingIds.has(t._id),
              );
              return [...prev, ...newTrades];
            });
          } else {
            setTrades(res.trades || []);
          }
          setTotalPages(res.totalPages || 1);
          setTotal(res.total || 0);
          setPage(pageNum);
        }
      } catch (err) {
        console.error("[TradeHistoryPanel] fetch error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [symbol],
  );

  // Initial load + reload on symbol change
  useEffect(() => {
    setTrades([]);
    setPage(1);
    fetchPage(1);
  }, [fetchPage]);

  // Refresh page 1 when a new trade comes in via socket
  useEffect(() => {
    if (liveLogs.length > 0) {
      // Prepend-refresh: reload page 1 and merge with existing
      (async () => {
        try {
          const params = {};
          if (symbol) params.symbol = symbol;
          const res = await getTrades(1, PAGE_SIZE, params);
          if (res?.success) {
            setTrades((prev) => {
              const newTrades = res.trades || [];
              const existingIds = new Set(newTrades.map((t) => t._id));
              // Keep existing trades from later pages that aren't in page 1
              const laterPages = prev.filter((t) => !existingIds.has(t._id));
              return [...newTrades, ...laterPages];
            });
            setTotal(res.total || 0);
            setTotalPages(res.totalPages || 1);
          }
        } catch {
          /* ignore */
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLogs.length]);

  // Full refresh (button)
  const handleRefresh = useCallback(() => {
    setTrades([]);
    setPage(1);
    fetchPage(1);
  }, [fetchPage]);

  // Load next page
  const loadMore = useCallback(() => {
    if (loadingMore || loading || page >= totalPages) return;
    fetchPage(page + 1, true);
  }, [loadingMore, loading, page, totalPages, fetchPage]);

  // Infinite scroll: IntersectionObserver watches the sentinel at the bottom
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { root: listRef.current, rootMargin: "100px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Merge OPEN live logs at the top (not yet in DB)
  const allTrades = [...trades];
  liveLogs.forEach((live) => {
    if (
      live.status === "OPEN" &&
      !allTrades.find((t) => t.orderId === live.orderId)
    ) {
      allTrades.unshift(live);
    }
  });

  const hasMore = page < totalPages;

  return (
    <div className="h-full flex flex-col bg-terminal-card/30">
      {/* Count + refresh bar */}
      <div className="px-3 py-1.5 border-b border-terminal-border flex items-center justify-between flex-shrink-0">
        <span className="text-[11px] font-mono text-gray-500">
          {allTrades.length} of {total} {total === 1 ? "trade" : "trades"}
        </span>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-terminal-hover transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Hint */}
      <div className="px-3 py-1.5 border-b border-terminal-border bg-gold/5 flex-shrink-0">
        <p className="text-[10px] text-gold/70 leading-tight">
          💡 Hover to preview · Click to pin
        </p>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading && trades.length === 0 ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-gold animate-spin" />
          </div>
        ) : allTrades.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-gray-600">No trades yet</p>
            <p className="text-[11px] text-gray-700 mt-1">
              Start auto-trading to see history
            </p>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/50">
            {allTrades.map((t, idx) => {
              const isBuy = (t.decision || t.side) === "BUY";
              const isClosed = (t.status || "OPEN") === "CLOSED";
              const pnl = t.pnl ?? 0;
              const pnlPositive = pnl >= 0;
              const exitTag = t.exitReason ? EXIT_LABELS[t.exitReason] : null;
              const ts = t.createdAt || t.timestamp;
              const signalPrice =
                t.signalPriceExec ??
                t.signalPriceMid ??
                t.entryAsk ??
                t.entryMid ??
                t.entryPrice;
              const executedEntry = t.executedEntryPrice ?? t.entryPrice;
              const executedExit = t.executedExitPrice ?? t.exitPrice;
              const slippage =
                typeof t.slippageEntry === "number"
                  ? t.slippageEntry
                  : typeof signalPrice === "number" &&
                      typeof executedEntry === "number"
                    ? executedEntry - signalPrice
                    : null;
              const key = t._id || t.orderId || idx;
              const isHovered = hoveredTradeId === key;
              const isPinned = pinnedTradeId === key;

              return (
                <div
                  key={key}
                  onMouseEnter={() => onHoverTrade?.({ ...t, _hoverKey: key })}
                  onMouseLeave={() => onLeaveTrade?.()}
                  onClick={() => onClickTrade?.({ ...t, _hoverKey: key })}
                  className={`px-2.5 py-2 cursor-pointer transition-colors ${
                    isPinned
                      ? "bg-gold/15 border-l-2 border-gold ring-1 ring-gold/20"
                      : isHovered
                        ? "bg-gold/10 border-l-2 border-gold/60"
                        : "hover:bg-terminal-hover border-l-2 border-transparent"
                  }`}
                >
                  {/* Top row: side + symbol + status */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          isBuy
                            ? "bg-bull/10 text-bull"
                            : "bg-bear/10 text-bear"
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5" />
                        )}
                        {t.decision || t.side}
                      </span>
                      <span className="text-[12px] font-semibold text-white">
                        {t.symbol}
                      </span>
                      {t.partialTaken && (
                        <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-yellow-500/10 text-yellow-400">
                          P
                        </span>
                      )}
                      {isPinned && <Pin className="w-2.5 h-2.5 text-gold" />}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isClosed && (
                        <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400">
                          OPEN
                        </span>
                      )}
                      {exitTag && (
                        <span
                          className={`px-1 py-0.5 rounded text-[10px] font-mono ${
                            t.exitReason === "TP_HIT"
                              ? "bg-bull/10 text-bull"
                              : t.exitReason === "SL_HIT"
                                ? "bg-bear/10 text-bear"
                                : "bg-gray-500/10 text-gray-400"
                          }`}
                        >
                          {exitTag}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Prices row */}
                  <div className="flex items-center justify-between text-[12px] font-mono">
                    <div className="text-gray-400">
                      <span className="text-gray-600">S</span>{" "}
                      {fmtPrice(signalPrice)}
                      <span className="text-gray-600 mx-1">|</span>
                      <span className="text-gray-600">F</span>{" "}
                      {fmtPrice(executedEntry)}
                      {isClosed && (
                        <>
                          <span className="text-gray-600 mx-1">→</span>
                          <span className="text-gray-400">
                            {fmtPrice(executedExit)}
                          </span>
                        </>
                      )}
                    </div>
                    {isClosed && (
                      <div
                        className={`flex items-center gap-0.5 font-semibold ${pnlPositive ? "text-bull" : "text-bear"}`}
                      >
                        {pnlPositive ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        {fmtPnl(pnl)}
                      </div>
                    )}
                  </div>

                  {/* Bottom row: time + pct */}
                  <div className="flex items-center justify-between mt-0.5 text-[11px] font-mono">
                    <span className="text-gray-200 font-medium">
                      {ts ? format(new Date(ts), "MMM dd, HH:mm:ss") : "—"}
                    </span>
                    {typeof slippage === "number" ? (
                      <span
                        className={
                          slippage >= 0 ? "text-bear/70" : "text-bull/70"
                        }
                      >
                        slip {slippage >= 0 ? "+" : ""}
                        {slippage.toFixed(4)}
                      </span>
                    ) : isClosed ? (
                      <span
                        className={
                          pnlPositive ? "text-bull/70" : "text-bear/70"
                        }
                      >
                        {fmtPct(t.pnlPct)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* Sentinel for infinite scroll + loading indicator */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="py-3 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-gold animate-spin" />
                <span className="text-[12px] text-gray-500">
                  Loading more...
                </span>
              </div>
            )}
            {!hasMore && trades.length > 0 && (
              <div className="py-3 text-center text-[11px] text-gray-600">
                All {total} trades loaded
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
