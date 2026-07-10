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
  const [activeTab, setActiveTab] = useState<'team' | 'personal' | 'monthly'>('team');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teamRoster, setTeamRoster] = useState<TeamRosterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Monthly Log States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success && data.data) {
        setEmployees(data.data);
        // Pre-select the current user
        if (user) {
          setSelectedEmployeeId(user.id.toString());
        }
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchMonthlyRecords = async () => {
    if (!selectedEmployeeId) return;
    try {
      setMonthlyLoading(true);
      const res = await fetch(`/api/v1/attendance?scope=team&user_id=${selectedEmployeeId}&month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (data.success && data.data) {
        setMonthlyRecords(data.data.records || []);
      }
    } catch (err) {
      console.error('Error fetching monthly records:', err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'monthly' && selectedEmployeeId) {
      fetchMonthlyRecords();
    }
  }, [selectedEmployeeId, selectedMonth, selectedYear, activeTab]);

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
    const proceed = async () => {
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

    if ((window as any).showConfirm) {
      (window as any).showConfirm('Are you sure you want to Check Out for today?', proceed);
    } else if (confirm('Are you sure you want to Check Out for today?')) {
      proceed();
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

  // Monthly calculations
  const getDaysInMonthList = (month: number, year: number) => {
    const days = [];
    const date = new Date(Date.UTC(year, month - 1, 1));
    while (date.getUTCMonth() === month - 1) {
      days.push(new Date(date));
      date.setUTCDate(date.getUTCDate() + 1);
    }
    return days;
  };

  const monthlyDays = getDaysInMonthList(selectedMonth, selectedYear);
  const presentDaysCount = monthlyRecords.length;
  
  const totalWorkMin = monthlyRecords.reduce((sum, r) => sum + (r.workDurationMin || 0), 0);
  const totalWorkHoursStr = `${Math.floor(totalWorkMin / 60)}h ${totalWorkMin % 60}m`;
  
  const completedDays = monthlyRecords.filter(r => r.workDurationMin && r.workDurationMin > 0);
  const avgWorkMin = completedDays.length > 0 ? Math.round(totalWorkMin / completedDays.length) : 0;
  const avgWorkHoursStr = `${Math.floor(avgWorkMin / 60)}h ${avgWorkMin % 60}m`;

  const lateCheckinsCount = monthlyRecords.filter(r => r.status === 'late').length;

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
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {activeTab !== 'monthly' && (
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-mono"
              />
            </div>
          )}

          <div className="flex bg-slate-950/60 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'team' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Team Roster
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'personal' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Log
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'monthly' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly History
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

        {activeTab === 'monthly' && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Employee Selector */}
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Employee:</span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-bold font-sans"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-slate-950 text-white">
                    {emp.name} ({emp.employeeId || 'No ID'})
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-bold"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const name = new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
                  return (
                    <option key={m} value={m} className="bg-slate-950 text-white">
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-bold"
              >
                {[-2, -1, 0, 1].map((offset) => {
                  const y = new Date().getFullYear() + offset;
                  return (
                    <option key={y} value={y} className="bg-slate-950 text-white">
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
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
        ) : activeTab === 'personal' ? (
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
        ) : (
          <div className="space-y-6">
            {/* Monthly Stats Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-900/20 border-b border-slate-800">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Days Present</span>
                  <span className="text-lg font-extrabold text-emerald-400 mt-1 block font-mono">
                    {presentDaysCount} <span className="text-xs text-slate-500 font-sans font-normal">/ {monthlyDays.length} days</span>
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Total Work Hours</span>
                  <span className="text-lg font-extrabold text-amber-400 mt-1 block font-mono">{totalWorkHoursStr}</span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Avg. Shift Length</span>
                  <span className="text-lg font-extrabold text-sky-400 mt-1 block font-mono">{avgWorkHoursStr}</span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Late Check-Ins</span>
                  <span className="text-lg font-extrabold text-rose-400 mt-1 block font-mono">{lateCheckinsCount} <span className="text-xs text-slate-500 font-sans font-normal">days</span></span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Monthly Calendar Tabular List */}
            {monthlyLoading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs font-semibold">Loading monthly logs...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-5 w-48">Date & Day</th>
                      <th className="py-3 px-4 w-32">Status</th>
                      <th className="py-3 px-4 w-32">Check In</th>
                      <th className="py-3 px-4 w-32">Check Out</th>
                      <th className="py-3 px-4 w-32">Hours Worked</th>
                      <th className="py-3 px-4">Locations & Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                    {monthlyDays.map((dayDate) => {
                      const dayStr = dayDate.toISOString().split('T')[0];
                      const record = monthlyRecords.find(r => r.date.split('T')[0] === dayStr);
                      const isWeekend = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6;
                      
                      const todayDateStr = new Date().toISOString().split('T')[0];
                      const isFuture = dayStr > todayDateStr;
                      const isToday = dayStr === todayDateStr;

                      // Display formatted date
                      const dateDisplay = dayDate.toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
                      const weekdayDisplay = dayDate.toLocaleDateString('default', { weekday: 'short', timeZone: 'UTC' });

                      return (
                        <tr key={dayStr} className={`hover:bg-slate-900/30 transition-all ${isToday ? 'bg-amber-500/5' : ''}`}>
                          <td className="py-3 px-5 font-sans">
                            <span className="font-bold text-white block">{dateDisplay}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{weekdayDisplay}</span>
                          </td>
                          <td className="py-3 px-4 font-sans">
                            {record ? (
                              record.status === 'completed' || record.checkOut ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider">
                                  Completed
                                </span>
                              ) : record.status === 'late' ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20 uppercase tracking-wider">
                                  Late Check-in
                                </span>
                              ) : record.status === 'half_day' ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 uppercase tracking-wider">
                                  Half Day
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase tracking-wider animate-pulse">
                                  Active
                                </span>
                              )
                            ) : isFuture ? (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border bg-slate-900/40 text-slate-600 border-slate-900/60 uppercase tracking-wider">
                                Future
                              </span>
                            ) : isWeekend ? (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border bg-slate-950 text-slate-500 border-slate-850 uppercase tracking-wider">
                                Weekend
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/20 uppercase tracking-wider">
                                Absent
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {record ? (
                              new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            ) : (
                              <span className="text-slate-600 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {record && record.checkOut ? (
                              new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            ) : (
                              <span className="text-slate-600 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-amber-400 font-bold">
                            {record && record.workDurationMin ? (
                              `${Math.floor(record.workDurationMin / 60)}h ${record.workDurationMin % 60}m`
                            ) : record && !record.checkOut ? (
                              <span className="text-slate-500 font-normal italic">Active...</span>
                            ) : (
                              <span className="text-slate-600 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-xs font-sans max-w-sm truncate" title={record?.checkInLocation || ''}>
                            {record ? (
                              <div className="flex flex-col gap-0.5">
                                {record.checkInLocation && (
                                  <span className="text-slate-300 truncate">
                                    <span className="text-slate-500 font-semibold text-[9px] uppercase tracking-wide mr-1">In Loc:</span>
                                    {record.checkInLocation.replace('Web Portal check-in at ', '')}
                                  </span>
                                )}
                                {record.notes && (
                                  <span className="text-amber-400/80 italic text-[11px]">
                                    &ldquo;{record.notes}&rdquo;
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
