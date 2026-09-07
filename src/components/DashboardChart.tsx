'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
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

const CustomTooltip = ({ active, payload, label, type }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload || {};

  let leftLabel = 'Leads Created';
  let leftVal = data.created || 0;
  let rightLabel = 'Sales Closed';
  let rightVal = data.closed || 0;
  let rateLabel = 'Conversion Rate';

  if (type === 'finance') {
    leftLabel = 'Total Orders';
    leftVal = data.orders || 0;
    rightLabel = 'Verified Orders';
    rightVal = data.verified || 0;
    rateLabel = 'Verification Rate';
  } else if (type === 'ops') {
    leftLabel = 'Total Orders';
    leftVal = data.orders || 0;
    rightLabel = 'Plants Commissioned';
    rightVal = data.commissioned || 0;
    rateLabel = 'Commissioning Rate';
  }

  const rate = leftVal > 0 ? ((rightVal / leftVal) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-xl backdrop-blur-md min-w-[170px] space-y-2">
      <p className="text-xs font-bold text-white border-b border-[var(--border-color)] pb-1.5 font-mono">
        {label}
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-blue-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {leftLabel}:
          </span>
          <span className="font-extrabold text-white font-mono">{leftVal}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {rightLabel}:
          </span>
          <span className="font-extrabold text-white font-mono">{rightVal}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border-color)]/60 text-[11px]">
          <span className="text-[var(--text-secondary)] font-semibold">{rateLabel}:</span>
          <span className="font-extrabold text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {rate}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function DashboardChart({ trend, type = 'sales' }: DashboardChartProps) {
  if (!trend || trend.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[var(--text-muted)] text-xs italic bg-[var(--bg-main)]/30 rounded-xl border border-dashed border-[var(--border-color)]">
        No trend data available for the selected period.
      </div>
    );
  }

  const isFinance = type === 'finance';
  const isOps = type === 'ops';

  const leftKey = isFinance || isOps ? 'orders' : 'created';
  const leftName = isFinance || isOps ? 'Total Orders' : 'Leads Created';
  const rightKey = isFinance ? 'verified' : isOps ? 'commissioned' : 'closed';
  const rightName = isFinance ? 'Verified Orders' : isOps ? 'Plant Commissioned' : 'Sales Closed';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={trend} margin={{ top: 12, right: 10, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.4} />
        
        {/* X Axis */}
        <XAxis
          dataKey="date"
          stroke="var(--text-muted)"
          fontSize={10}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-color)' }}
        />

        {/* Left Y Axis (Volume: Leads / Orders) */}
        <YAxis
          yAxisId="left"
          stroke="#60A5FA"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />

        {/* Right Y Axis (Closures / Milestones) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#34D399"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />

        <Tooltip content={<CustomTooltip type={type} />} cursor={{ fill: 'var(--bg-main)', opacity: 0.4 }} />

        {/* Bar for Leads / Orders Volume */}
        <Bar
          yAxisId="left"
          dataKey={leftKey}
          name={leftName}
          fill="#3B82F6"
          opacity={0.65}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />

        {/* Vibrant Line for Closed Sales / Verified / Commissioned */}
        <Line
          yAxisId="right"
          type="monotone"
          name={rightName}
          dataKey={rightKey}
          stroke="#10B981"
          strokeWidth={3}
          dot={{ fill: '#10B981', r: 3.5, stroke: '#064e3b', strokeWidth: 1.5 }}
          activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
