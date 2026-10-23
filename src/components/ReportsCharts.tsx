'use client';

import React, { useState } from 'react';
import {
  ComposedChart,
  LineChart,
  Line,
  Area,
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
          <span className="flex items-center gap-1.5 text-pink-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-pink-400" />
            Leads Created:
          </span>
          <span className="font-extrabold text-white font-mono">{created}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-purple-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Sales Closed:
          </span>
          <span className="font-extrabold text-white font-mono">{closed}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border-color)]/60 text-[11px]">
          <span className="text-[var(--text-secondary)] font-semibold">Conversion Rate:</span>
          <span className="font-extrabold text-purple-400 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded">
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
        {/* Soft Glowing Purple Gradient for Area Spline Wave */}
        <defs>
          <linearGradient id="reportsSalesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.32} />
            <stop offset="65%" stopColor="#8B5CF6" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.4} />
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
        <YAxis yAxisId="left" stroke="#F472B6" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" stroke="#A78BFA" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<TrendCustomTooltip />} cursor={{ fill: 'var(--bg-main)', opacity: 0.4 }} />
        <Bar yAxisId="left" dataKey="created" name="Leads Created" fill="#F472B6" opacity={0.80} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Area
          yAxisId="right"
          type="monotone"
          name="Sales Closed"
          dataKey="closed"
          stroke="#8B5CF6"
          strokeWidth={2.5}
          fill="url(#reportsSalesGradient)"
          dot={false}
          activeDot={{
            r: 5,
            fill: '#8B5CF6',
            stroke: '#ffffff',
            strokeWidth: 2,
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

interface LeadSourcePieChartProps {
  leadSourceData: { name: string; value: number }[];
  colors?: string[];
}

export function LeadSourcePieChart({ leadSourceData }: LeadSourcePieChartProps) {
  if (!leadSourceData || leadSourceData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-main)]/30 border border-dashed border-[var(--border-color)] rounded-xl min-h-[16rem]">
        <p className="text-xs text-[var(--text-secondary)] font-semibold">No lead source data available yet.</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">Imported leads without source tag are excluded until updated.</p>
      </div>
    );
  }

  // Separate "Other" / "Others" so large bulk numbers don't squash actionable channels
  const otherItem = leadSourceData.find(
    (item) => item.name.trim().toLowerCase() === 'other' || item.name.trim().toLowerCase() === 'others'
  );
  const otherCount = otherItem ? otherItem.value : 0;

  // Active marketing channels sorted descending by lead count
  const activeSources = leadSourceData
    .filter((item) => item.name.trim().toLowerCase() !== 'other' && item.name.trim().toLowerCase() !== 'others')
    .sort((a, b) => b.value - a.value);

  const activeTotal = activeSources.reduce((acc, curr) => acc + curr.value, 0);
  const maxVal = activeSources.length > 0 ? Math.max(...activeSources.map((s) => s.value)) : 1;

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header with Title, Subtitle, and Other/Untagged Lead Counter */}
      <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-[var(--border-color)]">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Lead Sources
          </h3>
          <p className="text-xs text-slate-500 dark:text-[var(--text-muted)] mt-0.5">
            Where your leads come from
          </p>
        </div>

        {otherCount > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-[11px] text-slate-600 dark:text-slate-400 font-medium shrink-0 shadow-2xs"
            title="Leads imported or created without a specific marketing channel tag"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            <span>Other:</span>
            <span className="font-extrabold font-mono text-slate-900 dark:text-white">
              {otherCount.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* Horizontal Bar Chart Body */}
      {activeSources.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-main)]/20 border border-dashed border-[var(--border-color)] rounded-xl min-h-[12rem]">
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
            No active marketing channels tagged yet.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            All <strong className="text-slate-900 dark:text-white font-mono">{otherCount.toLocaleString('en-IN')}</strong> leads are currently in Other / Untagged.
          </p>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col justify-center space-y-3 py-1">
          {/* Subtle Vertical Dotted Grid Lines */}
          <div className="absolute inset-y-0 left-24 sm:left-28 right-16 grid grid-cols-4 pointer-events-none">
            <div className="border-r border-dashed border-slate-200/80 dark:border-slate-800/60 h-full" />
            <div className="border-r border-dashed border-slate-200/80 dark:border-slate-800/60 h-full" />
            <div className="border-r border-dashed border-slate-200/80 dark:border-slate-800/60 h-full" />
            <div className="border-r border-dashed border-slate-200/80 dark:border-slate-800/60 h-full" />
          </div>

          {activeSources.map((item) => {
            const ratio = item.value / maxVal;
            const widthPercent = Math.max(8, Math.round(ratio * 92));
            const sharePercent = activeTotal > 0 ? ((item.value / activeTotal) * 100).toFixed(1) : '0';

            return (
              <div key={item.name} className="relative flex items-center group">
                {/* Channel Label */}
                <div className="w-24 sm:w-28 text-right pr-3 shrink-0">
                  <span
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate block"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Horizontal Bar Track */}
                <div className="flex-1 flex items-center min-w-0 pr-2">
                  <div
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: '#0D9488',
                    }}
                    className="h-7 sm:h-7.5 rounded-r-xl transition-all duration-700 ease-out flex items-center justify-end pr-2 group-hover:brightness-110 shadow-xs"
                  />

                  {/* Count & Share Percentage */}
                  <div className="ml-2.5 shrink-0 flex items-center gap-1.5 font-mono">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {item.value.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded">
                      {sharePercent}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Channels Summary Footer */}
      {activeSources.length > 0 && (
        <div className="pt-3 border-t border-[var(--border-color)] mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-[var(--text-muted)]">
          <span>Active Channels Total</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {activeTotal.toLocaleString('en-IN')} leads
          </span>
        </div>
      )}
    </div>
  );
}

const STAGE_SHORT_MAP: Record<string, string> = {
  'Fresh Lead': 'Fresh',
  'DNP (No Answer)': 'DNP',
  'Follow Up': 'Follow Up',
  'Not Interested': 'Not Int.',
  'Call Later': 'Call Later',
  'Already Installed': 'Installed',
  'Decision Pending': 'Decision',
  'Meeting Booked': 'Mtg Booked',
  'Meeting Done': 'Mtg Done',
  'Disconnected': 'Discon.',
  'Switch Off': 'Switch Off',
  "Can't Fit Solar": 'No Fit',
  'Sale Done': 'Sale Done',
  'Meeting Cancelled': 'Cancelled',
};

interface PipelineBarChartProps {
  pipelineData?: { stage: number; count: number }[];
  stageNames?: Record<number, { name: string; color: string; short?: string }>;
  pipelineBarData?: { name: string; Leads: number; color?: string }[];
}

const PipelineTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-xl backdrop-blur-md min-w-[190px] space-y-1.5 font-sans">
      <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--border-color)]">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: data.color }} />
        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
          {data.fullName || data.name}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs pt-0.5">
        <span className="text-slate-500 dark:text-[var(--text-secondary)] font-medium">Active Leads:</span>
        <span className="font-mono font-extrabold text-slate-900 dark:text-white">
          {data.count.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] pt-1 border-t border-[var(--border-color)]/60">
        <span className="text-slate-500 dark:text-[var(--text-secondary)] font-medium">Pipeline Share:</span>
        <span
          className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px]"
          style={{ backgroundColor: `${data.color}20`, color: data.color }}
        >
          {data.share}%
        </span>
      </div>
    </div>
  );
};

export function PipelineBarChart({ pipelineData, stageNames, pipelineBarData }: PipelineBarChartProps) {
  const [viewMode, setViewMode] = useState<'active' | 'all'>('active');

  // Extract counts for Fresh Lead (stage 1) and Not Interested (stage 4)
  let freshCount = 0;
  let notInterestedCount = 0;

  if (pipelineData && pipelineData.length > 0) {
    const f = pipelineData.find((p) => p.stage === 1);
    if (f) freshCount = f.count;
    const n = pipelineData.find((p) => p.stage === 4);
    if (n) notInterestedCount = n.count;
  } else if (pipelineBarData && pipelineBarData.length > 0) {
    const f = pipelineBarData.find((p) => p.name.toLowerCase().includes('fresh'));
    if (f) freshCount = f.Leads;
    const n = pipelineBarData.find((p) => p.name.toLowerCase().includes('not interested'));
    if (n) notInterestedCount = n.Leads;
  }

  let rawList: { stage?: number; name: string; fullName: string; count: number; color: string }[] = [];

  if (pipelineData && pipelineData.length > 0 && stageNames) {
    rawList = pipelineData.map((item) => {
      const stageInfo = stageNames[item.stage] || { name: `Stage ${item.stage}`, color: '#3B82F6' };
      const shortName = (stageInfo as any).short || STAGE_SHORT_MAP[stageInfo.name] || stageInfo.name;
      return {
        stage: item.stage,
        name: shortName,
        fullName: stageInfo.name,
        count: item.count,
        color: stageInfo.color,
      };
    });
  } else if (pipelineBarData && pipelineBarData.length > 0) {
    rawList = pipelineBarData.map((item) => ({
      name: STAGE_SHORT_MAP[item.name] || item.name,
      fullName: item.name,
      count: item.Leads,
      color: item.color || '#3B82F6',
    }));
  }

  // Filter based on viewMode (Active Pipeline excludes Fresh Lead & Not Interested)
  const filteredList = viewMode === 'active'
    ? rawList.filter((item) => {
        if (item.stage !== undefined) {
          return item.stage !== 1 && item.stage !== 4;
        }
        const lower = (item.fullName || item.name).toLowerCase();
        return !lower.includes('fresh') && !lower.includes('not interested');
      })
    : rawList;

  const total = filteredList.reduce((acc, curr) => acc + curr.count, 0) || 1;
  const data = filteredList.map((item) => ({
    ...item,
    share: ((item.count / total) * 100).toFixed(1),
  }));

  if (data.length === 0 && rawList.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[var(--text-muted)] text-xs italic bg-[var(--bg-main)]/30 rounded-xl border border-dashed border-[var(--border-color)]">
        No pipeline stage data available.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Option 2: Quick Filter Toggle Tabs + Fresh & Not Interested Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        {/* Toggle Tabs */}
        <div className="inline-flex items-center gap-1 p-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs self-start">
          <button
            type="button"
            onClick={() => setViewMode('active')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              viewMode === 'active'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active Pipeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              viewMode === 'all'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Stages
          </button>
        </div>

        {/* Counter Pills for Fresh Queue & Not Interested (shown in Active view) */}
        {viewMode === 'active' && (freshCount > 0 || notInterestedCount > 0) && (
          <div className="flex items-center gap-2 flex-wrap text-xs self-start sm:self-center">
            {freshCount > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] font-medium text-slate-600 dark:text-slate-400 shadow-2xs"
                title="Uncontacted / Fresh Lead Queue"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span>Fresh Queue:</span>
                <strong className="font-mono text-slate-900 dark:text-white font-extrabold">
                  {freshCount.toLocaleString('en-IN')}
                </strong>
              </div>
            )}
            {notInterestedCount > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] font-medium text-slate-600 dark:text-slate-400 shadow-2xs"
                title="Disqualified / Not Interested Leads"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>Not Interested:</span>
                <strong className="font-mono text-slate-900 dark:text-white font-extrabold">
                  {notInterestedCount.toLocaleString('en-IN')}
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Capsule Bar Chart */}
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.4} />
            <XAxis
              dataKey="name"
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
              interval={0}
              angle={0}
              textAnchor="middle"
              height={26}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<PipelineTooltip />} cursor={{ fill: 'var(--bg-main)', opacity: 0.3 }} />
            <Bar
              dataKey="count"
              name="Leads"
              radius={[12, 12, 0, 0]}
              maxBarSize={viewMode === 'active' ? 34 : 26}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
