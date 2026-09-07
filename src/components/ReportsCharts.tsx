'use client';

import React from 'react';
import {
  ComposedChart,
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

const TrendCustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload || {};
  const created = data.created || 0;
  const closed = data.closed || 0;
  const rate = created > 0 ? ((closed / created) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-xl backdrop-blur-md min-w-[170px] space-y-2">
      <p className="text-xs font-bold text-white border-b border-[var(--border-color)] pb-1.5 font-mono">
        {label}
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-blue-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Leads Created:
          </span>
          <span className="font-extrabold text-white font-mono">{created}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sales Closed:
          </span>
          <span className="font-extrabold text-white font-mono">{closed}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border-color)]/60 text-[11px]">
          <span className="text-[var(--text-secondary)] font-semibold">Conversion Rate:</span>
          <span className="font-extrabold text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {rate}%
          </span>
        </div>
      </div>
    </div>
  );
};

export function TrendLineChart({ trend }: TrendLineChartProps) {
  if (!trend || trend.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[var(--text-muted)] text-xs italic bg-[var(--bg-main)]/30 rounded-xl border border-dashed border-[var(--border-color)]">
        No trend data available for the selected period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={trend} margin={{ top: 12, right: 10, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.4} />
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
        <YAxis yAxisId="left" stroke="#60A5FA" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" stroke="#34D399" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<TrendCustomTooltip />} cursor={{ fill: 'var(--bg-main)', opacity: 0.4 }} />
        <Bar yAxisId="left" dataKey="created" name="Leads Created" fill="#3B82F6" opacity={0.65} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Line yAxisId="right" type="monotone" name="Sales Closed" dataKey="closed" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 3.5, stroke: '#064e3b', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }} />
      </ComposedChart>
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
              formatter={(value: any, name: any) => [
                `${value} leads (${total > 0 ? ((Number(value) / total) * 100).toFixed(3) : '0.000'}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Total</span>
          <span className="text-sm font-extrabold text-[var(--text-primary)]">{total}</span>
        </div>
      </div>

      {/* Formatted Legend Badges Grid with Percentage Points */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
        {leadSourceData.map((item, index) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(3) : '0.000';
          return (
            <div
              key={item.name}
              className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] min-w-0 hover:border-emerald-500/30 transition-all"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate" title={item.name}>
                  {item.name}
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[11px] font-extrabold text-emerald-400 font-mono">{pct}%</span>
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">({item.value})</span>
                </div>
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
