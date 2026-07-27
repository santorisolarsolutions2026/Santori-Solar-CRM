'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [department, setDepartment] = useState<'all' | 'sales' | 'finance' | 'operations'>('all');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('auto');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let url = `/api/v1/leaderboard?timeframe=${timeframe}&department=${department}&designation=${encodeURIComponent(selectedDesignation)}&metric=${selectedMetric}`;
        const res = await fetch(url);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          if (result.designations) {
            setDesignations(result.designations);
          }
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, timeframe, department, selectedDesignation, selectedMetric]);

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

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-450',
          trophy: 'text-blue-600 dark:text-blue-400 filter drop-shadow-[0_0_8px_rgba(37,99,235,0.2)]',
          glow: 'border-blue-500/10 dark:border-blue-500/20'
        };
      default:
        return {
          bg: 'bg-slate-900/40 border border-slate-800 text-slate-450',
          trophy: null,
          glow: 'border-slate-800/40'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        ref={drawerRef}
        className="w-full sm:w-[500px] h-full bg-[#090b11] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out translate-x-0 animate-slide-in-right text-slate-400"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-[#111625] relative overflow-hidden flex items-center justify-between">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Trophy className="w-5 h-5 font-bold" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 tracking-wide flex items-center gap-1.5">
                Santori Standings <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-400">Actual Work & Performance Standings</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Panel */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-3">
          {/* Timeframe Selectors */}
          <div className="flex gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {(['week', 'month', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                  timeframe === t
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'week' ? 'Weekly' : t === 'month' ? 'Monthly' : 'All-Time'}
              </button>
            ))}
          </div>

          {/* Department Selectors */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {(['all', 'sales', 'finance', 'operations'] as const).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDepartment(d);
                  setSelectedDesignation('all');
                }}
                className={`py-1 px-3 text-[10px] font-bold border rounded-full uppercase tracking-wider transition-all cursor-pointer ${
                  department === d
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {d === 'all' ? 'All Departments' : d === 'sales' ? 'Sales' : d}
              </button>
            ))}
          </div>

          {/* Designation & Primary Metric Filters */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-blue-600" /> Designation
              </label>
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg text-xs text-slate-200 cursor-pointer"
              >
                <option value="all">All Designations</option>
                {designations.map((des) => (
                  <option key={des.id} value={des.name}>
                    {des.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Award className="w-3 h-3 text-blue-600" /> Rank Parameter
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg text-xs text-slate-200 cursor-pointer"
              >
                <option value="auto">Auto (Dept Primary)</option>
                <option value="salesClosed">Sales Done</option>
                <option value="meetingsConducted">Meetings Recorded</option>
                <option value="leadsWorked">Leads Worked</option>
                <option value="ordersVerified">Orders Verified</option>
                <option value="opsMilestones">Ops Milestones</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search team member by name or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:outline-none rounded-lg text-xs text-slate-200 placeholder-slate-500 transition-all"
            />
          </div>
        </div>

        {/* Standings List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">Calculating actual work standings...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-850 rounded-xl">
              <Award className="w-8 h-8 text-slate-400 dark:text-slate-650 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-350">No matching team members found</p>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">Try adjusting your designation or department filter.</p>
            </div>
          ) : (
            filteredData.map((user, index) => {
              const rank = index + 1;
              const badgeStyle = getRankBadgeStyle(rank);
              const isExpanded = expandedUserId === user.id;

              return (
                <div
                  key={user.id}
                  className={`bg-[#111625] border border-slate-800 rounded-xl overflow-hidden transition-all duration-250 hover:bg-[#151b2e] ${badgeStyle.glow} ${
                    isExpanded ? 'ring-1 ring-blue-500/20 dark:ring-blue-500/10 shadow-lg shadow-blue-500/2' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                    className="w-full text-left p-3.5 flex items-center justify-between cursor-pointer focus:outline-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Indicator */}
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${badgeStyle.bg}`}>
                        {rank}
                      </div>

                      {/* Profile photograph */}
                      {user.photograph ? (
                        <img
                          src={`/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                          alt={user.name}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-800 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm shrink-0 uppercase">
                          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                      )}

                      {/* Name and Designation */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-100 truncate">{user.name}</p>
                          {badgeStyle.trophy && <Trophy className={`w-3.5 h-3.5 ${badgeStyle.trophy}`} />}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400/90 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded">
                            {user.designation}
                          </span>
                          {user.teamSize > 1 && (
                            <span className="text-[8px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1 rounded">
                              Team ({user.teamSize})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-wide block">
                          {user.primaryWorkValue}
                        </span>
                        <span className="text-[8px] text-slate-400 block -mt-0.5 font-bold uppercase tracking-wider">
                          {user.primaryMetricLabel}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Actual Work Breakdown Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800 bg-slate-950/45 text-[11px] space-y-2">
                      <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-2">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Actual Work Breakdown ({timeframe === 'week' ? 'Weekly' : timeframe === 'month' ? 'Monthly' : 'All-time'})
                        </span>
                        <span className="text-slate-400 font-mono">{user.department}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-350">
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                          <span className="flex items-center gap-1.5 text-slate-400"><FileCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" /> Sales Done</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{user.breakdown.salesClosed}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                          <span className="flex items-center gap-1.5 text-slate-400"><Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" /> Meetings Recorded</span>
                          <span className="font-extrabold text-sky-600 dark:text-sky-400">{user.breakdown.meetingsConducted}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                          <span className="flex items-center gap-1.5 text-slate-400"><Calendar className="w-3.5 h-3.5 text-blue-650 dark:text-blue-400 shrink-0" /> Meetings Booked</span>
                          <span className="font-extrabold text-slate-100">{user.breakdown.meetingsBooked}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                          <span className="flex items-center gap-1.5 text-slate-400"><Phone className="w-3.5 h-3.5 text-blue-650 dark:text-blue-450 shrink-0" /> Leads Worked</span>
                          <span className="font-extrabold text-slate-100">{user.breakdown.leadsWorked}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                          <span className="flex items-center gap-1.5 text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" /> Orders Verified</span>
                          <span className="font-extrabold text-teal-600 dark:text-teal-400">{user.breakdown.financeVerified}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                          <span className="flex items-center gap-1.5 text-slate-400"><Wrench className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" /> Ops Milestones</span>
                          <span className="font-extrabold text-purple-600 dark:text-purple-400">{user.breakdown.opsMilestones}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
