import React from "react";
import {
  Briefcase,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function PortfolioView({
  positions,
  loading,
  closingSymbol,
  showCloseAllConfirm,
  setShowCloseAllConfirm,
  fetchPositions,
  handleClose,
  handleCloseAll,
  totalPL,
  totalValue,
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-gold" />
          <div>
            <h1 className="text-lg font-bold text-white">Portfolio</h1>
            <p className="text-[12px] text-gray-500">
              {positions.length} open position
              {positions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPositions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-terminal-border hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          {positions.length > 0 && (
            <button
              onClick={() => setShowCloseAllConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-bear border border-bear/30 bg-bear/10 hover:bg-bear/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Close All
            </button>
          )}
        </div>
      </div>

      {/* Close All Confirmation */}
      {showCloseAllConfirm && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-bear/30 bg-bear/5">
          <div className="flex items-center gap-2 text-bear mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold">Close All Positions?</span>
          </div>
          <p className="text-[12px] text-gray-400 mb-3">
            This will close all {positions.length} open positions at market
            price.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCloseAll}
              className="px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-bear/20 text-bear border border-bear/30 hover:bg-bear/30 transition-colors"
            >
              Confirm Close All
            </button>
            <button
              onClick={() => setShowCloseAllConfirm(false)}
              className="px-4 py-1.5 rounded-lg text-[11px] font-semibold text-gray-400 border border-terminal-border hover:bg-terminal-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {positions.length > 0 && (
        <div className="px-6 py-3 border-b border-terminal-border flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Total Value
            </span>
            <div className="text-sm font-mono font-bold text-white">
              $
              {totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Unrealized P&L
            </span>
            <div
              className={`text-sm font-mono font-bold ${totalPL >= 0 ? "text-bull" : "text-bear"}`}
            >
              {totalPL >= 0 ? "+" : ""}$
              {totalPL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-terminal-card animate-shimmer"
              />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <Briefcase className="w-12 h-12 mb-3 text-gray-700" />
            <p className="text-sm font-medium">No open positions</p>
            <p className="text-[12px] text-gray-700 mt-1">
              Your positions will appear here when you start trading
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-terminal-border">
                  {[
                    "Symbol",
                    "Side",
                    "Qty",
                    "Avg Entry",
                    "Current",
                    "Market Value",
                    "P&L",
                    "P&L %",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border">
                {positions.map((pos) => {
                  const pl = parseFloat(pos.unrealized_pl || 0);
                  const plPct = parseFloat(pos.unrealized_plpc || 0) * 100;
                  const isUp = pl >= 0;
                  return (
                    <tr
                      key={pos.symbol}
                      className="hover:bg-terminal-hover/50 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${isUp ? "bg-bull" : "bg-bear"}`}
                          />
                          <span className="text-sm font-semibold text-white">
                            {pos.symbol}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            pos.side === "long"
                              ? "bg-bull/10 text-bull"
                              : "bg-bear/10 text-bear"
                          }`}
                        >
                          {(pos.side || "long").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-sm font-mono text-gray-300">
                        {pos.qty}
                      </td>
                      <td className="py-2.5 px-3 text-sm font-mono text-gray-300">
                        ${parseFloat(pos.avg_entry_price || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-sm font-mono text-white">
                        ${parseFloat(pos.current_price || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-sm font-mono text-gray-300">
                        $
                        {parseFloat(pos.market_value || 0).toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2 },
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-sm font-mono font-medium ${isUp ? "text-bull" : "text-bear"}`}
                      >
                        <div className="flex items-center gap-1">
                          {isUp ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {isUp ? "+" : ""}${pl.toFixed(2)}
                        </div>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-sm font-mono font-medium ${isUp ? "text-bull" : "text-bear"}`}
                      >
                        {isUp ? "+" : ""}
                        {plPct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleClose(pos.symbol)}
                          disabled={closingSymbol === pos.symbol}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-bear border border-bear/30 bg-bear/5 hover:bg-bear/15 transition-colors disabled:opacity-50"
                        >
                          {closingSymbol === pos.symbol
                            ? "Closing..."
                            : "Close"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
