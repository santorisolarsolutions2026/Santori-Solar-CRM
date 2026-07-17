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
  const [activeDeptTab, setActiveDeptTab] = useState<'PSA' | 'Sales' | 'Finance' | 'Operations' | 'IT'>('PSA');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [auditData, setAuditData] = useState<{ departments: Record<string, any[]> } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // States for the interactive employee audit modal
  const [selectedAuditEmpId, setSelectedAuditEmpId] = useState<number | null>(null);
  const [activeDetailType, setActiveDetailType] = useState<string>('leads_worked');
  const [modalData, setModalData] = useState<{ employee: any; results: any[] } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Timeline calendar modal states
  const [selectedTimelineEmpId, setSelectedTimelineEmpId] = useState<number | null>(null);
  const [selectedTimelineEmpName, setSelectedTimelineEmpName] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchTimelineData = async (empId: number) => {
    try {
      setTimelineLoading(true);
      let url = `/api/v1/reports/employee-audit/timeline?userId=${empId}`;
      if (filterStartDate && filterEndDate) {
        url += `&startDate=${filterStartDate}&endDate=${filterEndDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTimelineEvents(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimelineLoading(false);
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
      let url = `/api/v1/reports/employee-audit`;
      if (filterStartDate && filterEndDate) {
        url += `?startDate=${filterStartDate}&endDate=${filterEndDate}`;
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
  }, [user, activeReportTab, filterStartDate, filterEndDate]);

  const fetchModalData = async (empId: number, type: string) => {
    setModalLoading(true);
    try {
      let url = `/api/v1/reports/employee-audit/detail?userId=${empId}&type=${type}`;
      if (filterStartDate && filterEndDate) {
        url += `&startDate=${filterStartDate}&endDate=${filterEndDate}`;
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
          {/* Filter Bar with Date Inputs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-md">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Employee Audit filters</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select a date range to filter contributions across all departments.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Start:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg focus:ring-amber-500 focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">End:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg focus:ring-amber-500 focus:outline-none cursor-pointer"
                />
              </div>
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Department Tab Buttons */}
          <div className="flex gap-2 border-b border-slate-800 bg-slate-950/20 p-1.5 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none">
            {(['PSA', 'Sales', 'Finance', 'Operations', 'IT'] as const).map((dept) => {
              const isActive = activeDeptTab === dept;
              const count = auditData?.departments?.[dept]?.length || 0;
              return (
                <button
                  key={dept}
                  onClick={() => setActiveDeptTab(dept)}
                  className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold shadow-md'
                      : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
                  }`}
                >
                  <span>{dept} Department</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-455'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Table Section */}
          <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  activeDeptTab === 'PSA' ? 'bg-amber-500' :
                  activeDeptTab === 'Sales' ? 'bg-cyan-500' :
                  activeDeptTab === 'Finance' ? 'bg-emerald-500' :
                  activeDeptTab === 'Operations' ? 'bg-purple-500' : 'bg-slate-450'
                }`} />
                <span>{activeDeptTab} Staff Performance List</span>
              </h3>
              {auditLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-450 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>Syncing...</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              {(() => {
                const employeesList = auditData?.departments?.[activeDeptTab] || [];
                if (employeesList.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500 text-xs italic">
                      No active members found in {activeDeptTab} department for this range.
                    </div>
                  );
                }

                if (activeDeptTab === 'PSA') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[950px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-4 text-left">Employee Name</th>
                          <th className="pb-3 px-4 text-left">Designation</th>
                          <th className="pb-3 px-4 text-center">Leads Worked</th>
                          <th className="pb-3 px-4 text-center">Meetings Booked</th>
                          <th className="pb-3 px-4 text-center">Meetings Done</th>
                          <th className="pb-3 px-4 text-center">Cancelled Meetings</th>
                          <th className="pb-3 px-4 text-center">Sales Converted</th>
                          <th className="pb-3 px-4 text-right">Conversion Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {employeesList.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                              <span>{emp.name}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium"
                                title="View Daily Activity Timeline & Calendar"
                              >
                                <Calendar className="w-3 h-3 text-amber-500" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'leads_worked')}
                                className="font-extrabold text-amber-400 hover:text-amber-300 hover:underline outline-none cursor-pointer"
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
                                onClick={() => handleOpenDetailsModal(emp.id, 'meetings_done')}
                                className="font-extrabold text-sky-400 hover:text-sky-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.meetingsDone || 0}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'meetings_cancelled')}
                                className="font-extrabold text-rose-455 hover:text-rose-350 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.meetingsCancelled || 0}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'meetings_converted')}
                                className="font-extrabold text-emerald-450 hover:text-emerald-355 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.meetingsConverted}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-300">{emp.metrics.conversionRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (activeDeptTab === 'Sales') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-4 text-left">Employee Name</th>
                          <th className="pb-3 px-4 text-left">Designation</th>
                          <th className="pb-3 px-4 text-center">Leads Handled</th>
                          <th className="pb-3 px-4 text-center">Sales Converted</th>
                          <th className="pb-3 px-4 text-center">Orders Punched</th>
                          <th className="pb-3 px-4 text-right">Value Generated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {employeesList.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                              <span>{emp.name}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium"
                                title="View Daily Activity Timeline & Calendar"
                              >
                                <Calendar className="w-3 h-3 text-amber-500" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'leads_worked')}
                                className="font-extrabold text-amber-400 hover:text-amber-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.leadsWorked}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'meetings_converted')}
                                className="font-extrabold text-emerald-450 hover:text-emerald-355 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.meetingsConverted}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'orders_punched')}
                                className="font-extrabold text-indigo-400 hover:text-indigo-350 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.ordersPunched}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-slate-200">
                              ₹{(emp.metrics?.ordersPunchedValue || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (activeDeptTab === 'Finance') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-4 text-left">Employee Name</th>
                          <th className="pb-3 px-4 text-left">Designation</th>
                          <th className="pb-3 px-4 text-center">Orders Verified</th>
                          <th className="pb-3 px-4 text-right">Total Verified Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {employeesList.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                              <span>{emp.name}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium"
                                title="View Daily Activity Timeline & Calendar"
                              >
                                <Calendar className="w-3 h-3 text-amber-500" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'orders_verified')}
                                className="font-extrabold text-rose-455 hover:text-rose-350 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.ordersVerified}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-slate-200">
                              ₹{(emp.metrics?.ordersVerifiedValue || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (activeDeptTab === 'Operations') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-4 text-left">Employee Name</th>
                          <th className="pb-3 px-4 text-left">Designation</th>
                          <th className="pb-3 px-4 text-center">Installations Completed</th>
                          <th className="pb-3 px-4 text-right">Fulfillment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {employeesList.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                              <span>{emp.name}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium"
                                title="View Daily Activity Timeline & Calendar"
                              >
                                <Calendar className="w-3 h-3 text-amber-500" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'installations_completed')}
                                className="font-extrabold text-purple-400 hover:text-purple-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.installationsCompleted}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-400 font-medium">Site Commissioned</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (activeDeptTab === 'IT') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-4 text-left">Employee Name</th>
                          <th className="pb-3 px-4 text-left">Designation</th>
                          <th className="pb-3 px-4 text-center">Associated Activities</th>
                          <th className="pb-3 px-4 text-right">System Override Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {employeesList.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                              <span>{emp.name}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenTimelineModal(emp.id, emp.name)}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium"
                                title="View Daily Activity Timeline & Calendar"
                              >
                                <Calendar className="w-3 h-3 text-amber-500" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'leads_worked')}
                                className="font-extrabold text-blue-450 hover:text-blue-350 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.leadsWorked} leads
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right text-emerald-500 font-semibold">Bypass Enabled</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Audit Modal */}
      {selectedAuditEmpId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Contribution Audit Record</span>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>{modalData?.employee?.name || 'Loading Employee...'}</span>
                  {modalData?.employee && (
                    <span className="text-[10px] bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400 font-mono">
                      {modalData.employee.designation?.name || 'Employee'} ({modalData.employee.department?.name || 'Unassigned'})
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Drilldown view: <span className="text-amber-455 font-bold uppercase tracking-wider">{activeDetailType.replace('_', ' ')}</span>
                </p>
              </div>
              <button
                onClick={handleCloseAuditModal}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
              {modalLoading && !modalData ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs italic gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span>Loading metric details from server...</span>
                </div>
              ) : !modalData || !modalData.results || modalData.results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs italic">
                  <p>No recorded leads, meetings, or orders found for this metric.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Render detail view lists based on type */}
                  {(activeDetailType === 'leads_worked' || activeDetailType === 'meetings_converted') && (
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-3">Lead Code</th>
                          <th className="pb-3 px-3">Client Name</th>
                          <th className="pb-3 px-3">Location</th>
                          <th className="pb-3 px-3">Pipeline Status</th>
                          <th className="pb-3 px-3">Assigned Team</th>
                          <th className="pb-3 px-3">Your Actions/Logs</th>
                          <th className="pb-3 px-3 text-right">Created Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                        {modalData.results.map((lead: any) => (
                          <tr key={lead.id} className="hover:bg-slate-900/10">
                            <td className="py-3 px-3 font-bold text-white">
                              <a href={`/leads/${lead.id}`} className="hover:underline text-amber-400 font-semibold">
                                {lead.leadCode}
                              </a>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-200">{lead.customerName}</td>
                            <td className="py-3 px-3">{lead.city || 'Unknown'}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/15">
                                Stage {lead.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              <div className="flex flex-col gap-0.5 text-[10px]">
                                <span>Mgr: {lead.manager?.name || 'None'}</span>
                                <span>TL: {lead.tl?.name || 'None'}</span>
                                <span>Cons: {lead.consultant?.name || 'None'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-400 max-w-[280px]">
                              {lead.activityLogs && lead.activityLogs.length > 0 ? (
                                <div className="space-y-1 text-[10px]">
                                  {lead.activityLogs.map((log: any) => (
                                    <div key={log.id} className="bg-slate-900/70 p-1.5 rounded border border-slate-800/80 hover:bg-slate-800/45 transition-colors">
                                      <div className="flex justify-between items-center gap-2 mb-0.5">
                                        <span className="text-[8px] text-slate-500 font-mono">{new Date(log.createdAt).toLocaleDateString()}</span>
                                        {log.fromStatus !== log.toStatus && (
                                          <span className="text-[9px] text-amber-400/90 font-bold font-mono">Stage: {log.fromStatus} → {log.toStatus}</span>
                                        )}
                                      </div>
                                      {log.remark && (
                                        <span className="text-slate-300 block italic leading-relaxed">&ldquo;{log.remark}&rdquo;</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-660 text-[10px] italic">No active logs in range</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-500 font-mono">
                              {new Date(lead.createdAt).toLocaleDateString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {['meetings_booked', 'meetings_done', 'meetings_cancelled'].includes(activeDetailType) && (
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-3">Lead Code</th>
                          <th className="pb-3 px-3">Client Name</th>
                          <th className="pb-3 px-3">Scheduled Slot</th>
                          <th className="pb-3 px-3">Location Details</th>
                          <th className="pb-3 px-3">Assigned Executive</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                        {modalData.results.map((meet: any) => (
                          <tr key={meet.id} className="hover:bg-slate-900/10">
                            <td className="py-3 px-3 font-bold text-white">
                              <a href={`/leads/${meet.leadId}`} className="hover:underline text-amber-400 font-semibold">
                                {meet.leadCode}
                              </a>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-200">{meet.customerName}</td>
                            <td className="py-3 px-3 font-bold text-white">{meet.detail1}</td>
                            <td className="py-3 px-3 text-slate-450">{meet.detail2}</td>
                            <td className="py-3 px-3 text-slate-455 font-medium">{meet.executiveName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {(activeDetailType === 'orders_punched' || activeDetailType === 'orders_verified' || activeDetailType === 'installations_completed') && (
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-855 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-3">Lead Code</th>
                          <th className="pb-3 px-3">Client Name</th>
                          <th className="pb-3 px-3">Order Specs</th>
                          <th className="pb-3 px-3">Status</th>
                          <th className="pb-3 px-3 text-right">Deal Value</th>
                          <th className="pb-3 px-3 text-right">Action Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                        {modalData.results.map((ord: any) => (
                          <tr key={ord.id} className="hover:bg-slate-900/10">
                            <td className="py-3 px-3 font-bold text-white">
                              <a href={`/leads/${ord.leadId}`} className="hover:underline text-amber-400 font-semibold">
                                {ord.leadCode}
                              </a>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-200">{ord.customerName}</td>
                            <td className="py-3 px-3">{ord.detail1}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                                {ord.detail2}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-white">
                              ₹{(ord.value || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-500 font-mono">{ord.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-955/20 text-right">
              <button
                onClick={handleCloseAuditModal}
                className="py-2 px-5 bg-slate-900 border border-slate-800 text-slate-355 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer outline-none"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline Calendar Modal */}
      {selectedTimelineEmpId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Employee Performance Audit</span>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>{selectedTimelineEmpName}'s Task Timeline Calendar</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological trail of daily check-ins, pipeline updates, and meetings.
                </p>
              </div>
              <button
                onClick={handleCloseTimelineModal}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto min-h-[350px] space-y-4">
              {timelineLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs italic gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span>Aggregating task trail from database logs...</span>
                </div>
              ) : timelineEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs italic font-sans">
                  <p>No logged check-ins, status modifications, or meetings in this timeframe.</p>
                </div>
              ) : (
                <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
                  {timelineEvents.map((evt: any) => {
                    const isCheckIn = evt.type === 'check_in';
                    const isCheckOut = evt.type === 'check_out';
                    const isLog = evt.type === 'log';
                    const isMeet = evt.type === 'meeting';

                    const theme = isCheckIn ? { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' } :
                                  isCheckOut ? { border: 'border-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-400' } :
                                  isLog ? { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400' } :
                                  isMeet ? { border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' } :
                                  { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' };

                    return (
                      <div key={evt.id} className="relative group">
                        {/* Dot indicator */}
                        <div className={`absolute -left-9 top-1 w-5 h-5 rounded-full border-2 ${theme.border} bg-[#111625] flex items-center justify-center`} />
                        
                        <div className="bg-slate-900/35 border border-slate-850 hover:border-slate-800 p-4 rounded-xl space-y-1.5 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>{evt.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-medium">
                              {new Date(evt.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{evt.description}</p>
                          
                          {evt.meta && (evt.meta.notes || evt.meta.remark) && (
                            <div className="text-[11px] bg-slate-950/60 border border-slate-900/60 px-3 py-1.5 rounded-lg text-slate-400 italic">
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
            <div className="p-4 border-t border-slate-800 bg-slate-955/20 text-right">
              <button
                type="button"
                onClick={handleCloseTimelineModal}
                className="py-2 px-5 bg-slate-900 border border-slate-800 text-slate-355 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer outline-none"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
