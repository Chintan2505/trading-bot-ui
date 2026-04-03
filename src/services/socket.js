import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
export const socket = io(URL);

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
