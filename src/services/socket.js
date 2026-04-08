import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
console.log('[Socket] Connecting to:', URL);
export const socket = io(URL);

socket.on('connect', () => {
  console.log('[Socket] Connected — id:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected — reason:', reason);
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message);
});

socket.on('bar_update', (bar) => {
  console.log(`[Socket] bar_update — close: $${bar.close?.toFixed(2)}, vol: ${bar.volume}`);
});

socket.on('strategy_update', (data) => {
  console.log(`[Socket] strategy_update — type: ${data.strategyType}, strength: ${data.strength}, crossover: ${data.crossover || data.rsiCrossover || 'NONE'}`);
});

socket.on('trade_executed', (trade) => {
  console.log(`[Socket] trade_executed — ${trade.strategy} ${trade.decision} ${trade.symbol} | orderId: ${trade.orderId}`);
});

socket.on('strategy_changed', (data) => {
  console.log('[Socket] strategy_changed →', data.strategy);
});

socket.on('scalping_settings_updated', (data) => {
  console.log('[Socket] scalping_settings_updated:', data);
});

socket.on('auto_trade_stopped', (data) => {
  console.log('[Socket] auto_trade_stopped — reason:', data.reason);
});

socket.on('scalping_position_closed', (data) => {
  console.log('[Socket] scalping_position_closed:', data);
});

export const subscribeToSymbol = (symbol) => {
  if (socket.connected) {
    socket.emit('change_subscription', { symbol });
  } else {
    socket.once('connect', () => {
      socket.emit('change_subscription', { symbol });
    });
  }
};

export const toggleAutoTrade = (enabled) => {
  socket.emit('toggle_auto_trade', { enabled });
};

// ─── Scalping Strategy Events ───

export const changeStrategy = (strategy) => {
  socket.emit('change_strategy', { strategy });
};

export const updateScalpingSettings = (settings) => {
  socket.emit('update_scalping_settings', settings);
};

export const getScalpingSettings = () => {
  socket.emit('get_scalping_settings');
};

export const getStrategy = () => {
  socket.emit('get_strategy');
};

export const manualClosePosition = () => {
  socket.emit('manual_close_position');
};

export const manualTestBuy = () => {
  socket.emit('manual_test_buy');
};
