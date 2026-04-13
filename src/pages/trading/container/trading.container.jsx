import React, { useState, useEffect, useCallback, useRef } from 'react';
import Chart from '@/components/Chart';
import { getHistoricalCandles, getTradeStats } from '@/services/api';
import { socket, subscribeToSymbol, toggleAutoTrade, changeStrategy, updateScalpingSettings, getScalpingSettings, manualClosePosition, manualTestBuy } from '@/services/socket';
import { toast } from 'sonner';
import TradingView from '../view/trading.view';

const PERIODS = [
  { label: '1D', timeframe: '1Min', days: 1, buffer: 4 },
  { label: '5D', timeframe: '5Min', days: 5, buffer: 4 },
  { label: '1M', timeframe: '1Hour', days: 30, buffer: 2 },
  { label: '3M', timeframe: '1Day', days: 90, buffer: 2 },
  { label: '6M', timeframe: '1Day', days: 180, buffer: 2 },
  { label: 'YTD', timeframe: '1Day', days: Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000), buffer: 2 },
  { label: '1Y', timeframe: '1Day', days: 365, buffer: 2 },
];
const WATCHLIST = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'BTC/USD', 'ETH/USD', 'LTC/USD'];

// Crypto symbols contain a slash (e.g. "BTC/USD"). Crypto trades 24/7 — no market hours filtering.
const isCrypto = (symbol) => typeof symbol === 'string' && symbol.includes('/');

// US regular market: 9:30 AM – 4:00 PM ET = 13:30 – 20:00 UTC = 19:00 – 01:30 IST
function getPeriodDates(period, symbol) {
  const now = new Date();
  const start = new Date(now.getTime() - (period.days + period.buffer) * 86400000).toISOString();

  // Crypto: no market-hours logic, just go back N days from now
  if (isCrypto(symbol)) {
    return { start, end: '' };
  }

  let end = '';
  if (period.timeframe.includes('Min') || period.timeframe === '1Hour') {
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    const beforeMarketOpen = utcH < 13 || (utcH === 13 && utcM < 30);
    if (beforeMarketOpen) {
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    }
  }

  return { start, end };
}

// Filter bars to regular trading hours only (9:30 AM – 4:00 PM ET = 13:30 – 20:00 UTC)
// Pre/post market has sparse data with gaps, regular hours have 1 bar per minute
// Crypto is 24/7 → never filter
function filterRegularHours(bars, symbol) {
  if (isCrypto(symbol)) return bars;
  return bars.filter(b => {
    const d = new Date(b.time * 1000);
    const totalMin = d.getUTCHours() * 60 + d.getUTCMinutes();
    return totalMin >= 810 && totalMin < 1200; // 13:30 (810min) to 20:00 (1200min) UTC
  });
}

// Persist selected symbol + period across page refreshes
const STORAGE_KEY = 'tradex.trading.selection';
const loadSelection = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.symbol === 'string') return parsed;
  } catch { /* ignore */ }
  return null;
};
const saveSelection = (symbol, periodLabel) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ symbol, period: periodLabel }));
  } catch { /* ignore */ }
};

export default function TradingContainer() {
  // ── Core state ──
  const persisted = loadSelection();
  const initialSymbol = persisted?.symbol || 'AAPL';
  const initialPeriodLabel = persisted?.period || '1D';
  const initialPeriod = PERIODS.find(p => p.label === initialPeriodLabel) || PERIODS[0];

  const [symbol, setSymbol] = useState(initialSymbol);
  const [activeSymbol, setActiveSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState(initialPeriod.timeframe);
  const [activePeriod, setActivePeriod] = useState(initialPeriod.label);
  const [historicalData, setHistoricalData] = useState([]);
  const [liveBar, setLiveBar] = useState(null);
  const [prevBar, setPrevBar] = useState(null);
  const [livePrice, setLivePrice] = useState(null); // ticks on every trade (sub-second updates)
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'disconnected');
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [tradeLogs, setTradeLogs] = useState([]);
  const [botActivities, setBotActivities] = useState([]);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState('chart');
  const [searchOpen, setSearchOpen] = useState(false);
  const [tradeFlash, setTradeFlash] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [leftSidebarOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    start: '', end: '', limit: '500', adjustment: 'raw', feed: 'iex', sort: 'desc', currency: 'USD',
  });

  // ── Scalping state ──
  // Stored as strings so the controlled inputs can hold partial typing
  // like "0.", "" or "12." without being normalised by parseFloat.
  const [scalpSettings, setScalpSettings] = useState({
    takeProfitPct: '0.5',
    stopLossPct: '0.3',
    qty: '0.001',
    cooldownMs: '3000',
    trailingStopEnabled: true,
  });
  const [scalpPositionState, setScalpPositionState] = useState({ isOpen: false, pendingOrder: false });
  const [geminiStatus, setGeminiStatus] = useState({
    action: 'WAIT', confidence: 0, reason: 'Waiting for first signal...', analyzedAt: null,
    totalCalls: 0, totalBlocked: 0, minConfidence: 70,
  });
  const [activeScalpLevels, setActiveScalpLevels] = useState(null); // { entry, tp, sl, side }
  const [tradeStats, setTradeStats] = useState(null); // { totalPnl, winRate, ... }

  const searchRef = useRef(null);
  // Mirror activeSymbol in a ref so socket callbacks always see the latest value
  const activeSymbolRef = useRef(activeSymbol);
  useEffect(() => { activeSymbolRef.current = activeSymbol; }, [activeSymbol]);

  // ── Derived values ──
  // Prefer livePrice (sub-second trade ticks) > liveBar.close (per-minute) > last historical close
  const currentPrice = livePrice?.price ?? liveBar?.close ?? historicalData[historicalData.length - 1]?.close ?? 0;
  const prevPrice = prevBar?.close ?? historicalData[historicalData.length - 1]?.close ?? currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePct = prevPrice !== 0 ? ((priceChange / prevPrice) * 100) : 0;
  const isUp = priceChange >= 0;

  // ── Data loading ──
  const initMarketData = useCallback(async (sym, tf, filterOverrides = {}) => {
    setIsLoading(true);
    // Clear stale live data from previous symbol so chart never shows wrong prices
    setLiveBar(null);
    setPrevBar(null);
    setLivePrice(null);
    setHistoricalData([]);
    try {
      const opts = {
        timeframe: tf,
        limit: parseInt(filterOverrides.limit || filters.limit, 10) || 500,
        adjustment: filterOverrides.adjustment || filters.adjustment,
        feed: filterOverrides.feed || filters.feed,
        sort: filterOverrides.sort || filters.sort,
        currency: filterOverrides.currency || filters.currency,
      };
      const start = filterOverrides.start ?? filters.start;
      const end = filterOverrides.end ?? filters.end;
      if (start) opts.start = start;
      if (end) opts.end = end;

      const response = await getHistoricalCandles(sym, opts);
      if (response.success) {
        // For intraday timeframes, filter to regular trading hours only (no pre/post market gaps)
        const bars = tf.includes('Min') ? filterRegularHours(response.bars, sym) : response.bars;
        if (bars.length === 0) {
          toast.warning(`No data for ${sym}`, {
            description: 'Market may be closed or no bars in this range. Try a wider period or different symbol.',
          });
        }
        setHistoricalData(bars);
        setActiveSymbol(sym);
        setBotActivities([]);
        subscribeToSymbol(sym);
      } else {
        toast.error(`Failed to load ${sym}`, { description: response.error || 'Unknown error' });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Network error';
      toast.error(`Failed to load ${sym}`, { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // ── Load initial market data (uses persisted symbol + period) ──
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      const period = PERIODS.find(p => p.label === activePeriod) || PERIODS[0];
      const { start, end } = getPeriodDates(period, activeSymbol);
      initMarketData(activeSymbol, period.timeframe, { start, end });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the selection whenever symbol or period changes
  useEffect(() => {
    saveSelection(activeSymbol, activePeriod);
  }, [activeSymbol, activePeriod]);

  // ── Socket.IO setup ──
  useEffect(() => {
    if (socket.connected) setConnectionStatus('connected');

    const onConnect = () => {
      setConnectionStatus('connected');
      // Re-tell backend which symbol we want (handles backend restart / reconnect)
      const sym = activeSymbolRef.current;
      if (sym) {
        console.log('[Socket] Reconnected — re-subscribing to', sym);
        subscribeToSymbol(sym);
      }
      // Request fresh bot state (in case backend restarted while we were away)
      socket.emit('request_bot_state');
    };
    const onDisconnect = () => setConnectionStatus('disconnected');
    const onBarUpdate = (bar) => {
      // Reject bars that belong to a different symbol than the one currently active
      if (bar.symbol && activeSymbolRef.current && bar.symbol !== activeSymbolRef.current) return;
      setPrevBar(prev => prev || bar);
      setLiveBar(current => {
        setPrevBar(current);
        return bar;
      });
    };
    const onPriceUpdate = (data) => {
      // High-frequency trade ticks (sub-second updates for the price ticker)
      if (data.symbol && activeSymbolRef.current && data.symbol !== activeSymbolRef.current) return;
      if (typeof data.price === 'number') {
        setLivePrice({ price: data.price, time: data.time });
      }
    };

    // Strategy update is no longer used for indicators — only position state sync
    const onStrategyUpdate = () => {};

    const onTradeExecuted = (trade) => {
      const now = Date.now();

      setTradeLogs(prev => [{
        id: now.toString(), timestamp: trade.timestamp || now, symbol: trade.symbol,
        decision: trade.decision,
        orderId: trade.orderId, strategy: trade.strategy, executedBy: trade.executedBy,
        entryPrice: trade.entryPrice, takeProfitPrice: trade.takeProfitPrice,
        stopLossPrice: trade.stopLossPrice, qty: trade.qty,
      }, ...prev].slice(0, 50));

      // Set active SL/TP levels for chart price lines + immediately mark position open
      if (trade.strategy === 'scalping' && trade.entryPrice) {
        setActiveScalpLevels({
          entry: trade.entryPrice,
          tp: trade.takeProfitPrice,
          sl: trade.stopLossPrice,
          side: trade.decision,
          qty: trade.qty,
        });
        // Immediately reflect open position in UI (don't wait for next strategy_update)
        setScalpPositionState({ isOpen: true, pendingOrder: false });
      }

      setBotActivities(prev => [{
        id: `trade-${now}`, type: 'trade', decision: trade.decision,
        rsi: trade.rsi?.toFixed(2), emaTrend: trade.emaTrend,
        strength: trade.strength, orderId: trade.orderId,
        strategy: trade.strategy,
        entryPrice: trade.entryPrice, takeProfitPrice: trade.takeProfitPrice,
        stopLossPrice: trade.stopLossPrice,
        timestamp: trade.timestamp || now, rawTimestamp: now,
      }, ...prev].slice(0, 30));

      setTradeFlash(trade.decision);
      setTimeout(() => setTradeFlash(null), 1500);

      const isBuy = trade.decision === 'BUY';
      const desc = `${trade.symbol} | Entry: $${trade.entryPrice?.toFixed(2)} | TP: $${trade.takeProfitPrice?.toFixed(2)} | SL: $${trade.stopLossPrice?.toFixed(2)}`;
      toast[isBuy ? 'success' : 'error'](
        `${trade.decision} Scalp Executed`,
        { description: desc }
      );
    };

    const onScalpingSettings = (data) => {
      // Ignore the backend echo if the user has typed within the last 500ms —
      // otherwise fast typing gets clobbered by the round-trip update.
      if (Date.now() - lastSettingsEditRef.current < 500) return;
      setScalpSettings({
        takeProfitPct: ((data.takeProfitPct ?? 0.005) * 100).toString(),
        stopLossPct: ((data.stopLossPct ?? 0.003) * 100).toString(),
        qty: (data.qty ?? 0.001).toString(),
        cooldownMs: (data.cooldownMs ?? 3000).toString(),
        trailingStopEnabled: data.trailingStopEnabled !== false,
      });
    };

    const onAutoTradeStopped = (data) => {
      setIsAutoTrading(false);
      if (data.reason === 'strategy_switch') {
        toast.warning('Auto-trading stopped — strategy switched');
      } else if (data.reason === 'daily_loss_limit') {
        toast.error('Auto-trading stopped — daily loss limit reached');
      }
    };

    const onPositionClosed = (data) => {
      setScalpPositionState({ isOpen: false, pendingOrder: false });
      setActiveScalpLevels(null);

      // Patch the matching trade row with exit info so the table reflects the close
      setTradeLogs(prev => prev.map(log =>
        log.orderId && log.orderId === data.orderId
          ? {
              ...log,
              status: 'CLOSED',
              exitPrice: data.exitPrice,
              pnl: data.pnl,
              pnlPct: data.pnlPct,
              exitReason: data.result,
            }
          : log
      ));

      // Add a "close" entry to the activity feed
      const now = Date.now();
      setBotActivities(prev => [{
        id: `close-${now}`,
        type: 'close',
        decision: data.side === 'BUY' ? 'SELL' : 'BUY',
        strategy: 'scalping',
        orderId: data.orderId,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        pnl: data.pnl,
        pnlPct: data.pnlPct,
        exitReason: data.result,
        timestamp: now,
        rawTimestamp: now,
      }, ...prev].slice(0, 30));

      const pnlText = typeof data.pnl === 'number'
        ? `${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)} (${data.pnlPct?.toFixed(2)}%)`
        : '';
      const isWin = (data.pnl ?? 0) >= 0;
      const resultLabel = data.result === 'TP_HIT' ? '🎯 TP HIT'
        : data.result === 'SL_HIT' ? '🛑 SL HIT'
        : data.result === 'MAX_HOLD' ? '⏱ MAX HOLD'
        : 'Position closed';
      toast[isWin ? 'success' : 'error'](
        `${resultLabel} — ${pnlText}`,
        { description: `${data.side} @ entry $${data.entryPrice?.toFixed(2)} → exit $${data.exitPrice?.toFixed(2)}` }
      );
    };

    const onTradeStats = (stats) => {
      setTradeStats(stats);
    };

    // Server sends current state on connect — restore position, trades, stats after page reload
    const onBotState = (state) => {
      console.log('[Socket] bot_state received:', state);
      if (state.isAutoTrading !== undefined) setIsAutoTrading(state.isAutoTrading);
      if (state.scalpSettings) {
        // Don't clobber active typing
        if (Date.now() - lastSettingsEditRef.current >= 500) {
          setScalpSettings({
            takeProfitPct: ((state.scalpSettings.takeProfitPct ?? 0.005) * 100).toString(),
            stopLossPct: ((state.scalpSettings.stopLossPct ?? 0.003) * 100).toString(),
            qty: (state.scalpSettings.qty ?? 0.001).toString(),
            cooldownMs: (state.scalpSettings.cooldownMs ?? 3000).toString(),
            trailingStopEnabled: state.scalpSettings.trailingStopEnabled !== false,
          });
        }
      }
      if (state.position?.isOpen) {
        setScalpPositionState({ isOpen: true, pendingOrder: false });
        setActiveScalpLevels({
          entry: state.position.entryPrice,
          tp: state.position.takeProfitPrice,
          sl: state.position.stopLossPrice,
          side: state.position.side,
          qty: state.position.qty,
        });
      } else {
        setScalpPositionState({ isOpen: false, pendingOrder: false });
        setActiveScalpLevels(null);
      }
      if (state.stats) setTradeStats(state.stats);
      if (state.gemini) setGeminiStatus(state.gemini);
      if (Array.isArray(state.recentTrades)) {
        const logs = state.recentTrades.map(t => ({
          id: String(t._id),
          timestamp: new Date(t.createdAt).getTime(),
          symbol: t.symbol,
          decision: t.decision,
          strategy: t.strategy,
          orderId: t.orderId,
          entryPrice: t.entryPrice,
          takeProfitPrice: t.takeProfitPrice,
          stopLossPrice: t.stopLossPrice,
          executedBy: t.executedBy,
          exitPrice: t.exitPrice,
          exitReason: t.exitReason,
          pnl: t.pnl,
          pnlPct: t.pnlPct,
          status: t.status,
        }));
        setTradeLogs(logs);

      }
    };

    const onStreamStatus = (data) => {
      // Only show errors for the currently active symbol
      if (data.symbol && data.symbol !== activeSymbolRef.current) return;
      if (data.status === 'unavailable' || data.status === 'error') {
        toast.error(`Live data unavailable for ${data.symbol || 'symbol'}`, {
          description: data.reason || 'Stream error',
        });
      } else if (data.status === 'disconnected') {
        toast.warning(`Stream disconnected for ${data.symbol || 'symbol'}`, {
          description: data.reason || 'Connection lost',
        });
      }
    };

    const onTradeError = (data) => {
      toast.error(`Trade failed: ${data.symbol} ${data.decision}`, {
        description: data.error,
      });
    };

    const onGeminiUpdate = (data) => {
      if (data) setGeminiStatus(data);
    };

    // Trailing stop fired — backend moved SL to break-even. Update chart line
    // and the position panel without closing the position.
    const onPositionUpdated = (data) => {
      if (typeof data.stopLossPrice !== 'number') return;
      setActiveScalpLevels(prev => prev ? { ...prev, sl: data.stopLossPrice } : prev);
      setTradeLogs(prev => prev.map(log =>
        log.orderId && log.orderId === data.orderId
          ? { ...log, stopLossPrice: data.stopLossPrice }
          : log
      ));
      if (data.reason === 'TRAILING_BREAK_EVEN') {
        toast.success('🔒 Trailing stop armed', {
          description: `SL moved to break-even @ $${data.stopLossPrice?.toFixed(2)} — no more losses on this trade`,
        });
      }
    };


    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bar_update', onBarUpdate);
    socket.on('price_update', onPriceUpdate);
    socket.on('strategy_update', onStrategyUpdate);
    socket.on('trade_executed', onTradeExecuted);
    socket.on('scalping_settings_updated', onScalpingSettings);
    socket.on('auto_trade_stopped', onAutoTradeStopped);
    socket.on('scalping_position_closed', onPositionClosed);
    socket.on('trade_stats', onTradeStats);
    socket.on('bot_state', onBotState);
    socket.on('stream_status', onStreamStatus);
    socket.on('trade_error', onTradeError);
    socket.on('position_updated', onPositionUpdated);
    socket.on('gemini_update', onGeminiUpdate);

    changeStrategy('scalping');
    getScalpingSettings();

    // Explicitly request bot state now that all listeners are registered
    // (avoids race where backend emits bot_state before frontend listens)
    socket.emit('request_bot_state');

    // Fetch initial stats — uses VITE_API_URL via the shared axios client
    getTradeStats()
      .then(d => { if (d?.success) setTradeStats(d.stats); })
      .catch(() => {});

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bar_update', onBarUpdate);
      socket.off('price_update', onPriceUpdate);
      socket.off('strategy_update', onStrategyUpdate);
      socket.off('trade_executed', onTradeExecuted);
      socket.off('scalping_settings_updated', onScalpingSettings);
      socket.off('auto_trade_stopped', onAutoTradeStopped);
      socket.off('scalping_position_closed', onPositionClosed);
      socket.off('trade_stats', onTradeStats);
      socket.off('bot_state', onBotState);
      socket.off('stream_status', onStreamStatus);
      socket.off('trade_error', onTradeError);
      socket.off('position_updated', onPositionUpdated);
      socket.off('gemini_update', onGeminiUpdate);
    };
  }, []);

  // ── Handlers ──
  const handleSymbolSubmit = (e) => {
    e.preventDefault();
    if (symbol.trim()) {
      const sym = symbol.toUpperCase();
      const period = PERIODS.find(p => p.label === activePeriod) || PERIODS[0];
      const { start, end } = getPeriodDates(period, sym);
      initMarketData(sym, period.timeframe, { start, end });
      setSearchOpen(false);
    }
  };

  const handleWatchlistClick = (sym) => {
    setSymbol(sym);
    const period = PERIODS.find(p => p.label === activePeriod) || PERIODS[0];
    const { start, end } = getPeriodDates(period, sym);
    initMarketData(sym, period.timeframe, { start, end });
  };

  const handleToggleAutoTrade = () => {
    const newState = !isAutoTrading;
    setIsAutoTrading(newState);
    toggleAutoTrade(newState);

    setBotActivities(prev => [{
      id: `toggle-${Date.now()}`, type: newState ? 'signal' : 'analysis',
      decision: newState ? 'BUY' : 'HOLD', rsi: null,
      timestamp: Date.now(), rawTimestamp: Date.now(),
      emaTrend: newState ? 'BOT STARTED' : 'BOT STOPPED',
    }, ...prev].slice(0, 30));

    toast[newState ? 'success' : 'warning'](
      newState ? 'Scalping Bot Activated' : 'Scalping Bot Deactivated',
      { description: newState ? `Bot is now scalping ${activeSymbol}` : 'Bot stopped' }
    );
  };

  // Tracks the last time the user edited a setting locally — used to ignore
  // backend echoes (`scalping_settings_updated`) for a short window so they
  // don't clobber what the user is currently typing.
  const lastSettingsEditRef = useRef(0);

  const handleScalpSettingChange = (key, value) => {
    // Always reflect the raw typed value in state so partial inputs like
    // "0.", "" or "12." render correctly in the controlled input.
    const updated = { ...scalpSettings, [key]: value };
    setScalpSettings(updated);
    lastSettingsEditRef.current = Date.now();

    // Only push to backend when every numeric field is valid.
    const tp = parseFloat(updated.takeProfitPct);
    const sl = parseFloat(updated.stopLossPct);
    const qty = parseFloat(updated.qty);
    const cooldown = parseFloat(updated.cooldownMs);
    if ([tp, sl, qty, cooldown].some(n => isNaN(n) || n <= 0)) return;

    updateScalpingSettings({
      takeProfitPct: tp / 100,
      stopLossPct: sl / 100,
      qty,
      cooldownMs: cooldown,
      trailingStopEnabled: !!updated.trailingStopEnabled,
    });
  };

  const handleManualClose = () => {
    manualClosePosition();
    toast.info('Closing position...');
  };

  const handleManualTestBuy = () => {
    if (scalpPositionState.isOpen) {
      toast.error('A position is already open — close it first');
      return;
    }
    if (!currentPrice) {
      toast.error('No live price yet — wait for the first bar');
      return;
    }
    manualTestBuy();
    toast.info(`Test BUY @ $${currentPrice.toFixed(2)} — placing order...`);
  };

  const handlePeriodSelect = (period) => {
    const { start, end } = getPeriodDates(period, activeSymbol);
    setTimeframe(period.timeframe);
    setActivePeriod(period.label);
    setFilters(f => ({ ...f, start, end }));
    initMarketData(activeSymbol, period.timeframe, { start, end });
  };

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  const handleResetFilters = () => {
    const defaults = { start: '', end: '', limit: '500', adjustment: 'raw', feed: 'sip', sort: 'desc', currency: 'USD' };
    setFilters(defaults);
    initMarketData(activeSymbol, timeframe, defaults);
  };

  const handleApplyFilters = () => {
    initMarketData(activeSymbol, timeframe);
  };

  // Close search on click outside
  useEffect(() => {
    const handler = (e) => {
      if (searchOpen && searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  return (
    <TradingView
      // Core data
      symbol={symbol}
      setSymbol={setSymbol}
      activeSymbol={activeSymbol}
      timeframe={timeframe}
      historicalData={historicalData}
      liveBar={liveBar}
      isLoading={isLoading}
      connectionStatus={connectionStatus}
      isAutoTrading={isAutoTrading}
      tradeLogs={tradeLogs}
      botActivities={botActivities}
      // Derived
      currentPrice={currentPrice}
      priceChange={priceChange}
      priceChangePct={priceChangePct}
      isUp={isUp}
      // UI state
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchOpen={searchOpen}
      setSearchOpen={setSearchOpen}
      tradeFlash={tradeFlash}
      drawerOpen={drawerOpen}
      setDrawerOpen={setDrawerOpen}
      leftSidebarOpen={leftSidebarOpen}
      filtersOpen={filtersOpen}
      setFiltersOpen={setFiltersOpen}
      filters={filters}
      // Scalping
      scalpSettings={scalpSettings}
      scalpPositionState={scalpPositionState}
      activeScalpLevels={activeScalpLevels}
      tradeStats={tradeStats}
      // Refs
      searchRef={searchRef}
      // Handlers
      handleSymbolSubmit={handleSymbolSubmit}
      handleWatchlistClick={handleWatchlistClick}
      handleToggleAutoTrade={handleToggleAutoTrade}
      handleScalpSettingChange={handleScalpSettingChange}
      handleManualClose={handleManualClose}
      handleManualTestBuy={handleManualTestBuy}
      geminiStatus={geminiStatus}
      handlePeriodSelect={handlePeriodSelect}
      handleFilterChange={handleFilterChange}
      handleResetFilters={handleResetFilters}
      handleApplyFilters={handleApplyFilters}
      // Constants
      activePeriod={activePeriod}
      periods={PERIODS}
      watchlist={WATCHLIST}
      // Components
      Chart={Chart}
    />
  );
}
