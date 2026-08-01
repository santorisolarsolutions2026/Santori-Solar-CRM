'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  ShieldCheck, 
  Search, 
  Sparkles, 
  Calendar, 
  GitFork, 
  ArrowRight,
  ChevronRight, 
  X
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { useAuth } from '@/context/AuthContext';

interface LeaderboardUser {
  id: number;
  name: string;
  email: string;
  role: string;
  photograph: string | null;
  designation: string;
  department: string;
  teamSize: number;
  primaryWorkValue: number;
  primaryMetricLabel: string;
  breakdown: {
    salesClosed: number;
    meetingsConducted: number;
    meetingsBooked: number;
    leadsWorked: number;
    ordersPunched: number;
    financeVerified: number;
    ledgerActivities: number;
    deliveriesCompleted: number;
    installationsCompleted: number;
    opsMilestones: number;
  };
}

interface DesignationOption {
  id: number;
  name: string;
}

export default function StandingsAndAuditPage() {
  const { user } = useAuth();

  // Active view tab: 'standings' | 'audit'
  const [activeTab, setActiveTab] = useState<'standings' | 'audit'>('standings');

  // --- STANDINGS STATES ---
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [standingsDept, setStandingsDept] = useState<'all' | 'sales' | 'finance' | 'operations'>('all');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('auto');
  const [standingsSearch, setStandingsSearch] = useState('');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [designationsList, setDesignationsList] = useState<DesignationOption[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);

  // --- AUDIT STATES ---
  const [auditDeptTab, setAuditDeptTab] = useState<'Sales' | 'Finance' | 'Operations' | 'Other'>('Sales');
  const [auditDesignation, setAuditDesignation] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterStartTime, setFilterStartTime] = useState<string>('00:00');
  const [filterEndTime, setFilterEndTime] = useState<string>('23:59');
  const [auditData, setAuditData] = useState<{ departments: Record<string, any[]>; designations?: string[] } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // --- AUDIT MODAL STATES ---
  const [selectedAuditEmpId, setSelectedAuditEmpId] = useState<number | null>(null);
  const [selectedAuditEmpName, setSelectedAuditEmpName] = useState<string>('');
  const [activeDetailType, setActiveDetailType] = useState<string>('leads_worked');
  const [modalData, setModalData] = useState<{ employee: any; results: any[]; teamSize?: number } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Timeline calendar modal states
  const [selectedTimelineEmpId, setSelectedTimelineEmpId] = useState<number | null>(null);
  const [selectedTimelineEmpName, setSelectedTimelineEmpName] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Hierarchy modal states
  const [hierarchyModalData, setHierarchyModalData] = useState<any>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);

  // Fetch Leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setStandingsLoading(true);
      try {
        let url = `/api/v1/leaderboard?timeframe=${timeframe}&department=${standingsDept}&designation=${encodeURIComponent(selectedDesignation)}&metric=${selectedMetric}`;
        const res = await fetch(url);
        const result = await res.json();
        if (result.success) {
          setLeaderboardData(result.data || []);
          if (result.designations) {
            setDesignationsList(result.designations);
          }
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setStandingsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe, standingsDept, selectedDesignation, selectedMetric]);

  // Fetch Employee Audit Data
  const fetchAuditData = async () => {
    setAuditLoading(true);
    try {
      let url = `/api/v1/reports/employee-audit?designation=${encodeURIComponent(auditDesignation)}`;
      if (filterStartDate && filterEndDate) {
        url += `&startDate=${filterStartDate}&endDate=${filterEndDate}&startTime=${filterStartTime}&endTime=${filterEndTime}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAuditData(data);
      }
    } catch (err) {
      console.error('Failed to fetch employee audit data:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [auditDesignation, filterStartDate, filterEndDate, filterStartTime, filterEndTime]);

  // Fetch Audit Metric Detail Modal Data
  useEffect(() => {
    if (!selectedAuditEmpId) return;

    const fetchDetailModal = async () => {
      setModalLoading(true);
      try {
        let url = `/api/v1/reports/employee-audit/detail?userId=${selectedAuditEmpId}&type=${activeDetailType}`;
        if (filterStartDate && filterEndDate) {
          url += `&startDate=${filterStartDate}&endDate=${filterEndDate}&startTime=${filterStartTime}&endTime=${filterEndTime}`;
        }
        const res = await fetch(url);
        const result = await res.json();
        if (result.success) {
          setModalData(result.data);
        } else {
          setModalData(null);
        }
      } catch (err) {
        console.error('Failed to fetch audit details:', err);
        setModalData(null);
      } finally {
        setModalLoading(false);
      }
    };

    fetchDetailModal();
  }, [selectedAuditEmpId, activeDetailType, filterStartDate, filterEndDate, filterStartTime, filterEndTime]);

  // Fetch Timeline Data
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

  useEffect(() => {
    if (selectedTimelineEmpId !== null) {
      fetchTimelineData(selectedTimelineEmpId);
    }
  }, [selectedTimelineEmpId]);

  // Fetch Hierarchy Modal Data
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

  // Switch to Audit tab with specific employee pre-selected
  const jumpToEmployeeAudit = (empId: number, empName: string) => {
    setSelectedAuditEmpId(empId);
    setSelectedAuditEmpName(empName);
    setActiveTab('audit');
  };

  // Filter Standings data
  const filteredStandings = leaderboardData.filter((userItem) => {
    const term = standingsSearch.toLowerCase();
    return (
      userItem.name.toLowerCase().includes(term) ||
      userItem.role.toLowerCase().includes(term) ||
      userItem.designation.toLowerCase().includes(term) ||
      userItem.email.toLowerCase().includes(term)
    );
  });

  const top3 = filteredStandings.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-300 p-4 md:p-8 space-y-8 font-sans">
      
      {/* Dynamic Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#0d121f] to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Unified Performance & Audit Command Hub
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Santori Standings & Employee Audit
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Interconnected real-time performance rankings and granular daily work activity audit trails for all team members across departments.
            </p>
          </div>

          {/* Unified Interconnected Tab Switcher */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shadow-xl self-stretch sm:self-auto">
            <button
              onClick={() => setActiveTab('standings')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'standings'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Santori Standings</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'audit'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Employee Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SANTORI STANDINGS LEADERBOARD                                      */}
      {/* ========================================================================= */}
      {activeTab === 'standings' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Standings Controls & Filters */}
          <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              {/* Timeframe selector */}
              <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                {(['week', 'month', 'all'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`py-2 px-4 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                      timeframe === t
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t === 'week' ? 'Weekly' : t === 'month' ? 'Monthly' : 'All-Time'}
                  </button>
                ))}
              </div>

              {/* Department Selector */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {(['all', 'sales', 'finance', 'operations'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setStandingsDept(d);
                      setSelectedDesignation('all');
                    }}
                    className={`py-1.5 px-4 text-xs font-bold border rounded-full uppercase tracking-wider transition-all cursor-pointer ${
                      standingsDept === d
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {d === 'all' ? 'All Depts' : d}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search team member..."
                  value={standingsSearch}
                  onChange={(e) => setStandingsSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Sub-Filters: Designation & Metric */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Designation:</span>
                <div className="w-44">
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Designations' },
                      ...designationsList.map(d => ({ value: d.name, label: d.name }))
                    ]}
                    value={selectedDesignation}
                    onChange={(val) => setSelectedDesignation(val)}
                    placeholder="All Designations"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metric Focus:</span>
                <div className="w-48">
                  <CustomSelect
                    options={[
                      { value: 'auto', label: 'Auto (Dept Recommended)' },
                      { value: 'salesClosed', label: 'Sales Closed' },
                      { value: 'meetingsConducted', label: 'Meetings Conducted' },
                      { value: 'ordersVerified', label: 'Orders Verified' },
                      { value: 'opsMilestones', label: 'Operations Milestones' }
                    ]}
                    value={selectedMetric}
                    onChange={(val) => setSelectedMetric(val)}
                    placeholder="Select Metric"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top 3 Performers Podium Spotlight */}
          {!standingsLoading && top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {top3.map((u, idx) => {
                const rank = idx + 1;
                const isFirst = rank === 1;
                const borderStyle = isFirst
                  ? 'border-yellow-500/40 bg-gradient-to-b from-yellow-500/10 via-[#111625] to-[#111625] shadow-yellow-500/5'
                  : rank === 2
                  ? 'border-slate-400/40 bg-gradient-to-b from-slate-400/10 via-[#111625] to-[#111625]'
                  : 'border-amber-600/40 bg-gradient-to-b from-amber-600/10 via-[#111625] to-[#111625]';

                const trophyBg = isFirst ? 'bg-yellow-500/20 text-yellow-400' : rank === 2 ? 'bg-slate-400/20 text-slate-300' : 'bg-amber-600/20 text-amber-500';

                return (
                  <div key={u.id} className={`relative rounded-3xl border ${borderStyle} p-6 shadow-2xl space-y-4 overflow-hidden flex flex-col justify-between`}>
                    <div className="flex items-center justify-between">
                      <span className={`w-8 h-8 rounded-xl ${trophyBg} font-extrabold flex items-center justify-center text-sm shadow-md`}>
                        #{rank}
                      </span>
                      <Trophy className={`w-6 h-6 ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : 'text-amber-500'}`} />
                    </div>

                    <div className="flex items-center gap-4">
                      {u.photograph ? (
                        <img src={u.photograph} alt={u.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md" />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl shadow-md">
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-base font-bold text-white tracking-wide">{u.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{u.designation || u.role}</p>
                        <p className="text-[10px] text-blue-400 uppercase font-mono tracking-wider mt-0.5">{u.department}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold">{u.primaryMetricLabel}</span>
                      <span className="text-xl font-extrabold text-white font-mono">{u.primaryWorkValue}</span>
                    </div>

                    {/* Interconnected Action Button */}
                    <button
                      onClick={() => jumpToEmployeeAudit(u.id, u.name)}
                      className="w-full py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 group"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Audit Employee Work Trail</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Standings Leaderboard Table */}
          <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Trophy className="w-5 h-5 text-blue-400" />
              Comprehensive Team Standings Roster
            </h3>

            {standingsLoading ? (
              <div className="p-12 text-center text-slate-400 animate-pulse">Loading standings leaderboard...</div>
            ) : filteredStandings.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No team members match the selected standings filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-extrabold bg-slate-950/50">
                      <th className="py-3.5 px-4">Rank</th>
                      <th className="py-3.5 px-4">Team Member</th>
                      <th className="py-3.5 px-4">Department & Designation</th>
                      <th className="py-3.5 px-4 text-center">Primary Score</th>
                      <th className="py-3.5 px-4 text-center">Work Breakdown</th>
                      <th className="py-3.5 px-4 text-right">Interconnected Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredStandings.map((u, index) => {
                      const rank = index + 1;
                      return (
                        <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-slate-300">
                            #{rank}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {u.photograph ? (
                                <img src={u.photograph} alt={u.name} className="w-9 h-9 rounded-xl object-cover border border-slate-700" />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                                  {u.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <span className="text-white font-bold block">{u.name}</span>
                                <span className="text-[11px] text-slate-500">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-slate-300 font-semibold block">{u.designation || u.role}</span>
                            <span className="text-[10px] text-blue-400 font-mono uppercase">{u.department}</span>
                          </td>
                          <td className="py-4 px-4 text-center font-mono font-extrabold text-sm text-white">
                            <div>{u.primaryWorkValue}</div>
                            <span className="text-[9px] text-slate-500 uppercase font-sans">{u.primaryMetricLabel}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {u.breakdown?.salesClosed > 0 && (
                                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                                  {u.breakdown.salesClosed} Sales
                                </span>
                              )}
                              {u.breakdown?.meetingsConducted > 0 && (
                                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded text-[10px] font-bold">
                                  {u.breakdown.meetingsConducted} Meetings
                                </span>
                              )}
                              {u.breakdown?.ordersPunched > 0 && (
                                <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded text-[10px] font-bold">
                                  {u.breakdown.ordersPunched} Orders
                                </span>
                              )}
                              {u.breakdown?.financeVerified > 0 && (
                                <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded text-[10px] font-bold">
                                  {u.breakdown.financeVerified} Verified
                                </span>
                              )}
                              {u.breakdown?.installationsCompleted > 0 && (
                                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[10px] font-bold">
                                  {u.breakdown.installationsCompleted} Installs
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => jumpToEmployeeAudit(u.id, u.name)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-blue-400 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Audit Logs</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMPLOYEE AUDIT TRAIL                                               */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-8 animate-fade-in">

          {/* Audit Controls & Date Filters */}
          <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              
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
                    value={auditDesignation}
                    onChange={(val) => setAuditDesignation(val)}
                    placeholder="All Designations"
                  />
                </div>
              </div>

              {/* Date Filters */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">Start:</span>
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

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">End:</span>
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

                {(filterStartDate || filterEndDate || auditDesignation !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterStartTime('00:00');
                      setFilterEndTime('23:59');
                      setAuditDesignation('all');
                    }}
                    className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer text-xs font-bold"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Employee Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter audit logs..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Department Tab Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto whitespace-nowrap scrollbar-none">
              {(['Sales', 'Finance', 'Operations', 'Other'] as const).map((dept) => {
                const isActive = auditDeptTab === dept;
                const count = auditData?.departments?.[dept]?.length || 0;
                return (
                  <button
                    key={dept}
                    onClick={() => setAuditDeptTab(dept)}
                    className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span>{dept} Department</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Employee Audit Cards */}
          <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                {auditDeptTab} Department Audit Trail Roster
              </h3>
            </div>

            {auditLoading ? (
              <div className="p-12 text-center text-slate-400 animate-pulse">Loading employee audit records...</div>
            ) : (() => {
              const employeesList = (auditData?.departments?.[auditDeptTab] || []).filter((emp) => {
                if (!auditSearchQuery) return true;
                const q = auditSearchQuery.toLowerCase();
                return (
                  emp.name.toLowerCase().includes(q) ||
                  emp.email.toLowerCase().includes(q) ||
                  (emp.designation && emp.designation.toLowerCase().includes(q))
                );
              });

              if (employeesList.length === 0) {
                return <div className="p-12 text-center text-slate-500">No audit records found matching your filters.</div>;
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {employeesList.map((emp: any) => (
                    <div key={emp.id} className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 transition-all">
                      
                      {/* Employee Info Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {emp.photograph ? (
                            <img src={emp.photograph} alt={emp.name} className="w-11 h-11 rounded-xl object-cover border border-slate-700" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 font-bold">
                              {emp.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-white">{emp.name}</h4>
                            <p className="text-[11px] text-slate-400">{emp.designation || emp.role}</p>
                            <p className="text-[10px] text-blue-400 font-mono">{emp.email}</p>
                          </div>
                        </div>

                        {emp.teamSize > 0 && (
                          <button
                            onClick={() => handleOpenHierarchyModal(emp.id)}
                            className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold hover:bg-indigo-500/20 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <GitFork className="w-3 h-3" />
                            <span>{emp.teamSize} Team</span>
                          </button>
                        )}
                      </div>

                      {/* Work Metric Badges (Clickable for Details) */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                        {emp.leadsWorked !== undefined && (
                          <button
                            onClick={() => {
                              setSelectedAuditEmpId(emp.id);
                              setSelectedAuditEmpName(emp.name);
                              setActiveDetailType('leads_worked');
                            }}
                            className="p-2.5 bg-slate-900 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/30 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className="text-slate-400 text-[11px]">Leads Worked</span>
                            <span className="font-mono text-white font-bold">{emp.leadsWorked}</span>
                          </button>
                        )}

                        {emp.meetingsBooked !== undefined && (
                          <button
                            onClick={() => {
                              setSelectedAuditEmpId(emp.id);
                              setSelectedAuditEmpName(emp.name);
                              setActiveDetailType('meetings_booked');
                            }}
                            className="p-2.5 bg-slate-900 hover:bg-cyan-600/10 border border-slate-800 hover:border-cyan-500/30 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className="text-slate-400 text-[11px]">Meetings Booked</span>
                            <span className="font-mono text-cyan-400 font-bold">{emp.meetingsBooked}</span>
                          </button>
                        )}

                        {emp.meetingsConducted !== undefined && (
                          <button
                            onClick={() => {
                              setSelectedAuditEmpId(emp.id);
                              setSelectedAuditEmpName(emp.name);
                              setActiveDetailType('meetings_done');
                            }}
                            className="p-2.5 bg-slate-900 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/30 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className="text-slate-400 text-[11px]">Meetings Done</span>
                            <span className="font-mono text-blue-400 font-bold">{emp.meetingsConducted}</span>
                          </button>
                        )}

                        {emp.ordersPunched !== undefined && (
                          <button
                            onClick={() => {
                              setSelectedAuditEmpId(emp.id);
                              setSelectedAuditEmpName(emp.name);
                              setActiveDetailType('orders_punched');
                            }}
                            className="p-2.5 bg-slate-900 hover:bg-purple-600/10 border border-slate-800 hover:border-purple-500/30 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className="text-slate-400 text-[11px]">Orders Punched</span>
                            <span className="font-mono text-purple-400 font-bold">{emp.ordersPunched}</span>
                          </button>
                        )}

                        {emp.financeVerified !== undefined && (
                          <button
                            onClick={() => {
                              setSelectedAuditEmpId(emp.id);
                              setSelectedAuditEmpName(emp.name);
                              setActiveDetailType('finance_verified');
                            }}
                            className="p-2.5 bg-slate-900 hover:bg-emerald-600/10 border border-slate-800 hover:border-emerald-500/30 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className="text-slate-400 text-[11px]">Finance Verified</span>
                            <span className="font-mono text-emerald-400 font-bold">{emp.financeVerified}</span>
                          </button>
                        )}

                        {emp.installationsCompleted !== undefined && (
                          <button
                            onClick={() => {
                              setSelectedAuditEmpId(emp.id);
                              setSelectedAuditEmpName(emp.name);
                              setActiveDetailType('installations');
                            }}
                            className="p-2.5 bg-slate-900 hover:bg-amber-600/10 border border-slate-800 hover:border-amber-500/30 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className="text-slate-400 text-[11px]">Installs Completed</span>
                            <span className="font-mono text-amber-400 font-bold">{emp.installationsCompleted}</span>
                          </button>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => {
                            setSelectedTimelineEmpId(emp.id);
                            setSelectedTimelineEmpName(emp.name);
                          }}
                          className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>Audit Timeline</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('standings')}
                          className="py-2 px-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="View Standing Rank"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT METRIC DETAIL MODAL                                                 */}
      {/* ========================================================================= */}
      {selectedAuditEmpId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1422] border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Audit Breakdown: {selectedAuditEmpName}
                </h3>
                <p className="text-xs text-slate-400 uppercase font-mono tracking-wider mt-0.5">
                  Category: {activeDetailType.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditEmpId(null)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {modalLoading ? (
                <div className="p-8 text-center text-slate-400 animate-pulse">Fetching detailed activity audit...</div>
              ) : !modalData || !modalData.results || modalData.results.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No activity records found for this metric filter.</div>
              ) : (
                <div className="space-y-3">
                  {modalData.results.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-white font-bold text-sm block">{item.customerName || item.title || item.leadName || `Record #${item.id}`}</span>
                        {item.phone && <p className="text-slate-400">Phone: {item.phone}</p>}
                        {item.status && <p className="text-blue-400 font-semibold">Status: {item.status}</p>}
                        {item.createdAt && <p className="text-[10px] text-slate-500 font-mono">Date: {new Date(item.createdAt).toLocaleString()}</p>}
                      </div>
                      {item.leadId && (
                        <Link
                          href={`/leads/${item.leadId}`}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all cursor-pointer shrink-0 text-xs flex items-center gap-1.5"
                        >
                          <span>Open Lead</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIMELINE CALENDAR MODAL                                                   */}
      {/* ========================================================================= */}
      {selectedTimelineEmpId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1422] border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Chronological Audit Timeline: {selectedTimelineEmpName}
                </h3>
                <p className="text-xs text-slate-400">Detailed timestamped work activity log</p>
              </div>
              <button
                onClick={() => setSelectedTimelineEmpId(null)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {timelineLoading ? (
                <div className="p-8 text-center text-slate-400 animate-pulse">Loading timeline events...</div>
              ) : timelineEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No activity timeline events found for this timeframe.</div>
              ) : (
                <div className="relative border-l-2 border-slate-800 pl-6 space-y-6 ml-3">
                  {timelineEvents.map((evt: any, idx: number) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-4 border-[#0f1422]" />
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 text-xs">
                        <span className="text-blue-400 font-mono text-[10px] block font-bold">{new Date(evt.timestamp || evt.createdAt).toLocaleString()}</span>
                        <h5 className="text-white font-bold text-sm">{evt.action || evt.title || 'Work Activity'}</h5>
                        <p className="text-slate-300">{evt.details || evt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIERARCHY TREE MODAL                                                      */}
      {/* ========================================================================= */}
      {hierarchyModalData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1422] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GitFork className="w-5 h-5 text-indigo-400" />
                Team Organizational Hierarchy Scope
              </h3>
              <button
                onClick={() => setHierarchyModalData(null)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {hierarchyLoading ? (
                <div className="p-8 text-center text-slate-400 animate-pulse">Loading hierarchy tree...</div>
              ) : (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                  {JSON.stringify(hierarchyModalData, null, 2)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
