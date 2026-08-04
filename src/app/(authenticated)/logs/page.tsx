'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Database,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  User,
  Activity,
  ArrowRight,
  Terminal,
} from 'lucide-react';

interface AuditLog {
  id: number;
  tableName: string;
  recordId: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  ip: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    department: {
      name: string;
    } | null;
  };
}

const STAGE_NAMES: Record<string, string> = {
  '1': 'Fresh Lead',
  '2': 'DNP (No Answer)',
  '3': 'Follow Up',
  '4': 'Not Interested',
  '5': 'Call Later',
  '6': 'Already Installed',
  '7': 'Decision Pending',
  '8': 'Meeting Booked',
  '9': 'Meeting Done',
  '10': 'Disconnected',
  '11': 'Switch Off',
  '12': "Can't Fit Solar",
  '13': 'Sale Done',
};

const formatExecutiveSummary = (log: AuditLog) => {
  const table = (log.tableName || '').toLowerCase();
  const field = (log.fieldName || '').toLowerCase();
  const oldVal = log.oldValue;
  const newVal = log.newValue;

  if (table.includes('lead')) {
    if (field === 'status') {
      const fromSt = STAGE_NAMES[oldVal || ''] || oldVal || 'Initial';
      const toSt = STAGE_NAMES[newVal || ''] || newVal || 'Updated';
      return `${log.user.name} promoted Lead #${log.recordId} stage from "${fromSt}" to "${toSt}"`;
    }
    if (field.includes('consultant') || field.includes('tl') || field.includes('manager') || field.includes('assign')) {
      return `${log.user.name} reassigned Lead #${log.recordId} team member ownership`;
    }
    return `${log.user.name} updated Lead #${log.recordId} (${log.fieldName})`;
  }

  if (table.includes('order')) {
    if (field === 'status') {
      return `${log.user.name} updated Solar Order #${log.recordId} verification status to "${newVal}"`;
    }
    if (field.includes('delivery')) {
      return `${log.user.name} marked Solar Order #${log.recordId} delivery as ${newVal === 'true' ? 'Completed' : 'Pending'}`;
    }
    if (field.includes('install')) {
      return `${log.user.name} marked Solar Order #${log.recordId} installation as ${newVal === 'true' ? 'Completed' : 'Pending'}`;
    }
    if (field.includes('commission')) {
      return `${log.user.name} marked Solar Order #${log.recordId} plant commissioning as Completed`;
    }
    if (field.includes('subsidy')) {
      return `${log.user.name} updated Order #${log.recordId} government subsidy status to ${newVal === 'true' ? 'Applied' : 'Pending'}`;
    }
    return `${log.user.name} modified Solar Order #${log.recordId} (${log.fieldName})`;
  }

  if (table.includes('user') || table.includes('permission')) {
    if (field === 'permissions') {
      return `${log.user.name} configured access control permissions for Employee #${log.recordId}`;
    }
    if (field === 'role') {
      return `${log.user.name} changed Employee #${log.recordId}'s designation/role from "${oldVal}" to "${newVal}"`;
    }
    return `${log.user.name} updated Employee #${log.recordId} account info (${log.fieldName})`;
  }

  if (table.includes('meeting')) {
    return `${log.user.name} scheduled / updated client meeting record #${log.recordId}`;
  }

  if (table.includes('payment')) {
    return `${log.user.name} recorded payment entry #${log.recordId} (Amount: ₹${newVal || oldVal || '0'})`;
  }

  return `${log.user.name} updated ${log.tableName} #${log.recordId} (${log.fieldName}: ${oldVal || 'None'} → ${newVal || 'None'})`;
};

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  // Fetch functions
  const fetchLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(targetPage));
      params.append('limit', String(limit));

      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      if (searchUser) params.append('searchUser', searchUser);
      if (selectedTable) params.append('tableName', selectedTable);
      if (selectedAction) params.append('action', selectedAction);

      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLogs(data.data.logs);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
        setPage(data.data.page);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const isUserAdmin = user.role === 'admin' || user.role?.startsWith('admin:');
      const isUserIT = user.department?.name === 'IT';
      if (!isUserAdmin && !isUserIT) {
        // Redirection or block is handled in render
        return;
      }
      fetchLogs(1);
    }
  }, [user]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchUser('');
    setSelectedTable('');
    setSelectedAction('');
    // Trigger fetch on next tick or immediate call
    setTimeout(() => {
      fetchLogs(1);
    }, 0);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const isCurrentUserAdmin = user.role === 'admin' || user.role?.startsWith('admin:');
  const isITUser = user.department?.name === 'IT';
  const hasAccess = isCurrentUserAdmin || isITUser;

  if (!hasAccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[var(--bg-main)] p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-[var(--bg-card)]/80 border border-[var(--border-color)] rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-950/40 border border-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">Access Forbidden</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
            The System Audit Logs are strictly restricted to the IT Department and system Administrators.
            You do not have the required permissions to view this resource.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-emerald-400 hover:text-emerald-400 border border-[var(--border-color)] rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Helper to format values
  const formatChangeValue = (val: string | null) => {
    if (val === null || val === undefined || val === 'null' || val === '') {
      return <span className="text-slate-600 italic">None</span>;
    }
    // Attempt JSON parse
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'object') {
        return (
          <pre className="text-[10px] font-mono bg-[var(--bg-main)] p-2 rounded border border-[var(--border-color)] overflow-x-auto text-slate-350 max-w-xs">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      }
    } catch {}
    return <span className="font-mono text-[var(--text-primary)] break-all text-[11px]">{val}</span>;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">System Audit Logs</h1>
          <p className="text-[var(--text-secondary)] text-xs mt-1">
            Real-time tracking of every model and configuration write across the Santori Solar Database.
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] hover:text-white border border-[var(--border-color)] rounded-lg text-xs font-bold transition-all cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-[var(--bg-card)]/60 border border-[var(--border-color)]/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          <span>Search & Filters</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* User Search */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Performed By (User)</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-white text-xs focus:ring-emerald-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Table Selector */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Database Component</label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Tables</option>
              <option value="User">User Accounts</option>
              <option value="Lead">Leads</option>
              <option value="Order">Orders</option>
              <option value="Attendance">Attendance</option>
              <option value="Payment">Payments & Finance</option>
              <option value="Department">Departments</option>
              <option value="Designation">Designations</option>
            </select>
          </div>

          {/* Action Type */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Operation / Action</label>
            <input
              type="text"
              placeholder="e.g. CREATE, role, isActive..."
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-white text-xs focus:ring-emerald-500 focus:outline-none placeholder:text-slate-600"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">From Date & Time</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-slate-350 text-xs focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">To Date & Time</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-slate-355 text-xs focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-transparent hover:bg-[var(--bg-card)] border border-transparent rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold transition-all cursor-pointer"
          >
            Clear Fields
          </button>
          <button
            onClick={() => fetchLogs(1)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-slate-955 rounded-lg text-xs font-extrabold shadow-lg shadow-emerald-500/10 transition-all cursor-pointer uppercase tracking-wider"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--bg-card)]/60 border border-[var(--border-color)]/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider">Retrieving Logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full flex items-center justify-center mx-auto text-slate-600">
              <Database className="w-5 h-5" />
            </div>
            <p className="text-[var(--text-muted)] text-xs uppercase font-extrabold tracking-wider">No audit logs matching this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">

              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-main)] text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-wider">
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-5">Operator (Who)</th>
                  <th className="py-3.5 px-5">Executive Action Summary</th>
                  <th className="py-3.5 px-5">Target (Model)</th>
                  <th className="py-3.5 px-5">Action / Field</th>
                  <th className="py-3.5 px-5">Old State</th>
                  <th className="py-3.5 px-5">New State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {logs.map((log) => {
                  const dept = log.user.department?.name || 'Shared';
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--bg-card)] transition-colors text-xs text-[var(--text-primary)]"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-bold text-white">
                              {new Date(log.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="text-[9px] text-slate-550 font-mono">
                              {new Date(log.createdAt).toISOString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-emerald-400 shrink-0 font-extrabold text-[11px]">
                            {log.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{log.user.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{log.user.email}</span>
                            <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest mt-0.5">
                              {dept} ({log.user.role.includes(':') ? log.user.role.split(':')[1] : log.user.role})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Executive Action Summary */}
                      <td className="py-3.5 px-5 font-medium text-emerald-400 max-w-xs">
                        {formatExecutiveSummary(log)}
                      </td>

                      {/* Target Component */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-white font-mono text-[10px] uppercase font-bold">
                          <Database className="w-3 h-3 text-[var(--text-muted)]" />
                          {log.tableName}
                          <span className="text-emerald-400 font-normal">#{log.recordId}</span>
                        </span>
                      </td>

                      {/* Action / Field */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold uppercase tracking-wider">
                          <Activity className="w-2.5 h-2.5 shrink-0" />
                          {log.fieldName}
                        </span>
                      </td>

                      {/* Old State */}
                      <td className="py-3.5 px-5 min-w-[120px]">
                        {STAGE_NAMES[log.oldValue || ''] || formatChangeValue(log.oldValue)}
                      </td>

                      {/* New State */}
                      <td className="py-3.5 px-5 min-w-[120px]">
                        {STAGE_NAMES[log.newValue || ''] || formatChangeValue(log.newValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
            <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">
              Showing <span className="text-white">{logs.length}</span> of <span className="text-white">{total}</span> logs
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page === 1}
                className="p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold text-[var(--text-primary)] px-2 uppercase tracking-wide">
                Page <span className="text-emerald-400">{page}</span> of {totalPages}
              </span>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
