import React, { useState, useEffect, useCallback } from 'react';
import { getTrades, getTradeStats } from '@/services/api';
import { toast } from 'sonner';
import TradeHistoryView from '../view/trade-history.view';

export default function TradeHistoryContainer() {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ symbol: '', decision: '' });
  const limit = 20;

  const fetchData = useCallback(async () => {
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <TradeHistoryView
      trades={trades}
      stats={stats}
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
