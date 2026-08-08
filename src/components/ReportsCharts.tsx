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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.6} />
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
            padding: '8px 12px',
          }}
          labelStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
          itemStyle={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 0' }}
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
  if (!leadSourceData || leadSourceData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-main)]/30 border border-dashed border-[var(--border-color)] rounded-xl">
        <p className="text-xs text-[var(--text-secondary)] font-semibold">No lead source data available yet.</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">Imported leads without source tag are excluded until updated.</p>
      </div>
    );
  }

  const total = leadSourceData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="w-full h-full flex flex-col justify-between space-y-4">
      <div className="w-full h-44 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={leadSourceData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={leadSourceData.length > 1 ? 3 : 0}
              dataKey="value"
              stroke="none"
              strokeWidth={0}
            >
              {leadSourceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
                padding: '8px 12px',
              }}
              labelStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 0' }}
              formatter={(value: any, name: any) => [`${value} leads (${total > 0 ? ((Number(value) / total) * 100).toFixed(0) : 0}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Total</span>
          <span className="text-sm font-extrabold text-[var(--text-primary)]">{total}</span>
        </div>
      </div>

      {/* Formatted Legend Badges Grid */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
        {leadSourceData.map((item, index) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
          return (
            <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[index % colors.length] }} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate" title={item.name}>{item.name}</p>
                <p className="text-[10px] text-[var(--text-secondary)] font-mono">{pct}% ({item.value})</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PipelineBarChartProps {
  pipelineBarData: { name: string; Leads: number }[];
}

export function PipelineBarChart({ pipelineBarData }: PipelineBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={pipelineBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.6} />
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
            padding: '8px 12px',
          }}
          labelStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
          itemStyle={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 0' }}
          cursor={false}
        />
        <Bar dataKey="Leads" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
