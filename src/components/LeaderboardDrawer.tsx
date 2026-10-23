'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  X, 
  Trophy, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Calendar,
  Award,
  Layers,
  Wrench,
  CreditCard,
  PlusCircle,
  Clock,
  Phone,
  FileCheck,
  CheckCircle2,
  Filter
} from 'lucide-react';
import CustomSelect, { SelectOption } from '@/components/CustomSelect';

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

interface LeaderboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeaderboardDrawer({ isOpen, onClose }: LeaderboardDrawerProps) {
  const { user } = useAuth();

  const baseRole = user?.role ? (user.role.includes(':') ? user.role.split(':')[0] : user.role) : '';
  const isSuperUser = baseRole === 'admin' || baseRole === 'director' || user?.department?.name === 'IT';
  
  const allowedDepts = isSuperUser 
    ? (['all', 'sales', 'finance', 'operations'] as const)
    : baseRole === 'finance'
      ? (['finance'] as const)
      : baseRole === 'operations'
        ? (['operations'] as const)
        : (['sales'] as const);

  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [department, setDepartment] = useState<'all' | 'sales' | 'finance' | 'operations'>('all');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('auto');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Sync default department based on user permissions when loaded
  useEffect(() => {
    if (user) {
      const baseRole = user.role.includes(':') ? user.role.split(':')[0] : user.role;
      const isSuperUser = baseRole === 'admin' || baseRole === 'director' || user.department?.name === 'IT';
      if (!isSuperUser) {
        if (baseRole === 'finance') {
          setDepartment('finance');
        } else if (baseRole === 'operations') {
          setDepartment('operations');
        } else {
          setDepartment('sales');
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let url = `/api/v1/leaderboard?timeframe=${timeframe}&department=${department}&designation=${encodeURIComponent(selectedDesignation)}&metric=${selectedMetric}`;
        if (timeframe === 'custom' && startDate && endDate) {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        }
        const res = await fetch(url);
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const result = await res.json();
          if (result.success) {
            setData(result.data);
            if (result.designations) {
              setDesignations(result.designations);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, timeframe, department, selectedDesignation, selectedMetric, startDate, endDate]);

  // Handle click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter local search results
  const filteredData = data.filter((user) => {
    const term = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term) ||
      user.designation.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  const designationOptions: SelectOption[] = [
    { value: 'all', label: 'All Designations' },
    ...designations.map((des) => ({ value: des.name, label: des.name })),
  ];

  const metricOptions: SelectOption[] = [
    { value: 'auto', label: 'Auto (Dept Primary)' },
    { value: 'salesClosed', label: 'Sales Done' },
    { value: 'meetingsConducted', label: 'Meetings Recorded' },
    { value: 'leadsWorked', label: 'Leads Worked' },
    { value: 'ordersVerified', label: 'Orders Verified' },
    { value: 'opsMilestones', label: 'Ops Milestones' },
  ];

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-[#4F7D32]/10 border border-[#4F7D32]/30 text-[#4F7D32] dark:text-[#68A344]',
          trophy: 'text-[#4F7D32] dark:text-[#68A344] filter drop-shadow-[0_0_8px_rgba(79,125,50,0.25)]',
          glow: 'border-[#4F7D32]/20 dark:border-[#4F7D32]/30'
        };
      default:
        return {
          bg: 'bg-[var(--bg-card)]/40 border border-[var(--border-color)] text-[var(--text-secondary)]',
          trophy: null,
          glow: 'border-[var(--border-color)]/40'
        };
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
      <div 
        ref={drawerRef}
        className="w-full max-w-4xl max-h-[88vh] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto text-[var(--text-secondary)]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border-color)] bg-[var(--bg-main)] relative overflow-hidden flex items-center justify-between shrink-0">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#4F7D32]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F7D32] flex items-center justify-center shadow-lg shadow-[#4F7D32]/20 shrink-0">
              <Trophy className="w-5 h-5 font-bold text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-wide flex items-center gap-1.5">
                Santori Standings <Sparkles className="w-4 h-4 text-[#4A943E] animate-pulse" />
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">Actual Work &amp; Performance Standings</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--border-color)]/20 border border-[var(--border-color)] hover:border-[#4F7D32] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            title="Close Standings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Panel */}
        <div className="p-4 sm:p-5 bg-[var(--bg-main)]/60 border-b border-[var(--border-color)] space-y-3 relative z-30 shrink-0">
          {/* Top row: Timeframe + Departments */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Timeframe Selectors */}
            <div className="flex gap-1.5 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] shrink-0">
              {(['week', 'month', 'all', 'custom'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeframe(t)}
                  className={`py-1.5 px-3 text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                    timeframe === t
                      ? 'bg-[#4F7D32] text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t === 'week' ? 'Weekly' : t === 'month' ? 'Monthly' : t === 'all' ? 'All-Time' : 'Custom'}
                </button>
              ))}
            </div>

            {/* Department Selectors */}
            {allowedDepts.length > 1 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                {allowedDepts.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDepartment(d);
                      setSelectedDesignation('all');
                    }}
                    className={`py-1 px-3 text-[10px] font-bold border rounded-full uppercase tracking-wider transition-all cursor-pointer ${
                      department === d
                        ? 'bg-[#4F7D32] text-white border-[#4F7D32]'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#4F7D32]/40 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {d === 'all' ? 'All Departments' : d === 'sales' ? 'Sales' : d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Date Range Picker */}
          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 bg-[var(--bg-card)]/90 p-2 rounded-lg border border-[var(--border-color)] text-xs">
              <div className="flex-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-[#4F7D32] rounded px-2 py-1 text-[var(--text-primary)] text-xs focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-[#4F7D32] rounded px-2 py-1 text-[var(--text-primary)] text-xs focus:outline-none cursor-pointer"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Clear custom dates"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Designation & Primary Metric Filters + Search in wide layout */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 relative z-20 items-end">
            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#4A943E]" /> Designation
              </label>
              <CustomSelect
                value={selectedDesignation}
                onChange={setSelectedDesignation}
                options={designationOptions}
                placeholder="All Designations"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Award className="w-3 h-3 text-[#4A943E]" /> Rank Parameter
              </label>
              <CustomSelect
                value={selectedMetric}
                onChange={setSelectedMetric}
                options={metricOptions}
                placeholder="Auto (Dept Primary)"
              />
            </div>

            <div className="sm:col-span-6">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search team member by name or designation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] focus:border-[#4F7D32] focus:outline-none rounded-lg text-xs text-[var(--text-primary)] placeholder-slate-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Standings List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#4F7D32] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-secondary)] font-semibold tracking-wide">Calculating actual work standings...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl">
              <Award className="w-8 h-8 text-[var(--text-secondary)] mb-2" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">No matching team members found</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Try adjusting your designation or department filter.</p>
            </div>
          ) : (
            filteredData.map((user, index) => {
              const rank = index + 1;
              const badgeStyle = getRankBadgeStyle(rank);
              const isExpanded = expandedUserId === user.id;

              return (
                <div
                  key={user.id}
                  className={`bg-[var(--bg-main)]/40 border border-[var(--border-color)] rounded-xl overflow-hidden transition-all duration-250 hover:border-[#4F7D32]/40 ${badgeStyle.glow} ${
                    isExpanded ? 'ring-1 ring-[#4F7D32]/25 shadow-md shadow-[#4F7D32]/5' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                    className="w-full text-left p-3.5 flex items-center justify-between cursor-pointer focus:outline-none hover:bg-[var(--bg-card)]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Indicator */}
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-black text-xs shrink-0 ${badgeStyle.bg}`}>
                        {rank}
                      </div>

                      {/* Profile photograph */}
                      {user.photograph ? (
                        <img
                          src={`/api/v1/users/${user.id}/photograph`}
                          alt={user.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] font-bold text-sm shrink-0 uppercase">
                          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                      )}

                      {/* Name and Designation */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">{user.name}</p>
                          {badgeStyle.trophy && <Trophy className={`w-3.5 h-3.5 ${badgeStyle.trophy}`} />}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[9px] font-semibold text-[#4F7D32] dark:text-[#68A344] bg-[#4F7D32]/10 border border-[#4F7D32]/20 px-1.5 py-0.5 rounded">
                            {user.designation}
                          </span>
                          <span className="text-[9px] text-[var(--text-secondary)] font-medium">
                            • {user.department}
                          </span>
                          {user.teamSize > 1 && (
                            <span className="text-[8px] font-mono text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-color)] px-1 rounded">
                              Team ({user.teamSize})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-black text-[#4F7D32] dark:text-[#68A344] tracking-wide block">
                          {user.primaryWorkValue}
                        </span>
                        <span className="text-[8px] text-[var(--text-secondary)] block -mt-0.5 font-bold uppercase tracking-wider">
                          {user.primaryMetricLabel}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </button>

                  {/* Actual Work Breakdown Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2.5 border-t border-[var(--border-color)] bg-[var(--bg-card)] text-[11px] space-y-2.5">
                      <div className="flex items-center justify-between text-[var(--text-secondary)] font-bold uppercase text-[9px] tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#4F7D32] dark:text-[#68A344]" /> Actual Work Breakdown ({timeframe === 'week' ? 'Weekly' : timeframe === 'month' ? 'Monthly' : timeframe === 'custom' ? 'Custom Range' : 'All-time'})
                        </span>
                        <span className="text-[var(--text-secondary)] font-mono">{user.department} Department</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-semibold"><FileCheck className="w-3 h-3 text-[#4F7D32] dark:text-[#68A344] shrink-0" /> Sales Done</span>
                          <span className="font-extrabold text-sm text-[#4F7D32] dark:text-[#68A344] mt-1.5">{user.breakdown.salesClosed}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-semibold"><Clock className="w-3 h-3 text-[#4F7D32] dark:text-[#68A344] shrink-0" /> Meetings Rec.</span>
                          <span className="font-extrabold text-sm text-[#4F7D32] dark:text-[#68A344] mt-1.5">{user.breakdown.meetingsConducted}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-semibold"><Calendar className="w-3 h-3 text-[#4F7D32] dark:text-[#68A344] shrink-0" /> Meetings Booked</span>
                          <span className="font-extrabold text-sm text-[var(--text-primary)] mt-1.5">{user.breakdown.meetingsBooked}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-semibold"><Phone className="w-3 h-3 text-[#4F7D32] dark:text-[#68A344] shrink-0" /> Leads Worked</span>
                          <span className="font-extrabold text-sm text-[var(--text-primary)] mt-1.5">{user.breakdown.leadsWorked}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-semibold"><CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" /> Orders Verified</span>
                          <span className="font-extrabold text-sm text-teal-600 dark:text-teal-400 mt-1.5">{user.breakdown.financeVerified}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col justify-between">
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-semibold"><Wrench className="w-3 h-3 text-purple-500 dark:text-purple-400 shrink-0" /> Ops Milestones</span>
                          <span className="font-extrabold text-sm text-purple-600 dark:text-purple-400 mt-1.5">{user.breakdown.opsMilestones}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex justify-between items-center text-xs text-[var(--text-secondary)] shrink-0">
          <span>
            Showing {filteredData.length} team members
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#4F7D32] text-slate-900 dark:text-white rounded-lg font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : modalContent;
}
