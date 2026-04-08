import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '@/context/AccountContext';
import { useSocket } from '@/context/SocketContext';
import { getPortfolioHistory, getPositions, getTrades } from '@/services/api';
import DashboardView from '../view/dashboard.view';

export default function DashboardContainer() {
  const { account, isLoading: accountLoading } = useAccount();
  const { connectionStatus, isAutoTrading, activeSymbol } = useSocket();
  const navigate = useNavigate();

  const [portfolioHistory, setPortfolioHistory] = useState(null);
  const [positions, setPositions] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, posRes, tradesRes] = await Promise.all([
          getPortfolioHistory('1M', '1D'),
          getPositions(),
          getTrades(1, 5),
        ]);
        if (historyRes.success) setPortfolioHistory(historyRes.history);
        if (posRes.success) setPositions(posRes.positions);
        if (tradesRes.success) setRecentTrades(tradesRes.trades);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const equity = account?.equity ? parseFloat(account.equity) : 0;
  const lastEquity = account?.last_equity ? parseFloat(account.last_equity) : equity;
  const dayPL = equity - lastEquity;
  const dayPLPct = lastEquity > 0 ? (dayPL / lastEquity) * 100 : 0;
  const buyingPower = account?.buying_power ? parseFloat(account.buying_power) : 0;

  return (
    <DashboardView
      account={account}
      accountLoading={accountLoading}
      connectionStatus={connectionStatus}
      isAutoTrading={isAutoTrading}
      portfolioHistory={portfolioHistory}
      positions={positions}
      recentTrades={recentTrades}
      loading={loading}
      equity={equity}
      dayPL={dayPL}
      dayPLPct={dayPLPct}
      buyingPower={buyingPower}
      navigate={navigate}
    />
  );
}
