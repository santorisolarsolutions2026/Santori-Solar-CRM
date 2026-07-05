'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendLineChartProps {
  trend: { date: string; created: number; closed: number }[];
}

export function TrendLineChart({ trend }: TrendLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} />
        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111625', border: '1px solid #1f2937', borderRadius: '8px' }}
          labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px' }}
          cursor={false}
        />
        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
        <Line type="monotone" name="Leads Created" dataKey="created" stroke="#3B82F6" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
        <Line type="monotone" name="Sales Completed" dataKey="closed" stroke="#10B981" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface LeadSourcePieChartProps {
  leadSourceData: { name: string; value: number }[];
  colors: string[];
}

export function LeadSourcePieChart({ leadSourceData, colors }: LeadSourcePieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={leadSourceData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={5}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {leadSourceData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#111625', border: '1px solid #1f2937', borderRadius: '8px' }}
          labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface PipelineBarChartProps {
  pipelineBarData: { name: string; Leads: number }[];
}

export function PipelineBarChart({ pipelineBarData }: PipelineBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={pipelineBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="name" stroke="#6b7280" fontSize={8} tickLine={false} />
        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111625', border: '1px solid #1f2937', borderRadius: '8px' }}
          labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px' }}
          cursor={false}
        />
        <Bar dataKey="Leads" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
