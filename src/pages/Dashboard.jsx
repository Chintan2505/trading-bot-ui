import React, { useState, useEffect } from 'react';
import Header from '../components/dashboard/Header.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import ChartCard from '../components/dashboard/ChartCard.jsx';
import TradeTable from '../components/dashboard/TradeTable.jsx';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { runBotStrategy } from '../services/api.js';
import { toast } from 'sonner';

export default function Dashboard() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState({
    decision: 'HOLD',
    rsi: 0,
    price: 0,
    lastTradeTime: null,
  });
  const [chartData, setChartData] = useState([]);
  const [tradeLogs, setTradeLogs] = useState([]);

  // Mock initial fetch + Polling effect
  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        handleRunBot(true); // silent fetch
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleRunBot = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    
    try {
      const response = await runBotStrategy();
      
      const newTimestamp = Date.now();
      
      setData(prev => ({
        ...prev,
        decision: response.decision,
        rsi: response.rsi,
        price: response.price || 0, 
        lastTradeTime: response.order ? newTimestamp : prev.lastTradeTime,
      }));

      // Update Chart
      setChartData(prev => {
        // Initialize chart cleanly using backend history if available
        if (prev.length === 0 && response.rsiHistory && response.rsiHistory.length > 0) {
          return response.rsiHistory.slice(-50).map((r, i, arr) => ({
            timestamp: newTimestamp - ((arr.length - 1 - i) * 60000),
            rsi: r
          }));
        }
        
        const newData = [...prev, { timestamp: newTimestamp, rsi: response.rsi }].slice(-50); // Keep last 50 points
        return newData;
      });

      // Update Table if order happened
      if (response.order || (response.decision !== 'HOLD')) {
        setTradeLogs(prev => {
          const newLog = {
            id: newTimestamp.toString(),
            timestamp: newTimestamp,
            decision: response.decision,
            rsi: response.rsi,
            orderStatus: response.order ? response.order.id : (response.cooldown ? 'Skipped (Cooldown)' : 'N/A')
          };
          return [newLog, ...prev].slice(0, 20); // Keep last 20 logs
        });
      }

      if (!isSilent) {
        if (response.order) {
          toast.success(`Trade Executed: ${response.decision} (RSI: ${response.rsi.toFixed(2)})`);
        } else if (response.cooldown) {
          toast.info(`Cooldown Active: Analysis polled but trade skipped.`);
        } else {
          toast(`Bot calculation complete (Decision: ${response.decision})`);
        }
      }

    } catch (error) {
      console.error(error);
      const errMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to run bot strategy. Make sure Alpaca Keys are correct!';
      if (!isSilent) toast.error(`Error: ${errMessage}`);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const getDecisionColor = (decision) => {
    if (decision === 'BUY') return 'text-green-600';
    if (decision === 'SELL') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Header isRunning={isActive} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Avg Proxy Price" 
          value={`$${data.price.toFixed(2)}`} 
          icon={<TrendingUp className="h-4 w-4 text-gray-400" />} 
          valueColorClass="text-gray-900"
        />
        <StatCard 
          title="Last RSI Value" 
          value={data.rsi ? data.rsi.toFixed(2) : '--'} 
          icon={<Activity className="h-4 w-4 text-gray-400" />} 
          valueColorClass={data.rsi < 30 ? "text-green-600" : data.rsi > 70 ? "text-red-600" : "text-gray-900"}
        />
        <StatCard 
          title="Current Decision" 
          value={data.decision} 
          icon={<AlertTriangle className="h-4 w-4 text-gray-400" />} 
          valueColorClass={getDecisionColor(data.decision)}
        />
        <StatCard 
          title="Last Trade Time" 
          value={data.lastTradeTime ? new Date(data.lastTradeTime).toLocaleTimeString() : 'No trades yet'} 
          icon={<Clock className="h-4 w-4 text-gray-400" />} 
          valueColorClass="text-gray-900"
        />
      </div>

      <div className="flex justify-between items-center py-4">
        <div className="text-sm text-gray-500">
          Manual execution triggers the full pipeline.
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? "Stop Polling" : "Start 5s Polling"}
          </Button>
          <Button 
            onClick={() => handleRunBot(false)} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && <Activity className="h-4 w-4 animate-spin" />}
            Run Bot Manually
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard data={chartData} />
        <div className="lg:col-span-1">
          <TradeTable logs={tradeLogs} />
        </div>
      </div>
    </div>
  );
}
