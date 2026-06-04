'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Sun,
  Activity,
  Users,
  Calendar,
  TrendingUp,
  FileText,
  Clock,
  Compass,
  AlertCircle,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

interface LogEntry {
  id: number;
  remark: string | null;
  fromStatus: number | null;
  toStatus: number;
  createdAt: string;
  lead: { customerName: string; leadCode: string; id: number };
  user: { name: string; role: string };
}

interface PresenceUser {
  id: number;
  name: string;
  role: string;
  status: 'online' | 'idle' | 'offline';
  lastSeenAt: string | null;
}

interface KPIs {
  salesToday: number;
  meetingsToday: number;
  newLeadsToday: number;
  activeConsultantsOnline: number;
}

const STAGE_BADGES: Record<number, { name: string; color: string }> = {
  1: { name: 'Fresh Lead', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  2: { name: 'DNP (No Answer)', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  3: { name: 'Follow Up', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  4: { name: 'Not Interested', color: 'bg-red-800/10 text-red-400 border-red-800/20' },
  5: { name: 'Call Later', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  6: { name: 'Already Installed', color: 'bg-slate-800/20 text-slate-500 border-slate-800/30' },
  7: { name: 'Decision Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  8: { name: 'Meeting Booked 📅', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  9: { name: 'Meeting Done', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  10: { name: 'Disconnected', color: 'bg-slate-600/15 text-slate-400 border-slate-600/20' },
  11: { name: 'Switch Off', color: 'bg-slate-700/20 text-slate-400 border-slate-700/30' },
  12: { name: 'Can\'t Fit Solar', color: 'bg-stone-900 text-stone-400 border-stone-800/40' },
  13: { name: '✅ SALE DONE', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold' },
  14: { name: 'Meeting Ended', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
};

export default function LiveLinkPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastLogId, setLastLogId] = useState<number | null>(null);
  const [highlightedLogId, setHighlightedLogId] = useState<number | null>(null);

  // Fetch real-time data
  const fetchLiveData = async (isFirstLoad = false) => {
    try {
      const res = await fetch('/api/v1/live/feed');
      const data = await res.json();
      
      if (data.success && data.data) {
        const { logs: newLogs, presence: newPresence, kpis: newKpis } = data.data;

        setLogs(newLogs);
        setPresence(newPresence);
        setKpis(newKpis);

        // Flash animation check on new entries
        if (!isFirstLoad && newLogs.length > 0) {
          const latestLog = newLogs[0];
          if (lastLogId && latestLog.id !== lastLogId) {
            setHighlightedLogId(latestLog.id);
            // Remove highlight after 2.5 seconds
            setTimeout(() => {
              setHighlightedLogId(null);
            }, 2500);
          }
        }

        if (newLogs.length > 0) {
          setLastLogId(newLogs[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch live feed error:', err);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Access Control
      if (!['admin', 'sales_head'].includes(user.role)) {
        router.push('/dashboard');
        return;
      }

      fetchLiveData(true);
      // Smart Polling: Fetch feed every 5 seconds (Section 6.1)
      const interval = setInterval(() => {
        fetchLiveData(false);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user, lastLogId]);

  if (loading || !kpis) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <Sun className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  // Calculate current stage distributions (Section 6.3 B)
  const getStageCount = (stageNum: number) => {
    // Count how many logs have lead moving to this stage as their latest status
    // For simplicity, we can fetch active leads and group them. Since we have logs here,
    // let's compute distribution counts from our current leads table or estimate it.
    // In our overview database, we can also count them. For now let's just make it a mock or pull from DB.
    // Actually, we already have a pipeline distribution endpoint that pulls actual live DB counts!
    // Let's call /api/v1/reports/pipeline inside our feed or let's query it.
    // Wait, let's keep it simple: the live link can just poll reports/pipeline as well!
  };

  return (
    <div className="space-y-6">
      {/* 1. Header KPIs Bar (Section 6.3 D) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gradient-to-r from-[#111625] via-[#141b2e] to-[#111625] border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="text-center md:border-r border-slate-800/80 last:border-0 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            New Leads Today
          </span>
          <span className="text-3xl font-extrabold text-blue-400 tracking-tight">{kpis.newLeadsToday}</span>
        </div>
        <div className="text-center md:border-r border-slate-800/80 last:border-0 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Meetings Scheduled Today
          </span>
          <span className="text-3xl font-extrabold text-cyan-400 tracking-tight">{kpis.meetingsToday}</span>
        </div>
        <div className="text-center md:border-r border-slate-800/80 last:border-0 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Sales Confirmed Today
          </span>
          <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{kpis.salesToday}</span>
        </div>
        <div className="text-center py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Active Consultants Online
          </span>
          <span className="text-3xl font-extrabold text-purple-400 tracking-tight flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>{kpis.activeConsultantsOnline}</span>
          </span>
        </div>
      </div>

      {/* Main War-Room Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)] min-h-[30rem]">
        {/* Left Column: Live Activity Feed (Section 6.3 A) */}
        <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full lg:col-span-2">
          <div className="p-4 border-b border-slate-800 bg-slate-900/15 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Real-Time Activity Stream</span>
            </h3>
            <span className="text-[9px] text-slate-500">Auto-updates every 5s</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                Awaiting client logs and caller events...
              </div>
            ) : (
              logs.map((log) => {
                const stage = STAGE_BADGES[log.toStatus] || { name: `Stage ${log.toStatus}`, color: 'bg-slate-500' };
                const isNew = log.id === highlightedLogId;

                return (
                  <div
                    key={log.id}
                    className={`p-3.5 border rounded-xl flex items-start gap-4 transition-all duration-500 ${
                      isNew
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-slate-900/20 border-slate-800/80 hover:border-slate-750'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-slate-500 mt-1 shrink-0 font-semibold">
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <Link
                          href={`/leads/${log.lead.id}`}
                          className="text-xs font-bold text-white hover:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <span>{log.lead.customerName}</span>
                          <span className="text-[9px] text-slate-400">({log.lead.leadCode})</span>
                        </Link>
                        
                        <span className={`text-[8px] font-extrabold uppercase px-2 py-0.25 border rounded-full ${stage.color}`}>
                          {stage.name}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                        Moved by <strong>{log.user.name}</strong> (<span className="capitalize">{log.user.role}</span>)
                      </p>
                      {log.remark && (
                        <p className="text-[10px] text-slate-500 italic mt-1 pl-2 border-l-2 border-slate-800 leading-normal truncate">
                          "{log.remark}"
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/leads/${log.lead.id}`}
                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-500 hover:text-white shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: User Presence Map (Section 6.3 C) */}
        <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
          <div className="p-4 border-b border-slate-800 bg-slate-900/15 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Consultant Presence</span>
            </h3>
            <span className="text-[9px] text-slate-500">Heartbeat check</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {presence.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                No active users tracked.
              </div>
            ) : (
              presence.map((user) => {
                const presenceColors = {
                  online: 'bg-emerald-500 shadow-emerald-500/20',
                  idle: 'bg-yellow-500 shadow-yellow-500/20',
                  offline: 'bg-slate-700',
                };
                
                return (
                  <div key={user.id} className="p-4 hover:bg-slate-900/10 flex items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Presence indicator dot */}
                      <span className={`w-2.5 h-2.5 rounded-full shadow-lg ${presenceColors[user.status]} relative shrink-0`}>
                        {user.status === 'online' && (
                          <span className="absolute -inset-0.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                        )}
                      </span>
                      
                      <div className="text-left">
                        <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                        <p className="text-[9px] text-slate-400 mt-1 capitalize leading-none">{user.role}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {user.status === 'offline' ? (
                        <span className="text-[9px] text-slate-500">Offline</span>
                      ) : (
                        <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>
                            {user.lastSeenAt
                              ? new Date(user.lastSeenAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Now'}
                          </span>
                        </span>
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
  );
}
