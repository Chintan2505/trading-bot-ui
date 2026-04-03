import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatCard({ title, value, icon, valueColorClass = "text-gray-900" }) {
  return (
    <Card className="rounded-2xl shadow-sm border-gray-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColorClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
