'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Layers,
  FileCheck,
  Calendar,
  TrendingUp,
  Clock,
  Sparkles,
  Users,
  ArrowUpRight,
  UserCheck,
  ChevronRight,
  Flame,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const DashboardChart = dynamic(() => import('@/components/DashboardChart'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-950/20 rounded-xl border border-slate-900/40">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface OverviewStats {
  totalLeads: number;
  activeLeads: number;
  meetingsBookedThisMonth: number;
  salesDoneThisMonth: number;
  todayFollowUps: number;
  conversionRate: number;
}

interface PipelineStage {
  stage: number;
  count: number;
}

interface ConsultantPerformance {
  id: number;
  name: string;
  email: string;
  leadsAssigned: number;
  meetingsBooked: number;
  salesClosed: number;
  callsMade: number;
  conversionRate: number;
}

interface ActivityLog {
  id: number;
  remark: string | null;
  fromStatus: number | null;
  toStatus: number;
  createdAt: string;
  lead: { id: number; customerName: string; leadCode: string };
  user: { id: number; name: string; role: string };
}

const STAGE_NAMES: Record<number, { name: string; color: string }> = {
  1: { name: 'Fresh Lead', color: '#3B82F6' },
  2: { name: 'DNP (No Answer)', color: '#9CA3AF' },
  3: { name: 'Follow Up', color: '#F59E0B' },
  4: { name: 'Not Interested', color: '#991B1B' },
  5: { name: 'Call Later', color: '#8B5CF6' },
  6: { name: 'Already Installed', color: '#374151' },
  7: { name: 'Decision Pending', color: '#EAB308' },
  8: { name: 'Meeting Booked', color: '#0D9488' },
  9: { name: 'Meeting Done', color: '#0EA5E9' },
  10: { name: 'Disconnected', color: '#6B7280' },
  11: { name: 'Switch Off', color: '#4B5563' },
  12: { name: 'Can\'t Fit Solar', color: '#111827' },
  13: { name: 'Sale Done', color: '#16A34A' },
};

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [performance, setPerformance] = useState<ConsultantPerformance[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // 1. Fetch overview stats
      const statsRes = await fetch('/api/v1/reports/overview');
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      // 2. Fetch pipeline
      const pipelineRes = await fetch('/api/v1/reports/pipeline');
      const pipelineData = await pipelineRes.json();
      if (pipelineData.success) setPipeline(pipelineData.data);

      // 3. Fetch trends
      const trendRes = await fetch('/api/v1/reports/trend');
      const trendData = await trendRes.json();
      if (trendData.success) setTrend(trendData.data);

      // 4. Fetch team performance (for all users system-wide)
      const perfRes = await fetch('/api/v1/reports/team-performance');
      const perfData = await perfRes.json();
      if (perfData.success) setPerformance(perfData.data);

      // 5. Fetch recent activity
      const feedRes = await fetch('/api/v1/reports/recent-activity');
      const feedData = await feedRes.json();
      if (feedData.success) {
        setActivities(feedData.data.logs || feedData.data || []);
      }

      // 6. Fetch reminders
      const remindersRes = await fetch('/api/v1/reports/reminders');
      const remindersData = await remindersRes.json();
      if (remindersData.success) setReminders(remindersData.data);
    } catch (err) {
      console.error('Fetch dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#111625] border border-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-[#111625] border border-slate-800 rounded-xl lg:col-span-2" />
          <div className="h-96 bg-[#111625] border border-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Leads Pool',
      value: stats?.totalLeads || 0,
      icon: Layers,
      color: 'from-blue-600/10 to-indigo-600/5 border-blue-500/20 text-blue-400',
    },
    {
      name: 'Active Lead Opportunities',
      value: stats?.activeLeads || 0,
      icon: Flame,
      color: 'from-amber-600/10 to-yellow-600/5 border-amber-500/20 text-amber-400',
    },
    {
      name: 'Meetings Booked (Month)',
      value: stats?.meetingsBookedThisMonth || 0,
      icon: Calendar,
      color: 'from-cyan-600/10 to-blue-600/5 border-cyan-500/20 text-cyan-400',
    },
    {
      name: 'Sales Closed (Month)',
      value: stats?.salesDoneThisMonth || 0,
      icon: TrendingUp,
      color: 'from-emerald-600/10 to-teal-600/5 border-emerald-500/20 text-emerald-400',
    },
    {
      name: "Today's Scheduled Actions",
      value: stats?.todayFollowUps || 0,
      icon: Clock,
      color: 'from-purple-600/10 to-pink-600/5 border-purple-500/20 text-purple-400',
    },
    {
      name: 'Sales Closure Rate',
      value: `${stats?.conversionRate || 0}%`,
      icon: Sparkles,
      color: 'from-pink-600/10 to-rose-600/5 border-pink-500/20 text-pink-400',
    },
  ];

  // Filter out redundant ones depending on role (e.g. Finance/Ops don't care about callers as much)
  const isFinanceOrOps = ['finance', 'operations'].includes(user?.role || '');
  const activeCards = isFinanceOrOps 
    ? statCards.filter((card) => ['Total Leads Pool', 'Sales Closed (Month)', 'Sales Closure Rate'].includes(card.name))
    : statCards;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-[#111625] via-[#141b2e] to-[#111625] border border-slate-800 rounded-2xl p-6 overflow-hidden">
        <div className="absolute top-[-20%] right-[-5%] w-[40%] h-[150%] rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              Welcome Back, <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">{user?.name}</span>!
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Here's the latest status of your solar sales pipeline.
            </p>
          </div>
          <div className="flex gap-3">
            {hasPermission('leads:create') && (
              <Link
                href="/leads/new"
                className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5"
              >
                <span>Add New Lead</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}

          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {activeCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`relative overflow-hidden bg-gradient-to-br ${card.color} border rounded-xl p-5 shadow-lg flex flex-col justify-between h-32 transition-transform hover:-translate-y-1 duration-200`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 tracking-wider leading-snug">
                  {card.name}
                </span>
                <Icon className="w-5 h-5 opacity-70" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white tracking-tight">{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line graph */}
        <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 lg:col-span-2 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Sales & Leads Trend (15 Days)</h3>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Leads Created
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Sales Closed
              </span>
            </div>
          </div>
          <div className="h-80 w-full">
            <DashboardChart trend={trend} />
          </div>
        </div>

        {/* Pipeline Stage Distribution Bars */}
        <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Pipeline Distribution</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {pipeline.map((item) => {
                const stageInfo = STAGE_NAMES[item.stage] || { name: `Stage ${item.stage}`, color: '#fff' };
                const maxCount = Math.max(...pipeline.map((p) => p.count)) || 1;
                const percent = (item.count / maxCount) * 100;
                return (
                  <div key={item.stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">{stageInfo.name}</span>
                      <span className="text-white">{item.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: stageInfo.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 mt-4">
            <Link
              href="/leads"
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center justify-center gap-1"
            >
              <span>View Interactive Pipeline Grid</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Reminders, Leaderboard and Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Upcoming Task Reminders */}
        <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-md flex flex-col h-[28rem]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Upcoming Task Reminders</span>
          </h3>
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {reminders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic py-12">
                <span>No upcoming tasks scheduled.</span>
              </div>
            ) : (
              reminders.map((rem) => {
                const isMeeting = rem.type === 'meeting';
                return (
                  <div
                    key={rem.id}
                    className={`p-3 border rounded-xl flex items-start gap-3 transition-colors ${
                      isMeeting
                        ? 'bg-cyan-950/10 border-cyan-800/30 hover:border-cyan-700/50'
                        : 'bg-amber-950/10 border-amber-800/30 hover:border-amber-700/50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isMeeting ? (
                        <Calendar className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <Link
                          href={`/leads/${rem.leadId}`}
                          className="text-xs font-bold text-white hover:text-amber-400 hover:underline truncate"
                        >
                          {rem.customerName}
                          <span className="text-[10px] text-slate-400 font-semibold ml-1.5">
                            ({rem.leadCode})
                          </span>
                        </Link>
                        <span className="text-[9px] font-bold text-slate-500 shrink-0 font-mono">
                          {new Date(rem.datetime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.25 rounded-md border ${
                          isMeeting 
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {rem.title}
                        </span>
                        
                        <span className="text-[9px] text-slate-400 font-bold font-mono">
                          {new Date(rem.datetime).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-normal truncate">
                        {rem.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Team Leaderboard (Unconditional) */}
        <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-md h-[28rem] flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-500" />
            <span>Consultant Leaderboard</span>
          </h3>
          <div className="overflow-y-auto pr-1 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider sticky top-0 bg-[#111625] pb-3">
                    <th className="pb-3">Consultant</th>
                    <th className="pb-3 text-center">Assigned</th>
                    <th className="pb-3 text-center">Calls</th>
                    <th className="pb-3 text-center">Meetings</th>
                    <th className="pb-3 text-center">Sales</th>
                    <th className="pb-3 text-right">Conv.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {performance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                        No team member statistics found.
                      </td>
                    </tr>
                  ) : (
                    performance.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-3 font-semibold text-white truncate max-w-[90px]">{member.name}</td>
                        <td className="py-3 text-center text-slate-300">{member.leadsAssigned}</td>
                        <td className="py-3 text-center text-slate-300">{member.callsMade}</td>
                        <td className="py-3 text-center text-slate-300">{member.meetingsBooked}</td>
                        <td className="py-3 text-center text-emerald-400 font-bold">{member.salesClosed}</td>
                        <td className="py-3 text-right text-amber-400 font-extrabold">{member.conversionRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Column 3: Recent Activity Stream (Unconditional, lg:col-span-1) */}
        <div className="lg:col-span-1 bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-md h-[28rem] flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Recent Activity Stream</span>
          </h3>
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No activity records found.
              </div>
            ) : (
              activities.map((log) => {
                const stage = STAGE_NAMES[log.toStatus] || { name: `Stage ${log.toStatus}`, color: '#9CA3AF' };
                return (
                  <div key={log.id} className="p-3 bg-slate-900/30 border border-slate-800/50 rounded-lg hover:border-slate-700 transition-colors flex items-start gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                        <p className="text-xs font-bold text-white truncate">
                          <Link
                            href={`/leads/${log.lead.id}`}
                            className="hover:text-amber-400 hover:underline"
                          >
                            {log.lead.customerName}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-semibold ml-1.5 font-mono">
                            ({log.lead.leadCode})
                          </span>
                        </p>
                        <span className="text-[9px] text-slate-500 shrink-0">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Moved to <strong style={{ color: stage.color }}>{stage.name}</strong> by{' '}
                        <Link href={`/team?userId=${log.user.id}`} className="text-amber-400 hover:underline font-bold">
                          {log.user.name}
                        </Link>{' '}
                        ({log.user.role})
                      </p>
                      {log.remark && (
                        <p className="text-[10px] text-slate-500 italic mt-1 leading-normal border-l-2 border-slate-800 pl-2">
                          "{log.remark}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
