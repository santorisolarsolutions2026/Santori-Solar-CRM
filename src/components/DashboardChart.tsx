'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardChartProps {
  trend: {
    date: string;
    created: number;
    closed: number;
  }[];
}

export default function DashboardChart({ trend }: DashboardChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} />
        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111625', border: '1px solid #1f2937', borderRadius: '8px' }}
          labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px' }}
          cursor={false}
        />
        <Area type="monotone" dataKey="created" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
        <Area type="monotone" dataKey="closed" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
