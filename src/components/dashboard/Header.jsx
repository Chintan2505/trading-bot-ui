import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function Header({ isRunning }) {
  return (
    <div className="flex items-center justify-between pb-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Trading Bot</h1>
      <Badge variant={isRunning ? "default" : "secondary"} className="text-sm px-3 py-1">
        {isRunning ? (
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span> Active / Running</span>
        ) : (
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400"></span> Idle / Paused</span>
        )}
      </Badge>
    </div>
  );
}
