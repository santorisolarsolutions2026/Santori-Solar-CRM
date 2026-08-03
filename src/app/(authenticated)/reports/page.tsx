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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];

export default function ReportsPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <Sun className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
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
          <p className="text-xs text-slate-400 mt-1">
            Inspect staff performance metrics, activity logs, and detailed work audit trails.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export to Excel (CSV)</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Print Audit (PDF)</span>
          </button>
        </div>
      </div>

      {/* Employee Audit Dashboard */}
      <div className="space-y-6">
          {/* Filter Bar with Date Inputs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-md">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Employee Audit filters</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select a date range to filter contributions across all departments.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Designation Filter */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Designation:</span>
                <div className="w-48">
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

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Start:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg focus:ring-blue-500 focus:outline-none cursor-pointer"
                />
                <input
                  type="time"
                  value={filterStartTime}
                  onChange={(e) => setFilterStartTime(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1.5 rounded-lg focus:ring-blue-500 focus:outline-none cursor-pointer font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">End:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg focus:ring-blue-500 focus:outline-none cursor-pointer"
                />
                <input
                  type="time"
                  value={filterEndTime}
                  onChange={(e) => setFilterEndTime(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1.5 rounded-lg focus:ring-blue-500 focus:outline-none cursor-pointer font-mono"
                />
              </div>
              {(filterStartDate || filterEndDate || filterDesignation !== 'all') && (
                <button
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterStartTime('00:00');
                    setFilterEndTime('23:59');
                    setFilterDesignation('all');
                  }}
                  className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Department Tab Buttons */}
          <div className="flex gap-2 border-b border-slate-800 bg-slate-955/20 p-1.5 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none">
            {(['Sales', 'Finance', 'Operations', 'Other'] as const).map((dept) => {
              const isActive = activeDeptTab === (dept as any);
              const count = auditData?.departments?.[dept]?.length || 0;
              return (
                <button
                  key={dept}
                  onClick={() => setActiveDeptTab(dept as any)}
                  className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-650 text-slate-955 font-extrabold shadow-md'
                      : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
                  }`}
                >
                  <span>{dept} Department</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    isActive ? 'bg-slate-955/20 text-slate-955' : 'bg-slate-900 text-slate-455'
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
                  activeDeptTab === 'Sales' ? 'bg-cyan-500' :
                  activeDeptTab === 'Finance' ? 'bg-emerald-500' :
                  activeDeptTab === 'Operations' ? 'bg-purple-500' : 'bg-blue-600'
                }`} />
                <span>{activeDeptTab} Staff Performance & Audit List</span>
              </h3>
              {auditLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-455 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Syncing metrics...</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              {(() => {
                const employeesList = auditData?.departments?.[activeDeptTab] || [];
                if (employeesList.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500 text-xs italic">
                      No active members found in {activeDeptTab} department for this timeframe.
                    </div>
                  );
                }

                if (activeDeptTab === 'Sales' || activeDeptTab === 'PSA') {
                  return (
                    <table className="w-full text-left border-collapse min-w-[950px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-4 text-left">Employee Name</th>
                          <th className="pb-3 px-4 text-left">Designation</th>
                          <th className="pb-3 px-4 text-center">Team Members</th>
                          <th className="pb-3 px-4 text-center">Leads Worked</th>
                          <th className="pb-3 px-4 text-center">Meetings Booked</th>
                          <th className="pb-3 px-4 text-center">Meetings Recorded</th>
                          <th className="pb-3 px-4 text-center">Meetings Cancelled</th>
                          <th className="pb-3 px-4 text-center">Sales Done</th>
                          <th className="pb-3 px-4 text-center">Orders Punched</th>
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
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-blue-600 dark:text-blue-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium ml-auto"
                                title="View Daily Activity Timeline"
                              >
                                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center font-extrabold font-mono text-blue-600 dark:text-blue-400">
                              {emp.teamSize || 1}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'leads_worked')}
                                className="font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-600 dark:text-blue-400 hover:underline outline-none cursor-pointer"
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
                                {emp.metrics.meetingsCancelled || 0} <span className="text-[10px] font-normal text-slate-500">({emp.metrics.cancellationRate || 0}%)</span>
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenDetailsModal(emp.id, 'sales_done')}
                                className="font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.salesDone || 0} <span className="text-[10px] font-normal text-slate-500">({emp.metrics.saleConversionRate || 0}%)</span>
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
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-4 text-left">Employee Name</th>
                          <th className="pb-3 px-4 text-left">Designation</th>
                          <th className="pb-3 px-4 text-center">Team Members</th>
                          <th className="pb-3 px-4 text-center">Orders Verified</th>
                          <th className="pb-3 px-4 text-center">Ledger Activities</th>
                          <th className="pb-3 px-4 text-center">Payments Handled</th>
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
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-blue-600 dark:text-blue-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium ml-auto"
                              >
                                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center font-extrabold font-mono text-blue-600 dark:text-blue-400">
                              {emp.teamSize || 1}
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
                                className="font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-600 dark:text-blue-400 hover:underline outline-none cursor-pointer"
                              >
                                {emp.metrics.ledgerActivities}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center font-extrabold text-slate-200">
                              ₹{(emp.metrics.paymentsAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-slate-200 font-mono">
                              ₹{(emp.metrics.ordersVerifiedValue || 0).toLocaleString('en-IN')}
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
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-4 text-left">Employee Name</th>
                          <th className="pb-3 px-4 text-left">Designation</th>
                          <th className="pb-3 px-4 text-center">Team Members</th>
                          <th className="pb-3 px-4 text-center">Deliveries</th>
                          <th className="pb-3 px-4 text-center">Installations</th>
                          <th className="pb-3 px-4 text-center">Plants Commissioned</th>
                          <th className="pb-3 px-4 text-center">Subsidies Applied</th>
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
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-blue-600 dark:text-blue-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium ml-auto"
                              >
                                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Timeline
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                            <td className="py-3.5 px-4 text-center font-extrabold font-mono text-blue-600 dark:text-blue-400">
                              {emp.teamSize || 1}
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
                                className="font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-600 dark:text-blue-400 hover:underline outline-none cursor-pointer"
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
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="pb-3 px-4 text-left">Employee Name</th>
                        <th className="pb-3 px-4 text-left">Designation</th>
                        <th className="pb-3 px-4 text-center">Team Members</th>
                        <th className="pb-3 px-4 text-center">Leads Worked</th>
                        <th className="pb-3 px-4 text-center">Actions Logged</th>
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
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-blue-600 dark:text-blue-400 transition-all cursor-pointer font-sans text-[10px] flex items-center gap-1 shrink-0 font-medium ml-auto"
                            >
                              <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Timeline
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-medium text-xs">{emp.designation}</td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenHierarchyModal(emp.id)}
                              className="font-extrabold font-mono text-blue-600 dark:text-blue-400 hover:underline outline-none cursor-pointer"
                            >
                              {emp.teamSize || 1}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenDetailsModal(emp.id, 'leads_worked')}
                              className="font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-600 dark:text-blue-400 hover:underline outline-none cursor-pointer"
                            >
                              {emp.metrics.leadsWorked}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-slate-200">
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
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Detailed Activity Trail</span>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>{modalData?.employee?.name || 'Loading Employee...'}</span>
                  {modalData?.employee && (
                    <span className="text-[10px] bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400 font-mono">
                      {modalData.employee.designation?.name || modalData.employee.role.toUpperCase()} ({modalData.employee.department?.name || 'Sales'})
                    </span>
                  )}
                  {modalData?.teamSize && modalData.teamSize > 1 && (
                    <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-mono">
                      Hierarchy Team ({modalData.teamSize} members)
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Drilldown Line Items for: <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">{activeDetailType.replace('_', ' ')}</span>
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
            <div className="p-6 flex-1 overflow-y-auto min-h-[400px]">
              {modalData?.results && modalData.results.length > 0 && (
                <div className="mb-6 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by Lead Name, ID, or Details..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
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
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs italic gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                      <span>Fetching activity details across team hierarchy...</span>
                    </div>
                  );
                }

                if (!modalData || filteredResults.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs italic">
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
                        <div key={group.leadId} className="border border-slate-800 rounded-xl overflow-hidden bg-[#141a2a]">
                          <button
                            onClick={() => setExpandedLeadIds(prev => ({ ...prev, [group.leadId]: !prev[group.leadId] }))}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors text-left border-b border-transparent focus:outline-none"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                                <span className="text-blue-400 font-bold text-xs">{group.logs.length}</span>
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-sm tracking-wide">{group.customerName || `Lead #${group.leadCode}`}</h4>
                                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">#{group.leadCode}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800/60">
                              <span className="text-[10px] font-mono font-medium">{group.logs.length} Actions</span>
                              {expandedLeadIds[group.leadId] ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>
                          
                          {expandedLeadIds[group.leadId] && (
                            <div className="border-t border-slate-800 bg-slate-950/40 p-5 shadow-inner">
                              <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
                                {group.logs.map((log: any) => (
                                  <div key={log.id} className="relative group">
                                    <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-[3px] border-blue-500/80 bg-slate-950 ring-4 ring-slate-950 shadow-sm" />
                                    <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 hover:border-slate-700 transition-colors">
                                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-bold text-blue-400/90 tracking-wide uppercase">{log.detail1}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                          {log.date || new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{log.detail2}</p>
                                      {log.executedBy && (
                                        <div className="mt-2 text-[10px] bg-slate-950 border border-slate-850 px-2 py-1 rounded inline-flex items-center gap-1">
                                          <span className="text-slate-500">Executed by:</span> <span className="text-white font-medium">{log.executedBy.name}</span>
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
                  <div className="overflow-x-auto bg-[#141a2a] rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
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
                      <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                        {filteredResults.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-900/80 transition-colors group">
                            <td className="py-3.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                              {item.date || new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.executedBy ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{item.executedBy.name}</span>
                                  <span className="text-[9px] text-blue-500/70 font-mono mt-0.5">{item.executedBy.designation}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">Self</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.leadId ? (
                                <a href={`/leads/${item.leadId}`} className="hover:underline text-blue-500 font-bold block transition-colors">
                                  {item.customerName || `Lead #${item.leadCode}`}
                                </a>
                              ) : (
                                <span className="text-slate-400 font-medium">{item.customerName || '-'}</span>
                              )}
                              {item.leadCode && <span className="text-[9px] text-slate-500 font-mono block mt-0.5">#{item.leadCode}</span>}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-200">
                              {item.detail1}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 max-w-[280px] leading-relaxed">
                              {item.detail2}
                            </td>
                            {modalData.results.some((r: any) => r.value !== undefined) && (
                              <td className="py-3.5 px-4 text-right font-extrabold text-white font-mono bg-slate-900/20">
                                {item.value ? `₹${item.value.toLocaleString('en-IN')}` : '-'}
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
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
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
                                  isLog ? { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' } :
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

      {/* Team Hierarchy Modal */}
      {hierarchyModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Organizational Structure</span>
                <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>Team Hierarchy</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  View the direct and indirect reporting structure.
                </p>
              </div>
              <button
                onClick={() => setHierarchyModalData(null)}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
              {hierarchyLoading || hierarchyModalData.loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs italic gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Loading hierarchy tree...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Recursive component to render tree */}
                  {(() => {
                    const renderNode = (node: any, level: number = 0) => {
                      return (
                        <div key={node.id} className={`pl-${level === 0 ? '0' : '6'} border-l ${level === 0 ? 'border-transparent' : 'border-slate-800'} mt-2`}>
                          <div className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl relative">
                            {level > 0 && <div className="absolute -left-6 top-1/2 w-6 border-t border-slate-800"></div>}
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                              <Users className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold text-sm truncate">{node.name}</h4>
                              <p className="text-[10px] text-slate-500 font-mono truncate">{node.designation} • {node.department}</p>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
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
            <div className="p-4 border-t border-slate-800 bg-slate-955/20 text-right">
              <button
                onClick={() => setHierarchyModalData(null)}
                className="py-2 px-5 bg-slate-900 border border-slate-800 text-slate-355 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer outline-none"
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
