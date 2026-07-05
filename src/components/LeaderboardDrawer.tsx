'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Trophy, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  User, 
  Calendar,
  Award,
  Layers,
  Wrench,
  CreditCard,
  Check,
  PlusCircle,
  Clock,
  Phone,
  FileCheck
} from 'lucide-react';

interface LeaderboardUser {
  id: number;
  name: string;
  email: string;
  role: string;
  photograph: string | null;
  points: number;
  breakdown: {
    leadsCreated: number;
    followUps: number;
    meetingsBooked: number;
    meetingsConducted: number;
    salesClosed: number;
    salesSupervisedTl: number;
    salesSupervisedManager: number;
    financeVerified: number;
    paymentsRecorded: number;
    documentsUploaded: number;
    opsMilestones: number;
  };
}

interface LeaderboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: number;
}

export default function LeaderboardDrawer({ isOpen, onClose, currentUserId }: LeaderboardDrawerProps) {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [department, setDepartment] = useState<'all' | 'sales' | 'finance' | 'operations'>('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/leaderboard?timeframe=${timeframe}&department=${department}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, timeframe, department]);

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
      user.email.toLowerCase().includes(term)
    );
  });

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    director: { label: 'Director', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    sales_head: { label: 'Sales Head', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    finance: { label: 'Finance Manager', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    operations: { label: 'Operations Manager', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    psa_tl: { label: 'PSA Team Leader', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    psa: { label: 'PSA Consultant', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    tl: { label: 'Sales Team Leader', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    consultant: { label: 'Sales Consultant', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };

  const getRoleConfig = (roleStr: string) => {
    const key = roleStr.includes(':') ? roleStr.split(':')[0] : roleStr;
    const label = roleStr.includes(':') ? roleStr.split(':')[1] : roleLabels[key]?.label || roleStr;
    const color = roleLabels[key]?.color || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    return { label, color };
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/40 text-yellow-400',
          trophy: 'text-yellow-400 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]',
          glow: 'shadow-[0_0_15px_rgba(234,179,8,0.05)] border-yellow-500/20'
        };
      case 2:
        return {
          bg: 'bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/30 text-slate-300',
          trophy: 'text-slate-300',
          glow: 'border-slate-500/10'
        };
      case 3:
        return {
          bg: 'bg-gradient-to-r from-amber-700/20 to-amber-800/10 border-amber-750/30 text-amber-500',
          trophy: 'text-amber-500',
          glow: 'border-amber-700/10'
        };
      default:
        return {
          bg: 'bg-slate-900/60 border-slate-800 text-slate-400',
          trophy: null,
          glow: 'border-slate-800/40'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        ref={drawerRef}
        className="w-full sm:w-[480px] h-full bg-[#0d111d] border-l border-slate-850 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out translate-x-0 animate-slide-in-right"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-850 bg-[#121826] relative overflow-hidden flex items-center justify-between">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Trophy className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                Santori Standings <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-400">Real-time team contribution leaderboard</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Panel */}
        <div className="p-4 bg-[#101524]/60 border-b border-slate-850 space-y-3">
          {/* Timeframe Selectors */}
          <div className="flex gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-900">
            {(['week', 'month', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                  timeframe === t
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/5'
                    : 'text-slate-450 hover:text-white'
                }`}
              >
                {t === 'week' ? 'Weekly' : t === 'month' ? 'Monthly' : 'All-Time'}
              </button>
            ))}
          </div>

          {/* Department Selectors */}
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'sales', 'finance', 'operations'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDepartment(d)}
                className={`py-1 px-3 text-[10px] font-bold border rounded-full uppercase tracking-wider transition-all cursor-pointer ${
                  department === d
                    ? 'bg-slate-100 text-slate-950 border-white'
                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {d === 'all' ? 'All Teams' : d === 'sales' ? 'Sales' : d}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search team member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-850 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-lg text-xs text-white placeholder-slate-500 transition-all"
            />
          </div>
        </div>

        {/* Standings List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-semibold tracking-wide">Recalculating contributions...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-slate-900/20 border border-slate-850 rounded-xl">
              <Award className="w-8 h-8 text-slate-650 mb-2" />
              <p className="text-xs font-semibold text-slate-350">No rankings found</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            filteredData.map((user, index) => {
              const rank = index + 1;
              const badgeStyle = getRankBadgeStyle(rank);
              const isExpanded = expandedUserId === user.id;
              const roleConfig = getRoleConfig(user.role);

              const isCurrentUser = user.id === currentUserId;
              return (
                <div
                  key={user.id}
                  className={`bg-[#111625] border rounded-xl overflow-hidden transition-all duration-250 hover:bg-[#151b2e] ${
                    isCurrentUser ? 'border-amber-500/40 ring-1 ring-amber-500/10 bg-[#161d2f]/70' : badgeStyle.glow
                  } ${
                    isExpanded ? 'ring-1 ring-amber-500/25 shadow-lg shadow-amber-500/2' : ''
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

                      {/* Name and Role */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-100 truncate">
                            {user.name} {isCurrentUser && <span className="text-[10px] text-amber-455 font-semibold">(You)</span>}
                          </p>
                          {badgeStyle.trophy && <Trophy className={`w-3.5 h-3.5 ${badgeStyle.trophy}`} />}
                        </div>
                        <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded-full mt-1 ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-xs font-black text-amber-400 tracking-wide">{user.points}</span>
                        <span className="text-[9px] text-slate-400 block -mt-0.5 font-bold uppercase">Points</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Task Breakdown Details (Collapsible Drawer section) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1.5 border-t border-slate-850/60 bg-slate-950/45 text-[11px] space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Action breakdown ({timeframe === 'week' ? 'Weekly' : timeframe === 'month' ? 'Monthly' : 'All-time'})
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-slate-350">
                        {user.breakdown.leadsCreated > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><PlusCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Leads Registered</span>
                            <span className="font-extrabold text-slate-100">{user.breakdown.leadsCreated}</span>
                          </div>
                        )}
                        {user.breakdown.followUps > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Follow-ups & Notes</span>
                            <span className="font-extrabold text-slate-100">{user.breakdown.followUps}</span>
                          </div>
                        )}
                        {user.breakdown.meetingsBooked > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Meetings Booked</span>
                            <span className="font-extrabold text-slate-100">{user.breakdown.meetingsBooked}</span>
                          </div>
                        )}
                        {user.breakdown.meetingsConducted > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> Site visits conducted</span>
                            <span className="font-extrabold text-slate-100">{user.breakdown.meetingsConducted}</span>
                          </div>
                        )}
                        {user.breakdown.salesClosed > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Sales Closed</span>
                            <span className="font-extrabold text-emerald-450">{user.breakdown.salesClosed}</span>
                          </div>
                        )}
                        {user.breakdown.salesSupervisedTl > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><Award className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> TL Team Closings</span>
                            <span className="font-extrabold text-slate-100">{user.breakdown.salesSupervisedTl}</span>
                          </div>
                        )}
                        {user.breakdown.salesSupervisedManager > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><Award className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Manager Closings</span>
                            <span className="font-extrabold text-slate-100">{user.breakdown.salesSupervisedManager}</span>
                          </div>
                        )}
                        {user.breakdown.financeVerified > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><FileCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Finance Verifications</span>
                            <span className="font-extrabold text-teal-400">{user.breakdown.financeVerified}</span>
                          </div>
                        )}
                        {user.breakdown.paymentsRecorded > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Payments Recorded</span>
                            <span className="font-extrabold text-slate-100">{user.breakdown.paymentsRecorded}</span>
                          </div>
                        )}
                        {user.breakdown.documentsUploaded > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><Layers className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Docs Uploaded</span>
                            <span className="font-extrabold text-slate-100">{user.breakdown.documentsUploaded}</span>
                          </div>
                        )}
                        {user.breakdown.opsMilestones > 0 && (
                          <div className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-450"><Wrench className="w-3.5 h-3.5 text-pink-400 shrink-0" /> Ops Milestones</span>
                            <span className="font-extrabold text-pink-400">{user.breakdown.opsMilestones}</span>
                          </div>
                        )}
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
