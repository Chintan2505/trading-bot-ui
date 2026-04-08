import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import TradeTable from '@/components/dashboard/TradeTable';
import BotActivityFeed from '@/components/dashboard/BotActivityFeed';
import {
  Activity, Wifi, WifiOff, Zap, ZapOff,
  BarChart3, ArrowUpRight, ArrowDownRight, Search,
  SlidersHorizontal, X, RotateCcw, PanelRightOpen, PanelRightClose,
  Clock, TrendingUp, TrendingDown, Trophy,
} from 'lucide-react';

// P&L statistics panel for the right sidebar
function PnLStatsPanel({ stats }) {
  if (!stats) {
    return (
      <div className="p-3 border-b border-terminal-border flex-shrink-0">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-2">P&amp;L Stats</span>
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
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">P&amp;L Stats</span>
        <div className={`flex items-center gap-1 text-[10px] font-bold ${isProfit ? 'text-bull' : 'text-bear'}`}>
          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isProfit ? '+' : ''}{totalPnlPct.toFixed(2)}%
        </div>
      </div>

      {/* Total P&L row */}
      <div className={`p-2 rounded-lg border mb-2 ${
        isProfit ? 'bg-bull/5 border-bull/20' : 'bg-bear/5 border-bear/20'
      }`}>
        <div className="text-[9px] uppercase text-gray-500 font-semibold mb-0.5">Total Profit / Loss</div>
        <div className={`text-lg font-mono font-bold ${isProfit ? 'text-bull' : 'text-bear'}`}>
          {isProfit ? '+' : ''}${totalPnl.toFixed(2)}
        </div>
        <div className={`text-[10px] font-mono ${isProfit ? 'text-bull/70' : 'text-bear/70'}`}>
          {isProfit ? '+' : ''}{totalPnlPct.toFixed(2)}%
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <Stat label="Today" value={`${isTodayProfit ? '+' : ''}$${todayPnl.toFixed(2)}`}
              sub={`${isTodayProfit ? '+' : ''}${todayPnlPct.toFixed(2)}%`}
              color={isTodayProfit ? 'bull' : 'bear'} />
        <Stat label="Win Rate" value={`${winRate.toFixed(1)}%`}
              sub={`${stats.winCount}W / ${stats.lossCount}L`}
              color={winRate >= 50 ? 'bull' : 'bear'} icon={Trophy} />
        <Stat label="Total Trades" value={`${stats.totalTrades || 0}`}
              sub={`${stats.openTrades || 0} open`} />
        <Stat label="Avg P&L" value={`${(stats.avgPnlPct || 0).toFixed(2)}%`}
              sub={`Best: ${(stats.bestPnlPct || 0).toFixed(2)}%`}
              color={(stats.avgPnlPct || 0) >= 0 ? 'bull' : 'bear'} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color, icon: Icon }) {
  const colorClass = color === 'bull' ? 'text-bull' : color === 'bear' ? 'text-bear' : 'text-white';
  return (
    <div className="p-1.5 rounded bg-terminal-bg border border-terminal-border">
      <div className="flex items-center gap-1 text-[9px] uppercase text-gray-500 font-semibold">
        {Icon && <Icon className="w-2.5 h-2.5" />}
        {label}
      </div>
      <div className={`text-[12px] font-mono font-bold ${colorClass}`}>{value}</div>
      {sub && <div className="text-[9px] text-gray-500 font-mono">{sub}</div>}
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
  if (isWeekend) return { open: false, label: 'WEEKEND' };
  if (inSession) return { open: true, label: 'OPEN' };
  return { open: false, label: 'CLOSED' };
}

function LiveClock({ symbol }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const istTime = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const istDate = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short', day: '2-digit', month: 'short', year: '2-digit',
  });
  const utcTime = now.toLocaleString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  // Countdown to next 1-minute bar boundary (60 - current second)
  const secondsLeft = 60 - now.getSeconds();
  const countdown = String(secondsLeft).padStart(2, '0');

  const isCryptoSymbol = typeof symbol === 'string' && symbol.includes('/');
  const market = isCryptoSymbol
    ? { open: true, label: '24/7' }
    : getMarketStatus();

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
          <span className={`px-1.5 py-0.5 rounded font-bold tabular-nums ${
            secondsLeft <= 5 ? 'bg-gold/20 text-gold' : 'bg-terminal-bg text-gray-300'
          }`}>
            00:{countdown}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Market:</span>
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${
            market.open ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${market.open ? 'bg-bull animate-pulse' : 'bg-bear'}`} />
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
  tradeMarkers,
  botActivities,
  strategyData,
  // Derived
  currentPrice,
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
  filtersOpen,
  setFiltersOpen,
  filters,
  // Scalping
  scalpSettings,
  scalpPositionState,
  activeScalpLevels,
  tradeStats,
  // Refs
  searchRef,
  // Handlers
  handleSymbolSubmit,
  handleWatchlistClick,
  handleToggleAutoTrade,
  handleScalpSettingChange,
  handleManualClose,
  handleManualTestBuy,
  learnedMinScore,
  learningStats,
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
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Trade Flash Overlay */}
      {tradeFlash && (
        <div className={`fixed inset-0 z-[100] pointer-events-none animate-trade-flash ${
          tradeFlash === 'BUY' ? 'bg-bull' : 'bg-bear'
        }`} />
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
                <span className="font-semibold text-sm text-white">{activeSymbol}</span>
                <span className={`text-[11px] font-mono ${isUp ? 'text-bull' : 'text-bear'}`}>
                  {isUp ? '+' : ''}{priceChangePct.toFixed(2)}%
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
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 px-2 py-1">Popular</p>
                    <div className="grid grid-cols-2 gap-1">
                      {watchlist.map(sym => (
                        <button
                          key={sym}
                          onClick={() => { handleWatchlistClick(sym); setSearchOpen(false); }}
                          className={`text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                            sym === activeSymbol
                              ? 'bg-gold/10 text-gold border border-gold/20'
                              : 'hover:bg-terminal-hover text-gray-400 hover:text-white'
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

            {/* Price Display */}
            <div className="hidden md:flex items-center gap-2.5">
              <span className={`text-lg font-mono font-bold ${isUp ? 'text-bull' : 'text-bear'}`}>
                ${currentPrice.toFixed(2)}
              </span>
              <div className={`flex items-center gap-0.5 text-[11px] font-mono ${isUp ? 'text-bull' : 'text-bear'}`}>
                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {isUp ? '+' : ''}{priceChange.toFixed(2)} ({isUp ? '+' : ''}{priceChangePct.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Right: Status + Controls */}
          <div className="flex items-center gap-2">
            {/* Last trade */}
            {tradeLogs.length > 0 && (
              <div className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${
                tradeLogs[0].decision === 'BUY'
                  ? 'bg-bull/10 text-bull border border-bull/20'
                  : 'bg-bear/10 text-bear border border-bear/20'
              }`}>
                {tradeLogs[0].decision === 'BUY'
                  ? <ArrowUpRight className="w-2.5 h-2.5" />
                  : <ArrowDownRight className="w-2.5 h-2.5" />
                }
                {tradeLogs[0].decision}
              </div>
            )}

            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
              connectionStatus === 'connected' ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
            }`}>
              {connectionStatus === 'connected'
                ? <><Wifi className="w-2.5 h-2.5" /> Live</>
                : <><WifiOff className="w-2.5 h-2.5" /> Offline</>
              }
            </div>

            <button
              onClick={handleToggleAutoTrade}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                isAutoTrading
                  ? 'bg-bull/20 text-bull border border-bull/30 animate-glow'
                  : 'bg-terminal-bg text-gray-400 border border-terminal-border hover:border-gray-600 hover:text-white'
              }`}
            >
              {isAutoTrading ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
              {isAutoTrading ? 'Scalping' : 'Bot Off'}
            </button>

            {/* Drawer Toggle */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                drawerOpen
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-terminal-bg text-gray-400 border border-terminal-border hover:border-gold/30 hover:text-gold'
              }`}
            >
              {drawerOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Panel</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Sidebar: Strategy Signals ── */}
        {leftSidebarOpen && strategyData && (
          <aside className="w-44 flex-shrink-0 border-r border-terminal-border bg-terminal-card/30 overflow-hidden hidden lg:block">
            <div className="p-2.5">
              <h3 className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold mb-2 px-0.5">Scalping Signals</h3>
              <div className="space-y-1">
                <SignalRow label="EMA5" value={strategyData.emaFast?.toFixed(2)} color={
                  strategyData.crossover === 'BULLISH_CROSS' ? 'text-bull' : strategyData.crossover === 'BEARISH_CROSS' ? 'text-bear' : 'text-gray-300'
                } />
                <SignalRow label="EMA13" value={strategyData.emaSlow?.toFixed(2)} color={
                  strategyData.crossover === 'BULLISH_CROSS' ? 'text-bull' : strategyData.crossover === 'BEARISH_CROSS' ? 'text-bear' : 'text-gray-300'
                } />
                <SignalRow label="VWAP" value={strategyData.vwapFilter || '--'} color={
                  strategyData.vwapFilter === 'ABOVE' ? 'text-bull' : strategyData.vwapFilter === 'BELOW' ? 'text-bear' : 'text-gray-400'
                } />
                <SignalRow label="Signal" value={strategyData.crossover || 'NONE'} color={
                  strategyData.crossover === 'BULLISH_CROSS' ? 'text-bull' : strategyData.crossover === 'BEARISH_CROSS' ? 'text-bear' : 'text-gray-500'
                } />
                <SignalRow label="Strength" value={`${strategyData.strength || 0}/3`} color={
                  strategyData.strength >= 2 ? 'text-gold' : 'text-gray-400'
                } />
                <div className="mt-1.5 flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                        i < (strategyData?.strength || 0) ? 'bg-gold shadow-sm shadow-gold/30' : 'bg-terminal-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Symbols */}
            <div className="p-2.5 border-t border-terminal-border">
              <h3 className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold mb-1.5 px-0.5">Quick Switch</h3>
              <div className="grid grid-cols-2 gap-1">
                {watchlist.slice(0, 6).map(sym => (
                  <button
                    key={sym}
                    onClick={() => handleWatchlistClick(sym)}
                    className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${
                      sym === activeSymbol
                        ? 'bg-gold/10 text-gold border border-gold/20'
                        : 'text-gray-500 hover:text-white hover:bg-terminal-hover'
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
            {periods.map(p => (
              <button
                key={p.label}
                onClick={() => handlePeriodSelect(p)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  activePeriod === p.label
                    ? 'bg-terminal-accent text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-hover'
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="h-3.5 w-px bg-terminal-border mx-1.5" />

            <button
              onClick={() => setActiveTab('chart')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                activeTab === 'chart' ? 'bg-terminal-accent text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'trades' ? 'bg-terminal-accent text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Trades
              {tradeLogs.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-gold/20 text-gold text-[9px] flex items-center justify-center font-bold">
                  {tradeLogs.length}
                </span>
              )}
            </button>

            <div className="h-3.5 w-px bg-terminal-border mx-1" />

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                filtersOpen ? 'bg-gold/15 text-gold border border-gold/30' : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-hover'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filters
            </button>

            {isLoading && (
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                Loading...
              </div>
            )}
          </div>

          {/* Filters Panel */}
          {filtersOpen && (
            <div className="border-b border-terminal-border bg-terminal-card/40 backdrop-blur-sm flex-shrink-0">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Data Filters</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:bg-terminal-hover transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                    <button onClick={() => setFiltersOpen(false)} className="p-1 rounded hover:bg-terminal-hover text-gray-500 hover:text-gray-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  <FilterInput label="Start" type="datetime-local"
                    value={filters.start ? filters.start.slice(0, 16) : ''}
                    onChange={(v) => handleFilterChange('start', v ? new Date(v).toISOString() : '')}
                  />
                  <FilterInput label="End" type="datetime-local"
                    value={filters.end ? filters.end.slice(0, 16) : ''}
                    onChange={(v) => handleFilterChange('end', v ? new Date(v).toISOString() : '')}
                  />
                  <FilterInput label="Limit" type="number" value={filters.limit}
                    onChange={(v) => handleFilterChange('limit', v)}
                  />
                  <FilterSelect label="Adjustment" value={filters.adjustment}
                    onChange={(v) => handleFilterChange('adjustment', v)}
                    options={[['raw','Raw'],['split','Split'],['dividend','Dividend'],['all','All']]}
                  />
                  <FilterSelect label="Feed" value={filters.feed}
                    onChange={(v) => handleFilterChange('feed', v)}
                    options={[['sip','SIP'],['iex','IEX'],['otc','OTC'],['boats','BOATS']]}
                  />
                  <FilterSelect label="Sort" value={filters.sort}
                    onChange={(v) => handleFilterChange('sort', v)}
                    options={[['asc','Ascending'],['desc','Descending']]}
                  />
                  <FilterSelect label="Currency" value={filters.currency}
                    onChange={(v) => handleFilterChange('currency', v)}
                    options={[['USD','USD'],['EUR','EUR'],['GBP','GBP'],['JPY','JPY'],['CAD','CAD']]}
                  />
                </div>

                <div className="flex items-center gap-3 mt-2.5">
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-1.5 rounded-lg bg-gold/20 text-gold border border-gold/30 text-[11px] font-semibold hover:bg-gold/30 transition-colors"
                  >
                    Apply Filters
                  </button>
                  <span className="text-[10px] text-gray-600">Leave Start/End empty for auto range</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Content Area ── */}
          {activeTab === 'chart' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0">
                  <Chart data={historicalData} liveBar={liveBar} trades={tradeMarkers} scalpLevels={activeScalpLevels} />
                </div>
              </div>
              <div className="h-[3px] bg-terminal-border hover:bg-gold/30 cursor-row-resize flex-shrink-0 flex items-center justify-center group">
                <div className="w-8 h-[2px] rounded-full bg-terminal-accent group-hover:bg-gold/50 transition-colors" />
              </div>
              <LiveClock symbol={activeSymbol} />
            </div>
          ) : activeTab === 'trades' ? (
            <div className="flex-1 overflow-auto p-4">
              <TradeTable logs={tradeLogs} />
            </div>
          ) : null}
        </main>

        {/* ── Right Drawer: Scalping Bot ── */}
        <aside
          className={`flex-shrink-0 border-l border-terminal-border bg-terminal-card/30 overflow-hidden transition-all duration-300 ease-in-out ${
            drawerOpen ? 'w-80' : 'w-0'
          }`}
        >
          <div className="w-80 h-full flex flex-col overflow-y-auto">
            {/* Price Header */}
            <div className="p-3 border-b border-terminal-border flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{activeSymbol}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isUp ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
                }`}>
                  {isUp ? '+' : ''}{priceChangePct.toFixed(2)}%
                </span>
              </div>
              <div className={`text-2xl font-mono font-bold tracking-tight ${isUp ? 'text-bull' : 'text-bear'}`}>
                ${currentPrice.toFixed(2)}
              </div>
            </div>

            {/* Bot Control */}
            <div className="p-3 border-b border-terminal-border flex-shrink-0">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Scalping Bot</span>
                <div className={`flex items-center gap-1.5 text-[10px] font-medium ${
                  isAutoTrading ? 'text-bull' : 'text-gray-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isAutoTrading ? 'bg-bull animate-pulse' : 'bg-gray-600'}`} />
                  {isAutoTrading ? 'ACTIVE' : 'IDLE'}
                </div>
              </div>

              <button
                onClick={handleToggleAutoTrade}
                disabled={scalpPositionState.pendingOrder}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                  isAutoTrading
                    ? 'bg-bear/20 text-bear border border-bear/30 hover:bg-bear/30'
                    : 'bg-bull/20 text-bull border border-bull/30 hover:bg-bull/30'
                }`}
              >
                {isAutoTrading ? 'STOP SCALPING' : 'START SCALPING'}
              </button>

              {/* Manual TEST BUY — places a market BUY at current price (for testing) */}
              <button
                onClick={handleManualTestBuy}
                disabled={scalpPositionState.isOpen || scalpPositionState.pendingOrder || !currentPrice}
                title={
                  scalpPositionState.isOpen
                    ? 'A position is already open — close it first'
                    : !currentPrice
                      ? 'Waiting for live price...'
                      : `Place a test BUY at $${currentPrice?.toFixed(2)} with current TP/SL settings`
                }
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold transition-all bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                🧪 TEST BUY {currentPrice ? `@ $${currentPrice.toFixed(2)}` : ''}
              </button>

              <div className={`mt-2 flex items-center justify-center gap-1.5 text-[10px] ${
                isAutoTrading ? 'text-bull' : 'text-gray-600'
              }`}>
                <Activity className="w-3 h-3" />
                {isAutoTrading ? 'Monitoring EMA5/EMA13 Crossover' : 'Enable to start scalping'}
              </div>

              {/* Strategy Indicators */}
              <div className="flex gap-1.5 mt-2.5">
                <StrategyPill label="EMA5" active={strategyData?.crossover === 'BULLISH_CROSS' || strategyData?.crossover === 'BEARISH_CROSS'} />
                <StrategyPill label="EMA13" active={strategyData?.crossover === 'BULLISH_CROSS' || strategyData?.crossover === 'BEARISH_CROSS'} />
                <StrategyPill label="VWAP" active={strategyData?.vwapFilter === 'ABOVE' || strategyData?.vwapFilter === 'BELOW'} />
                <div className="flex-1 flex items-center justify-end gap-0.5">
                  <div className={`w-3 h-1.5 rounded-sm transition-colors ${
                    (strategyData?.strength || 0) > 0 ? 'bg-gold' : 'bg-terminal-border'
                  }`} />
                </div>
              </div>

              {/* Scalp Position Status with Manual Close button */}
              {scalpPositionState.isOpen && activeScalpLevels && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-gold/10 border border-gold/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                      POSITION OPEN ({activeScalpLevels.side})
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">qty {activeScalpLevels.qty || scalpSettings.qty}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[9px] mb-2">
                    <div>
                      <div className="text-gray-500">Entry</div>
                      <div className="text-gold font-mono font-bold">${activeScalpLevels.entry?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">TP</div>
                      <div className="text-bull font-mono font-bold">${activeScalpLevels.tp?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">SL</div>
                      <div className="text-bear font-mono font-bold">${activeScalpLevels.sl?.toFixed(2)}</div>
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
                  <span className="text-[10px] font-bold text-blue-400">ORDER PENDING...</span>
                </div>
              )}
            </div>

            {/* Scalping Settings */}
            <div className="p-3 border-b border-terminal-border flex-shrink-0">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-2">Scalping Settings</span>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Take Profit %</label>
                    <input
                      type="number"
                      value={scalpSettings.takeProfitPct}
                      onChange={(e) => handleScalpSettingChange('takeProfitPct', e.target.value)}
                      min="0.05" max="5" step="0.05"
                      className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-bull focus:outline-none focus:border-bull/50 transition-colors"
                    />
                    {currentPrice > 0 && (
                      <div className="text-[9px] font-mono text-bull/70">
                        ≈ ${(currentPrice * (1 + scalpSettings.takeProfitPct / 100)).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Stop Loss %</label>
                    <input
                      type="number"
                      value={scalpSettings.stopLossPct}
                      onChange={(e) => handleScalpSettingChange('stopLossPct', e.target.value)}
                      min="0.05" max="5" step="0.05"
                      className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-bear focus:outline-none focus:border-bear/50 transition-colors"
                    />
                    {currentPrice > 0 && (
                      <div className="text-[9px] font-mono text-bear/70">
                        ≈ ${(currentPrice * (1 - scalpSettings.stopLossPct / 100)).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Quantity</label>
                    <input
                      type="number"
                      value={scalpSettings.qty}
                      onChange={(e) => handleScalpSettingChange('qty', e.target.value)}
                      step="any"
                      className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-gold/50 transition-colors"
                    />
                    {currentPrice > 0 && (
                      <div className="text-[9px] font-mono text-gray-500">
                        ≈ ${(currentPrice * scalpSettings.qty).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Cooldown (sec)</label>
                    <input
                      type="number"
                      value={scalpSettings.cooldownMs / 1000}
                      onChange={(e) => handleScalpSettingChange('cooldownMs', parseFloat(e.target.value) * 1000)}
                      min="1" max="60" step="1"
                      className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-gray-500">Auto SL + TP</span>
                    <span className="text-gold font-bold">CLIENT-SIDE MONITOR</span>
                  </div>
                </div>

                {/* ── Smart features toggles ── */}
                <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border space-y-2">
                  <label className="flex items-center justify-between cursor-pointer text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-gray-300 font-semibold">🔒 Trailing Stop</span>
                      <span className="text-[8px] text-gray-600">Move SL to break-even at half-TP</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!scalpSettings.trailingStopEnabled}
                      onChange={(e) => handleScalpSettingChange('trailingStopEnabled', e.target.checked)}
                      className="w-4 h-4 accent-gold cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-gray-300 font-semibold">🧠 Self-Learning</span>
                      <span className="text-[8px] text-gray-600">Auto-tune score threshold from history</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!scalpSettings.selfLearningEnabled}
                      onChange={(e) => handleScalpSettingChange('selfLearningEnabled', e.target.checked)}
                      className="w-4 h-4 accent-gold cursor-pointer"
                    />
                  </label>
                </div>

                {/* ── Learning Engine Stats ── */}
                {scalpSettings.selfLearningEnabled && (
                  <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">🧠 Adaptive Engine</span>
                      <span className="text-[9px] font-mono text-blue-300">
                        Min Score: <span className="font-bold text-blue-200">{learnedMinScore}/4</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[8px] font-mono">
                      {[2, 3, 4].map(score => {
                        const stats = learningStats?.byScore?.[score] || { wins: 0, losses: 0 };
                        const total = stats.wins + stats.losses;
                        const wr = total > 0 ? (stats.wins / total) * 100 : null;
                        const wrColor = wr === null ? 'text-gray-600' : wr >= 50 ? 'text-bull' : 'text-bear';
                        return (
                          <div key={score} className="bg-terminal-bg rounded px-1 py-0.5 border border-terminal-border">
                            <div className="text-gray-500">Score {score}</div>
                            <div className={`font-bold ${wrColor}`}>
                              {wr === null ? '—' : `${wr.toFixed(0)}%`}
                            </div>
                            <div className="text-gray-600">{total} trade{total === 1 ? '' : 's'}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[8px] text-gray-600 text-center">
                      Sample: {learningStats?.sampleSize || 0} closed
                      {learningStats?.lastTunedAt && ` · Tuned ${new Date(learningStats.lastTunedAt).toLocaleTimeString()}`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* P&L Stats Panel */}
            {/* <PnLStatsPanel stats={tradeStats} /> */}

            {/* Activity Feed — natural height, scrolls with whole panel */}
            <div className="flex flex-col flex-shrink-0">
              <div className="px-3 py-2 border-b border-terminal-border flex items-center justify-between bg-terminal-card/40 sticky top-0 z-10">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-gold" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Activity Feed</span>
                </div>
                <span className="text-[10px] text-gray-600 font-mono">
                  {botActivities.length} event{botActivities.length !== 1 ? 's' : ''}
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

// ─── Sub-components ──────────────────────────────────────────

function SignalRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-[11px] font-mono font-medium ${color}`}>{value ?? '--'}</span>
    </div>
  );
}

const STRATEGY_INFO = {
  EMA5: {
    fullName: 'Fast EMA (5-period)',
    description: 'Short-term trend for scalping entry signals.',
    how: 'Calculated on the last 5 closing prices. When it crosses above EMA13, generates a BUY signal.',
    signals: ['EMA5 > EMA13 → Bullish cross → Buy', 'EMA5 < EMA13 → Bearish cross → Sell'],
  },
  EMA13: {
    fullName: 'Slow EMA (13-period)',
    description: 'Medium-term trend baseline for scalping.',
    how: 'Calculated on the last 13 closing prices. Acts as the reference line for crossover detection.',
    signals: ['Crossover with EMA5 triggers trade signals'],
  },
  VWAP: {
    fullName: 'Volume Weighted Average Price',
    description: 'Filters scalping signals by comparing price to the volume-weighted average.',
    how: 'Only allows BUY if price is above VWAP (bullish) and SELL if price is below VWAP (bearish). Reduces false signals.',
    signals: ['Price > VWAP → Allow BUY signals', 'Price < VWAP → Allow SELL signals'],
  },
};

function StrategyPill({ label, active }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, placeAbove: true, arrowX: 0 });
  const ref = useRef(null);
  const info = STRATEGY_INFO[label];

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const tooltipWidth = 260;
      const padding = 8;
      let x = rect.left + rect.width / 2;
      const minX = tooltipWidth / 2 + padding;
      const maxX = window.innerWidth - tooltipWidth / 2 - padding;
      x = Math.max(minX, Math.min(maxX, x));
      const placeAbove = rect.top > 200;
      setCoords({
        x,
        y: placeAbove ? rect.top - 8 : rect.bottom + 8,
        placeAbove,
        arrowX: rect.left + rect.width / 2,
      });
    }
    setShow(true);
  };

  const tooltip = show && info && createPortal(
    <div
      className="fixed z-[99999] w-[260px] pointer-events-none"
      style={{
        left: `${coords.x}px`,
        top: coords.placeAbove ? 'auto' : `${coords.y}px`,
        bottom: coords.placeAbove ? `${window.innerHeight - coords.y}px` : 'auto',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-[#0d1117] border border-emerald-500/30 rounded-lg shadow-2xl shadow-emerald-500/10 p-3 text-left pointer-events-auto">
        {/* Arrow */}
        <div
          className={`absolute w-2.5 h-2.5 bg-[#0d1117] border-emerald-500/30 rotate-45 ${
            coords.placeAbove ? 'bottom-[-6px] border-b border-r' : 'top-[-6px] border-t border-l'
          }`}
          style={{ left: `${coords.arrowX - coords.x + 130}px`, transform: 'translateX(-50%) rotate(45deg)' }}
        />

        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded ${
            active ? 'text-bull bg-bull/10' : 'text-gray-400 bg-gray-800/50'
          }`}>
            {label}
          </span>
          <span className="text-[12px] font-medium text-gray-300">{info.fullName}</span>
        </div>

        {/* Description */}
        <p className="text-[12px] text-gray-400 mb-2 leading-relaxed">{info.description}</p>

        {/* Signals */}
        <div className="space-y-1 mb-2">
          {info.signals.map((signal, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <span className="mt-1 w-1 h-1 rounded-full bg-emerald-400/60 shrink-0" />
              <span className="text-gray-400">{signal}</span>
            </div>
          ))}
        </div>

        {/* How bot calculates */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-md p-2 mt-2">
          <div className="flex items-center gap-1 mb-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400/70" />
            <span className="text-[11px] font-medium text-emerald-400/80">How Bot Calculates</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">{info.how}</p>
        </div>

        {/* Status */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${active ? 'bg-bull animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-[11px] font-medium ${active ? 'text-bull' : 'text-gray-600'}`}>
            {active ? 'Active — Signal detected' : 'Inactive — No signal'}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <span
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-help ${
        active
          ? 'bg-bull/15 text-bull border border-bull/20'
          : 'bg-gray-800/50 text-gray-600 border border-gray-800 hover:text-emerald-400 hover:border-emerald-500/30'
      }`}
    >
      {label}
      {tooltip}
    </span>
  );
}

function FilterInput({ label, type, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</label>
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
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer"
      >
        {options.map(([val, text]) => (
          <option key={val} value={val}>{text}</option>
        ))}
      </select>
    </div>
  );
}
