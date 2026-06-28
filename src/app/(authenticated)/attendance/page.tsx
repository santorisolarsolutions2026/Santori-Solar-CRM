'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentLocationString } from '@/lib/location';
import {
  Clock,
  UserCheck,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Loader2,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  User,
} from 'lucide-react';

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkIn: string;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  workDurationMin: number | null;
  status: string;
  notes: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    employeeId: string | null;
    photograph: string | null;
    loginLocation: string | null;
  };
}

interface TeamRosterItem {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    employeeId: string | null;
    photograph: string | null;
    loginLocation: string | null;
  };
  attendance: AttendanceRecord | null;
}

export default function AttendancePage() {
  const { user, hasPermission } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'team' | 'personal'>('team');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teamRoster, setTeamRoster] = useState<TeamRosterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Action states
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/attendance?date=${selectedDate}&scope=${activeTab}`);
      const data = await res.json();
      if (data.success && data.data) {
        setRecords(data.data.records || []);
        setTeamRoster(data.data.teamRoster || []);
      }
    } catch (err) {
      console.error('Fetch attendance data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const res = await fetch('/api/v1/attendance/today');
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    fetchTodayAttendance();
  }, [selectedDate, activeTab]);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const loc = await getCurrentLocationString();
      const res = await fetch('/api/v1/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchTodayAttendance();
        fetchAttendanceData();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to Check Out for today?')) return;
    try {
      setActionLoading(true);
      const loc = await getCurrentLocationString();
      const res = await fetch('/api/v1/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchTodayAttendance();
        fetchAttendanceData();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during check-out.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRoster = teamRoster.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.user.name.toLowerCase().includes(q) ||
      item.user.email.toLowerCase().includes(q) ||
      (item.user.employeeId && item.user.employeeId.toLowerCase().includes(q)) ||
      item.user.role.toLowerCase().includes(q)
    );
  });

  const checkedInCount = teamRoster.filter(r => r.attendance !== null).length;
  const completedCount = teamRoster.filter(r => r.attendance?.checkOut !== null && r.attendance?.checkOut !== undefined).length;

  const hasAttendanceAccess = user?.role === 'admin' || user?.role?.startsWith('admin:') || hasPermission('attendance:view');

  if (!hasAttendanceAccess) {
    return (
      <div className="p-12 text-center bg-[#111625] border border-slate-800 rounded-2xl max-w-xl mx-auto my-12 space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Attendance Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Daily attendance tracking and time logs are restricted to administrators or team members granted explicit Attendance View access. Please contact your system admin if you require access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header & Daily Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-amber-400" />
            <span>Team Member Attendance & Work Hours</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track daily check-ins, check-outs, working durations, and attendance logs across the organization.
          </p>
        </div>

        {/* Quick Personal Action Box */}
        <div className="p-3.5 bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-lg shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Today's Status</span>
            <span className={`text-xs font-bold font-mono ${
              !todayAttendance ? 'text-slate-400' : todayAttendance.checkOut ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {!todayAttendance ? 'Not Checked In' : todayAttendance.checkOut ? 'Day Completed ✓' : 'Checked In'}
            </span>
          </div>

          {!todayAttendance ? (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="py-2 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>Check In Now</span>
            </button>
          ) : !todayAttendance.checkOut ? (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Check Out</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] font-bold text-emerald-400 font-mono">
              {Math.floor((todayAttendance.workDurationMin || 0) / 60)}h {(todayAttendance.workDurationMin || 0) % 60}m Worked
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Total Team Members</span>
            <span className="text-xl font-extrabold text-white mt-1 block font-mono">{teamRoster.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-[#111625] border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Checked In (Active)</span>
            <span className="text-xl font-extrabold text-amber-400 mt-1 block font-mono">{checkedInCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-[#111625] border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Checked Out (Completed)</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1 block font-mono">{completedCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-mono"
            />
          </div>

          <div className="flex bg-slate-950/60 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('team')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'team' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Team Roster
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'personal' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Log
            </button>
          </div>
        </div>

        {activeTab === 'team' && (
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team member name or ID..."
              className="block w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
        )}
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span className="text-xs font-semibold">Loading daily attendance records...</span>
          </div>
        ) : activeTab === 'team' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-5 w-64">Team Member</th>
                  <th className="py-4 px-4 w-36">Check In</th>
                  <th className="py-4 px-4 w-36">Check Out</th>
                  <th className="py-4 px-4 w-32">Work Duration</th>
                  <th className="py-4 px-4 w-36">Status</th>
                  <th className="py-4 px-4">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                      No team members found for the selected date.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map(({ user: member, attendance }) => (
                    <tr key={member.id} className="hover:bg-slate-900/30 transition-all">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {member.photograph ? (
                            <img
                              src={`/api/v1/users/${member.id}/photograph?t=${Date.now()}`}
                              alt={member.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-800 shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-400 shrink-0">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{member.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 capitalize">{member.role}</span>
                              {member.employeeId && (
                                <span className="text-[9px] font-mono text-amber-400/80 bg-amber-950/20 px-1.5 py-0.25 rounded border border-amber-900/30">
                                  {member.employeeId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                        {attendance ? (
                          new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-slate-600 italic font-normal">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                        {attendance?.checkOut ? (
                          new Date(attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-slate-600 italic font-normal">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 font-semibold">
                        {attendance?.workDurationMin ? (
                          `${Math.floor(attendance.workDurationMin / 60)}h ${attendance.workDurationMin % 60}m`
                        ) : (
                          <span className="text-slate-600 font-normal">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {!attendance ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-slate-900/60 text-slate-500 border-slate-800 uppercase tracking-wider flex items-center gap-1 w-fit" title="Not Checked In Yet">
                            <AlertCircle className="w-3 h-3 text-slate-500" /> Pending
                          </span>
                        ) : attendance.checkOut ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider flex items-center gap-1 w-fit" title="Day Completed & Checked Out">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase tracking-wider flex items-center gap-1 w-fit animate-pulse" title="Currently Checked In">
                            <UserCheck className="w-3 h-3 text-amber-400" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 text-xs truncate max-w-xs font-medium" title={member.loginLocation || attendance?.checkInLocation || '-'}>
                        {(member.loginLocation && !member.loginLocation.includes('Web Portal'))
                          ? member.loginLocation
                          : (attendance?.checkInLocation && !attendance.checkInLocation.includes('Web Portal')
                              ? attendance.checkInLocation
                              : member.loginLocation || attendance?.checkInLocation || '-')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-5 w-36">Date</th>
                  <th className="py-4 px-4 w-36">Check In</th>
                  <th className="py-4 px-4 w-36">Check Out</th>
                  <th className="py-4 px-4 w-32">Work Hours</th>
                  <th className="py-4 px-4 w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 italic font-sans">
                      No personal attendance records found for this date.
                    </td>
                  </tr>
                ) : (
                  records.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-900/30 transition-all">
                      <td className="py-3.5 px-5 font-bold text-white">{att.date.split('T')[0]}</td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-amber-400 font-bold">
                        {att.workDurationMin ? `${Math.floor(att.workDurationMin / 60)}h ${att.workDurationMin % 60}m` : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider">
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
