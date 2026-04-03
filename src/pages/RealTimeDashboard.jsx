import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Chart from '@/components/Chart';
import RSIChart from '@/components/RSIChart';
import TradeTable from '@/components/dashboard/TradeTable';
import BotActivityFeed from '@/components/dashboard/BotActivityFeed';
import AIAnalysisPanel from '@/components/dashboard/AIAnalysisPanel';
import { getHistoricalCandles, getLatestBars, placeOrder, getOrders, getPosition, closePosition } from '@/services/api';
import { socket, subscribeToSymbol, toggleAutoTrade } from '@/services/socket';
import { toast } from 'sonner';
import {
  Activity, Wifi, WifiOff, Zap, ZapOff, Brain,
  BarChart3, ArrowUpRight, ArrowDownRight, Search,
  SlidersHorizontal, X, RotateCcw, PanelRightOpen, PanelRightClose,
  ChevronLeft, ChevronRight, Gauge, ShoppingCart, RefreshCw,
  DollarSign, Briefcase, ClipboardList
} from 'lucide-react';

const TIMEFRAMES = ['1Min', '5Min', '15Min', '1Hour', '1Day'];
const PERIODS = [
  { label: '1D', timeframe: '5Min', days: 1 },
  { label: '1W', timeframe: '15Min', days: 7 },
  { label: '1M', timeframe: '1Hour', days: 30 },
  { label: '3M', timeframe: '1Day', days: 90 },
  { label: '6M', timeframe: '1Day', days: 180 },
  { label: '1Y', timeframe: '1Day', days: 365 },
];
const WATCHLIST = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'BTC/USD'];

export default function RealTimeDashboard() {
  // ── Core state ──
  const [symbol, setSymbol] = useState('AAPL');
  const [activeSymbol, setActiveSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1Min');
  const [historicalData, setHistoricalData] = useState([]);
  const [liveBar, setLiveBar] = useState(null);
  const [prevBar, setPrevBar] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'disconnected');
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [tradeLogs, setTradeLogs] = useState([]);
  const [tradeMarkers, setTradeMarkers] = useState([]);
  const [botActivities, setBotActivities] = useState([]);
  const [strategyData, setStrategyData] = useState(null);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState('chart');
  const [rightPanel, setRightPanel] = useState('trade');
  const [searchOpen, setSearchOpen] = useState(false);
  const [tradeFlash, setTradeFlash] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    start: '', end: '', limit: '500', adjustment: 'raw', feed: 'iex', sort: 'asc', currency: 'USD',
  });

  // ── Latest bars state ──
  const [latestBarsData, setLatestBarsData] = useState({});
  const [latestBarsLoading, setLatestBarsLoading] = useState(false);
  const [latestBarsFeed, setLatestBarsFeed] = useState('iex');
  const [latestBarsCurrency, setLatestBarsCurrency] = useState('USD');
  const [latestBarsSymbols, setLatestBarsSymbols] = useState('');

  // ── Trading state ──
  const [orderQty, setOrderQty] = useState('1');
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState('day');
  const [placingOrder, setPlacingOrder] = useState(null); // 'buy' | 'sell' | null
  const [currentPosition, setCurrentPosition] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const searchRef = useRef(null);

  // ── Derived values ──
  const currentPrice = liveBar?.close ?? historicalData[historicalData.length - 1]?.close ?? 0;
  const prevPrice = prevBar?.close ?? historicalData[historicalData.length - 1]?.close ?? currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePct = prevPrice !== 0 ? ((priceChange / prevPrice) * 100) : 0;
  const isUp = priceChange >= 0;

  // ── Data loading ──
  const initMarketData = useCallback(async (sym, tf, filterOverrides = {}) => {
    setIsLoading(true);
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
        setHistoricalData(response.bars);
        setActiveSymbol(sym);
        setTradeMarkers([]);
        setBotActivities([]);
        subscribeToSymbol(sym);
      } else {
        toast.error('Failed to load market data');
      }
    } catch {
      toast.error('Network error loading market data');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // ── Load initial market data ──
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      initMarketData(activeSymbol, timeframe);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when symbol or timeframe changes (user action only)
  const handleChangeSymbolOrTimeframe = useCallback((sym, tf) => {
    initMarketData(sym, tf);
  }, [initMarketData]);

  // ── Socket.IO setup ──
  useEffect(() => {
    // Check if already connected (event may have fired before mount)
    if (socket.connected) setConnectionStatus('connected');

    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    const onBarUpdate = (bar) => {
      setPrevBar(prev => prev || bar);
      setLiveBar(current => {
        setPrevBar(current);
        return bar;
      });
    };

    const onStrategyUpdate = (data) => {
      setStrategyData(data);
      if (data.rsiCrossover === 'NONE') {
        setBotActivities(prev => {
          const lastAnalysis = prev.find(a => a.type === 'analysis');
          if (lastAnalysis && (Date.now() - lastAnalysis.rawTimestamp) < 25000) return prev;
          return [{
            id: `analysis-${Date.now()}`, type: 'analysis', decision: 'HOLD',
            rsi: data.rsi?.toFixed(2), emaTrend: data.emaTrend,
            timestamp: Date.now(), rawTimestamp: Date.now(),
          }, ...prev].slice(0, 30);
        });
      } else {
        setBotActivities(prev => [{
          id: `signal-${Date.now()}`, type: 'signal', decision: data.rsiCrossover,
          rsi: data.rsi?.toFixed(2), emaTrend: data.emaTrend, strength: data.strength,
          timestamp: Date.now(), rawTimestamp: Date.now(),
        }, ...prev].slice(0, 30));
      }
    };

    const onTradeExecuted = (trade) => {
      const now = Date.now();
      const tradeTime = Math.floor(now / 1000);

      setTradeLogs(prev => [{
        id: now.toString(), timestamp: trade.timestamp || now, symbol: trade.symbol,
        rsi: trade.rsi?.toFixed(2), decision: trade.decision, strength: trade.strength,
        orderId: trade.orderId,
      }, ...prev].slice(0, 50));

      setTradeMarkers(prev => [...prev, { time: tradeTime, decision: trade.decision }]);

      setBotActivities(prev => [{
        id: `trade-${now}`, type: 'trade', decision: trade.decision,
        rsi: trade.rsi?.toFixed(2), emaTrend: trade.emaTrend,
        strength: trade.strength, orderId: trade.orderId,
        timestamp: trade.timestamp || now, rawTimestamp: now,
      }, ...prev].slice(0, 30));

      setTradeFlash(trade.decision);
      setTimeout(() => setTradeFlash(null), 1500);

      const isBuy = trade.decision === 'BUY';
      toast[isBuy ? 'success' : 'error'](
        `${trade.decision} Signal Executed`,
        { description: `${trade.symbol} | RSI: ${trade.rsi?.toFixed(2)} | Strength: ${trade.strength}/3` }
      );
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bar_update', onBarUpdate);
    socket.on('strategy_update', onStrategyUpdate);
    socket.on('trade_executed', onTradeExecuted);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bar_update', onBarUpdate);
      socket.off('strategy_update', onStrategyUpdate);
      socket.off('trade_executed', onTradeExecuted);
    };
  }, []);

  // ── Handlers ──
  const handleSymbolSubmit = (e) => {
    e.preventDefault();
    if (symbol.trim()) {
      handleChangeSymbolOrTimeframe(symbol.toUpperCase(), timeframe);
      setSearchOpen(false);
    }
  };

  const handleWatchlistClick = (sym) => {
    setSymbol(sym);
    handleChangeSymbolOrTimeframe(sym, timeframe);
  };

  const handleToggleAutoTrade = () => {
    const newState = !isAutoTrading;
    setIsAutoTrading(newState);
    toggleAutoTrade(newState);

    setBotActivities(prev => [{
      id: `toggle-${Date.now()}`, type: newState ? 'signal' : 'analysis',
      decision: newState ? 'BUY' : 'HOLD', rsi: strategyData?.rsi?.toFixed(2),
      timestamp: Date.now(), rawTimestamp: Date.now(),
      emaTrend: newState ? 'BOT STARTED' : 'BOT STOPPED',
    }, ...prev].slice(0, 30));

    toast[newState ? 'success' : 'warning'](
      newState ? 'Auto-Trading Activated' : 'Auto-Trading Deactivated',
      { description: newState ? `Bot is now trading ${activeSymbol}` : 'Manual mode enabled' }
    );
  };

  const fetchLatestBars = useCallback(async () => {
    setLatestBarsLoading(true);
    try {
      const syms = latestBarsSymbols.trim() || WATCHLIST.join(',');
      const options = {};
      if (latestBarsFeed) options.feed = latestBarsFeed;
      if (latestBarsCurrency) options.currency = latestBarsCurrency;
      const response = await getLatestBars(syms, options);
      if (response.success) {
        setLatestBarsData(response.bars);
      } else {
        toast.error('Failed to fetch latest bars');
      }
    } catch {
      toast.error('Network error fetching latest bars');
    } finally {
      setLatestBarsLoading(false);
    }
  }, [latestBarsSymbols, latestBarsFeed, latestBarsCurrency]);

  useEffect(() => {
    if (activeTab === 'latest') fetchLatestBars();
  }, [activeTab, fetchLatestBars]);

  // ── Fetch position & orders for active symbol ──
  const fetchTradingData = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const [posRes, ordersRes] = await Promise.allSettled([
        getPosition(activeSymbol),
        getOrders('all', 20),
      ]);
      if (posRes.status === 'fulfilled' && posRes.value.success) {
        setCurrentPosition(posRes.value.position);
      } else {
        setCurrentPosition(null);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.success) {
        setRecentOrders(ordersRes.value.orders || []);
      }
    } catch {
      // silent fail
    } finally {
      setOrdersLoading(false);
    }
  }, [activeSymbol]);

  useEffect(() => {
    if (rightPanel === 'trade') fetchTradingData();
  }, [rightPanel, fetchTradingData]);

  // ── Derived: position info for sell validation ──
  const positionQty = currentPosition ? parseFloat(currentPosition.qty) : 0;
  const hasPosition = positionQty > 0;

  // ── Place order handler ──
  const handlePlaceOrder = async (side) => {
    if (!orderQty || parseFloat(orderQty) <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    // Prevent selling if no position
    if (side === 'sell' && !hasPosition) {
      toast.error(`You don't own any ${activeSymbol} shares to sell`);
      return;
    }

    // Warn if selling more than owned
    if (side === 'sell' && parseFloat(orderQty) > positionQty) {
      toast.error(`You only own ${positionQty} shares of ${activeSymbol}. Cannot sell ${orderQty}.`);
      return;
    }

    setPlacingOrder(side);
    try {
      const orderData = {
        symbol: activeSymbol,
        qty: parseFloat(orderQty),
        side,
        type: orderType,
        time_in_force: timeInForce,
      };
      if ((orderType === 'limit' || orderType === 'stop_limit') && limitPrice) {
        orderData.limit_price = parseFloat(limitPrice);
      }
      if ((orderType === 'stop' || orderType === 'stop_limit') && limitPrice) {
        orderData.stop_price = parseFloat(limitPrice);
      }
      const data = await placeOrder(orderData);
      if (data.success) {
        const isBuy = side === 'buy';
        toast[isBuy ? 'success' : 'error'](
          `${side.toUpperCase()} Order Placed`,
          { description: `${orderQty} ${activeSymbol} @ ${orderType === 'market' ? 'Market' : '$' + limitPrice}` }
        );
        setTradeFlash(side === 'buy' ? 'BUY' : 'SELL');
        setTimeout(() => setTradeFlash(null), 1500);
        fetchTradingData();
      } else {
        toast.error('Order failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Failed to place order');
    } finally {
      setPlacingOrder(null);
    }
  };

  // ── Close entire position ──
  const handleClosePosition = async () => {
    if (!hasPosition) return;
    setPlacingOrder('sell');
    try {
      const data = await closePosition(activeSymbol);
      if (data.success) {
        toast.success(`Closed ${activeSymbol} position (${positionQty} shares)`);
        setTradeFlash('SELL');
        setTimeout(() => setTradeFlash(null), 1500);
        fetchTradingData();
      } else {
        toast.error('Failed to close position: ' + (data.error || 'Unknown error'));
      }
    } catch {
      toast.error('Failed to close position');
    } finally {
      setPlacingOrder(null);
    }
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
                      {WATCHLIST.map(sym => (
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
            {/* Strategy mini indicators */}
            {strategyData && (
              <div className="hidden lg:flex items-center gap-1.5 mr-1">
                <MiniIndicator
                  label="RSI"
                  value={strategyData.rsi?.toFixed(0)}
                  color={strategyData.rsi < 30 ? 'bull' : strategyData.rsi > 70 ? 'bear' : 'gray-400'}
                />
                <MiniIndicator
                  label="STR"
                  value={`${strategyData.strength || 0}/3`}
                  color={strategyData.strength >= 2 ? 'gold' : 'gray-400'}
                />
              </div>
            )}

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
                {tradeLogs[0].decision} @ RSI {tradeLogs[0].rsi}
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
              {isAutoTrading ? 'Bot Active' : 'Bot Off'}
            </button>

            {/* AI Drawer Toggle */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                drawerOpen
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-terminal-bg text-gray-400 border border-terminal-border hover:border-purple-500/30 hover:text-purple-300'
              }`}
            >
              {drawerOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Sidebar: Strategy Signals (compact) ── */}
        {leftSidebarOpen && strategyData && (
          <aside className="w-44 flex-shrink-0 border-r border-terminal-border bg-terminal-card/30 overflow-hidden hidden lg:block">
            <div className="p-2.5">
              <h3 className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold mb-2 px-0.5">Live Strategy</h3>
              <div className="space-y-1">
                <SignalRow label="RSI (14)" value={strategyData.rsi?.toFixed(1)} color={
                  strategyData.rsi < 30 ? 'text-bull' : strategyData.rsi > 70 ? 'text-bear' : 'text-gray-300'
                } />
                <SignalRow label="EMA" value={strategyData.emaTrend} color={
                  strategyData.emaTrend === 'BULLISH' ? 'text-bull' : strategyData.emaTrend === 'BEARISH' ? 'text-bear' : 'text-gray-400'
                } />
                <SignalRow label="Volume" value={strategyData.volumeRatio ? `${strategyData.volumeRatio.toFixed(1)}x` : '--'} color={
                  strategyData.volumeConfirmed ? 'text-bull' : 'text-gray-400'
                } />
                <SignalRow label="Strength" value={`${strategyData.strength || 0}/3`} color={
                  strategyData.strength >= 2 ? 'text-gold' : 'text-gray-400'
                } />
                <SignalRow label="Signal" value={strategyData.rsiCrossover || 'NONE'} color={
                  strategyData.rsiCrossover === 'BUY' ? 'text-bull' : strategyData.rsiCrossover === 'SELL' ? 'text-bear' : 'text-gray-500'
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
                {WATCHLIST.slice(0, 6).map(sym => (
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
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => { setTimeframe(tf); handleChangeSymbolOrTimeframe(activeSymbol, tf); }}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  tf === timeframe
                    ? 'bg-terminal-accent text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-hover'
                }`}
              >
                {tf}
              </button>
            ))}

            <div className="h-3.5 w-px bg-terminal-border mx-1" />

            {PERIODS.map(p => (
              <button
                key={p.label}
                onClick={() => {
                  const start = new Date(Date.now() - p.days * 24 * 60 * 60 * 1000).toISOString();
                  setTimeframe(p.timeframe);
                  setFilters(f => ({ ...f, start, end: '' }));
                  initMarketData(activeSymbol, p.timeframe, { start, end: '' });
                }}
                className="px-2 py-1 rounded text-[11px] font-medium text-gold/70 hover:text-gold hover:bg-gold/10 transition-colors"
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
            <button
              onClick={() => setActiveTab('latest')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'latest' ? 'bg-terminal-accent text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Activity className="w-3 h-3" />
              Latest
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
                      onClick={() => {
                        const defaults = { start: '', end: '', limit: '500', adjustment: 'raw', feed: 'iex', sort: 'asc', currency: 'USD' };
                        setFilters(defaults);
                        initMarketData(activeSymbol, timeframe, defaults);
                      }}
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
                    onChange={(v) => setFilters(f => ({ ...f, start: v ? new Date(v).toISOString() : '' }))}
                  />
                  <FilterInput label="End" type="datetime-local"
                    value={filters.end ? filters.end.slice(0, 16) : ''}
                    onChange={(v) => setFilters(f => ({ ...f, end: v ? new Date(v).toISOString() : '' }))}
                  />
                  <FilterInput label="Limit" type="number" value={filters.limit}
                    onChange={(v) => setFilters(f => ({ ...f, limit: v }))}
                  />
                  <FilterSelect label="Adjustment" value={filters.adjustment}
                    onChange={(v) => setFilters(f => ({ ...f, adjustment: v }))}
                    options={[['raw','Raw'],['split','Split'],['dividend','Dividend'],['all','All']]}
                  />
                  <FilterSelect label="Feed" value={filters.feed}
                    onChange={(v) => setFilters(f => ({ ...f, feed: v }))}
                    options={[['sip','SIP'],['iex','IEX'],['otc','OTC'],['boats','BOATS']]}
                  />
                  <FilterSelect label="Sort" value={filters.sort}
                    onChange={(v) => setFilters(f => ({ ...f, sort: v }))}
                    options={[['asc','Ascending'],['desc','Descending']]}
                  />
                  <FilterSelect label="Currency" value={filters.currency}
                    onChange={(v) => setFilters(f => ({ ...f, currency: v }))}
                    options={[['USD','USD'],['EUR','EUR'],['GBP','GBP'],['JPY','JPY'],['CAD','CAD']]}
                  />
                </div>

                <div className="flex items-center gap-3 mt-2.5">
                  <button
                    onClick={() => initMarketData(activeSymbol, timeframe)}
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
              {/* Candlestick Chart */}
              <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0">
                  <Chart data={historicalData} liveBar={liveBar} trades={tradeMarkers} />
                </div>
              </div>

              {/* Pane Divider */}
              <div className="h-[3px] bg-terminal-border hover:bg-gold/30 cursor-row-resize flex-shrink-0 flex items-center justify-center group">
                <div className="w-8 h-[2px] rounded-full bg-terminal-accent group-hover:bg-gold/50 transition-colors" />
              </div>

              {/* RSI Pane */}
              <div className="flex-shrink-0 flex flex-col" style={{ height: '160px' }}>
                <div className="flex items-center justify-between h-7 px-3 border-b border-terminal-border bg-terminal-card/30">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">RSI (14)</span>
                    {strategyData?.rsi != null && (
                      <span className={`text-[11px] font-mono font-bold ${
                        strategyData.rsi < 30 ? 'text-bull' : strategyData.rsi > 70 ? 'text-bear' : 'text-gold'
                      }`}>
                        {strategyData.rsi.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-[9px] font-mono text-gray-600">
                    <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-bear mr-1" />70</span>
                    <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-bull mr-1" />30</span>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <RSIChart data={historicalData} liveBar={liveBar} />
                </div>
              </div>
            </div>
          ) : activeTab === 'trades' ? (
            <div className="flex-1 overflow-auto p-4">
              <TradeTable logs={tradeLogs} />
            </div>
          ) : activeTab === 'latest' ? (
            <div className="flex-1 overflow-auto">
              {/* Latest Bars Controls */}
              <div className="p-3 border-b border-terminal-border bg-terminal-card/20">
                <div className="flex flex-wrap items-end gap-2.5">
                  <div className="flex-1 min-w-[180px] space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Symbols</label>
                    <input
                      type="text"
                      value={latestBarsSymbols}
                      onChange={(e) => setLatestBarsSymbols(e.target.value.toUpperCase())}
                      placeholder={WATCHLIST.join(', ')}
                      className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50"
                    />
                  </div>
                  <FilterSelect label="Feed" value={latestBarsFeed} onChange={setLatestBarsFeed}
                    options={[['sip','SIP'],['iex','IEX'],['delayed_sip','Delayed'],['otc','OTC'],['boats','BOATS'],['overnight','Overnight']]}
                  />
                  <FilterSelect label="Currency" value={latestBarsCurrency} onChange={setLatestBarsCurrency}
                    options={[['USD','USD'],['EUR','EUR'],['GBP','GBP'],['JPY','JPY'],['CAD','CAD']]}
                  />
                  <button
                    onClick={fetchLatestBars}
                    disabled={latestBarsLoading}
                    className="px-3 py-1.5 rounded-lg bg-gold/20 text-gold border border-gold/30 text-[11px] font-semibold hover:bg-gold/30 transition-colors disabled:opacity-50"
                  >
                    {latestBarsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {/* Latest Bars Grid */}
              <div className="p-3">
                {latestBarsLoading && Object.keys(latestBarsData).length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      Fetching latest bars...
                    </div>
                  </div>
                ) : Object.keys(latestBarsData).length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-gray-600 text-sm">
                    No data yet. Click Refresh to fetch latest bars.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {Object.entries(latestBarsData).map(([sym, bar]) => {
                      const barChange = bar.close - bar.open;
                      const barChangePct = bar.open !== 0 ? ((barChange / bar.open) * 100) : 0;
                      const barIsUp = barChange >= 0;
                      return (
                        <div
                          key={sym}
                          onClick={() => { setSymbol(sym); initMarketData(sym, timeframe); setActiveTab('chart'); }}
                          className="bg-terminal-card/50 border border-terminal-border rounded-xl p-3 hover:border-gold/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${barIsUp ? 'bg-bull' : 'bg-bear'}`} />
                              <span className="font-bold text-white text-sm group-hover:text-gold transition-colors">{sym}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              barIsUp ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
                            }`}>
                              {barIsUp ? '+' : ''}{barChangePct.toFixed(2)}%
                            </span>
                          </div>
                          <div className={`text-lg font-mono font-bold mb-2 ${barIsUp ? 'text-bull' : 'text-bear'}`}>
                            ${bar.close?.toFixed(2)}
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            <MiniStat label="O" value={bar.open} />
                            <MiniStat label="H" value={bar.high} isHigh />
                            <MiniStat label="L" value={bar.low} isLow />
                            <MiniStat label="V" value={bar.volume} isVolume />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </main>

        {/* ── Right Drawer: AI + Bot ── */}
        <aside
          className={`flex-shrink-0 border-l border-terminal-border bg-terminal-card/30 overflow-hidden transition-all duration-300 ease-in-out ${
            drawerOpen ? 'w-80' : 'w-0'
          }`}
        >
          <div className="w-80 h-full flex flex-col">
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
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                <MiniStat label="O" value={liveBar?.open} />
                <MiniStat label="H" value={liveBar?.high} isHigh />
                <MiniStat label="L" value={liveBar?.low} isLow />
                <MiniStat label="V" value={liveBar?.volume} isVolume />
              </div>
            </div>

            {/* Panel Tabs */}
            <div className="flex border-b border-terminal-border flex-shrink-0">
              <button
                onClick={() => setRightPanel('trade')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors ${
                  rightPanel === 'trade'
                    ? 'text-gold border-b-2 border-gold bg-gold/5'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Trade
              </button>
              <button
                onClick={() => setRightPanel('ai')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors ${
                  rightPanel === 'ai'
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                AI
              </button>
              <button
                onClick={() => setRightPanel('bot')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors ${
                  rightPanel === 'bot'
                    ? 'text-bull border-b-2 border-bull bg-bull/5'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Bot
                {isAutoTrading && <div className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />}
              </button>
            </div>

            {/* Panel Content */}
            {rightPanel === 'trade' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                {/* Current Position Banner */}
                <div className="p-3 border-b border-terminal-border flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-gray-500" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        {activeSymbol} Position
                      </span>
                    </div>
                    <button onClick={fetchTradingData} className="text-gray-600 hover:text-gray-300 transition-colors">
                      <RefreshCw className={`w-3 h-3 ${ordersLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {hasPosition ? (
                    <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            currentPosition.side === 'long' ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
                          }`}>
                            {(currentPosition.side || 'long').toUpperCase()}
                          </span>
                          <span className="text-[12px] font-mono font-bold text-white">{currentPosition.qty} shares</span>
                        </div>
                        {(() => {
                          const pl = parseFloat(currentPosition.unrealized_pl || 0);
                          const plPct = parseFloat(currentPosition.unrealized_plpc || 0) * 100;
                          const up = pl >= 0;
                          return (
                            <span className={`text-[11px] font-mono font-bold ${up ? 'text-bull' : 'text-bear'}`}>
                              {up ? '+' : ''}${pl.toFixed(2)} ({up ? '+' : ''}{plPct.toFixed(2)}%)
                            </span>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[8px] uppercase text-gray-600 block">Avg Entry</span>
                          <span className="text-[10px] font-mono text-gray-300">${parseFloat(currentPosition.avg_entry_price || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase text-gray-600 block">Current</span>
                          <span className="text-[10px] font-mono text-white">${parseFloat(currentPosition.current_price || currentPrice).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase text-gray-600 block">Value</span>
                          <span className="text-[10px] font-mono text-white">${parseFloat(currentPosition.market_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      {/* Close Position Button */}
                      <button
                        onClick={handleClosePosition}
                        disabled={!!placingOrder}
                        className="w-full mt-2.5 py-2 rounded-lg text-[11px] font-bold bg-bear/15 text-bear border border-bear/25 hover:bg-bear/25 transition-all disabled:opacity-50"
                      >
                        {placingOrder === 'sell' ? 'Closing...' : `Close Position (Sell All ${currentPosition.qty} Shares)`}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-terminal-bg border border-terminal-border text-center">
                      <span className="text-[11px] text-gray-600">No position in {activeSymbol}</span>
                      <p className="text-[9px] text-gray-700 mt-0.5">Buy shares below to open a position</p>
                    </div>
                  )}
                </div>

                {/* Buy / Sell Section */}
                <div className="p-3 border-b border-terminal-border flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Place Order</span>
                    <span className="text-[11px] font-mono font-bold text-white">{activeSymbol}</span>
                  </div>

                  {/* Order Config */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Quantity</label>
                        <input
                          type="number"
                          value={orderQty}
                          onChange={(e) => setOrderQty(e.target.value)}
                          min="0.01"
                          step="any"
                          className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-gold/50 transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Type</label>
                        <select
                          value={orderType}
                          onChange={(e) => setOrderType(e.target.value)}
                          className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer"
                        >
                          <option value="market">Market</option>
                          <option value="limit">Limit</option>
                          <option value="stop">Stop</option>
                          <option value="stop_limit">Stop Limit</option>
                        </select>
                      </div>
                    </div>

                    {orderType !== 'market' && (
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">
                          {orderType === 'limit' ? 'Limit' : orderType === 'stop' ? 'Stop' : 'Limit/Stop'} Price
                        </label>
                        <input
                          type="number"
                          value={limitPrice}
                          onChange={(e) => setLimitPrice(e.target.value)}
                          placeholder={currentPrice.toFixed(2)}
                          step="any"
                          className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-2 text-sm font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50 transition-colors"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Time in Force</label>
                      <div className="flex gap-1">
                        {[['day', 'Day'], ['gtc', 'GTC'], ['ioc', 'IOC']].map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setTimeInForce(val)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                              timeInForce === val
                                ? 'bg-terminal-accent text-white'
                                : 'bg-terminal-bg text-gray-500 border border-terminal-border hover:text-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="p-2 rounded-lg bg-terminal-bg border border-terminal-border">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-500">Est. Total</span>
                        <span className="font-mono font-bold text-white">
                          ${(currentPrice * (parseFloat(orderQty) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {hasPosition && (
                        <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-terminal-border">
                          <span className="text-gray-500">You own</span>
                          <span className="font-mono text-gold">{positionQty} shares</span>
                        </div>
                      )}
                    </div>

                    {/* Buy / Sell Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handlePlaceOrder('buy')}
                        disabled={!!placingOrder}
                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-bull/20 text-bull border border-bull/30 hover:bg-bull/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {placingOrder === 'buy' ? (
                          <div className="w-4 h-4 border-2 border-bull/30 border-t-bull rounded-full animate-spin" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                        BUY
                      </button>
                      <button
                        onClick={() => handlePlaceOrder('sell')}
                        disabled={!!placingOrder || !hasPosition}
                        title={!hasPosition ? `You don't own any ${activeSymbol} to sell` : `Sell ${orderQty} shares of ${activeSymbol}`}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          hasPosition
                            ? 'bg-bear/20 text-bear border-bear/30 hover:bg-bear/30 disabled:opacity-50'
                            : 'bg-gray-800/50 text-gray-600 border-gray-800 cursor-not-allowed'
                        }`}
                      >
                        {placingOrder === 'sell' ? (
                          <div className="w-4 h-4 border-2 border-bear/30 border-t-bear rounded-full animate-spin" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        SELL
                      </button>
                    </div>

                    {/* Sell helper text */}
                    {!hasPosition && (
                      <p className="text-[9px] text-gray-600 text-center">Buy shares first before you can sell</p>
                    )}
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="p-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ClipboardList className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Recent Orders</span>
                  </div>
                  {recentOrders.length === 0 ? (
                    <div className="text-[11px] text-gray-600 text-center py-2">No recent orders</div>
                  ) : (
                    <div className="space-y-1">
                      {recentOrders.slice(0, 10).map((order) => {
                        const statusColor = {
                          filled: 'text-bull', new: 'text-gold', accepted: 'text-gold',
                          canceled: 'text-bear', partially_filled: 'text-blue-400',
                          expired: 'text-gray-500', rejected: 'text-bear', pending_new: 'text-gold',
                        }[order.status] || 'text-gray-500';
                        return (
                          <div key={order.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-terminal-hover/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                order.side === 'buy' ? 'bg-bull' : 'bg-bear'
                              }`} />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-medium text-white">{order.symbol}</span>
                                  <span className={`text-[9px] font-bold ${order.side === 'buy' ? 'text-bull' : 'text-bear'}`}>
                                    {order.side?.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-[9px] text-gray-600 font-mono">
                                  {order.qty} @ {order.type === 'market' ? 'MKT' : '$' + (order.limit_price || order.stop_price || '--')}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-[9px] font-bold ${statusColor}`}>
                                {order.status?.toUpperCase()}
                              </div>
                              <div className="text-[8px] text-gray-600 font-mono">
                                {order.submitted_at ? new Date(order.submitted_at).toLocaleTimeString() : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : rightPanel === 'ai' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                <AIAnalysisPanel symbol={activeSymbol} timeframe={timeframe} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Bot Control */}
                <div className="p-3 border-b border-terminal-border flex-shrink-0">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Bot Control</span>
                    <div className={`flex items-center gap-1.5 text-[10px] font-medium ${
                      isAutoTrading ? 'text-bull' : 'text-gray-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${isAutoTrading ? 'bg-bull animate-pulse' : 'bg-gray-600'}`} />
                      {isAutoTrading ? 'ACTIVE' : 'IDLE'}
                    </div>
                  </div>

                  <button
                    onClick={handleToggleAutoTrade}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isAutoTrading
                        ? 'bg-bear/20 text-bear border border-bear/30 hover:bg-bear/30'
                        : 'bg-bull/20 text-bull border border-bull/30 hover:bg-bull/30'
                    }`}
                  >
                    {isAutoTrading ? 'STOP AUTO-TRADING' : 'START AUTO-TRADING'}
                  </button>

                  <div className={`mt-2 flex items-center justify-center gap-1.5 text-[10px] ${
                    isAutoTrading ? 'text-bull' : 'text-gray-600'
                  }`}>
                    <Activity className="w-3 h-3" />
                    {isAutoTrading ? 'Monitoring RSI + EMA + Volume' : 'Enable to start trading'}
                  </div>

                  <div className="flex gap-1.5 mt-2.5">
                    <StrategyPill label="RSI" active={!!strategyData?.rsiCrossover && strategyData.rsiCrossover !== 'NONE'} />
                    <StrategyPill label="EMA" active={strategyData?.emaTrend === 'BULLISH' || strategyData?.emaTrend === 'BEARISH'} />
                    <StrategyPill label="VOL" active={strategyData?.volumeConfirmed} />
                    <div className="flex-1 flex items-center justify-end gap-0.5">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className={`w-3 h-1.5 rounded-sm transition-colors ${
                            i < (strategyData?.strength || 0) ? 'bg-gold' : 'bg-terminal-border'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="px-3 py-2 border-b border-terminal-border flex items-center justify-between flex-shrink-0">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Activity</span>
                    <span className="text-[10px] text-gray-600 font-mono">
                      {tradeLogs.length} trade{tradeLogs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2.5">
                    <BotActivityFeed activities={botActivities} />
                  </div>
                </div>
              </div>
            )}
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

function MiniStat({ label, value, isHigh, isLow, isVolume }) {
  const formatted = value != null
    ? isVolume ? Number(value).toLocaleString() : Number(value).toFixed(2)
    : '--';
  return (
    <div className="text-center">
      <span className="text-[9px] uppercase text-gray-600 block">{label}</span>
      <span className={`text-[10px] font-mono font-medium ${
        isHigh ? 'text-bull' : isLow ? 'text-bear' : 'text-gray-400'
      }`}>
        {formatted}
      </span>
    </div>
  );
}

function MiniIndicator({ label, value, color }) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-terminal-bg border border-terminal-border`}>
      <span className="text-[9px] text-gray-500 font-semibold">{label}</span>
      <span className={`text-[10px] font-mono font-bold text-${color}`}>{value}</span>
    </div>
  );
}

const STRATEGY_INFO = {
  RSI: {
    fullName: 'Relative Strength Index',
    description: 'Measures overbought/oversold conditions to time entries and exits.',
    how: 'Bot calculates 14-period RSI from recent closes. Triggers BUY when RSI crosses below 30 (oversold) and SELL when RSI crosses above 70 (overbought).',
    signals: ['RSI < 30 → Oversold → Buy signal', 'RSI > 70 → Overbought → Sell signal'],
  },
  EMA: {
    fullName: 'Exponential Moving Average',
    description: 'Detects trend direction by weighting recent prices more heavily.',
    how: 'Bot compares short-term EMA (12) vs long-term EMA (26). Bullish when short EMA is above long EMA, bearish when below.',
    signals: ['Short EMA > Long EMA → Bullish trend', 'Short EMA < Long EMA → Bearish trend'],
  },
  VOL: {
    fullName: 'Volume Confirmation',
    description: 'Validates signals by checking if volume supports the price move.',
    how: 'Bot compares current volume against the 20-period average. A signal is confirmed only when volume is above average, filtering out weak/false moves.',
    signals: ['Volume > Average → Signal confirmed', 'Volume < Average → Signal ignored'],
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
