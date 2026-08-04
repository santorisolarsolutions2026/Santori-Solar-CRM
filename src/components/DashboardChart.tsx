'use client';

import React from 'react';
import {
  LineChart,
  Line,
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
      <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey="date" stroke="#6E7681" fontSize={10} tickLine={false} />
        <YAxis stroke="#6E7681" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#161B22', border: '1px solid var(--border-color)', borderRadius: '8px' }}
          labelStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
          cursor={false}
        />
        <Line type="monotone" name="Leads Created" dataKey="created" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" name="Sales Closed" dataKey="closed" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
