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
  type?: 'sales' | 'finance' | 'ops';
  trend: {
    date: string;
    created?: number;
    closed?: number;
    orders?: number;
    verified?: number;
    commissioned?: number;
  }[];
}

export default function DashboardChart({ trend, type = 'sales' }: DashboardChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.6} />
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            padding: '8px 12px',
          }}
          labelStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
          itemStyle={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 0' }}
          cursor={false}
        />
        {type === 'finance' ? (
          <>
            <Line type="monotone" name="Total Orders" dataKey="orders" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" name="Verified Orders" dataKey="verified" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </>
        ) : type === 'ops' ? (
          <>
            <Line type="monotone" name="Total Orders" dataKey="orders" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" name="Plant Commissioned" dataKey="commissioned" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </>
        ) : (
          <>
            <Line type="monotone" name="Leads Created" dataKey="created" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" name="Sales Closed" dataKey="closed" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
