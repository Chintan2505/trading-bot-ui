import React, { useState, useEffect, useCallback } from 'react';
import { getTrades, getTradeStats, getStatsBySymbol } from '@/services/api';
import { toast } from 'sonner';
import TradeHistoryView from '../view/trade-history.view';

export default function TradeHistoryContainer() {
  const [view, setView] = useState('flat'); // 'flat' | 'symbol'
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [symbolStats, setSymbolStats] = useState([]);
  const [symbolTrades, setSymbolTrades] = useState({}); // { [symbol]: trades[] }
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ symbol: '', decision: '' });
  const limit = 20;

  const fetchFlat = useCallback(async () => {
    setLoading(true);
    try {
      const [tradesRes, statsRes] = await Promise.all([
        getTrades(page, limit, filters),
        getTradeStats(),
      ]);
      if (tradesRes.success) {
        setTrades(tradesRes.trades);
        setTotal(tradesRes.total || 0);
      }
      if (statsRes.success) setStats(statsRes.stats);
    } catch {
      toast.error('Failed to load trade history');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchBySymbol = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStatsBySymbol();
      if (res.success) setSymbolStats(res.symbols || []);
    } catch {
      toast.error('Failed to load symbol stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'flat') fetchFlat();
    else fetchBySymbol();
  }, [view, fetchFlat, fetchBySymbol]);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  const loadSymbolTrades = async (symbol) => {
    if (symbolTrades[symbol]) return; // already cached
    try {
      const res = await getTrades(1, 200, { symbol });
      if (res.success) {
        setSymbolTrades(prev => ({ ...prev, [symbol]: res.trades }));
      }
    } catch {
      toast.error(`Failed to load trades for ${symbol}`);
    }
  };

  return (
    <TradeHistoryView
      view={view}
      setView={setView}
      trades={trades}
      stats={stats}
      symbolStats={symbolStats}
      symbolTrades={symbolTrades}
      loadSymbolTrades={loadSymbolTrades}
      loading={loading}
      page={page}
      setPage={setPage}
      total={total}
      totalPages={totalPages}
      filters={filters}
      handleFilterChange={handleFilterChange}
    />
  );
}
