import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function ChartCard({ data }) {
  // Format tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow bg-white/90 backdrop-blur-sm">
          <p className="text-sm text-gray-500 mb-1">{format(new Date(label), 'HH:mm:ss')}</p>
          <p className="font-semibold text-gray-900">
            RSI: <span className="text-indigo-600">{payload[0].value.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-2xl shadow-sm border-gray-100 lg:col-span-2">
      <CardHeader>
        <CardTitle>RSI Real-time Chart (AAPL)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-400">Waiting for data...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(unixTime) => format(new Date(unixTime), 'HH:mm:ss')}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#888' }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#888' }}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="rsi" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                />
                {/* Reference lines for Overbought / Oversold */}
                <Line type="monotone" dataKey={() => 70} stroke="#ef4444" strokeDasharray="3 3" dot={false} strokeWidth={1} isAnimationActive={false} />
                <Line type="monotone" dataKey={() => 30} stroke="#22c55e" strokeDasharray="3 3" dot={false} strokeWidth={1} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
