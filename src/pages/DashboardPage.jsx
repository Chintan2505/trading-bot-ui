import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '@/context/AccountContext';
import { useSocket } from '@/context/SocketContext';
import { getPortfolioHistory, getPositions, getTrades } from '@/services/api';
import {
  TrendingUp, TrendingDown, DollarSign, Briefcase, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';

export default function DashboardPage() {
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
  const cash = account?.cash ? parseFloat(account.cash) : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div>
          <h1 className="text-lg font-bold text-white">Dashboard</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Portfolio overview & performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
            connectionStatus === 'connected' ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-bull animate-pulse' : 'bg-bear'}`} />
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </div>
          {isAutoTrading && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-bull/10 text-bull">
              <Activity className="w-3 h-3" />
              Bot Active
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Equity"
            value={`$${equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            loading={accountLoading}
          />
          <StatCard
            title="Day P&L"
            value={`${dayPL >= 0 ? '+' : ''}$${dayPL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle={`${dayPLPct >= 0 ? '+' : ''}${dayPLPct.toFixed(2)}%`}
            icon={dayPL >= 0 ? TrendingUp : TrendingDown}
            color={dayPL >= 0 ? 'bull' : 'bear'}
            loading={accountLoading}
          />
          <StatCard
            title="Buying Power"
            value={`$${buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            icon={BarChart3}
            loading={accountLoading}
          />
          <StatCard
            title="Open Positions"
            value={positions.length.toString()}
            subtitle={`${positions.filter(p => parseFloat(p.unrealized_pl) > 0).length} profitable`}
            icon={Briefcase}
            color="gold"
            loading={loading}
          />
        </div>

        {/* Equity Chart */}
        {portfolioHistory && portfolioHistory.equity && (
          <div className="glass-card p-4">
            <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-3">Equity Curve (1M)</h3>
            <div className="h-48 flex items-end gap-[2px]">
              {portfolioHistory.equity.map((val, i) => {
                const max = Math.max(...portfolioHistory.equity);
                const min = Math.min(...portfolioHistory.equity);
                const range = max - min || 1;
                const height = ((val - min) / range) * 100;
                const isLast = i === portfolioHistory.equity.length - 1;
                const prev = i > 0 ? portfolioHistory.equity[i - 1] : val;
                const isUp = val >= prev;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-all ${isLast ? 'bg-gold' : isUp ? 'bg-bull/40' : 'bg-bear/40'}`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`$${val.toLocaleString()}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Open Positions */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Open Positions</h3>
              <button
                onClick={() => navigate('/portfolio')}
                className="text-[11px] text-gold hover:text-yellow-400 transition-colors"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-terminal-border">
              {positions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-600 text-sm">No open positions</div>
              ) : (
                positions.slice(0, 5).map((pos) => {
                  const pl = parseFloat(pos.unrealized_pl || 0);
                  const plPct = parseFloat(pos.unrealized_plpc || 0) * 100;
                  const isUp = pl >= 0;
                  return (
                    <div key={pos.symbol} className="flex items-center justify-between px-4 py-2.5 hover:bg-terminal-hover transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-bull' : 'bg-bear'}`} />
                        <div>
                          <span className="text-sm font-medium text-white">{pos.symbol}</span>
                          <span className="text-[11px] text-gray-500 ml-2">{pos.qty} shares</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-mono font-medium ${isUp ? 'text-bull' : 'text-bear'}`}>
                          {isUp ? '+' : ''}${pl.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-mono ${isUp ? 'text-bull' : 'text-bear'}`}>
                          {isUp ? '+' : ''}{plPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Recent Bot Trades</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-[11px] text-gold hover:text-yellow-400 transition-colors"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-terminal-border">
              {recentTrades.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-600 text-sm">No trades yet</div>
              ) : (
                recentTrades.map((trade, i) => (
                  <div key={trade._id || i} className="flex items-center justify-between px-4 py-2.5 hover:bg-terminal-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        trade.decision === 'BUY' ? 'bg-bull/15 text-bull' : trade.decision === 'SELL' ? 'bg-bear/15 text-bear' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {trade.decision === 'BUY' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white">{trade.symbol}</span>
                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          trade.decision === 'BUY' ? 'bg-bull/10 text-bull' : trade.decision === 'SELL' ? 'bg-bear/10 text-bear' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {trade.decision}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-gray-400 font-mono">RSI {trade.rsi?.toFixed(1) ?? '--'}</div>
                      <div className="text-[10px] text-gray-600">{new Date(trade.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color = 'white', loading }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          color === 'bull' ? 'bg-bull/10' : color === 'bear' ? 'bg-bear/10' : color === 'gold' ? 'bg-gold/10' : 'bg-terminal-accent/50'
        }`}>
          <Icon className={`w-4 h-4 ${
            color === 'bull' ? 'text-bull' : color === 'bear' ? 'text-bear' : color === 'gold' ? 'text-gold' : 'text-gray-400'
          }`} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-32 rounded bg-terminal-accent animate-shimmer" />
      ) : (
        <>
          <div className={`text-xl font-mono font-bold ${
            color === 'bull' ? 'text-bull' : color === 'bear' ? 'text-bear' : 'text-white'
          }`}>
            {value}
          </div>
          {subtitle && (
            <div className={`text-[11px] font-mono mt-0.5 ${
              color === 'bull' ? 'text-bull/70' : color === 'bear' ? 'text-bear/70' : 'text-gray-500'
            }`}>
              {subtitle}
            </div>
          )}
        </>
      )}
    </div>
  );
}
