import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

export const runBotStrategy = async () => {
  const response = await api.get('/bot/run');
  return response.data;
};

/**
 * Fetch historical candles with full Alpaca API options.
 * @param {string} symbol
 * @param {object} options - { timeframe, limit, start, end, adjustment, feed, sort, currency }
 */
export const getHistoricalCandles = async (symbol = 'AAPL', options = {}) => {
  const params = { symbol, ...options };
  // Remove empty/undefined values so they don't get sent as "undefined"
  Object.keys(params).forEach(key => {
    if (params[key] === undefined || params[key] === '') delete params[key];
  });
  const response = await api.get('/bot/candles', { params });
  return response.data;
};

/**
 * Fetch latest minute bar for one or more symbols.
 * @param {string} symbols  Comma-separated symbols (e.g. 'AAPL,TSLA,GOOGL')
 * @param {object} options  - { feed, currency }
 */
export const getLatestBars = async (symbols = 'AAPL', options = {}) => {
  const params = { symbols, ...options };
  Object.keys(params).forEach(key => {
    if (params[key] === undefined || params[key] === '') delete params[key];
  });
  const response = await api.get('/bot/candles/latest', { params });
  return response.data;
};

export const getAIAnalysis = async (symbol = 'AAPL', timeframe = '1Min') => {
  const response = await api.get('/bot/ai-analysis', {
    params: { symbol, timeframe }
  });
  return response.data;
};

// ── Account ──
export const getAccountInfo = async () => {
  const response = await api.get('/account');
  return response.data;
};

export const getAccountConfig = async () => {
  const response = await api.get('/account/config');
  return response.data;
};

export const getPortfolioHistory = async (period = '1M', timeframe = '1D') => {
  const response = await api.get('/account/history', { params: { period, timeframe } });
  return response.data;
};

// ── Portfolio ──
export const getPositions = async () => {
  const response = await api.get('/portfolio/positions');
  return response.data;
};

export const getPosition = async (symbol) => {
  const response = await api.get(`/portfolio/positions/${symbol}`);
  return response.data;
};

export const closePosition = async (symbol, qty) => {
  const params = qty ? { qty } : {};
  const response = await api.delete(`/portfolio/positions/${symbol}`, { params });
  return response.data;
};

export const closeAllPositions = async () => {
  const response = await api.delete('/portfolio/positions');
  return response.data;
};

// ── Orders ──
export const getOrders = async (status = 'all', limit = 50) => {
  const response = await api.get('/orders', { params: { status, limit } });
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const placeOrder = async (orderData) => {
  const response = await api.post('/orders', orderData);
  return response.data;
};

export const replaceOrder = async (id, changes) => {
  const response = await api.patch(`/orders/${id}`, changes);
  return response.data;
};

export const cancelOrder = async (id) => {
  const response = await api.delete(`/orders/${id}`);
  return response.data;
};

export const cancelAllOrders = async () => {
  const response = await api.delete('/orders/cancel-all');
  return response.data;
};

// ── Watchlists ──
export const getWatchlists = async () => {
  const response = await api.get('/watchlists');
  return response.data;
};

export const getWatchlist = async (id) => {
  const response = await api.get(`/watchlists/${id}`);
  return response.data;
};

export const createWatchlist = async (name, symbols) => {
  const response = await api.post('/watchlists', { name, symbols });
  return response.data;
};

export const updateWatchlist = async (id, data) => {
  const response = await api.put(`/watchlists/${id}`, data);
  return response.data;
};

export const deleteWatchlist = async (id) => {
  const response = await api.delete(`/watchlists/${id}`);
  return response.data;
};

export const addSymbolToWatchlist = async (id, symbol) => {
  const response = await api.post(`/watchlists/${id}/symbols`, { symbol });
  return response.data;
};

export const removeSymbolFromWatchlist = async (id, symbol) => {
  const response = await api.delete(`/watchlists/${id}/symbols/${symbol}`);
  return response.data;
};

// ── Trade History ──
export const getTrades = async (page = 1, limit = 50, filters = {}) => {
  const params = { page, limit, ...filters };
  Object.keys(params).forEach(key => {
    if (params[key] === undefined || params[key] === '') delete params[key];
  });
  const response = await api.get('/trades', { params });
  return response.data;
};

export const getTradeStats = async () => {
  const response = await api.get('/trades/stats');
  return response.data;
};

export default api;
