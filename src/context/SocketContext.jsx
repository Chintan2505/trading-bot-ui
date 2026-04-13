import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socket, subscribeToSymbol, toggleAutoTrade } from '@/services/socket';
import { toast } from 'sonner';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'disconnected');
  const [liveBar, setLiveBar] = useState(null);
  const [prevBar, setPrevBar] = useState(null);
  const [isAutoTrading, setIsAutoTrading] = useState(false);
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bar_update', onBarUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bar_update', onBarUpdate);
    };
  }, []);

  const handleToggleAutoTrade = useCallback(() => {
    const newState = !isAutoTrading;
    setIsAutoTrading(newState);
    toggleAutoTrade(newState);

    toast[newState ? 'success' : 'warning'](
      newState ? 'Auto-Trading Activated' : 'Auto-Trading Deactivated',
      { description: newState ? `Bot is now trading ${activeSymbol}` : 'Manual mode enabled' }
    );
  }, [isAutoTrading, activeSymbol]);

  const changeSymbol = useCallback((sym) => {
    setActiveSymbol(sym);
    setLiveBar(null);
    setPrevBar(null);
    subscribeToSymbol(sym);
  }, []);

  const value = {
    connectionStatus,
    liveBar,
    prevBar,
    isAutoTrading,
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
