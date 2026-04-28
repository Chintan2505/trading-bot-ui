import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
console.log('[Socket] Connecting to:', URL);
export const socket = io(URL);

// ─── Chart data source legend ───
// 📡 IEX trade tick (Last Trade) | 📊 1-min final bar | 💹 bid/ask quote
// 🎯 fill snap (synthetic) | 🚀 trade opened | 🛑 position closed
// 📥 socket inbound | 📤 socket outbound | ⚠ warning | ❌ error

socket.on('connect', () => {
  console.log(`✅ [Socket] Connected — id:${socket.id}`);
});

socket.on('disconnect', (reason) => {
  console.log(`❌ [Socket] Disconnected — reason:${reason}`);
});

socket.on('connect_error', (err) => {
  console.error(`❌ [Socket] Connection error:`, err.message);
});

socket.on('price_update', (p) => {
  // Last Trade tick — drives chart line + ticker
  console.log(
    `📥 [Chart] price_update RX → sym:${p.symbol} price:$${p.price?.toFixed?.(2)} bid:$${p.bid?.toFixed?.(2) ?? '-'} ask:$${p.ask?.toFixed?.(2) ?? '-'} t:${p.time}`,
  );
});

socket.on('bar_update', (bar) => {
  // bar.close = Last Trade price (the chart line)
  console.log(
    `📥 [Chart] bar_update RX → sym:${bar.symbol} O:${bar.open?.toFixed?.(2)} H:${bar.high?.toFixed?.(2)} L:${bar.low?.toFixed?.(2)} C:${bar.close?.toFixed?.(2)} V:${bar.volume}`,
  );
});

socket.on('quote_update', (q) => {
  // bid/ask quote — used for spread display + execution-side reference
  if (typeof q.spread === 'number' && q.spread > 0.05) {
    console.log(
      `💹 [Chart] quote_update RX → bid:$${q.bid?.toFixed(2)} ask:$${q.ask?.toFixed(2)} spread:$${q.spread.toFixed(2)} (wide)`,
    );
  }
});

socket.on('strategy_update', () => {});

socket.on('trade_executed', (trade) => {
  console.log(
    `🚀 [Trade] EXECUTED → ${trade.decision} ${trade.symbol} | entry:$${trade.entryPrice?.toFixed?.(2)} TP:$${trade.takeProfitPrice?.toFixed?.(2)} SL:$${trade.stopLossPrice?.toFixed?.(2)} | qty:${trade.qty} | order:${trade.orderId}`,
  );
});

socket.on('strategy_changed', (data) => {
  console.log(`🧠 [Bot] strategy_changed → ${data.strategy}`);
});

socket.on('scalping_settings_updated', (data) => {
  console.log(`⚙ [Bot] settings_updated:`, data);
});

socket.on('auto_trade_stopped', (data) => {
  console.log(`⏸ [Bot] auto_trade_stopped — reason:${data.reason}`);
});

socket.on('scalping_position_closed', (data) => {
  const pnlIcon = (data.pnl ?? 0) >= 0 ? '🟢' : '🔴';
  console.log(
    `🛑 [Trade] CLOSED ${pnlIcon} → ${data.side} ${data.symbol} | entry:$${data.entryPrice?.toFixed?.(2)} → exit:$${data.exitPrice?.toFixed?.(2)} | P&L:$${data.pnl?.toFixed?.(2)} (${data.pnlPct?.toFixed?.(2)}%) | reason:${data.result}`,
  );
});

socket.on('stream_status', (s) => {
  const icon = s.status === 'connected' ? '🟢' : s.status === 'connecting' ? '🟡' : '🔴';
  console.log(`${icon} [Stream] ${s.symbol} → ${s.status}${s.reason ? ' — ' + s.reason : ''}`);
});

socket.on('trade_error', (e) => {
  console.error(`❌ [Trade] ERROR → ${e.symbol} ${e.decision} — ${e.error}`);
});

export const subscribeToSymbol = (symbol) => {
  console.log(`📤 [Socket] change_subscription → ${symbol}`);
  if (socket.connected) {
    socket.emit('change_subscription', { symbol });
  } else {
    socket.once('connect', () => {
      socket.emit('change_subscription', { symbol });
    });
  }
};

export const toggleAutoTrade = (enabled) => {
  console.log(`📤 [Socket] toggle_auto_trade → ${enabled ? 'ON' : 'OFF'}`);
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
  console.log(`📤 [Socket] manual_close_position`);
  socket.emit('manual_close_position');
};

export const manualTestBuy = () => {
  console.log(`📤 [Socket] manual_test_buy`);
  socket.emit('manual_test_buy');
};

export const updatePositionLevels = (tp, sl) => {
  console.log(`📤 [Socket] update_position_levels → TP:$${tp} SL:$${sl}`);
  socket.emit('update_position_levels', { tp, sl });
};

