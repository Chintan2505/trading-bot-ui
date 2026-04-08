import React from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Eye, Zap, Shield, BarChart3 } from 'lucide-react';

export default function BotActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-600">
        <Eye className="w-5 h-5 mb-2 text-gray-700" />
        <p className="text-[11px]">Waiting for bot activity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {activities.map((item) => (
        <ActivityItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function ActivityItem({ item }) {
  const isTrade = item.type === 'trade';
  const isBuy = item.decision === 'BUY';
  const isHold = item.decision === 'HOLD';

  const iconMap = {
    trade: isBuy ? ArrowUpRight : ArrowDownRight,
    signal: Zap,
    hold: Shield,
    analysis: BarChart3,
  };
  const Icon = iconMap[item.type] || BarChart3;

  const colorMap = {
    BUY: { bg: 'bg-[#0ecb81]/10', border: 'border-[#0ecb81]/20', text: 'text-[#0ecb81]', icon: 'text-[#0ecb81]' },
    SELL: { bg: 'bg-[#f6465d]/10', border: 'border-[#f6465d]/20', text: 'text-[#f6465d]', icon: 'text-[#f6465d]' },
    HOLD: { bg: 'bg-gray-800/50', border: 'border-gray-700/30', text: 'text-gray-400', icon: 'text-gray-500' },
  };
  const colors = colorMap[item.decision] || colorMap.HOLD;

  return (
    <div className={`relative flex gap-2.5 p-2.5 rounded-lg border transition-all ${colors.bg} ${colors.border} ${
      isTrade ? 'animate-fade-in' : ''
    }`}>
      {/* Left icon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
        isTrade ? (isBuy ? 'bg-[#0ecb81]/20' : 'bg-[#f6465d]/20') : 'bg-gray-800'
      }`}>
        <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold ${colors.text}`}>
            {isTrade ? `${item.decision} EXECUTED` : item.decision === 'HOLD' ? 'HOLDING' : `${item.decision} SIGNAL`}
          </span>
          {isTrade && item.strength && (
            <div className="flex gap-px">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-1 h-1 rounded-full ${
                  i < item.strength ? 'bg-[#f0b90b]' : 'bg-gray-700'
                }`} />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {item.rsi && (
            <span className="text-[10px] text-gray-500">
              RSI <span className={`font-mono ${
                parseFloat(item.rsi) < 30 ? 'text-[#0ecb81]' : parseFloat(item.rsi) > 70 ? 'text-[#f6465d]' : 'text-gray-400'
              }`}>{item.rsi}</span>
            </span>
          )}
          {item.price && (
            <span className="text-[10px] text-gray-500">
              @ <span className="font-mono text-gray-400">${Number(item.price).toFixed(2)}</span>
            </span>
          )}
          {item.emaTrend && (
            <span className={`text-[10px] ${
              item.emaTrend === 'BULLISH' ? 'text-[#0ecb81]' : item.emaTrend === 'BEARISH' ? 'text-[#f6465d]' : 'text-gray-600'
            }`}>
              {item.emaTrend}
            </span>
          )}
        </div>

        {item.orderId && (
          <div className="mt-1">
            <span className="text-[9px] font-mono text-gray-600 bg-gray-800/80 px-1.5 py-0.5 rounded">
              #{item.orderId.substring(0, 12)}
            </span>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-[9px] text-gray-600 flex-shrink-0 font-mono">
        {item.timestamp ? format(new Date(item.timestamp), 'HH:mm:ss') : ''}
      </span>
    </div>
  );
}
