'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ALL_PERMISSIONS, PermissionItem } from '@/lib/permissions';
import { Shield, Check, Save, User, Search, RefreshCw, Lock, AlertCircle, Building, Award } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  employeeId?: string | null;
  permissions?: string | null;
  department?: { id: number; name: string } | null;
  designation?: { id: number; name: string; level: number } | null;
}

export default function PermissionsManagementPage() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'sales' | 'finance' | 'operations' | 'admin'>('sales');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPermissionsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/permissions');
      const data = await res.json();
      if (data.success && data.data?.users) {
        setEmployees(data.data.users);
        if (data.data.users.length > 0 && !selectedEmployee) {
          const first = data.data.users[0];
          setSelectedEmployee(first);
          parsePermissions(first.permissions);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load permissions' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error connecting to server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissionsData();
  }, []);

  const parsePermissions = (permString?: string | null) => {
    if (!permString) {
      setActivePermissions([]);
      return;
    }
    const clean = permString
      .replace(/^CUSTOM:/, '')
      .split(',')
      .map(p => p.trim())
      .filter(p => p !== '' && p !== 'none');
    setActivePermissions(clean);
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    parsePermissions(emp.permissions);
    setMessage(null);
  };

  const togglePermission = (key: string) => {
    setActivePermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllModule = (moduleKey: 'sales' | 'finance' | 'operations' | 'admin') => {
    const keys = ALL_PERMISSIONS[moduleKey].map(p => p.key);
    const allSelected = keys.every(k => activePermissions.includes(k));
    if (allSelected) {
      setActivePermissions(prev => prev.filter(k => !keys.includes(k)));
    } else {
      setActivePermissions(prev => Array.from(new Set([...prev, ...keys])));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedEmployee.id,
          permissions: activePermissions
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Access levels updated for ${selectedEmployee.name}!` });
        setEmployees(prev =>
          prev.map(e =>
            e.id === selectedEmployee.id
              ? { ...e, permissions: activePermissions.join(',') }
              : e
          )
        );
        setSelectedEmployee(prev => (prev ? { ...prev, permissions: activePermissions.join(',') } : null));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save permissions' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving permissions' });
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept =
      selectedDeptFilter === 'ALL' ||
      (emp.department && emp.department.name.toUpperCase() === selectedDeptFilter.toUpperCase());

    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <Shield className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dynamic RBAC Permission Control</h1>
              <p className="text-sm text-slate-300 mt-1">
                Capabilities strictly depend on assigned Access Levels. Employee department & designation serve only as hierarchy markers.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchPermissionsData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-sm font-medium transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reload Data
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs opacity-60 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left Employee List, Right Permission Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Employee Selector */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" /> Employees ({filteredEmployees.length})
            </h2>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {['ALL', 'Sales', 'Finance', 'Operations', 'PSA', 'IT'].map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    selectedDeptFilter === dept
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Employee List */}
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading employees...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No matching employees found</div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedEmployee?.id === emp.id;
                const permCount = emp.permissions
                  ? emp.permissions.split(',').filter(p => p.trim() && p !== 'none').length
                  : 0;

                return (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-100 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        {emp.name}
                        {emp.role === 'admin' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded font-semibold">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" /> {emp.department?.name || 'No Dept'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" /> {emp.designation?.name || emp.role}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-medium">
                        {permCount} Access Levels
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Permissions Matrix */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          {selectedEmployee ? (
            <>
              {/* Selected Employee Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedEmployee.name}
                    <span className="text-xs font-medium px-2.5 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full">
                      ID: {selectedEmployee.employeeId || selectedEmployee.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Dept: <span className="font-semibold">{selectedEmployee.department?.name || 'N/A'}</span> | Title:{' '}
                    <span className="font-semibold">{selectedEmployee.designation?.name || selectedEmployee.role}</span>
                  </p>
                </div>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving Changes...' : 'Save Permissions'}
                </button>
              </div>

              {/* Module Tabs */}
              <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto">
                {(['sales', 'finance', 'operations', 'admin'] as const).map(modKey => {
                  const label =
                    modKey === 'sales'
                      ? 'Sales Access Levels'
                      : modKey === 'finance'
                      ? 'Finance Access Levels'
                      : modKey === 'operations'
                      ? 'Operations Access Levels'
                      : 'Administration Access Levels';

                  const count = ALL_PERMISSIONS[modKey].filter(p => activePermissions.includes(p.key)).length;
                  const total = ALL_PERMISSIONS[modKey].length;

                  return (
                    <button
                      key={modKey}
                      onClick={() => setActiveTab(modKey)}
                      className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === modKey
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                        {count}/{total}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Module Permission Checklist */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {activeTab.toUpperCase()} PERMISSIONS
                  </span>
                  <button
                    onClick={() => selectAllModule(activeTab)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Toggle Select All {activeTab.toUpperCase()}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ALL_PERMISSIONS[activeTab].map((permItem: PermissionItem) => {
                    const isChecked = activePermissions.includes(permItem.key);

                    return (
                      <div
                        key={permItem.key}
                        onClick={() => togglePermission(permItem.key)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {permItem.label}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {permItem.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Lock className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-sm">Select an employee from the left panel to configure their Access Levels.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
