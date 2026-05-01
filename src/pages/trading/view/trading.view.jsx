import React, { useState, useRef, useEffect } from "react";
import TradeTable from "@/components/dashboard/TradeTable";
import TradeStatsPanel from "@/components/dashboard/TradeStatsPanel";
import BotActivityFeed from "@/components/dashboard/BotActivityFeed";
import TradeHistoryPanel from "@/components/trading/TradeHistoryPanel";
import TradeHoverCard from "@/components/trading/TradeHoverCard";
import { SettingLabel } from "@/components/ui/tooltip";
import {
  Activity,
  Wifi,
  WifiOff,
  Zap,
  ZapOff,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  PanelRightOpen,
  PanelRightClose,
  PanelLeftOpen,
  PanelLeftClose,
  History,
  Clock,
  TrendingUp,
  TrendingDown,
  Trophy,
  Ruler,
} from "lucide-react";
// Quantity + Dollar Amount inputs — each tracks its own string state so the
// cursor never jumps while the user is typing. They sync to each other on
// blur (when the user clicks away) instead of on every keystroke.
const QtyDollarInputs = ({ qty, currentPrice, onQtyChange }) => {
  const [qtyStr, setQtyStr] = useState(String(qty));
  const [dollarStr, setDollarStr] = useState("");
  const [editingField, setEditingField] = useState(null); // 'qty' | 'dollar' | null

  // Sync from parent when NOT actively typing
  useEffect(() => {
    if (editingField !== "qty") {
      setQtyStr(String(qty));
    }
    if (editingField !== "dollar" && currentPrice > 0) {
      const parsed = parseFloat(qty);
      if (!isNaN(parsed)) setDollarStr((currentPrice * parsed).toFixed(2));
    }
  }, [qty, currentPrice]);

  const handleQtyChange = (e) => {
    const val = e.target.value;
    setQtyStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onQtyChange(val);
      if (currentPrice > 0) setDollarStr((currentPrice * num).toFixed(2));
    }
  };

  const handleDollarChange = (e) => {
    const val = e.target.value;
    setDollarStr(val);
    const dollars = parseFloat(val);
    if (!isNaN(dollars) && dollars > 0 && currentPrice > 0) {
      const newQty = (dollars / currentPrice).toFixed(6);
      setQtyStr(newQty);
      onQtyChange(newQty);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <SettingLabel
          label="Quantity"
          tooltip="Number of shares or coins to buy per trade"
        />
        <input
          type="text"
          inputMode="decimal"
          value={qtyStr}
          onFocus={() => setEditingField("qty")}
          onBlur={() => setEditingField(null)}
          onChange={handleQtyChange}
          className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-gold/50 transition-colors"
        />
        {currentPrice > 0 && parseFloat(qtyStr) > 0 && (
          <div className="text-[11px] font-mono text-gray-500">
            ≈ ${(currentPrice * parseFloat(qtyStr)).toFixed(2)}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <SettingLabel
          label="Dollar Amount"
          tooltip="Enter $ amount — auto-calculates quantity based on current price"
        />
        <input
          type="text"
          inputMode="decimal"
          value={dollarStr}
          onFocus={() => setEditingField("dollar")}
          onBlur={() => setEditingField(null)}
          onChange={handleDollarChange}
          placeholder={currentPrice > 0 ? "" : "No price yet"}
          disabled={!currentPrice}
          className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-gold focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-40"
        />
      </div>
    </div>
  );
};

// P&L statistics panel for the right sidebar
function PnLStatsPanel({ stats }) {
  if (!stats) {
    return (
      <div className="p-3 border-b border-terminal-border flex-shrink-0">
        <span className="text-[12px] text-gray-500 uppercase tracking-wider font-semibold block mb-2">
          P&amp;L Stats
        </span>
        <div className="text-[11px] text-gray-600">No trades yet</div>
      </div>
    );
  }

  const totalPnl = stats.totalPnl ?? 0;
  const totalPnlPct = stats.totalPnlPct ?? 0;
  const todayPnl = stats.todayPnl ?? 0;
  const todayPnlPct = stats.todayPnlPct ?? 0;
  const winRate = stats.winRate ?? 0;
  const isProfit = totalPnl >= 0;
  const isTodayProfit = todayPnl >= 0;

  return (
    <div className="p-3 border-b border-terminal-border flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-gray-500 uppercase tracking-wider font-semibold">
          P&amp;L Stats
        </span>
        <div
          className={`flex items-center gap-1 text-[12px] font-bold ${isProfit ? "text-bull" : "text-bear"}`}
        >
          {isProfit ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isProfit ? "+" : ""}
          {totalPnlPct.toFixed(2)}%
        </div>
      </div>

      {/* Total P&L row */}
      <div
        className={`p-2 rounded-lg border mb-2 ${
          isProfit ? "bg-bull/5 border-bull/20" : "bg-bear/5 border-bear/20"
        }`}
      >
        <div className="text-[11px] uppercase text-gray-500 font-semibold mb-0.5">
          Total Profit / Loss
        </div>
        <div
          className={`text-lg font-mono font-bold ${isProfit ? "text-bull" : "text-bear"}`}
        >
          {isProfit ? "+" : ""}${totalPnl.toFixed(2)}
        </div>
        <div
          className={`text-[12px] font-mono ${isProfit ? "text-bull/70" : "text-bear/70"}`}
        >
          {isProfit ? "+" : ""}
          {totalPnlPct.toFixed(2)}%
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[12px]">
        <Stat
          label="Today"
          value={`${isTodayProfit ? "+" : ""}$${todayPnl.toFixed(2)}`}
          sub={`${isTodayProfit ? "+" : ""}${todayPnlPct.toFixed(2)}%`}
          color={isTodayProfit ? "bull" : "bear"}
        />
        <Stat
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          sub={`${stats.winCount}W / ${stats.lossCount}L`}
          color={winRate >= 50 ? "bull" : "bear"}
          icon={Trophy}
        />
        <Stat
          label="Total Trades"
          value={`${stats.totalTrades || 0}`}
          sub={`${stats.openTrades || 0} open`}
        />
        <Stat
          label="Avg P&L"
          value={`${(stats.avgPnlPct || 0).toFixed(2)}%`}
          sub={`Best: ${(stats.bestPnlPct || 0).toFixed(2)}%`}
          color={(stats.avgPnlPct || 0) >= 0 ? "bull" : "bear"}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color, icon: Icon }) {
  const colorClass =
    color === "bull"
      ? "text-bull"
      : color === "bear"
        ? "text-bear"
        : "text-white";
  return (
    <div className="p-1.5 rounded bg-terminal-bg border border-terminal-border">
      <div className="flex items-center gap-1 text-[11px] uppercase text-gray-500 font-semibold">
        {Icon && <Icon className="w-2.5 h-2.5" />}
        {label}
      </div>
      <div className={`text-[12px] font-mono font-bold ${colorClass}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-500 font-mono">{sub}</div>}
    </div>
  );
}

// US market: 9:30 AM – 4:00 PM ET = 13:30 – 20:00 UTC = 19:00 – 01:30 IST
function getMarketStatus() {
  const now = new Date();
  const dayUTC = now.getUTCDay(); // 0 = Sun, 6 = Sat
  const minutesUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
  // Friday after 20:00 UTC = market closed for weekend
  const isWeekend = dayUTC === 0 || dayUTC === 6;
  const inSession = minutesUTC >= 810 && minutesUTC < 1200; // 13:30–20:00 UTC
  if (isWeekend) return { open: false, label: "WEEKEND" };
  if (inSession) return { open: true, label: "OPEN" };
  return { open: false, label: "CLOSED" };
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const istTime = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const istDate = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
  const utcTime = now.toLocaleString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Countdown to next 1-minute bar boundary (60 - current second)
  const secondsLeft = 60 - now.getSeconds();
  const countdown = String(secondsLeft).padStart(2, "0");

  const market = getMarketStatus();

  return (
    <div className="h-7 border-t border-terminal-border bg-terminal-card/40 flex items-center justify-between px-3 text-[11px] font-mono flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Clock className="w-3 h-3 text-gold" />
          <span className="text-white">{istTime}</span>
          <span className="text-gray-600">IST</span>
        </div>
        <div className="hidden md:flex items-center gap-1 text-gray-500">
          <span>{istDate}</span>
        </div>
        <div className="hidden lg:flex items-center gap-1 text-gray-600">
          <span>·</span>
          <span>{utcTime} UTC</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Next bar:</span>
          <span
            className={`px-1.5 py-0.5 rounded font-bold tabular-nums ${
              secondsLeft <= 5
                ? "bg-gold/20 text-gold"
                : "bg-terminal-bg text-gray-300"
            }`}
          >
            00:{countdown}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Market:</span>
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${
              market.open ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${market.open ? "bg-bull animate-pulse" : "bg-bear"}`}
            />
            {market.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TradingView({
  // Core data
  symbol,
  setSymbol,
  activeSymbol,
  timeframe,
  historicalData,
  liveBar,
  isLoading,
  connectionStatus,
  isAutoTrading,
  tradeLogs,
  botActivities,
  // Derived
  currentPrice,
  liveQuote,
  priceChange,
  priceChangePct,
  isUp,
  // UI state
  activeTab,
  setActiveTab,
  searchOpen,
  setSearchOpen,
  tradeFlash,
  drawerOpen,
  setDrawerOpen,
  leftSidebarOpen,
  // Scalping
  scalpSettings,
  scalpPositionState,
  activeScalpLevels,
  onLevelsChange,
  tradeStats,
  hoveredTrade,
  pinnedTrade,
  onHoverTrade,
  onLeaveTrade,
  onToggleTradePin,
  onUnpinTrade,
  // Refs
  searchRef,
  // Handlers
  handleSymbolSubmit,
  handleWatchlistClick,
  handleToggleAutoTrade,
  handleScalpSettingChange,
  handleManualClose,
  handleManualTestBuy,
  geminiStatus,
  handlePeriodSelect,
  handleFilterChange,
  handleResetFilters,
  handleApplyFilters,
  // Constants
  activePeriod,
  periods,
  watchlist,
  // Components
  Chart,
}) {
  const [measureMode, setMeasureMode] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Trade Flash Overlay */}
      {tradeFlash && (
        <div
          className={`fixed inset-0 z-[100] pointer-events-none animate-trade-flash ${
            tradeFlash === "BUY" ? "bg-bull" : "bg-bear"
          }`}
        />
      )}

      {/* ═══════════ TOP NAV BAR ═══════════ */}
      <header className="h-12 border-b border-terminal-border bg-terminal-card/80 backdrop-blur-xl flex-shrink-0 z-50">
        <div className="h-full flex items-center justify-between px-3">
          {/* Left: Symbol */}
          <div className="flex items-center gap-3">
            {/* Symbol Search */}
            <div className="relative" ref={searchRef}>
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-terminal-bg border border-terminal-border hover:border-terminal-accent transition-colors"
              >
                <Search className="w-3 h-3 text-gray-500" />
                <span className="font-semibold text-sm text-white">
                  {activeSymbol}
                </span>
                <span
                  className={`text-[11px] font-mono ${isUp ? "text-bull" : "text-bear"}`}
                >
                  {isUp ? "+" : ""}
                  {priceChangePct.toFixed(2)}%
                </span>
              </button>

              {searchOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-terminal-card border border-terminal-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                  <form onSubmit={handleSymbolSubmit} className="p-2">
                    <input
                      autoFocus
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="Search symbol..."
                      className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50"
                    />
                  </form>
                  <div className="px-2 pb-2">
                    <p className="text-[12px] uppercase tracking-wider text-gray-600 px-2 py-1">
                      Popular
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {watchlist.map((sym) => (
                        <button
                          key={sym}
                          onClick={() => {
                            handleWatchlistClick(sym);
                            setSearchOpen(false);
                          }}
                          className={`text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                            sym === activeSymbol
                              ? "bg-gold/10 text-gold border border-gold/20"
                              : "hover:bg-terminal-hover text-gray-400 hover:text-white"
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Price Display — Last Trade is the same source the chart line AND
                Alpaca's native bracket SL/TP trigger use. */}
            <div className="hidden md:flex items-center gap-2.5">
              <span
                className="text-[12px] uppercase text-gray-500 font-semibold"
                title="Last Trade — same reference Alpaca uses to trigger SL/TP brackets"
              >
                Last (trigger)
              </span>
              <span className={`text-lg font-mono font-bold ${isUp ? "text-bull" : "text-bear"}`}>
                ${currentPrice.toFixed(2)}
              </span>
              <div
                className={`flex items-center gap-0.5 text-[11px] font-mono ${isUp ? "text-bull" : "text-bear"}`}
              >
                {isUp ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {isUp ? "+" : ""}
                {priceChange.toFixed(2)} ({isUp ? "+" : ""}
                {priceChangePct.toFixed(2)}%)
              </div>
              {liveQuote && (
                <div className="hidden lg:flex items-center gap-1.5 text-[12px] font-mono text-gray-400">
                  <span>
                    Bid: <span className="text-bull">{liveQuote.bid.toFixed(2)}</span>
                  </span>
                  <span>|</span>
                  <span>
                    Ask: <span className="text-bear">{liveQuote.ask.toFixed(2)}</span>
                  </span>
                  <span>|</span>
                  <span>Spread: {(liveQuote.ask - liveQuote.bid).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Status + Controls */}
          <div className="flex items-center gap-2">
            {/* Last trade */}
            {tradeLogs.length > 0 && (
              <div
                className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-bold ${
                  tradeLogs[0].decision === "BUY"
                    ? "bg-bull/10 text-bull border border-bull/20"
                    : "bg-bear/10 text-bear border border-bear/20"
                }`}
              >
                {tradeLogs[0].decision === "BUY" ? (
                  <ArrowUpRight className="w-2.5 h-2.5" />
                ) : (
                  <ArrowDownRight className="w-2.5 h-2.5" />
                )}
                {tradeLogs[0].decision}
              </div>
            )}

            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-medium ${
                connectionStatus === "connected"
                  ? "bg-bull/10 text-bull"
                  : "bg-bear/10 text-bear"
              }`}
            >
              {connectionStatus === "connected" ? (
                <>
                  <Wifi className="w-2.5 h-2.5" /> Live
                </>
              ) : (
                <>
                  <WifiOff className="w-2.5 h-2.5" /> Offline
                </>
              )}
            </div>

            <button
              onClick={handleToggleAutoTrade}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                isAutoTrading
                  ? "bg-bull/20 text-bull border border-bull/30 animate-glow"
                  : "bg-terminal-bg text-gray-400 border border-terminal-border hover:border-gray-600 hover:text-white"
              }`}
            >
              {isAutoTrading ? (
                <Zap className="w-3 h-3" />
              ) : (
                <ZapOff className="w-3 h-3" />
              )}
              {isAutoTrading ? "Scalping" : "Bot Off"}
            </button>

            {/* Drawer Toggle */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                drawerOpen
                  ? "bg-gold/20 text-gold border border-gold/30"
                  : "bg-terminal-bg text-gray-400 border border-terminal-border hover:border-gold/30 hover:text-gold"
              }`}
            >
              {drawerOpen ? (
                <PanelRightClose className="w-3.5 h-3.5" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Panel</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Sidebar: Trade History (collapsible) ── */}
        {leftSidebarOpen && (
          <aside
            className={`flex-shrink-0 border-r border-terminal-border bg-terminal-card/30 overflow-hidden hidden lg:flex flex-col transition-[width] duration-200 ${
              leftPanelCollapsed ? "w-10" : "w-64"
            }`}
          >
            {leftPanelCollapsed ? (
              <button
                onClick={() => setLeftPanelCollapsed(false)}
                className="h-full w-full flex flex-col items-center justify-start pt-3 gap-2 text-gray-500 hover:text-white hover:bg-terminal-hover transition-colors group"
                title="Expand trade history"
              >
                <PanelLeftOpen className="w-4 h-4" />
                <History className="w-4 h-4" />
                <span
                  className="text-[11px] uppercase tracking-widest font-semibold"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  Trades
                </span>
              </button>
            ) : (
              <>
                {/* Collapse bar */}
                <div className="h-8 border-b border-terminal-border flex items-center justify-between px-2 flex-shrink-0 bg-terminal-card/50">
                  <div className="flex items-center gap-1.5">
                    <History className="w-3 h-3 text-gray-500" />
                    <span className="text-[12px] uppercase tracking-widest text-gray-500 font-semibold">
                      History
                    </span>
                  </div>
                  <button
                    onClick={() => setLeftPanelCollapsed(true)}
                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-terminal-hover transition-colors"
                    title="Collapse"
                  >
                    <PanelLeftClose className="w-3 h-3" />
                  </button>
                </div>

                {/* Trade History Panel */}
                <div className="flex-1 min-h-0">
                  <TradeHistoryPanel
                    symbol={activeSymbol}
                    liveLogs={tradeLogs}
                    onHoverTrade={onHoverTrade}
                    onLeaveTrade={onLeaveTrade}
                    onClickTrade={onToggleTradePin}
                    hoveredTradeId={hoveredTrade?._hoverKey}
                    pinnedTradeId={pinnedTrade?._hoverKey}
                  />
                </div>
              </>
            )}
          </aside>
        )}
        {/* Old left sidebar hidden but preserved below */}
        {false && leftSidebarOpen && (
          <aside className="w-44 flex-shrink-0 border-r border-terminal-border bg-terminal-card/30 overflow-hidden hidden lg:block">
            <div className="p-2.5">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-600 font-semibold mb-2 px-0.5">
                🤖 AI Decision
              </h3>
              <div className="space-y-1.5">
                {!geminiStatus?.analyzedAt ? (
                  <div className="text-[11px] text-gray-600">
                    Waiting for AI analysis...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-bold ${
                          geminiStatus.action === "BUY" &&
                          geminiStatus.shouldTrade
                            ? "text-bull"
                            : geminiStatus.action === "SELL" &&
                                geminiStatus.shouldTrade
                              ? "text-bear"
                              : "text-gray-400"
                        }`}
                      >
                        {geminiStatus.action === "BUY" &&
                        geminiStatus.shouldTrade
                          ? "🟢 BUY"
                          : geminiStatus.action === "SELL" &&
                              geminiStatus.shouldTrade
                            ? "🔴 SELL"
                            : "⏸ HOLD"}
                      </span>
                      <span
                        className={`text-[11px] font-bold font-mono ${
                          geminiStatus.confidence >= 70
                            ? "text-bull"
                            : geminiStatus.confidence >= 50
                              ? "text-yellow-400"
                              : "text-gray-500"
                        }`}
                      >
                        {geminiStatus.confidence}%
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {geminiStatus.reason}
                    </p>
                    <div className="pt-1 border-t border-terminal-border text-[10px] text-gray-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Calls</span>
                        <span>{geminiStatus.totalCalls || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Blocked</span>
                        <span>{geminiStatus.totalBlocked || 0}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Symbols */}
            <div className="p-2.5 border-t border-terminal-border">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-600 font-semibold mb-1.5 px-0.5">
                Quick Switch
              </h3>
              <div className="grid grid-cols-2 gap-1">
                {watchlist.slice(0, 6).map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleWatchlistClick(sym)}
                    className={`px-1.5 py-1 rounded text-[12px] font-medium transition-colors ${
                      sym === activeSymbol
                        ? "bg-gold/10 text-gold border border-gold/20"
                        : "text-gray-500 hover:text-white hover:bg-terminal-hover"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* ── Center: Chart + Tools ── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="h-9 border-b border-terminal-border bg-terminal-card/20 flex items-center px-3 gap-1 flex-shrink-0">
            {periods.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePeriodSelect(p)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  activePeriod === p.label
                    ? "bg-terminal-accent text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-terminal-hover"
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="h-3.5 w-px bg-terminal-border mx-1.5" />

            <button
              onClick={() => setActiveTab("chart")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                activeTab === "chart"
                  ? "bg-terminal-accent text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setActiveTab("trades")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                activeTab === "trades"
                  ? "bg-terminal-accent text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Trades
              {tradeLogs.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-gold/20 text-gold text-[11px] flex items-center justify-center font-bold">
                  {tradeLogs.length}
                </span>
              )}
            </button>

            <div className="h-3.5 w-px bg-terminal-border mx-1" />

            <button
              onClick={() => {
                setMeasureMode(!measureMode);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                measureMode
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-terminal-hover"
              }`}
              title="Measure tool — click & drag on chart (Esc to cancel)"
            >
              <Ruler className="w-3 h-3" />
              Measure
            </button>

            {isLoading && (
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                Loading...
              </div>
            )}
          </div>

          {/* ── Content Area ── */}
          {activeTab === "chart" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0">
                  {/* Active trade for lines+markers: pinned wins over transient hover */}
                  <Chart
                    data={historicalData}
                    liveBar={liveBar}
                    scalpLevels={activeScalpLevels}
                    hoveredTrade={pinnedTrade || hoveredTrade}
                    measureMode={measureMode}
                    onMeasureEnd={() => setMeasureMode(false)}
                    onLevelsChange={onLevelsChange}
                  />
                </div>
                {/* Floating card — shows for pinned (persistent) OR hover (transient) */}
                {(pinnedTrade || hoveredTrade) && (
                  <div className="absolute top-2 right-2 z-20">
                    <TradeHoverCard
                      trade={pinnedTrade || hoveredTrade}
                      pinned={!!pinnedTrade}
                      onClose={pinnedTrade ? onUnpinTrade : undefined}
                    />
                  </div>
                )}
              </div>
              <div className="h-[3px] bg-terminal-border hover:bg-gold/30 cursor-row-resize flex-shrink-0 flex items-center justify-center group">
                <div className="w-8 h-[2px] rounded-full bg-terminal-accent group-hover:bg-gold/50 transition-colors" />
              </div>
              <LiveClock />
            </div>
          ) : activeTab === "trades" ? (
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <TradeStatsPanel stats={tradeStats} />
              <TradeTable liveLogs={tradeLogs} symbol={activeSymbol} />
            </div>
          ) : null}
        </main>

        {/* ── Right Drawer: Scalping Bot ── */}
        <aside
          className={`flex-shrink-0 border-l border-terminal-border bg-terminal-card/30 overflow-hidden transition-all duration-300 ease-in-out ${
            drawerOpen ? "w-80" : "w-0"
          }`}
        >
          <div className="w-80 h-full flex flex-col overflow-y-auto">
            {/* Price Header */}
            <div className="p-3 border-b border-terminal-border flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-gray-500 uppercase tracking-wider font-semibold">
                  {activeSymbol}
                </span>
                <span
                  className={`text-[12px] px-1.5 py-0.5 rounded font-semibold ${
                    isUp ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {priceChangePct.toFixed(2)}%
                </span>
              </div>
              <div
                className={`text-2xl font-mono font-bold tracking-tight ${isUp ? "text-bull" : "text-bear"}`}
              >
                ${currentPrice.toFixed(2)}
                <span
                  className="ml-2 text-[12px] uppercase text-gray-500 font-semibold tracking-wider"
                  title="Last Trade — same reference Alpaca uses to trigger SL/TP"
                >
                  Last (trigger)
                </span>
              </div>
              {liveQuote && (
                <div className="mt-1 text-[12px] font-mono text-gray-400 leading-relaxed">
                  Bid: <span className="text-bull">{liveQuote.bid.toFixed(2)}</span>
                  {" | "}
                  Ask: <span className="text-bear">{liveQuote.ask.toFixed(2)}</span>
                  {" | "}
                  Spread: {(liveQuote.ask - liveQuote.bid).toFixed(2)}
                </div>
              )}
              <div className="mt-1 text-[11px] text-gray-500 italic leading-tight">
                SL/TP trigger on Last Trade (Alpaca server-side). Fill price = Bid/Ask.
              </div>
            </div>

            {/* Bot Control */}
            <div className="p-3 border-b border-terminal-border flex-shrink-0">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[12px] text-gray-500 uppercase tracking-wider font-semibold">
                  Scalping Bot
                </span>
                <div
                  className={`flex items-center gap-1.5 text-[12px] font-medium ${
                    isAutoTrading ? "text-bull" : "text-gray-600"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${isAutoTrading ? "bg-bull animate-pulse" : "bg-gray-600"}`}
                  />
                  {isAutoTrading ? "ACTIVE" : "IDLE"}
                </div>
              </div>

              <button
                onClick={handleToggleAutoTrade}
                disabled={scalpPositionState.pendingOrder}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                  isAutoTrading
                    ? "bg-bear/20 text-bear border border-bear/30 hover:bg-bear/30"
                    : "bg-bull/20 text-bull border border-bull/30 hover:bg-bull/30"
                }`}
              >
                {isAutoTrading ? "STOP SCALPING" : "START SCALPING"}
              </button>

              {/* Manual TEST BUY — places a market BUY at current price (for testing) */}
              <button
                onClick={handleManualTestBuy}
                disabled={
                  scalpPositionState.isOpen ||
                  scalpPositionState.pendingOrder ||
                  !currentPrice
                }
                title={
                  scalpPositionState.isOpen
                    ? "A position is already open — close it first"
                    : !currentPrice
                      ? "Waiting for live price..."
                      : `Place a test BUY at $${currentPrice?.toFixed(2)} with current TP/SL settings`
                }
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold transition-all bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                🧪 TEST BUY{" "}
                {currentPrice ? `@ $${currentPrice.toFixed(2)}` : ""}
              </button>

              <div
                className={`mt-1.5 flex items-center justify-center gap-1.5 text-[12px] ${
                  isAutoTrading ? "text-bull" : "text-gray-600"
                }`}
              >
                <Activity className="w-3 h-3" />
                {isAutoTrading
                  ? "🤖 Gemini AI making decisions"
                  : "Enable to start scalping"}
              </div>

              {/* Scalp Position Status with Manual Close button */}
              {scalpPositionState.isOpen && activeScalpLevels && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-gold/10 border border-gold/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-bold text-gold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                      POSITION OPEN ({activeScalpLevels.side})
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      qty {activeScalpLevels.qty || scalpSettings.qty}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] mb-2">
                    <div>
                      <div className="text-gray-500">Entry</div>
                      <div className="text-gold font-mono font-bold">
                        ${activeScalpLevels.entry?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">TP</div>
                      <div className="text-bull font-mono font-bold">
                        ${activeScalpLevels.tp?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">SL</div>
                      <div className="text-bear font-mono font-bold">
                        ${activeScalpLevels.sl?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleManualClose}
                    disabled={scalpPositionState.pendingOrder}
                    className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-bear/20 text-bear border border-bear/40 hover:bg-bear/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    SELL NOW (Close Position)
                  </button>
                </div>
              )}
              {scalpPositionState.pendingOrder && (
                <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[12px] font-bold text-blue-400">
                    ORDER PENDING...
                  </span>
                </div>
              )}
            </div>

            {/* Scalping Settings */}
            <div className="p-3 border-b border-terminal-border flex-shrink-0">
              <span className="text-[12px] text-gray-500 uppercase tracking-wider font-semibold block mb-2">
                Scalping Settings
              </span>
              <div className="space-y-2">
                {/* Auto SL/TP Toggle */}
                <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
                  <label className="flex items-center justify-between cursor-pointer text-[12px]">
                    <div className="flex flex-col">
                      <span className="text-gray-300 font-semibold">
                        🤖 Auto SL/TP
                      </span>
                      <span className="text-[10px] text-gray-600">
                        {scalpSettings.autoSlTp
                          ? "AI decides SL & TP levels"
                          : "Manual / ATR-based levels"}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!scalpSettings.autoSlTp}
                      onChange={(e) =>
                        handleScalpSettingChange("autoSlTp", e.target.checked)
                      }
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                  </label>
                </div>

                <div
                  className={`grid grid-cols-2 gap-2 ${scalpSettings.autoSlTp ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <div className="space-y-1">
                    <SettingLabel
                      label="Take Profit %"
                      tooltip="Enter as percent: 0.5 = 0.5%, 1 = 1%, 5 = 5%. Auto-sell when price rises this much from entry."
                    />
                    <div className="relative">
                      <input
                        type="number"
                        value={scalpSettings.takeProfitPct}
                        onChange={(e) =>
                          handleScalpSettingChange(
                            "takeProfitPct",
                            e.target.value,
                          )
                        }
                        min="0.05"
                        max="10"
                        step="0.1"
                        placeholder="0.5"
                        disabled={scalpSettings.autoSlTp}
                        className="w-full bg-terminal-bg border border-terminal-border rounded-lg pl-2.5 pr-6 py-1.5 text-sm font-mono text-bull focus:outline-none focus:border-bull/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-bull/60 pointer-events-none">%</span>
                    </div>
                    {currentPrice > 0 && !scalpSettings.autoSlTp && parseFloat(scalpSettings.takeProfitPct) > 0 && (
                      <div className="text-[12px] font-mono text-bull/70">
                        +{scalpSettings.takeProfitPct}% → $
                        {(
                          currentPrice *
                          (1 + parseFloat(scalpSettings.takeProfitPct) / 100)
                        ).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <SettingLabel
                      label="Stop Loss %"
                      tooltip="Enter as percent: 0.3 = 0.3%, 1 = 1%. Auto-sell when price drops this much from entry."
                    />
                    <div className="relative">
                      <input
                        type="number"
                        value={scalpSettings.stopLossPct}
                        onChange={(e) =>
                          handleScalpSettingChange("stopLossPct", e.target.value)
                        }
                        min="0.05"
                        max="10"
                        step="0.1"
                        placeholder="0.3"
                        disabled={scalpSettings.autoSlTp}
                        className="w-full bg-terminal-bg border border-terminal-border rounded-lg pl-2.5 pr-6 py-1.5 text-sm font-mono text-bear focus:outline-none focus:border-bear/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-bear/60 pointer-events-none">%</span>
                    </div>
                    {currentPrice > 0 && !scalpSettings.autoSlTp && parseFloat(scalpSettings.stopLossPct) > 0 && (
                      <div className="text-[12px] font-mono text-bear/70">
                        −{scalpSettings.stopLossPct}% → $
                        {(
                          currentPrice *
                          (1 - parseFloat(scalpSettings.stopLossPct) / 100)
                        ).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                <QtyDollarInputs
                  qty={scalpSettings.qty}
                  currentPrice={currentPrice}
                  onQtyChange={(val) => handleScalpSettingChange("qty", val)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <SettingLabel
                      label="Wait Between Trades"
                      tooltip="Seconds to wait after a trade before allowing the next one (prevents spam)"
                    />
                    <input
                      type="number"
                      value={scalpSettings.cooldownMs / 1000}
                      onChange={(e) =>
                        handleScalpSettingChange(
                          "cooldownMs",
                          parseFloat(e.target.value) * 1000,
                        )
                      }
                      min="1"
                      max="60"
                      step="1"
                      className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                </div>

                {/* ── Smart features toggles ── */}
                <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border space-y-2">
                  {!scalpSettings.partialTpEnabled && (
                    <label className="flex items-center justify-between cursor-pointer text-[12px]">
                      <div className="flex flex-col">
                        <span className="text-gray-300 font-semibold">
                          🔒 Trailing Stop
                        </span>
                        <span className="text-[10px] text-gray-600">
                          Move SL to break-even at half-TP
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!scalpSettings.trailingStopEnabled}
                        onChange={(e) =>
                          handleScalpSettingChange(
                            "trailingStopEnabled",
                            e.target.checked,
                          )
                        }
                        className="w-4 h-4 accent-gold cursor-pointer"
                      />
                    </label>
                  )}

                  <label className="flex items-center justify-between cursor-pointer text-[12px]">
                    <div className="flex flex-col">
                      <span className="text-gray-300 font-semibold">
                        📐 Partial Take Profit
                      </span>
                      <span className="text-[10px] text-gray-600">
                        Close 50% at half-TP, SL → break-even
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!scalpSettings.partialTpEnabled}
                      onChange={(e) =>
                        handleScalpSettingChange(
                          "partialTpEnabled",
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4 accent-gold cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Gemini AI Status — only in AI mode */}
            <div className="p-3 border-b border-terminal-border flex-shrink-0">
              <span className="text-[12px] text-gray-500 uppercase tracking-wider font-semibold block mb-2">
                🤖 Gemini AI
              </span>
              <div className="p-2.5 rounded-lg bg-terminal-bg border border-terminal-border space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-bold ${
                      geminiStatus?.action === "BUY" &&
                      geminiStatus?.confidence >=
                        (geminiStatus?.minConfidence || 70)
                        ? "text-bull"
                        : "text-gray-400"
                    }`}
                  >
                    {geminiStatus?.action === "BUY" &&
                    geminiStatus?.confidence >=
                      (geminiStatus?.minConfidence || 70)
                      ? "🟢 BUY"
                      : "⏸ WAIT"}
                  </span>
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      geminiStatus?.confidence >= 70
                        ? "bg-bull/10 text-bull"
                        : geminiStatus?.confidence >= 40
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-gray-500/10 text-gray-500"
                    }`}
                  >
                    {geminiStatus?.confidence || 0}%
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 leading-relaxed">
                  {geminiStatus?.reason || "Waiting for first signal..."}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-600 font-mono">
                  <span>
                    {geminiStatus?.totalCalls || 0} calls ·{" "}
                    {geminiStatus?.totalBlocked || 0} blocked
                  </span>
                  {geminiStatus?.analyzedAt && (
                    <span>
                      {new Date(geminiStatus.analyzedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Activity Feed — natural height, scrolls with whole panel */}
            <div className="flex flex-col flex-shrink-0">
              <div className="px-3 py-2 border-b border-terminal-border flex items-center justify-between bg-terminal-card/40 sticky top-0 z-10">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-gold" />
                  <span className="text-[12px] text-gray-500 uppercase tracking-wider font-semibold">
                    Activity Feed
                  </span>
                </div>
                <span className="text-[12px] text-gray-600 font-mono">
                  {botActivities.length} event
                  {botActivities.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="p-2.5">
                {botActivities.length === 0 ? (
                  <div className="text-center py-6 text-[11px] text-gray-600">
                    Waiting for bot activity...
                  </div>
                ) : (
                  <BotActivityFeed activities={botActivities} />
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FilterInput({ label, type, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <label className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer"
      >
        {options.map(([val, text]) => (
          <option key={val} value={val}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
