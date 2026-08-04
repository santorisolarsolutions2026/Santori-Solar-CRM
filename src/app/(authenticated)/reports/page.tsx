'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const TrendLineChart = dynamic(
  () => import('@/components/ReportsCharts').then((mod) => mod.TrendLineChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[var(--bg-main)] animate-pulse rounded-xl" />,
  }
);

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
    loading: () => <div className="h-full w-full bg-[var(--bg-main)] animate-pulse rounded-xl" />,
  }
);
import {
  BarChart2,
  TrendingUp,
  Download,
  Users,
  CheckCircle,
  Clock,
  Zap,
  IndianRupee,
  Layers,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  FileText,
  Sun,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

interface OverviewStats {
  totalLeads: number;
  activeLeads: number;
  meetingsBookedThisMonth: number;
  salesDoneThisMonth: number;
  todayFollowUps: number;
  conversionRate: number;
}

interface TeamPerformance {
  id: number;
  name: string;
  email: string;
  leadsAssigned: number;
  meetingsBooked: number;
  salesClosed: number;
  callsMade: number;
  conversionRate: number;
}

interface PipelineStage {
  stage: number;
  count: number;
}

const STAGE_NAMES: Record<number, string> = {
  1: 'Fresh Lead',
  2: 'DNP (No Answer)',
  3: 'Follow Up',
  4: 'Not Interested',
  5: 'Call Later',
  6: 'Already Installed',
  7: 'Decision Pending',
  8: 'Meeting Booked',
  9: 'Meeting Done',
  10: 'Disconnected',
  11: 'Switch Off',
  12: 'Can\'t Fit Solar',
  13: 'Sale Done',
};

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];

export default function ReportsPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!hasPermission('reports:view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-lg mt-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">
          You do not have the required permissions to view Performance Reports & Analytics. Please contact your administrator if you believe this is in error.
        </p>
      </div>
    );
  }
  
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [performance, setPerformance] = useState<TeamPerformance[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeReportTab, setActiveReportTab] = useState<'pipeline' | 'employee'>('employee');
  const [activeDeptTab, setActiveDeptTab] = useState<'Sales' | 'Finance' | 'Operations' | 'PSA' | 'Other'>('Sales');
  const [filterDesignation, setFilterDesignation] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterStartTime, setFilterStartTime] = useState<string>('00:00');
  const [filterEndTime, setFilterEndTime] = useState<string>('23:59');
  const [auditData, setAuditData] = useState<{ departments: Record<string, any[]>; designations?: string[] } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // States for the interactive employee audit modal
  const [selectedAuditEmpId, setSelectedAuditEmpId] = useState<number | null>(null);
  const [activeDetailType, setActiveDetailType] = useState<string>('leads_worked');
  const [modalData, setModalData] = useState<{ employee: any; results: any[]; teamSize?: number } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Timeline calendar modal states
  const [selectedTimelineEmpId, setSelectedTimelineEmpId] = useState<number | null>(null);
  const [selectedTimelineEmpName, setSelectedTimelineEmpName] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [expandedLeadIds, setExpandedLeadIds] = useState<Record<number, boolean>>({});

  // Hierarchy modal states
  const [hierarchyModalData, setHierarchyModalData] = useState<any>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);

  // Sorting and preset states for Employee Audit
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(['name', 'designation'].includes(field) ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <span className="text-slate-600 ml-1 font-mono text-[10px]">â†•</span>;
    return <span className="text-emerald-400 ml-1 font-mono text-[10px]">{sortOrder === 'asc' ? 'â†‘' : 'â†“'}</span>;
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarGradient = (id: number | string) => {
    const gradients = [
      'from-blue-600 to-indigo-600 border-emerald-400/30 text-emerald-100',
      'from-emerald-600 to-teal-600 border-emerald-400/30 text-emerald-100',
      'from-purple-600 to-indigo-600 border-purple-400/30 text-purple-100',
      'from-amber-600 to-orange-600 border-amber-400/30 text-amber-100',
      'from-cyan-600 to-blue-600 border-cyan-400/30 text-cyan-100',
      'from-rose-600 to-red-600 border-rose-400/30 text-rose-100',
    ];
    const num = typeof id === 'number' ? id : (id || '').length;
    return gradients[num % gradients.length];
  };

  const setPresetRange = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const formatYYYYMMDD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = formatYYYYMMDD(now);
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
      setFilterStartTime('00:00');
      setFilterEndTime('23:59');
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatYYYYMMDD(yest);
      setFilterStartDate(yestStr);
      setFilterEndDate(yestStr);
      setFilterStartTime('00:00');
      setFilterEndTime('23:59');
    } else if (preset === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setFilterStartDate(formatYYYYMMDD(weekAgo));
      setFilterEndDate(formatYYYYMMDD(now));
      setFilterStartTime('00:00');
      setFilterEndTime('23:59');
    } else if (preset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilterStartDate(formatYYYYMMDD(monthStart));
      setFilterEndDate(formatYYYYMMDD(now));
      setFilterStartTime('00:00');
      setFilterEndTime('23:59');
    } else if (preset === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
      setFilterStartTime('00:00');
      setFilterEndTime('23:59');
    }
  };

  const fetchTimelineData = async (empId: number) => {
    try {
      setTimelineLoading(true);
      let url = `/api/v1/reports/employee-audit/timeline?userId=${empId}`;
      if (filterStartDate && filterEndDate) {
        url += `&startDate=${filterStartDate}&endDate=${filterEndDate}&startTime=${filterStartTime}&endTime=${filterEndTime}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTimelineEvents(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleOpenHierarchyModal = async (empId: number) => {
    try {
      setHierarchyLoading(true);
      setHierarchyModalData({ loading: true });
      const res = await fetch(`/api/v1/reports/employee-audit/hierarchy/${empId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHierarchyModalData(data.tree);
        } else {
          setHierarchyModalData(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch hierarchy:', error);
      setHierarchyModalData(null);
    } finally {
      setHierarchyLoading(false);
    }
  };

  const handleOpenTimelineModal = (empId: number, name: string) => {
    setTimelineEvents([]);
    setSelectedTimelineEmpName(name);
    setSelectedTimelineEmpId(empId);
  };

  const handleCloseTimelineModal = () => {
    setSelectedTimelineEmpId(null);
    setTimelineEvents([]);
  };

  useEffect(() => {
    if (selectedTimelineEmpId !== null) {
      fetchTimelineData(selectedTimelineEmpId);
    }
  }, [selectedTimelineEmpId]);

  const fetchData = async () => {
    try {
      const fetchPromises: Promise<any>[] = [
        fetch('/api/v1/reports/overview'),
        fetch('/api/v1/reports/pipeline'),
        fetch('/api/v1/reports/trend'),
      ];

      const userHasReportsView = hasPermission('reports:view');
      if (userHasReportsView) {
        fetchPromises.push(fetch('/api/v1/reports/team-performance'));
      }

      const results = await Promise.all(fetchPromises);

      const statsRes = results[0];
      const pipelineRes = results[1];
      const trendRes = results[2];
      const perfRes = userHasReportsView ? results[3] : null;

      const [statsData, pipelineData, trendData, perfData] = await Promise.all([
        statsRes.json(),
        pipelineRes.json(),
        trendRes.json(),
        perfRes ? perfRes.json() : Promise.resolve({ success: false }),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (pipelineData.success) setPipeline(pipelineData.data);
      if (trendData.success) setTrend(trendData.data);
      if (perfData && perfData.success) setPerformance(perfData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchAuditData = async () => {
    setAuditLoading(true);
    try {
      let url = `/api/v1/reports/employee-audit?designation=${encodeURIComponent(filterDesignation)}`;
      if (filterStartDate && filterEndDate) {
        url += `&startDate=${filterStartDate}&endDate=${filterEndDate}&startTime=${filterStartTime}&endTime=${filterEndTime}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAuditData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeReportTab === 'employee') {
      fetchAuditData();
    }
  }, [user, activeReportTab, filterDesignation, filterStartDate, filterEndDate, filterStartTime, filterEndTime]);

  const fetchModalData = async (empId: number, type: string) => {
    setModalLoading(true);
    try {
      let url = `/api/v1/reports/employee-audit/detail?userId=${empId}&type=${type}`;
      if (filterStartDate && filterEndDate) {
        url += `&startDate=${filterStartDate}&endDate=${filterEndDate}&startTime=${filterStartTime}&endTime=${filterEndTime}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setModalData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAuditEmpId !== null) {
      fetchModalData(selectedAuditEmpId, activeDetailType);
    }
  }, [selectedAuditEmpId, activeDetailType]);

  const handleOpenDetailsModal = (empId: number, type: string) => {
    setModalData(null);
    setActiveDetailType(type);
    setSelectedAuditEmpId(empId);
  };

  const handleCloseAuditModal = () => {
    setSelectedAuditEmpId(null);
    setModalData(null);
  };

  // Client-side CSV exporter (Section 5.7)
  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/v1/leads?limit=1000');
      const data = await res.json();
      if (!data.success || !data.data?.leads) {
        alert('Failed to retrieve data for export.');
        return;
      }

      const leadsList = data.data.leads;
      const headers = ['Lead ID', 'Name', 'Phone', 'Connection Type', 'Pincode', 'City', 'Source', 'Status', 'Consultant'];
      
      const csvRows = [];
      csvRows.push(headers.join(','));

      for (const lead of leadsList) {
        const statusName = STAGE_NAMES[lead.status] || `Stage ${lead.status}`;
        const row = [
          `"${lead.leadCode}"`,
          `"${lead.customerName.replace(/"/g, '""')}"`,
          `"${lead.mobile}"`,
          `"${lead.connectionType}"`,
          `"${lead.pinCode}"`,
          `"${lead.city}"`,
          `"${lead.leadSource || ''}"`,
          `"${statusName}"`,
          `"${lead.consultant?.name || 'Unassigned'}"`,
        ];
        csvRows.push(row.join(','));
      }

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SolarCRM_Leads_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error exporting CSV.');
    }
  };

  // print window trigger for PDF (Section 5.7)
  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <Sun className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  // Format pipeline data for bar chart
  const pipelineBarData = pipeline.map((item) => ({
    name: STAGE_NAMES[item.stage] || `Stage ${item.stage}`,
    Leads: item.count,
  }));

  // Estimate lead source percentages for pie chart based on data
  // (In production this would be grouped from DB, but we can do it on client-side or render a gorgeous mock)
  const leadSourceData = [
    { name: 'Meta', value: 35 },
    { name: 'Discom', value: 20 },
    { name: 'Offline Campaign', value: 15 },
    { name: 'Inbound', value: 15 },
    { name: 'WhatsApp', value: 10 },
    { name: 'Cold Call', value: 5 },
  ];

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      {/* Title & Exporters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Employee Audit</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Inspect staff performance metrics, activity logs, and detailed work audit trails.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export to Excel (CSV)</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="py-2.5 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Print Audit (PDF)</span>
          </button>
        </div>
      </div>

      {/* Employee Audit Dashboard */}
      <div className="space-y-6">
          {/* Employee Audit Filter Bar */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-5">
            {/* Header & Clear Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)]/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                    <Filter className="w-4 h-4" />
                  </div>
                  <span>Employee Audit Filters</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Filter performance metrics and activity logs by designation, date range, or quick presets.
                </p>
              </div>

              {(filterStartDate || filterEndDate || filterDesignation !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterStartTime('00:00');
                    setFilterEndTime('23:59');
                    setFilterDesignation('all');
                  }}
                  className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            {/* Structured Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Designation Filter */}
              <div className="bg-[var(--bg-main)] border border-[var(--border-color)]/80 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-inner">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Designation Role</span>
                </label>
                <div className="w-full">
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Designations' },
                      ...(auditData?.designations || []).map((des) => ({
                        value: des,
                        label: des,
                      })),
                    ]}
                    value={filterDesignation}
                    onChange={(val) => setFilterDesignation(val)}
                    placeholder="All Designations"
                  />
                </div>
              </div>

              {/* Start Date & Time */}
              <div className="bg-[var(--bg-main)] border border-[var(--border-color)]/80 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-inner">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Start Date & Time</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-white px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  />
                  <input
                    type="time"
                    value={filterStartTime}
                    onChange={(e) => setFilterStartTime(e.target.value)}
                    className="w-24 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-white px-2.5 py-2 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="bg-[var(--bg-main)] border border-[var(--border-color)]/80 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-inner">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span>End Date & Time</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-white px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  />
                  <input
                    type="time"
                    value={filterEndTime}
                    onChange={(e) => setFilterEndTime(e.target.value)}
                    className="w-24 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-white px-2.5 py-2 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Quick Date Presets Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]/60">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider flex items-center gap-1.5 mr-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Quick Ranges:
                </span>
                {[
                  { label: 'Today', key: 'today' },
                  { label: 'Yesterday', key: 'yesterday' },
                  { label: 'This Week', key: 'week' },
                  { label: 'This Month', key: 'month' },
                  { label: 'All Time', key: 'all' },
                ].map((p) => {
                  const now = new Date();
                  const pad = (n: number) => (n < 10 ? '0' + n : n);
                  const formatYYYYMMDD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                  const todayStr = formatYYYYMMDD(now);

                  let isSelected = false;
                  if (p.key === 'all' && !filterStartDate && !filterEndDate) isSelected = true;
                  else if (p.key === 'today' && filterStartDate === todayStr && filterEndDate === todayStr) isSelected = true;
                  else if (p.key === 'yesterday') {
                    const yest = new Date(now);
                    yest.setDate(yest.getDate() - 1);
                    const yestStr = formatYYYYMMDD(yest);
                    if (filterStartDate === yestStr && filterEndDate === yestStr) isSelected = true;
                  } else if (p.key === 'week') {
                    const weekAgo = new Date(now);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    if (filterStartDate === formatYYYYMMDD(weekAgo) && filterEndDate === todayStr) isSelected = true;
                  } else if (p.key === 'month') {
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    if (filterStartDate === formatYYYYMMDD(monthStart) && filterEndDate === todayStr) isSelected = true;
                  }

                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPresetRange(p.key as any)}
                      className={`px-3.5 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-sm border ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-500 text-white font-extrabold shadow-emerald-500/20'
                          : 'bg-[var(--bg-card)]/90 hover:bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] hover:text-white'
                      }`}
                    >
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* KPI Summary Cards for Active Department */}
          {(() => {
            const currentDeptList = auditData?.departments?.[activeDeptTab] || [];
            const staffCount = currentDeptList.length;
            
            let totalOutput = 0;
            let outputLabel = 'Total Output';
            let topStaff = currentDeptList[0]?.name || '-';
            let maxVal = 0;

            currentDeptList.forEach((emp: any) => {
              let score = 0;
              if (activeDeptTab === 'Sales' || activeDeptTab === 'PSA') {
                score = emp.metrics?.leadsWorked || 0;
                totalOutput += score;
                outputLabel = 'Total Leads Worked';
              } else if (activeDeptTab === 'Finance') {
                score = emp.metrics?.ordersVerified || 0;
                totalOutput += score;
                outputLabel = 'Orders Verified';
              } else if (activeDeptTab === 'Operations') {
                score = emp.metrics?.installationsCompleted || 0;
                totalOutput += score;
                outputLabel = 'Installations Completed';
              } else {
                score = emp.metrics?.leadsWorked || 0;
                totalOutput += score;
                outputLabel = 'Activities Logged';
              }

              if (score > maxVal) {
                maxVal = score;
                topStaff = emp.name;
              }
            });

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]/80 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Active Staff</span>
                    <span className="text-xl font-extrabold text-white mt-1 block">{staffCount} <span className="text-xs text-[var(--text-muted)] font-normal">Members</span></span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]/80 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">{outputLabel}</span>
                    <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{totalOutput.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Award className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]/80 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Active Department</span>
                    <span className="text-sm font-bold text-[var(--text-primary)] mt-1 block flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        activeDeptTab === 'Sales' ? 'bg-cyan-400' : activeDeptTab === 'Finance' ? 'bg-emerald-400' : activeDeptTab === 'Operations' ? 'bg-purple-400' : 'bg-emerald-400'
                      }`} />
                      {activeDeptTab}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)]/80 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Top Contributor</span>
                    <span className="text-xs font-bold text-amber-300 mt-1 block truncate max-w-[130px]" title={topStaff}>
                      {topStaff}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Department Tab Buttons */}
          <div className="flex gap-2 border-b border-[var(--border-color)] bg-slate-955/20 p-1.5 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none">
            {(['Sales', 'Finance', 'Operations', 'Other'] as const).map((dept) => {
              const isActive = activeDeptTab === (dept as any);
              const count = auditData?.departments?.[dept]?.length || 0;
              return (
                <button
                  key={dept}
                  onClick={() => setActiveDeptTab(dept as any)}
                  className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-emerald-600 text-white font-extrabold shadow-md'
                      : 'bg-transparent border border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]/40'
                  }`}
                >
                  <span>{dept} Department</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    isActive ? 'bg-white/20 text-white font-extrabold' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Table Section */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--border-color)] pb-4">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  activeDeptTab === 'Sales' ? 'bg-cyan-500' :
                  activeDeptTab === 'Finance' ? 'bg-emerald-500' :
                  activeDeptTab === 'Operations' ? 'bg-purple-500' : 'bg-emerald-600'
                }`} />
                <span>{activeDeptTab} Staff Performance & Audit List</span>
              </h3>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search staff name or designation..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--border-color)]"
                  />
                </div>

                {auditLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] animate-pulse shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {(() => {
                const rawList = auditData?.departments?.[activeDeptTab] || [];
                const filteredList = rawList.filter((emp: any) => {
                  if (!auditSearchQuery.trim()) return true;
                  const q = auditSearchQuery.toLowerCase();
                  return (emp.name || '').toLowerCase().includes(q) || (emp.designation || '').toLowerCase().includes(q);
                });

                const employeesList = [...filteredList].sort((a: any, b: any) => {
                  let valA: any = a[sortField];
                  let valB: any = b[sortField];

                  if (valA === undefined && a.metrics) {
                    valA = a.metrics[sortField];
                  }
                  if (valB === undefined && b.metrics) {
                    valB = b.metrics[sortField];
                  }

                  if (valA === undefined || valA === null) valA = 0;
                  if (valB === undefined || valB === null) valB = 0;

                  if (typeof valA === 'string') {
                    const cmp = valA.localeCompare(String(valB));
                    return sortOrder === 'asc' ? cmp : -cmp;
                  }
                  return sortOrder === 'asc' ? valA - valB : valB - valA;
                });

                if (employeesList.length === 0) {
                  return (
                    <div className="py-12 text-center text-[var(--text-muted)] text-xs italic">
                      {auditSearchQuery ? `No staff matching "${auditSearchQuery}" found.` : `No active members found in ${activeDeptTab} department for this timeframe.`}
                    </div>
                  );
                }

                if (activeDeptTab === 'Sales' || activeDeptTab === 'PSA') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[950px]">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider bg-[var(--bg-main)] select-none">
                          <th onClick={() => handleSort('name')} className="pb-3 px-4 text-left cursor-pointer hover:text-white transition-colors">
                            Employee Name {getSortIcon('name')}
                          </th>
                          <th onClick={() => handleSort('designation')} className="pb-3 px-4 text-left cursor-pointer hover:text-white transition-colors">
                            Designation {getSortIcon('designation')}
                          </th>
                          <th onClick={() => handleSort('teamSize')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Team Members {getSortIcon('teamSize')}
                          </th>
                          <th onClick={() => handleSort('leadsWorked')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Leads Worked {getSortIcon('leadsWorked')}
                          </th>
                          <th onClick={() => handleSort('meetingsBooked')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Meetings Booked {getSortIcon('meetingsBooked')}
                          </th>
                          <th onClick={() => handleSort('meetingsRecorded')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Meetings Recorded {getSortIcon('meetingsRecorded')}
                          </th>
                          <th onClick={() => handleSort('meetingsCancelled')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Meetings Cancelled {getSortIcon('meetingsCancelled')}
                          </th>
                          <th onClick={() => handleSort('salesDone')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Sales Done {getSortIcon('salesDone')}
                          </th>
                          <th onClick={() => handleSort('ordersPunched')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Orders Punched {getSortIcon('ordersPunched')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {employeesList.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-[var(--bg-card)]/40 transition-colors group">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(emp.id)} flex items-center justify-center font-bold text-xs shadow-inner shrink-0 border`}>
                                {getInitials(emp.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate group-hover:text-emerald-400 transition-colors">{emp.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                                className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500/40 text-[var(--text-secondary)] hover:text-emerald-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium ml-auto"
                                title="View Daily Activity Timeline"
                              >
                                <Calendar className="w-3 h-3 text-emerald-400" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenHierarchyModal(emp.id)}
                                className="font-extrabold font-mono text-emerald-400 hover:underline outline-none cursor-pointer px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs"
                              >
                                {emp.teamSize || 1}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'leads_worked')}
                                className="font-extrabold text-emerald-400 hover:text-blue-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.leadsWorked}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'meetings_booked')}
                                className="font-extrabold text-cyan-400 hover:text-cyan-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.meetingsBooked}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'meetings_recorded')}
                                className="font-extrabold text-sky-400 hover:text-sky-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.meetingsRecorded}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'meetings_cancelled')}
                                className="font-extrabold text-red-400 hover:text-red-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.meetingsCancelled || 0} <span className="text-[10px] font-normal text-[var(--text-muted)]">({emp.metrics.cancellationRate || 0}%)</span>
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'sales_done')}
                                className="font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.salesDone || 0} <span className="text-[10px] font-normal text-[var(--text-muted)]">({emp.metrics.saleConversionRate || 0}%)</span>
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'orders_punched')}
                                className="font-extrabold text-teal-400 hover:text-teal-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.ordersPunched}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (activeDeptTab === 'Finance') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider bg-[var(--bg-main)] select-none">
                          <th onClick={() => handleSort('name')} className="pb-3 px-4 text-left cursor-pointer hover:text-white transition-colors">
                            Employee Name {getSortIcon('name')}
                          </th>
                          <th onClick={() => handleSort('designation')} className="pb-3 px-4 text-left cursor-pointer hover:text-white transition-colors">
                            Designation {getSortIcon('designation')}
                          </th>
                          <th onClick={() => handleSort('teamSize')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Team Members {getSortIcon('teamSize')}
                          </th>
                          <th onClick={() => handleSort('ordersVerified')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Orders Verified {getSortIcon('ordersVerified')}
                          </th>
                          <th onClick={() => handleSort('ledgerActivities')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Ledger Activities {getSortIcon('ledgerActivities')}
                          </th>
                          <th onClick={() => handleSort('paymentsAmount')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Payments Handled {getSortIcon('paymentsAmount')}
                          </th>
                          <th onClick={() => handleSort('ordersVerifiedValue')} className="pb-3 px-4 text-right cursor-pointer hover:text-white transition-colors">
                            Total Verified Value {getSortIcon('ordersVerifiedValue')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {employeesList.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-[var(--bg-card)]/40 transition-colors group">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(emp.id)} flex items-center justify-center font-bold text-xs shadow-inner shrink-0 border`}>
                                {getInitials(emp.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate group-hover:text-emerald-400 transition-colors">{emp.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                                className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500/40 text-[var(--text-secondary)] hover:text-emerald-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium ml-auto"
                              >
                                <Calendar className="w-3 h-3 text-emerald-400" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenHierarchyModal(emp.id)}
                                className="font-extrabold font-mono text-emerald-400 hover:underline outline-none cursor-pointer px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs"
                              >
                                {emp.teamSize || 1}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'orders_verified')}
                                className="font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.ordersVerified}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'ledger_activities')}
                                className="font-extrabold text-emerald-400 hover:text-blue-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.ledgerActivities}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center font-extrabold text-[var(--text-primary)]">
                              â‚¹{(emp.metrics.paymentsAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-[var(--text-primary)] font-mono">
                              â‚¹{(emp.metrics.ordersVerifiedValue || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (activeDeptTab === 'Operations') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider bg-[var(--bg-main)] select-none">
                          <th onClick={() => handleSort('name')} className="pb-3 px-4 text-left cursor-pointer hover:text-white transition-colors">
                            Employee Name {getSortIcon('name')}
                          </th>
                          <th onClick={() => handleSort('designation')} className="pb-3 px-4 text-left cursor-pointer hover:text-white transition-colors">
                            Designation {getSortIcon('designation')}
                          </th>
                          <th onClick={() => handleSort('teamSize')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Team Members {getSortIcon('teamSize')}
                          </th>
                          <th onClick={() => handleSort('deliveriesCompleted')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Deliveries {getSortIcon('deliveriesCompleted')}
                          </th>
                          <th onClick={() => handleSort('installationsCompleted')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Installations {getSortIcon('installationsCompleted')}
                          </th>
                          <th onClick={() => handleSort('commissionedCompleted')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Plants Commissioned {getSortIcon('commissionedCompleted')}
                          </th>
                          <th onClick={() => handleSort('subsidiesApplied')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                            Subsidies Applied {getSortIcon('subsidiesApplied')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {employeesList.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-[var(--bg-card)]/40 transition-colors group">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(emp.id)} flex items-center justify-center font-bold text-xs shadow-inner shrink-0 border`}>
                                {getInitials(emp.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate group-hover:text-emerald-400 transition-colors">{emp.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                                className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500/40 text-[var(--text-secondary)] hover:text-emerald-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium ml-auto"
                              >
                                <Calendar className="w-3 h-3 text-emerald-400" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenHierarchyModal(emp.id)}
                                className="font-extrabold font-mono text-emerald-400 hover:underline outline-none cursor-pointer px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs"
                              >
                                {emp.teamSize || 1}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'deliveries_completed')}
                                className="font-extrabold text-sky-400 hover:text-sky-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.deliveriesCompleted}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'installations_completed')}
                                className="font-extrabold text-purple-400 hover:text-purple-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.installationsCompleted}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'commissioned_completed')}
                                className="font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.commissionedCompleted}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'subsidies_applied')}
                                className="font-extrabold text-emerald-400 hover:text-blue-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.subsidiesApplied}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider bg-[var(--bg-main)] select-none">
                        <th onClick={() => handleSort('name')} className="pb-3 px-4 text-left cursor-pointer hover:text-white transition-colors">
                          Employee Name {getSortIcon('name')}
                        </th>
                        <th onClick={() => handleSort('designation')} className="pb-3 px-4 text-left cursor-pointer hover:text-white transition-colors">
                          Designation {getSortIcon('designation')}
                        </th>
                        <th onClick={() => handleSort('teamSize')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                          Team Members {getSortIcon('teamSize')}
                        </th>
                        <th onClick={() => handleSort('leadsWorked')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                          Leads Worked {getSortIcon('leadsWorked')}
                        </th>
                        <th onClick={() => handleSort('ledgerActivities')} className="pb-3 px-4 text-center cursor-pointer hover:text-white transition-colors">
                          Actions Logged {getSortIcon('ledgerActivities')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-sm">
                      {employeesList.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-[var(--bg-card)]/40 transition-colors group">
                          <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(emp.id)} flex items-center justify-center font-bold text-xs shadow-inner shrink-0 border`}>
                              {getInitials(emp.name)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate group-hover:text-emerald-400 transition-colors">{emp.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                              className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500/40 text-[var(--text-secondary)] hover:text-emerald-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium ml-auto"
                            >
                              <Calendar className="w-3 h-3 text-emerald-400" /> Timeline
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium text-xs">{emp.designation}</td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenHierarchyModal(emp.id)}
                              className="font-extrabold font-mono text-emerald-400 hover:underline outline-none cursor-pointer px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs"
                            >
                              {emp.teamSize || 1}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenDetailsModal(emp.id, 'leads_worked')}
                              className="font-extrabold text-emerald-400 hover:text-blue-300 hover:underline outline-none cursor-pointer"
                            >
                              {emp.metrics.leadsWorked}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-[var(--text-primary)]">
                            {emp.metrics.ledgerActivities || emp.metrics.leadsWorked}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>

      {/* Employee Detail Audit Modal */}
      {selectedAuditEmpId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Detailed Activity Trail</span>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>{modalData?.employee?.name || 'Loading Employee...'}</span>
                  {modalData?.employee && (
                    <span className="text-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded text-[var(--text-secondary)] font-mono">
                      {modalData.employee.designation?.name || modalData.employee.role.toUpperCase()} ({modalData.employee.department?.name || 'Sales'})
                    </span>
                  )}
                  {modalData?.teamSize && modalData.teamSize > 1 && (
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-mono">
                      Hierarchy Team ({modalData.teamSize} members)
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Drilldown Line Items for: <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">{activeDetailType.replace('_', ' ')}</span>
                </p>
              </div>
              <button
                onClick={handleCloseAuditModal}
                className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/60 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto min-h-[400px]">
              {modalData?.results && modalData.results.length > 0 && (
                <div className="mb-6 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search by Lead Name, ID, or Details..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              {(() => {
                let filteredResults = modalData?.results || [];
                if (auditSearchQuery) {
                  const q = auditSearchQuery.toLowerCase();
                  filteredResults = filteredResults.filter((item: any) => 
                    (item.customerName || '').toLowerCase().includes(q) ||
                    (item.leadCode || '').toLowerCase().includes(q) ||
                    (item.detail1 || '').toLowerCase().includes(q) ||
                    (item.detail2 || '').toLowerCase().includes(q)
                  );
                }

                if (modalLoading && !modalData) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-xs italic gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600 dark:text-emerald-400" />
                      <span>Fetching activity details across team hierarchy...</span>
                    </div>
                  );
                }

                if (!modalData || filteredResults.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-xs italic">
                      <p>No recorded activity items found for this metric in the selected timeframe (or your search didn't match anything).</p>
                    </div>
                  );
                }

                if (activeDetailType === 'leads_worked') {
                  const groupedLeads = filteredResults.reduce((acc: any, item: any) => {
                    if (!item.leadId) return acc;
                    if (!acc[item.leadId]) {
                      acc[item.leadId] = {
                        leadId: item.leadId,
                        leadCode: item.leadCode,
                        customerName: item.customerName,
                        logs: []
                      };
                    }
                    acc[item.leadId].logs.push(item);
                    return acc;
                  }, {});
                  const groupArray = Object.values(groupedLeads);
                  
                  return (
                    <div className="space-y-4">
                      {groupArray.map((group: any) => (
                        <div key={group.leadId} className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                          <button
                            onClick={() => setExpandedLeadIds(prev => ({ ...prev, [group.leadId]: !prev[group.leadId] }))}
                            className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-card)] transition-colors text-left border-b border-transparent focus:outline-none"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                <span className="text-emerald-400 font-bold text-xs">{group.logs.length}</span>
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-sm tracking-wide">{group.customerName || `Lead #${group.leadCode}`}</h4>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono block mt-0.5">#{group.leadCode}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-[var(--text-secondary)] bg-[var(--bg-card)]/60 px-3 py-1.5 rounded-full border border-[var(--border-color)]/60">
                              <span className="text-[10px] font-mono font-medium">{group.logs.length} Actions</span>
                              {expandedLeadIds[group.leadId] ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>
                          
                          {expandedLeadIds[group.leadId] && (
                            <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)] p-5 shadow-inner">
                              <div className="relative border-l-2 border-[var(--border-color)] ml-4 pl-6 space-y-6">
                                {group.logs.map((log: any) => (
                                  <div key={log.id} className="relative group">
                                    <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-[3px] border-emerald-500/80 bg-[var(--bg-main)] ring-4 ring-slate-950 shadow-sm" />
                                    <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)]/60 rounded-xl p-3 hover:border-[var(--border-color)] transition-colors">
                                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-bold text-emerald-400/90 tracking-wide uppercase">{log.detail1}</span>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                          {log.date || new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans">{log.detail2}</p>
                                      {log.executedBy && (
                                        <div className="mt-2 text-[10px] bg-[var(--bg-main)] border border-[var(--border-color)] px-2 py-1 rounded inline-flex items-center gap-1">
                                          <span className="text-[var(--text-muted)]">Executed by:</span> <span className="text-white font-medium">{log.executedBy.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-card)]/40 text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Executed By (Who)</th>
                          <th className="py-3 px-4">Lead / Client</th>
                          <th className="py-3 px-4">Primary Action Details</th>
                          <th className="py-3 px-4">Remarks / Outcome</th>
                          {modalData.results.some((r: any) => r.value !== undefined) && (
                            <th className="py-3 px-4 text-right">Value</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs text-[var(--text-primary)]">
                        {filteredResults.map((item: any) => (
                          <tr key={item.id} className="hover:bg-[var(--bg-card)]/80 transition-colors group">
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] font-mono whitespace-nowrap">
                              {item.date || new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.executedBy ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{item.executedBy.name}</span>
                                  <span className="text-[9px] text-emerald-500/70 font-mono mt-0.5">{item.executedBy.designation}</span>
                                </div>
                              ) : (
                                <span className="text-[var(--text-muted)] italic">Self</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.leadId ? (
                                <a href={`/leads/${item.leadId}`} className="hover:underline text-emerald-500 font-bold block transition-colors">
                                  {item.customerName || `Lead #${item.leadCode}`}
                                </a>
                              ) : (
                                <span className="text-[var(--text-secondary)] font-medium">{item.customerName || '-'}</span>
                              )}
                              {item.leadCode && <span className="text-[9px] text-[var(--text-muted)] font-mono block mt-0.5">#{item.leadCode}</span>}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                              {item.detail1}
                            </td>
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] max-w-[280px] leading-relaxed">
                              {item.detail2}
                            </td>
                            {modalData.results.some((r: any) => r.value !== undefined) && (
                              <td className="py-3.5 px-4 text-right font-extrabold text-white font-mono bg-[var(--bg-card)]/20">
                                {item.value ? `â‚¹${item.value.toLocaleString('en-IN')}` : '-'}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-slate-955/20 text-right">
              <button
                onClick={handleCloseAuditModal}
                className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-355 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer outline-none"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline Calendar Modal */}
      {selectedTimelineEmpId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-main)] backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Employee Performance Audit</span>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>{selectedTimelineEmpName}'s Task Timeline Calendar</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Chronological trail of daily check-ins, pipeline updates, and meetings.
                </p>
              </div>
              <button
                onClick={handleCloseTimelineModal}
                className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/60 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto min-h-[350px] space-y-4">
              {timelineLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-xs italic gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>Aggregating task trail from database logs...</span>
                </div>
              ) : timelineEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-xs italic font-sans">
                  <p>No logged check-ins, status modifications, or meetings in this timeframe.</p>
                </div>
              ) : (
                <div className="relative border-l border-[var(--border-color)] ml-4 pl-6 space-y-6">
                  {timelineEvents.map((evt: any) => {
                    const isCheckIn = evt.type === 'check_in';
                    const isCheckOut = evt.type === 'check_out';
                    const isLog = evt.type === 'log';
                    const isMeet = evt.type === 'meeting';

                    const theme = isCheckIn ? { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' } :
                                  isCheckOut ? { border: 'border-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-400' } :
                                  isLog ? { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' } :
                                  isMeet ? { border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' } :
                                  { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' };

                    return (
                      <div key={evt.id} className="relative group">
                        {/* Dot indicator */}
                        <div className={`absolute -left-9 top-1 w-5 h-5 rounded-full border-2 ${theme.border} bg-[var(--bg-card)] flex items-center justify-center`} />
                        
                        <div className="bg-[var(--bg-card)]/35 border border-[var(--border-color)] hover:border-[var(--border-color)] p-4 rounded-xl space-y-1.5 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>{evt.title}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono font-medium">
                              {new Date(evt.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans">{evt.description}</p>
                          
                          {evt.meta && (evt.meta.notes || evt.meta.remark) && (
                            <div className="text-[11px] bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-[var(--text-secondary)] italic">
                              &ldquo;{evt.meta.notes || evt.meta.remark}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-slate-955/20 text-right">
              <button
                type="button"
                onClick={handleCloseTimelineModal}
                className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-355 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer outline-none"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Hierarchy Modal */}
      {hierarchyModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-main)] backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Organizational Structure</span>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>Team Hierarchy</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  View the direct and indirect reporting structure.
                </p>
              </div>
              <button
                onClick={() => setHierarchyModalData(null)}
                className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/60 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
              {hierarchyLoading || hierarchyModalData.loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-xs italic gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>Loading hierarchy tree...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Recursive component to render tree */}
                  {(() => {
                    const renderNode = (node: any, level: number = 0) => {
                      return (
                        <div key={node.id} className={`pl-${level === 0 ? '0' : '6'} border-l ${level === 0 ? 'border-transparent' : 'border-[var(--border-color)]'} mt-2`}>
                          <div className="flex items-center gap-3 p-3 bg-[var(--bg-card)]/40 border border-[var(--border-color)]/60 rounded-xl relative">
                            {level > 0 && <div className="absolute -left-6 top-1/2 w-6 border-t border-[var(--border-color)]"></div>}
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                              <Users className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold text-sm truncate">{node.name}</h4>
                              <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{node.designation} â€¢ {node.department}</p>
                            </div>
                            <div className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-1 rounded border border-[var(--border-color)]">
                              {node.children?.length || 0} Direct
                            </div>
                          </div>
                          {node.children && node.children.length > 0 && (
                            <div className="ml-4">
                              {node.children.map((child: any) => renderNode(child, level + 1))}
                            </div>
                          )}
                        </div>
                      );
                    };
                    return renderNode(hierarchyModalData);
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-slate-955/20 text-right">
              <button
                onClick={() => setHierarchyModalData(null)}
                className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-355 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer outline-none"
              >
                Close Tree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
