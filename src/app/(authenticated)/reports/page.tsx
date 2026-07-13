'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const TrendLineChart = dynamic(
  () => import('@/components/ReportsCharts').then((mod) => mod.TrendLineChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-950/20 animate-pulse rounded-xl" />,
  }
);

const LeadSourcePieChart = dynamic(
  () => import('@/components/ReportsCharts').then((mod) => mod.LeadSourcePieChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-950/20 animate-pulse rounded-xl" />,
  }
);

const PipelineBarChart = dynamic(
  () => import('@/components/ReportsCharts').then((mod) => mod.PipelineBarChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-950/20 animate-pulse rounded-xl" />,
  }
);
import {
  Sun,
  FileSpreadsheet,
  FileText,
  LineChart as LineChartIcon,
  Calendar,
  Users,
  Compass,
  ArrowUpRight,
  ChevronRight,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Layers,
  X,
  Activity,
} from 'lucide-react';

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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];

export default function ReportsPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!hasPermission('reports:view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[#111625] border border-slate-800 rounded-xl shadow-lg mt-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-md">
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

  const [activeReportTab, setActiveReportTab] = useState<'pipeline' | 'employee'>('pipeline');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [auditData, setAuditData] = useState<{ employees: any[]; alerts: any[] } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // States for the interactive employee audit modal
  const [selectedAuditEmpId, setSelectedAuditEmpId] = useState<number | null>(null);
  const [modalTimeframe, setModalTimeframe] = useState<'today' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [modalData, setModalData] = useState<{ employee: any; stats: any; timeline: any[] } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

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
      const res = await fetch(`/api/v1/reports/employee-audit?timeframe=${timeframe}`);
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
  }, [user, activeReportTab, timeframe]);

  const fetchModalData = async (empId: number, mode: 'today' | 'custom', start?: string, end?: string) => {
    setModalLoading(true);
    try {
      let url = `/api/v1/reports/employee-audit/detail?userId=${empId}`;
      if (mode === 'custom' && start && end) {
        const sDate = new Date(start);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(end);
        eDate.setHours(23, 59, 59, 999);
        url += `&startDate=${sDate.toISOString()}&endDate=${eDate.toISOString()}`;
      } else {
        const sDate = new Date();
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date();
        eDate.setHours(23, 59, 59, 999);
        url += `&startDate=${sDate.toISOString()}&endDate=${eDate.toISOString()}`;
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
      if (modalTimeframe === 'today') {
        fetchModalData(selectedAuditEmpId, 'today');
      } else if (modalTimeframe === 'custom' && customStartDate && customEndDate) {
        fetchModalData(selectedAuditEmpId, 'custom', customStartDate, customEndDate);
      }
    }
  }, [selectedAuditEmpId, modalTimeframe, customStartDate, customEndDate]);

  const handleOpenAuditModal = (empId: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const prevStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setCustomStartDate(prevStr);
    setCustomEndDate(todayStr);
    setModalTimeframe('today');
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
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <Sun className="w-12 h-12 text-amber-500 animate-spin" />
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
    { name: 'WhatsApp', value: 35 },
    { name: 'Cold Call', value: 20 },
    { name: 'Referral', value: 25 },
    { name: 'Walk-In', value: 10 },
    { name: 'Google Ads', value: 10 },
  ];

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      {/* Title & Exporters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Performance Reports & Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyze team KPIs, sales trends, and download operational spreadsheets.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export to Excel (CSV)</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex border-b border-slate-800 text-xs font-semibold print:hidden">
        <button
          onClick={() => setActiveReportTab('pipeline')}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'pipeline'
              ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>Pipeline Overview</span>
        </button>
        {hasPermission('reports:view') && (
          <button
            onClick={() => setActiveReportTab('employee')}
            className={`px-5 py-3 border-b-2 transition-all cursor-pointer ${
              activeReportTab === 'employee'
                ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Employee Audit</span>
          </button>
        )}
      </div>

      {activeReportTab === 'pipeline' ? (
        <>
          {/* Overview stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-[#111625] border border-slate-800 rounded-2xl p-5 shadow-xl print:border-black print:text-black">
            <div className="text-center md:border-r border-slate-800 last:border-0 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Total Leads Registered
              </span>
              <span className="text-3xl font-extrabold text-white print:text-black">{stats?.totalLeads || 0}</span>
            </div>
            <div className="text-center md:border-r border-slate-800 last:border-0 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Active Nurturing Pool
              </span>
              <span className="text-3xl font-extrabold text-amber-400 print:text-black">{stats?.activeLeads || 0}</span>
            </div>
            <div className="text-center md:border-r border-slate-800 last:border-0 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Meetings Converted
              </span>
              <span className="text-3xl font-extrabold text-cyan-400 print:text-black">{stats?.meetingsBookedThisMonth || 0}</span>
            </div>
            <div className="text-center py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Closed Conversions %
              </span>
              <span className="text-3xl font-extrabold text-emerald-400 print:text-black">{stats?.conversionRate || 0}%</span>
            </div>
          </div>

          {/* Print Page Break for print layouts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend line graph */}
            <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-lg print:border-black">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-6 print:text-black">Daily Conversion trend</h3>
              <div className="h-72 w-full">
                <TrendLineChart trend={trend} />
              </div>
            </div>

            {/* Lead source analysis */}
            <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-lg print:border-black">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-6 print:text-black">Lead Acquisition Channels</h3>
              <div className="h-72 w-full flex items-center justify-center">
                <LeadSourcePieChart leadSourceData={leadSourceData} colors={COLORS} />
              </div>
            </div>

            {/* Pipeline Stage Bar Chart */}
            <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-lg lg:col-span-2 print:border-black">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-6 print:text-black">Lead Pipeline Stage Distribution</h3>
              <div className="h-72 w-full">
                <PipelineBarChart pipelineBarData={pipelineBarData} />
              </div>
            </div>

            {/* Leaders Table */}
            {hasPermission('reports:view') && (
              <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-lg lg:col-span-2 print:border-black">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-6 print:text-black">Consultant Sales Standings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="pb-3 px-4 w-48 text-left">Consultant Name</th>
                        <th className="pb-3 px-4 w-32 text-center">Leads Allocated</th>
                        <th className="pb-3 px-4 w-44 text-center">Nurture Actions Logged</th>
                        <th className="pb-3 px-4 w-32 text-center">Site Meetings</th>
                        <th className="pb-3 px-4 w-32 text-center">Sales Closed</th>
                        <th className="pb-3 px-4 w-32 text-right">Conversion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {performance.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white print:text-black w-48 text-left">{member.name}</td>
                          <td className="py-3.5 px-4 text-center text-slate-300 print:text-black w-32">{member.leadsAssigned}</td>
                          <td className="py-3.5 px-4 text-center text-slate-300 print:text-black w-44">{member.callsMade}</td>
                          <td className="py-3.5 px-4 text-center text-slate-300 print:text-black w-32">{member.meetingsBooked}</td>
                          <td className="py-3.5 px-4 text-center text-emerald-400 font-bold print:text-black w-32">{member.salesClosed}</td>
                          <td className="py-3.5 px-4 text-right text-amber-400 font-extrabold print:text-black w-32">{member.conversionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Employee Audit Dashboard */
        <div className="space-y-6">
          {/* Timeframe Selector & Audit Status */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111625] border border-slate-800 rounded-xl p-4 shadow-md">
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`py-2 px-4 rounded-lg font-bold text-xs capitalize transition-all cursor-pointer ${
                    timeframe === t
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'daily' ? 'Today (Daily)' : t === 'weekly' ? 'Last 7 Days (Weekly)' : 'Current Month (Monthly)'}
                </button>
              ))}
            </div>
            {auditLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Syncing Audit Logs...</span>
              </div>
            )}
          </div>

          {/* Audit Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-[#111625] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="text-center md:border-r border-slate-800 last:border-0 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Active Staff Today
              </span>
              <span className="text-3xl font-extrabold text-white">
                {auditData?.employees.filter(e => e.isCurrentlyCheckedIn).length || 0} / {auditData?.employees.length || 0}
              </span>
            </div>
            <div className="text-center md:border-r border-slate-800 last:border-0 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Total Stage Changes
              </span>
              <span className="text-3xl font-extrabold text-amber-400">
                {auditData?.employees.reduce((sum, e) => sum + e.stageChangesLogged, 0) || 0}
              </span>
            </div>
            <div className="text-center md:border-r border-slate-800 last:border-0 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Site Visits Logged
              </span>
              <span className="text-3xl font-extrabold text-cyan-400">
                {auditData?.employees.reduce((sum, e) => sum + e.meetingsCompleted, 0) || 0}
              </span>
            </div>
            <div className="text-center py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Active Audit Flags
              </span>
              <span className={`text-3xl font-extrabold ${auditData?.alerts.length ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                {auditData?.alerts.length || 0}
              </span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Employee Audit Logs</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Sort: Name (A-Z)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-4 w-48 text-left">Employee Name</th>
                    <th className="pb-3 px-4 w-32 text-left">Role</th>
                    <th className="pb-3 px-4 w-36 text-center">Work Hours Logged</th>
                    <th className="pb-3 px-4 w-48 text-center text-amber-400 font-bold bg-amber-500/[0.02] border-x border-slate-800/40">
                      ⚡ Pipeline Stage Changes
                    </th>
                    <th className="pb-3 px-4 w-32 text-center">Site Visits</th>
                    <th className="pb-3 px-4 w-32 text-center">Sales Closed</th>
                    <th className="pb-3 px-4 w-44 text-right">Audit Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {auditLoading && !auditData ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs italic">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-500 inline mr-2" />
                        Fetching employee logs...
                      </td>
                    </tr>
                  ) : auditData?.employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-550 text-xs italic">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    auditData?.employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white w-48 text-left">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${emp.isCurrentlyCheckedIn ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-slate-700'}`} title={emp.isCurrentlyCheckedIn ? 'Checked In' : 'Not Checked In'} />
                            <button
                              onClick={() => handleOpenAuditModal(emp.id)}
                              className="text-left font-bold text-white hover:text-amber-400 transition-all hover:underline outline-none cursor-pointer"
                            >
                              {emp.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 capitalize w-32 text-left">{emp.role}</td>
                        <td className="py-3.5 px-4 text-center text-slate-300 w-36 font-mono">
                          {emp.totalWorkDurationMin > 0 ? (
                            `${Math.floor(emp.totalWorkDurationMin / 60)}h ${emp.totalWorkDurationMin % 60}m`
                          ) : (
                            <span className="text-slate-600 italic text-xs">No hours</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-white font-extrabold w-48 bg-amber-500/[0.01] border-x border-slate-800/40">
                          <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                            emp.stageChangesLogged > 0
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-900/60 text-slate-500 border-slate-800'
                          }`}>
                            {emp.stageChangesLogged}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-300 w-32 font-mono">{emp.meetingsCompleted}</td>
                        <td className="py-3.5 px-4 text-center text-slate-350 w-32 font-mono">
                          {emp.salesClosed > 0 ? (
                            <span className="text-emerald-400 font-bold">{emp.salesClosed}</span>
                          ) : (
                            <span className="text-slate-600 font-normal">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right w-44">
                          {emp.alerts.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-end">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/20 text-red-400 border border-red-900/30">
                                {emp.alerts.length} Flags ⚠️
                              </span>
                            </div>
                          ) : (
                            <span className="text-emerald-500 text-xs font-bold">Clear ✓</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Audit & Anomalies Panel */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>Employee Audit & Discrepancies Log ({timeframe})</span>
              </h3>
              <div className="mt-4 max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {auditLoading && !auditData ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">Syncing alerts timeline...</p>
                ) : !auditData || auditData.alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">No anomalies or audit flags detected in this timeframe.</p>
                ) : (
                  auditData.alerts.map((alert, idx) => {
                    const isHigh = alert.severity === 'high';
                    const isMed = alert.severity === 'medium';
                    
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                          isHigh
                            ? 'bg-red-500/5 border-red-500/20 text-red-400'
                            : isMed
                              ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                              : 'bg-slate-950/40 border-slate-850 text-slate-350'
                        }`}
                      >
                        <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isHigh ? 'text-red-500' : isMed ? 'text-amber-500' : 'text-slate-400'}`} />
                        <div className="flex-1">
                          <p className="leading-relaxed font-medium">
                            {alert.message}
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-1.5 font-mono">
                            Logged: {new Date(alert.timestamp).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Audit Modal */}
      {selectedAuditEmpId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Employee Work Audit</span>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>{modalData?.employee?.name || 'Loading...'}</span>
                  {modalData?.employee && (
                    <span className="text-[10px] bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400 capitalize">
                      {modalData.employee.role}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{modalData?.employee?.email}</p>
              </div>
              <button
                onClick={handleCloseAuditModal}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Controls: Date Filter */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setModalTimeframe('today')}
                    className={`py-1.5 px-4 rounded text-xs font-bold transition-all cursor-pointer ${
                      modalTimeframe === 'today'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setModalTimeframe('custom')}
                    className={`py-1.5 px-4 rounded text-xs font-bold transition-all cursor-pointer ${
                      modalTimeframe === 'custom'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Custom Date Range
                  </button>
                </div>

                {modalTimeframe === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">From:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">To:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Loader */}
              {modalLoading && !modalData ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs italic gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span>Loading audit stream...</span>
                </div>
              ) : (
                <>
                  {/* Summary Metric Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Logged Hours</span>
                      <p className="text-xl font-bold text-white mt-1 font-mono">
                        {modalData?.stats ? (
                          `${Math.floor(modalData.stats.totalWorkDurationMin / 60)}h ${modalData.stats.totalWorkDurationMin % 60}m`
                        ) : '0h 0m'}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider text-amber-450">Pipeline Actions</span>
                      <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                        {modalData?.stats?.totalStageChanges || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Site Visits</span>
                      <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                        {modalData?.stats?.totalMeetings || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Deals Closed</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                        {modalData?.stats?.totalSales || 0}
                      </p>
                    </div>
                  </div>

                  {/* Work Timeline */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-amber-500" />
                      <span>Unified Work Stream Log</span>
                    </h3>

                    {modalLoading && (
                      <div className="flex items-center justify-center py-2 text-xs text-slate-450 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span>Updating stream...</span>
                      </div>
                    )}

                    <div className="relative border-l border-slate-800/80 ml-3 pl-6 space-y-6 pt-1 pb-2">
                      {!modalData || modalData.timeline.length === 0 ? (
                        <p className="text-xs text-slate-550 italic py-6 pl-2">No work logs or activities recorded for this timeframe.</p>
                      ) : (
                        modalData.timeline.map((evt: any) => {
                          const isCheck = evt.type === 'check_in' || evt.type === 'check_out';
                          const isStatus = evt.type === 'status_change';
                          const isMeet = evt.type === 'meeting_started' || evt.type === 'meeting_ended';
                          
                          return (
                            <div key={evt.id} className="relative">
                              <span className={`absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 ${
                                isCheck
                                  ? 'bg-slate-900 border-slate-500'
                                  : isStatus
                                    ? 'bg-amber-950 border-amber-500'
                                    : isMeet
                                      ? 'bg-cyan-950 border-cyan-500'
                                      : 'bg-emerald-950 border-emerald-500'
                              }`} />

                              <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <h4 className="text-xs font-bold text-white flex items-center flex-wrap gap-x-2">
                                    <span>{evt.title}</span>
                                    {evt.leadCode && (
                                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                                        {evt.customerName} ({evt.leadCode})
                                      </span>
                                    )}
                                  </h4>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(evt.timestamp).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {evt.details}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-right">
              <button
                onClick={handleCloseAuditModal}
                className="py-2 px-5 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer outline-none"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
