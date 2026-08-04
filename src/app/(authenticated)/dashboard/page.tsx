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
  DollarSign,
  Truck,
  Hammer,
  CheckCircle2,
  Maximize2,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const DashboardChart = dynamic(() => import('@/components/DashboardChart'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const LeadSourcePieChart = dynamic(
  () => import('@/components/ReportsCharts').then((mod) => mod.LeadSourcePieChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[var(--bg-main)] animate-pulse rounded-xl" />,
  }
);

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];

const leadSourceData = [
  { name: 'Meta', value: 35 },
  { name: 'Discom', value: 20 },
  { name: 'Offline Campaign', value: 15 },
  { name: 'Inbound', value: 15 },
  { name: 'WhatsApp', value: 10 },
  { name: 'Cold Call', value: 5 },
];

interface OverviewStats {
  totalLeads: number;
  activeLeads: number;
  meetingsBookedThisMonth: number;
  meetingsDoneThisMonth?: number;
  salesDoneThisMonth: number;
  todayFollowUps: number;
  conversionRate: number;
  
  // Finance stats
  totalOrdersPending?: number;
  ordersVerified?: number;
  totalLedgerValue?: number;
  totalPaymentsCollected?: number;
  outstandingBalance?: number;

  // Operations stats
  totalJobsAssigned?: number;
  deliveredJobs?: number;
  installedJobs?: number;
  commissionedJobs?: number;
  subsidyJobs?: number;
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
  2: { name: 'DNP (No Answer)', color: '#94A3B8' },
  3: { name: 'Follow Up', color: '#0D9488' },
  4: { name: 'Not Interested', color: '#EF4444' },
  5: { name: 'Call Later', color: '#06B6D4' },
  6: { name: 'Already Installed', color: '#475569' },
  7: { name: 'Decision Pending', color: '#6366F1' },
  8: { name: 'Meeting Booked', color: '#2563EB' },
  9: { name: 'Meeting Done', color: '#10B981' },
  10: { name: 'Disconnected', color: '#64748B' },
  11: { name: 'Switch Off', color: '#64748B' },
  12: { name: 'Can\'t Fit Solar', color: '#475569' },
  13: { name: 'Sale Done', color: '#10B981' },
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

  // Activity Stream full screen modal state for Admin
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role?.startsWith('admin:') || user?.role === 'director';

  const filteredActivities = activities.filter((log) => {
    if (!activitySearchQuery.trim()) return true;
    const q = activitySearchQuery.toLowerCase();
    return (
      log.lead.customerName.toLowerCase().includes(q) ||
      log.lead.leadCode.toLowerCase().includes(q) ||
      log.user.name.toLowerCase().includes(q) ||
      (log.remark && log.remark.toLowerCase().includes(q))
    );
  });

  const fetchData = async () => {
    try {
      const [
        statsRes,
        pipelineRes,
        trendRes,
        perfRes,
        feedRes,
        remindersRes
      ] = await Promise.all([
        fetch('/api/v1/reports/overview'),
        fetch('/api/v1/reports/pipeline'),
        fetch('/api/v1/reports/trend'),
        fetch('/api/v1/reports/team-performance'),
        fetch('/api/v1/reports/recent-activity'),
        fetch('/api/v1/reports/reminders'),
      ]);

      const [
        statsData,
        pipelineData,
        trendData,
        perfData,
        feedData,
        remindersData
      ] = await Promise.all([
        statsRes.json(),
        pipelineRes.json(),
        trendRes.json(),
        perfRes.json(),
        feedRes.json(),
        remindersRes.json()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (pipelineData.success) setPipeline(pipelineData.data);
      if (trendData.success) setTrend(trendData.data);
      if (perfData.success) setPerformance(perfData.data);
      if (feedData.success) setActivities(feedData.data.logs || feedData.data || []);
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
            <div key={i} className="h-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl lg:col-span-2" />
          <div className="h-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
        </div>
      </div>
    );
  }

  const userDept = user?.department?.name || '';
  const userBaseRole = user?.role ? (user.role.includes(':') ? user.role.split(':')[0] : user.role) : '';

  let activeCards: any[] = [];

  if (userDept === 'Finance' || userBaseRole === 'finance') {
    activeCards = [
      {
        name: 'Orders Received (Pending Verification)',
        value: stats?.totalOrdersPending || 0,
        icon: Layers,
        color: 'border-[var(--border-color)] text-emerald-400',
      },
      {
        name: 'Orders Verified (Total)',
        value: stats?.ordersVerified || 0,
        icon: FileCheck,
        color: 'from-emerald-600/10 to-teal-600/5 border-emerald-500/20 text-emerald-400',
      },
      {
        name: 'Total Ledger Value',
        value: `₹${(stats?.totalLedgerValue || 0).toLocaleString('en-IN')}`,
        icon: TrendingUp,
        color: 'border-[var(--border-color)] text-teal-400',
      },
      {
        name: 'Payments Collected',
        value: `₹${(stats?.totalPaymentsCollected || 0).toLocaleString('en-IN')}`,
        icon: DollarSign,
        color: 'from-purple-600/10 to-pink-600/5 border-purple-500/20 text-purple-400',
      },
      {
        name: 'Outstanding Balance',
        value: `₹${(stats?.outstandingBalance || 0).toLocaleString('en-IN')}`,
        icon: Clock,
        color: 'border-[var(--border-color)] text-emerald-400',
      },
    ];
  } else if (userDept === 'Operations' || userBaseRole === 'operations') {
    activeCards = [
      {
        name: 'Total Assigned Jobs',
        value: stats?.totalJobsAssigned || 0,
        icon: Layers,
        color: 'border-[var(--border-color)] text-emerald-400',
      },
      {
        name: 'Materials Delivered',
        value: stats?.deliveredJobs || 0,
        icon: Truck,
        color: 'border-[var(--border-color)] text-emerald-400',
      },
      {
        name: 'Installations Completed',
        value: stats?.installedJobs || 0,
        icon: Hammer,
        color: 'border-[var(--border-color)] text-teal-400',
      },
      {
        name: 'Plants Commissioned',
        value: stats?.commissionedJobs || 0,
        icon: CheckCircle2,
        color: 'from-emerald-600/10 to-teal-600/5 border-emerald-500/20 text-emerald-400',
      },
      {
        name: 'Subsidies Applied',
        value: stats?.subsidyJobs || 0,
        icon: Sparkles,
        color: 'from-pink-600/10 to-rose-600/5 border-pink-500/20 text-pink-400',
      },
    ];
  } else {
    activeCards = [
      {
        name: 'Total Leads Assigned',
        value: stats?.totalLeads || 0,
        icon: Layers,
        color: 'border-[var(--border-color)] text-emerald-400',
      },
      {
        name: 'Total Meetings Booked',
        value: stats?.meetingsBookedThisMonth || 0,
        icon: Calendar,
        color: 'border-[var(--border-color)] text-teal-400',
      },
      {
        name: 'Total Meetings Recorded',
        value: stats?.meetingsDoneThisMonth || 0,
        icon: FileCheck,
        color: 'from-purple-600/10 to-pink-600/5 border-purple-500/20 text-purple-400',
      },
      {
        name: 'Total Sales Closed',
        value: stats?.salesDoneThisMonth || 0,
        icon: TrendingUp,
        color: 'from-emerald-600/10 to-teal-600/5 border-emerald-500/20 text-emerald-400',
      },
      {
        name: "Today's Scheduled Actions",
        value: stats?.todayFollowUps || 0,
        icon: Clock,
        color: 'border-[var(--border-color)] text-emerald-400',
      },
      {
        name: 'Sales Closure Rate',
        value: `${stats?.conversionRate || 0}%`,
        icon: Sparkles,
        color: 'from-pink-600/10 to-rose-600/5 border-pink-500/20 text-pink-400',
      },
    ];
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 overflow-hidden shadow-sm">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">
              Welcome Back, <span className="text-emerald-500 font-extrabold">{user?.name}</span>!
            </h1>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-secondary)] mt-1">
              Here's the latest status of your solar sales pipeline.
            </p>
          </div>
          <div className="flex gap-3">
            {hasPermission('leads:create') && (
              <Link
                href="/leads/new"
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>Add New Lead</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-${activeCards.length} gap-6`}>
        {activeCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md flex justify-between items-center h-28 transition-all duration-200"
            >
              <div className="flex flex-col justify-between h-full">
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase leading-snug">
                  {card.name}
                </span>
                <span className="text-2xl font-extrabold text-white tracking-tight">{card.value}</span>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Reminders & Activity Feed Section (Placed right below Leads Data) */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Column 1: Upcoming Task Reminders */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm flex flex-col h-[28rem]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            <span>Upcoming Task Reminders</span>
          </h3>
          {reminders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-xs italic py-12">
              <span>No upcoming tasks scheduled.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 overflow-y-auto pr-1 flex-1">
              {reminders.map((rem) => {
                const isMeeting = rem.type === 'meeting';
                return (
                  <div
                    key={rem.id}
                    className="py-3 flex items-start gap-3 transition-colors hover:bg-[var(--bg-main)] px-2 rounded-lg"
                  >
                    <div className="mt-0.5 shrink-0">
                      {isMeeting ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                          <Calendar className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <Link
                          href={`/leads/${rem.leadId}`}
                          className="text-xs font-bold text-white hover:text-emerald-400 truncate"
                        >
                          {rem.customerName}
                          <span className="text-[10px] text-[var(--text-secondary)] font-semibold ml-1.5 font-mono">
                            ({rem.leadCode})
                          </span>
                        </Link>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] shrink-0 font-mono">
                          {new Date(rem.datetime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.25 rounded-md border ${
                          isMeeting 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                        }`}>
                          {rem.title}
                        </span>
                        
                        <span className="text-[9px] text-[var(--text-secondary)] font-bold font-mono">
                          {new Date(rem.datetime).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-normal truncate">
                        {rem.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Recent Activity Stream (Strictly Admin / Director Only) */}
        {isAdmin && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm h-[28rem] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span>Recent Activity Stream</span>
              </h3>
              <button
                type="button"
                onClick={() => setActivityModalOpen(true)}
                className="p-1.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-emerald-500 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold"
                title="Expand Full Screen Activity Timeline"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Screen</span>
              </button>
            </div>

            <div className="relative border-l border-[var(--border-color)] ml-4 pl-6 space-y-5 overflow-y-auto pr-1 flex-1 py-1">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-[var(--text-muted)] text-xs italic">
                  No system activity records found.
                </div>
              ) : (
                activities.slice(0, 15).map((log) => {
                  const stage = STAGE_NAMES[log.toStatus] || { name: `Stage ${log.toStatus}`, color: '#9CA3AF' };
                  return (
                    <div key={log.id} className="relative group">
                      <span 
                        className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--border-color)] transition-transform group-hover:scale-125 animate-pulse" 
                        style={{ backgroundColor: stage.color }} 
                      />
                      <div className="min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs font-bold text-white truncate">
                            <Link
                              href={`/leads/${log.lead.id}`}
                              className="hover:text-emerald-400 hover:underline"
                            >
                              {log.lead.customerName}
                            </Link>
                            <span className="text-[9.5px] text-[var(--text-secondary)] font-semibold ml-1.5 font-mono">
                              ({log.lead.leadCode})
                            </span>
                          </p>
                          <span className="text-[9px] text-[var(--text-secondary)] shrink-0 font-semibold">
                            {new Date(log.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          Moved to <strong style={{ color: stage.color }} className="font-semibold">{stage.name}</strong> by{' '}
                          <Link href={`/team?userId=${log.user.id}`} className="text-emerald-500 hover:underline font-bold">
                            {log.user.name}
                          </Link>
                        </p>
                        {log.remark && (
                          <p className="text-[10px] text-[var(--text-secondary)] mt-1 italic truncate font-mono bg-[var(--bg-main)] p-1.5 rounded border border-[var(--border-color)]">
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
        )}
      </div>

      {/* Charts & Redesigned Pipeline Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line graph */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 lg:col-span-2 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Sales & Leads Trend (15 Days)</h3>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Leads Created
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Sales Closed
              </span>
            </div>
          </div>
          <div className="h-80 w-full">
            <DashboardChart trend={trend} />
          </div>
        </div>

        {/* Lead Acquisition Channels Pie Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Lead Acquisition Channels</h3>
          <div className="h-80 w-full flex items-center justify-center">
            <LeadSourcePieChart leadSourceData={leadSourceData} colors={COLORS} />
          </div>
        </div>

        {/* Redesigned Pipeline Stage Distribution Grid */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm flex flex-col justify-between lg:col-span-3">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>Pipeline Stage Distribution</span>
              </h3>
              <span className="text-[11px] text-[var(--text-secondary)] font-semibold font-mono">
                Total Active Leads: <strong className="text-white">{pipeline.reduce((acc, curr) => acc + curr.count, 0)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {pipeline.map((item) => {
                const stageInfo = STAGE_NAMES[item.stage] || { name: `Stage ${item.stage}`, color: '#3B82F6' };
                const totalLeads = pipeline.reduce((acc, curr) => acc + curr.count, 0) || 1;
                const percent = Math.round((item.count / totalLeads) * 100);
                const hasLeads = item.count > 0;

                return (
                  <div
                    key={item.stage}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${
                      hasLeads
                        ? 'bg-[var(--bg-main)] border-[var(--border-color)] shadow-md'
                        : 'bg-[var(--bg-main)]/40 border-[var(--border-color)]/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: stageInfo.color }}
                        />
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate" title={stageInfo.name}>
                          {stageInfo.name}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-full shrink-0 font-mono ${
                          hasLeads
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {item.count}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%`, backgroundColor: stageInfo.color }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-mono">
                        <span>Share</span>
                        <span>{percent}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] mt-6 flex justify-center">
            <Link
              href="/leads"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-center gap-1.5 group"
            >
              <span>View Full Interactive Pipeline Grid</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Full-Screen Activity Modal for Admin */}
      {activityModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>Full System Activity Stream</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      {activities.length} logs
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">Live operational timeline across all teams</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-64 hidden sm:block">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-emerald-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setActivityModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--bg-main)]">
              {filteredActivities.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-xs italic py-20">
                  <span>No activity logs matched your search.</span>
                </div>
              ) : (
                <div className="relative border-l-2 border-[var(--border-color)] ml-4 pl-6 space-y-6">
                  {filteredActivities.map((log) => {
                    const stage = STAGE_NAMES[log.toStatus] || { name: `Stage ${log.toStatus}`, color: '#9CA3AF' };
                    return (
                      <div key={log.id} className="relative group">
                        <span
                          className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0f1422] shadow-md transition-transform group-hover:scale-125"
                          style={{ backgroundColor: stage.color }}
                        />

                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-2 hover:border-[var(--border-color)] transition-all">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <Link
                                href={`/leads/${log.lead.id}`}
                                onClick={() => setActivityModalOpen(false)}
                                className="text-sm font-bold text-white hover:text-emerald-400 hover:underline flex items-center gap-2"
                              >
                                <span>{log.lead.customerName}</span>
                                <span className="text-xs text-[var(--text-secondary)] font-mono font-semibold">({log.lead.leadCode})</span>
                              </Link>
                            </div>
                            <span className="text-xs text-[var(--text-secondary)] font-mono">
                              {new Date(log.createdAt).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-[var(--text-secondary)]">Moved to</span>
                            <span
                              className="px-2 py-0.5 rounded text-[11px] font-bold border"
                              style={{
                                backgroundColor: `${stage.color}15`,
                                color: stage.color,
                                borderColor: `${stage.color}30`,
                              }}
                            >
                              {stage.name}
                            </span>
                            <span className="text-[var(--text-secondary)]">by</span>
                            <span className="font-bold text-white bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                              {log.user.name} ({log.user.role})
                            </span>
                          </div>

                          {log.remark && (
                            <p className="text-xs text-[var(--text-primary)] italic font-mono bg-[var(--bg-main)] p-2.5 rounded-lg border border-[var(--border-color)]">
                              "{log.remark}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex justify-between items-center text-xs text-[var(--text-secondary)]">
              <span>Showing full activity history for system administrators</span>
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-white rounded-lg font-bold transition-all cursor-pointer"
              >
                Close Full Screen View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
