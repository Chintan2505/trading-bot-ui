import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socket, subscribeToSymbol, toggleAutoTrade } from '@/services/socket';
import { toast } from 'sonner';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'disconnected');
  const [liveBar, setLiveBar] = useState(null);
  const [prevBar, setPrevBar] = useState(null);
  const [strategyData, setStrategyData] = useState(null);
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [tradeLogs, setTradeLogs] = useState([]);
  const [tradeMarkers, setTradeMarkers] = useState([]);
  const [botActivities, setBotActivities] = useState([]);
  const [activeSymbol, setActiveSymbol] = useState('AAPL');

  useEffect(() => {
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bar_update', onBarUpdate);
    socket.on('strategy_update', onStrategyUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bar_update', onBarUpdate);
      socket.off('strategy_update', onStrategyUpdate);
    };
  }, []);

  const handleToggleAutoTrade = useCallback(() => {
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
  }, [isAutoTrading, strategyData, activeSymbol]);

  const changeSymbol = useCallback((sym) => {
    setActiveSymbol(sym);
    setLiveBar(null);
    setPrevBar(null);
    setTradeMarkers([]);
    setBotActivities([]);
    subscribeToSymbol(sym);
  }, []);

  const value = {
    connectionStatus,
    liveBar,
    prevBar,
    strategyData,
    isAutoTrading,
    tradeLogs,
    tradeMarkers,
    botActivities,
    activeSymbol,
    handleToggleAutoTrade,
    changeSymbol,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}
