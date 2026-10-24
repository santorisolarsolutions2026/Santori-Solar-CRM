'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Zap,
  ChevronDown,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import CustomDropdown from '@/components/CustomDropdown';

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

const PipelineBarChart = dynamic(
  () => import('@/components/ReportsCharts').then((mod) => mod.PipelineBarChart),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full bg-[var(--bg-main)] animate-pulse rounded-xl" />,
  }
);

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];

const CARD_PALETTES = [
  {
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.12)',
    borderHover: 'hover:border-blue-500/40',
    shadowHover: 'hover:shadow-[0_12px_24px_-10px_rgba(37,99,235,0.18)]',
  },
  {
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.12)',
    borderHover: 'hover:border-purple-500/40',
    shadowHover: 'hover:shadow-[0_12px_24px_-10px_rgba(124,58,237,0.18)]',
  },
  {
    color: '#0D9488',
    bg: 'rgba(13, 148, 136, 0.12)',
    borderHover: 'hover:border-teal-500/40',
    shadowHover: 'hover:shadow-[0_12px_24px_-10px_rgba(13,148,136,0.18)]',
  },
  {
    color: '#6FAF4F',
    bg: 'rgba(111, 175, 79, 0.15)',
    borderHover: 'hover:border-[#6FAF4F]/40',
    shadowHover: 'hover:shadow-[0_12px_24px_-10px_rgba(111,175,79,0.18)]',
  },
  {
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.14)',
    borderHover: 'hover:border-amber-500/40',
    shadowHover: 'hover:shadow-[0_12px_24px_-10px_rgba(217,119,6,0.18)]',
  },
  {
    color: '#E11D48',
    bg: 'rgba(225, 29, 72, 0.12)',
    borderHover: 'hover:border-rose-500/40',
    shadowHover: 'hover:shadow-[0_12px_24px_-10px_rgba(225,29,72,0.18)]',
  },
];

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
  id: number | string;
  remark: string | null;
  fromStatus: number | null;
  toStatus: number;
  createdAt: string;
  lead?: { id: number; customerName: string; leadCode: string } | null;
  user: { id: number; name: string; role: string };
  isTerritoryAssign?: boolean;
}

const STAGE_NAMES: Record<number, { name: string; short: string; color: string }> = {
  1: { name: 'Fresh Lead', short: 'Fresh', color: '#3B82F6' },
  2: { name: 'DNP (No Answer)', short: 'DNP', color: '#94A3B8' },
  3: { name: 'Follow Up', short: 'Follow Up', color: '#0D9488' },
  4: { name: 'Not Interested', short: 'Not Int.', color: '#EF4444' },
  5: { name: 'Call Later', short: 'Call Later', color: '#06B6D4' },
  6: { name: 'Already Installed', short: 'Installed', color: '#475569' },
  7: { name: 'Decision Pending', short: 'Decision', color: '#6366F1' },
  8: { name: 'Meeting Booked', short: 'Mtg Booked', color: '#2563EB' },
  9: { name: 'Meeting Done', short: 'Mtg Done', color: '#10B981' },
  10: { name: 'Disconnected', short: 'Discon.', color: '#64748B' },
  11: { name: 'Switch Off', short: 'Switch Off', color: '#64748B' },
  12: { name: 'Can\'t Fit Solar', short: 'No Fit', color: '#475569' },
  13: { name: 'Sale Done', short: 'Sale Done', color: '#10B981' },
  14: { name: 'Meeting Cancelled', short: 'Cancelled', color: '#EF4444' },
};

const REMINDER_HEX_COLORS: Record<string, string> = {
  meeting: '#4F7D32',      // Brand Green #4F7D32
  delivery: '#3B82F6',     // Blue
  installation: '#8B5CF6', // Purple
  commissioning: '#F59E0B', // Amber
  followup: '#0D9488',     // Teal #0D9488
  follow_up: '#0D9488',    // Teal #0D9488
};

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [performance, setPerformance] = useState<ConsultantPerformance[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateCitiesMap, setStateCitiesMap] = useState<Record<string, string[]>>({});
  const [dateShortcut, setDateShortcut] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Separate Activity Stream & Reminders modal states (no toggle between them)
  const [remindersModalOpen, setRemindersModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (remindersModalOpen || activityModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [remindersModalOpen, activityModalOpen]);

  const isAdmin = user?.role === 'admin' || user?.role?.startsWith('admin:') || user?.role === 'director';

  const applyDateShortcut = (shortcut: string) => {
    setDateShortcut(shortcut);

    if (shortcut === 'all' || shortcut === 'custom') {
      if (shortcut === 'all') {
        setFilterStartDate('');
        setFilterEndDate('');
      }
      return;
    }

    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (shortcut === 'today') {
      const dateStr = formatDate(today);
      setFilterStartDate(dateStr);
      setFilterEndDate(dateStr);
    } else if (shortcut === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = formatDate(yesterday);
      setFilterStartDate(dateStr);
      setFilterEndDate(dateStr);
    } else if (shortcut === 'this_week') {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(today.setDate(diff));
      const endOfWeek = new Date();
      setFilterStartDate(formatDate(startOfWeek));
      setFilterEndDate(formatDate(endOfWeek));
    } else if (shortcut === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date();
      setFilterStartDate(formatDate(startOfMonth));
      setFilterEndDate(formatDate(endOfMonth));
    }
  };

  const filteredActivities = activities.filter((log) => {
    if (!activitySearchQuery.trim()) return true;
    const q = activitySearchQuery.toLowerCase();
    return (
      (log.lead && (log.lead.customerName.toLowerCase().includes(q) || log.lead.leadCode.toLowerCase().includes(q))) ||
      (log.user && log.user.name.toLowerCase().includes(q)) ||
      (log.remark && log.remark.toLowerCase().includes(q))
    );
  });

  const meetingReminders = reminders.filter((rem) => rem.type === 'meeting');
  const followupReminders = reminders.filter((rem) => rem.type !== 'meeting');

  const fetchData = async () => {
    let query = '';
    const params = new URLSearchParams();
    if (stateFilter) params.append('state', stateFilter);
    if (cityFilter) params.append('city', cityFilter);
    if (filterStartDate && filterEndDate) {
      params.append('startDate', filterStartDate);
      params.append('endDate', filterEndDate);
    }
    if (params.toString()) {
      query = `?${params.toString()}`;
    }

    const cacheKey = `dashboard_data_cache_${query || 'default'}`;

    // SWR Step 1: Immediately use cached data if available for instant 0ms render
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Date.now() - parsed.timestamp < 3 * 60 * 1000) {
          if (parsed.stats) setStats(parsed.stats);
          if (parsed.pipeline) setPipeline(parsed.pipeline);
          if (parsed.trend) setTrend(parsed.trend);
          if (parsed.performance) setPerformance(parsed.performance);
          if (parsed.activities) setActivities(parsed.activities);
          if (parsed.reminders) setReminders(parsed.reminders);
          if (parsed.leadSources) setLeadSources(parsed.leadSources);
          setLoading(false);
        }
      }
    } catch {}

    // SWR Step 2: Fetch fresh data in background to silently revalidate
    try {
      const [
        statsRes,
        pipelineRes,
        trendRes,
        perfRes,
        feedRes,
        remindersRes,
        sourcesRes,
      ] = await Promise.all([
        fetch(`/api/v1/reports/overview${query}`),
        fetch(`/api/v1/reports/pipeline${query}`),
        fetch(`/api/v1/reports/trend${query}`),
        fetch(`/api/v1/reports/team-performance${query}`),
        fetch(`/api/v1/reports/recent-activity${query}`),
        fetch(`/api/v1/reports/reminders${query}`),
        fetch(`/api/v1/reports/lead-sources${query}`),
      ]);

      const safeJson = async (res: Response) => {
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await res.json();
          }
          return { success: false };
        } catch {
          return { success: false };
        }
      };

      const [
        statsData,
        pipelineData,
        trendData,
        perfData,
        feedData,
        remindersData,
        sourcesData,
      ] = await Promise.all([
        safeJson(statsRes),
        safeJson(pipelineRes),
        safeJson(trendRes),
        safeJson(perfRes),
        safeJson(feedRes),
        safeJson(remindersRes),
        safeJson(sourcesRes),
      ]);

      const freshCache: any = { timestamp: Date.now() };

      if (statsData.success) {
        setStats(statsData.data);
        freshCache.stats = statsData.data;
      }
      if (pipelineData.success) {
        setPipeline(pipelineData.data);
        freshCache.pipeline = pipelineData.data;
      }
      if (trendData.success) {
        setTrend(trendData.data);
        freshCache.trend = trendData.data;
      }
      if (perfData.success) {
        setPerformance(perfData.data);
        freshCache.performance = perfData.data;
      }
      if (feedData.success) {
        const logs = feedData.data.logs || feedData.data || [];
        setActivities(logs);
        freshCache.activities = logs;
      }
      if (remindersData.success) {
        setReminders(remindersData.data);
        freshCache.reminders = remindersData.data;
      }
      if (sourcesData.success && Array.isArray(sourcesData.data)) {
        setLeadSources(sourcesData.data);
        freshCache.leadSources = sourcesData.data;
      }

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(freshCache));
      } catch {}
    } catch (err) {
      console.error('Fetch dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const cached = sessionStorage.getItem('stateCitiesMap');
        if (cached) {
          setStateCitiesMap(JSON.parse(cached));
          return;
        }
        const res = await fetch('/api/v1/leads/locations');
        const data = await res.json();
        if (data.success && data.data) {
          setStateCitiesMap(data.data);
          sessionStorage.setItem('stateCitiesMap', JSON.stringify(data.data));
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      }
    };
    if (user) {
      fetchLocations();
      fetchData();
    }
  }, [user, stateFilter, cityFilter, filterStartDate, filterEndDate]);

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
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">
            Welcome Back, <span className="font-extrabold welcome-user-name" style={{ color: '#6FAF4F' }}>{user?.name}</span>!
          </h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-secondary)] mt-1">
            Here's the latest status of your solar sales pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setRemindersModalOpen(true)}
            className="py-2 px-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#4F7D32] text-slate-800 dark:text-white rounded-lg font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:bg-[var(--bg-main)]"
            title="View Upcoming Task Reminders"
          >
            <Clock className="w-3.5 h-3.5 text-[#4F7D32] dark:text-[#6FAF4F]" />
            <span>Reminders</span>
            {reminders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white leading-none">
                {reminders.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActivityModalOpen(true)}
              className="py-2 px-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#4F7D32] text-slate-800 dark:text-white rounded-lg font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:bg-[var(--bg-main)]"
              title="View Live Activity Stream"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Activity Stream</span>
              {activities.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-300 border border-[var(--border-color)] leading-none">
                  {activities.length}
                </span>
              )}
            </button>
          )}

          {hasPermission('leads:create') && (
            <Link
              href="/leads/new"
              style={{ backgroundColor: '#6FAF4F', color: '#FFFFFF' }}
              className="py-2 px-4 hover:brightness-95 text-white rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span style={{ color: '#FFFFFF' }}>Add New Lead</span>
              <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
            </Link>
          )}
        </div>
      </div>



      {/* KPI Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-${activeCards.length} gap-6`}>
        {activeCards.map((card, index) => {
          const Icon = card.icon;
          const palette = CARD_PALETTES[index % CARD_PALETTES.length];
          return (
            <div
              key={index}
              className={`kpi-dashboard-card kpi-card-${index % CARD_PALETTES.length} bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm ${palette.borderHover} ${palette.shadowHover} md:hover:-translate-y-1 flex justify-between items-center h-28 transition-all duration-350 ease-out group`}
            >
              <div className="flex flex-col justify-between h-full">
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase leading-snug">
                  {card.name}
                </span>
                <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{card.value}</span>
              </div>
              <div
                style={{ backgroundColor: palette.bg }}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
              >
                <Icon className="w-5 h-5" style={{ color: palette.color, stroke: palette.color }} />
              </div>
            </div>
          );
        })}
      </div>



      {/* Charts & Redesigned Pipeline Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line graph */}
        <div className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm hover:shadow-[0_12px_24px_-10px_rgba(16,185,129,0.10)] hover:border-emerald-500/20 md:hover:-translate-y-0.5 transition-all duration-350 ease-out ${
          (userDept === 'Finance' || userBaseRole === 'finance' || userDept === 'Operations' || userBaseRole === 'operations')
            ? 'lg:col-span-3'
            : 'lg:col-span-2'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {userDept === 'Finance' || userBaseRole === 'finance'
                ? 'Finance Trend: Total Orders vs Verified Orders (15 Days)'
                : userDept === 'Operations' || userBaseRole === 'operations'
                ? 'Operations Trend: Total Orders vs Plant Commissioned (15 Days)'
                : 'Sales & Leads Trend (15 Days)'}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-pink-400 font-semibold">
                <span className="w-2.5 h-3 bg-pink-400 rounded-xs opacity-80" />
                {userDept === 'Finance' || userBaseRole === 'finance' || userDept === 'Operations' || userBaseRole === 'operations'
                  ? 'Total Orders (Bars)'
                  : 'Leads Created (Bars)'}
              </span>
              <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-xs" />
                {userDept === 'Finance' || userBaseRole === 'finance'
                  ? 'Verified Orders (Line)'
                  : userDept === 'Operations' || userBaseRole === 'operations'
                  ? 'Plant Commissioned (Line)'
                  : 'Sales Closed (Line)'}
              </span>
            </div>
          </div>
          <div className="h-80 w-full">
            <DashboardChart
              trend={trend}
              type={
                userDept === 'Finance' || userBaseRole === 'finance'
                  ? 'finance'
                  : userDept === 'Operations' || userBaseRole === 'operations'
                  ? 'ops'
                  : 'sales'
              }
            />
          </div>
        </div>

        {/* Lead Sources Horizontal Bar Chart (Sales/Admin only) */}
        {userDept !== 'Finance' && userBaseRole !== 'finance' && userDept !== 'Operations' && userBaseRole !== 'operations' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-[0_12px_24px_-10px_rgba(16,185,129,0.10)] hover:border-emerald-500/20 md:hover:-translate-y-0.5 transition-all duration-350 ease-out">
            <LeadSourcePieChart leadSourceData={leadSources} colors={COLORS} />
          </div>
        )}

        {/* Redesigned Pipeline Stage Distribution Capsule Bar Chart (Sales/Admin only) */}
        {userDept !== 'Finance' && userBaseRole !== 'finance' && userDept !== 'Operations' && userBaseRole !== 'operations' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm flex flex-col justify-between lg:col-span-3 hover:shadow-[0_12px_24px_-10px_rgba(16,185,129,0.10)] hover:border-emerald-500/20 md:hover:-translate-y-0.5 transition-all duration-350 ease-out">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>Pipeline Stage Distribution</span>
                </h3>
                <span className="text-[11px] text-[var(--text-secondary)] font-semibold font-mono">
                  Total Active Leads: <strong className="text-slate-900 dark:text-white">{pipeline.reduce((acc, curr) => acc + curr.count, 0)}</strong>
                </span>
              </div>

              <div className="w-full h-72 sm:h-80">
                <PipelineBarChart pipelineData={pipeline} stageNames={STAGE_NAMES} />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] mt-4 flex justify-center">
              <Link
                href="/leads"
                style={{ color: '#91D06C' }}
                className="text-xs font-bold flex items-center justify-center gap-1.5 group hover:opacity-85 transition-opacity"
              >
                <span>View Full Interactive Pipeline Grid</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Upcoming Task Reminders Modal (Follow-ups & Meetings Separated with Independent Scrolling) */}
      {mounted && remindersModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header without any tab toggle */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4F7D32]/10 text-[#4F7D32] flex items-center justify-center border border-[#4F7D32]/25 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">
                    Upcoming Task Reminders
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Scheduled follow-ups, meetings &amp; site operations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-700 dark:text-slate-300 font-mono">
                  {reminders.length} Total Reminders
                </span>
                <button
                  type="button"
                  onClick={() => setRemindersModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#4F7D32] flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: 2 Columns with INDEPENDENT SCROLLING */}
            <div className="flex-1 min-h-0 p-4 sm:p-6 bg-[var(--bg-main)] overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full min-h-0">
                
                {/* Column 1: Scheduled Follow-Ups & Tasks (Independent Scroll) */}
                <div className="h-full flex flex-col min-h-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-xs">
                  {/* Column Header */}
                  <div className="shrink-0 flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Follow-ups &amp; Operations
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-mono">
                      {followupReminders.length}
                    </span>
                  </div>

                  {/* Independent Scroll Area */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                    {followupReminders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-xs italic py-16">
                        <Clock className="w-8 h-8 text-[var(--text-muted)] mb-2 opacity-30" />
                        <span>No pending follow-ups scheduled.</span>
                      </div>
                    ) : (
                      followupReminders.map((rem) => {
                        const isDelivery = rem.type === 'delivery';
                        const isInstallation = rem.type === 'installation';
                        const isCommissioning = rem.type === 'commissioning';
                        const remColor = REMINDER_HEX_COLORS[rem.type] || '#0D9488';
                        return (
                          <div
                            key={rem.id}
                            className="p-3.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-teal-500/40 transition-all flex items-start gap-3 shadow-xs"
                          >
                            <div className="mt-0.5 shrink-0">
                              {isDelivery ? (
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                                  <Truck className="w-3.5 h-3.5" />
                                </div>
                              ) : isInstallation ? (
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                                  <Hammer className="w-3.5 h-3.5" />
                                </div>
                              ) : isCommissioning ? (
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                                  <Zap className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
                                  <Clock className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <Link
                                  href={
                                    rem.type === 'delivery' || rem.type === 'installation' || rem.type === 'commissioning'
                                      ? `/operations?leadId=${rem.leadId}`
                                      : `/leads/${rem.leadId}`
                                  }
                                  onClick={() => setRemindersModalOpen(false)}
                                  className="reminder-customer-name text-xs font-bold text-slate-900 dark:text-white hover:text-[#4F7D32] dark:hover:text-[#7bb05c] truncate"
                                >
                                  {rem.customerName}
                                  <span className="text-[10px] text-slate-600 dark:text-[var(--text-secondary)] font-semibold ml-1.5 font-mono">
                                    ({rem.leadCode})
                                  </span>
                                </Link>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-[var(--text-muted)] shrink-0 font-mono">
                                  {new Date(rem.datetime).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  })}
                                </span>
                              </div>

                              <div className="flex justify-between items-center mt-1.5">
                                <span
                                  className="text-[9px] font-extrabold px-2 py-0.5 rounded-md"
                                  style={{
                                    backgroundColor: `${remColor}15`,
                                    color: remColor,
                                  }}
                                >
                                  {rem.title.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                </span>

                                <span className="text-[10px] text-slate-600 dark:text-[var(--text-secondary)] font-bold font-mono">
                                  {new Date(rem.datetime).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>

                              {rem.subtitle && (
                                <p className="reminder-subtitle text-[11px] text-slate-600 dark:text-[var(--text-muted)] mt-1.5 leading-normal truncate">
                                  {rem.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Column 2: Scheduled Meetings (Independent Scroll) */}
                <div className="h-full flex flex-col min-h-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-xs">
                  {/* Column Header */}
                  <div className="shrink-0 flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#4F7D32]/10 text-[#4F7D32] flex items-center justify-center border border-[#4F7D32]/25">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Scheduled Client Meetings
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#4F7D32]/15 text-[#4F7D32] dark:text-[#7bb05c] border border-[#4F7D32]/30 font-mono">
                      {meetingReminders.length}
                    </span>
                  </div>

                  {/* Independent Scroll Area */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                    {meetingReminders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-xs italic py-16">
                        <Calendar className="w-8 h-8 text-[var(--text-muted)] mb-2 opacity-30" />
                        <span>No upcoming meetings scheduled.</span>
                      </div>
                    ) : (
                      meetingReminders.map((rem) => {
                        const remColor = REMINDER_HEX_COLORS.meeting || '#4F7D32';
                        return (
                          <div
                            key={rem.id}
                            className="p-3.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-[#4F7D32]/40 transition-all flex items-start gap-3 shadow-xs"
                          >
                            <div className="mt-0.5 shrink-0">
                              <div className="w-8 h-8 rounded-lg bg-[#4F7D32]/10 text-[#4F7D32] flex items-center justify-center border border-[#4F7D32]/25">
                                <Calendar className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <Link
                                  href={`/leads/${rem.leadId}`}
                                  onClick={() => setRemindersModalOpen(false)}
                                  className="reminder-customer-name text-xs font-bold text-slate-900 dark:text-white hover:text-[#4F7D32] dark:hover:text-[#7bb05c] truncate"
                                >
                                  {rem.customerName}
                                  <span className="text-[10px] text-slate-600 dark:text-[var(--text-secondary)] font-semibold ml-1.5 font-mono">
                                    ({rem.leadCode})
                                  </span>
                                </Link>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-[var(--text-muted)] shrink-0 font-mono">
                                  {new Date(rem.datetime).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  })}
                                </span>
                              </div>

                              <div className="flex justify-between items-center mt-1.5">
                                <span
                                  className="text-[9px] font-extrabold px-2 py-0.5 rounded-md"
                                  style={{
                                    backgroundColor: `${remColor}15`,
                                    color: remColor,
                                  }}
                                >
                                  Meeting Scheduled
                                </span>

                                <span className="text-[10px] text-slate-600 dark:text-[var(--text-secondary)] font-bold font-mono">
                                  {new Date(rem.datetime).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>

                              {rem.subtitle && (
                                <p className="reminder-subtitle text-[11px] text-slate-600 dark:text-[var(--text-muted)] mt-1.5 leading-normal truncate">
                                  {rem.subtitle}
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex justify-between items-center text-xs text-[var(--text-secondary)] shrink-0">
              <span>
                Total {reminders.length} Reminders ({followupReminders.length} Follow-ups, {meetingReminders.length} Meetings)
              </span>
              <button
                type="button"
                onClick={() => setRemindersModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#4F7D32] text-slate-900 dark:text-white rounded-lg font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dedicated Recent Activity Stream Modal (No Toggle) */}
      {mounted && activityModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header without any tab toggle */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/25 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">
                    Recent Activity Stream
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Real-time audit trail &amp; pipeline status transitions
                  </p>
                </div>
              </div>

              {/* Search & Close Controls */}
              <div className="flex items-center gap-2.5">
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search activity..."
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#4F7D32] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setActivityModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#4F7D32] flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-[var(--bg-main)]">
              {filteredActivities.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-xs italic py-20">
                  <span>No activity logs matched your search.</span>
                </div>
              ) : (
                <div className="relative border-l-2 border-[var(--border-color)] ml-4 pl-6 space-y-6">
                  {filteredActivities.map((log) => {
                    if (log.isTerritoryAssign) {
                      return (
                        <div key={log.id} className="relative group">
                          <span
                            className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0f1422] shadow-md transition-transform group-hover:scale-125 bg-emerald-500"
                          />

                          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-2 hover:border-[var(--border-color)] transition-all">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">Territory Assignment</span>
                                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-mono font-bold uppercase">
                                  Map Assign
                                </span>
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
                              <span className="text-[var(--text-secondary)]">Executed by</span>
                              <span className="font-bold text-[#4F7D32] bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                                {log.user.name} ({log.user.role})
                              </span>
                            </div>

                            {log.remark && (
                              <p className="text-xs text-[var(--text-primary)] font-mono bg-[var(--bg-main)] p-2.5 rounded-lg border border-[var(--border-color)] leading-relaxed">
                                {log.remark}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

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
                              {log.lead ? (
                                <Link
                                  href={`/leads/${log.lead.id}`}
                                  onClick={() => setActivityModalOpen(false)}
                                  className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#4F7D32] hover:underline flex items-center gap-2"
                                >
                                  <span>{log.lead.customerName}</span>
                                  <span className="text-xs text-[var(--text-secondary)] font-mono font-semibold">({log.lead.leadCode})</span>
                                </Link>
                              ) : (
                                <span className="text-sm font-bold text-slate-900 dark:text-white">System Activity</span>
                              )}
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
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold"
                              style={{
                                backgroundColor: `${stage.color}15`,
                                color: stage.color,
                              }}
                            >
                              {stage.name}
                            </span>
                            <span className="text-[var(--text-secondary)]">by</span>
                            <span className="font-bold text-[#4F7D32] bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border-color)]">
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
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex justify-between items-center text-xs text-[var(--text-secondary)] shrink-0">
              <span>
                Showing {filteredActivities.length} activity records
              </span>
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#4F7D32] text-slate-900 dark:text-white rounded-lg font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
