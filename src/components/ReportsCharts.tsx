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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
          labelStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
          cursor={false}
        />
        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
        <Line type="monotone" name="Leads Created" dataKey="created" stroke="var(--accent-color)" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
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
          contentStyle={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
          labelStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} tickLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
          labelStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold' }}
          itemStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
          cursor={false}
        />
        <Bar dataKey="Leads" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
