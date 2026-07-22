'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, User, Building, AlertCircle, Save, Loader2 } from 'lucide-react';
import { DEPARTMENT_PERMISSIONS } from '@/lib/permissions';

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string;
  department?: { id: number; name: string } | null;
  designation?: { id: number; name: string } | null;
}

interface AccessControlManagerProps {
  currentUser: { id: number; role: string; department?: { name: string } | null };
  users: UserItem[];
  onPermissionsUpdated?: () => void;
}

export default function AccessControlManager({ currentUser, users, onPermissionsUpdated }: AccessControlManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedUser = users.find(u => u.id === selectedUserId);

  useEffect(() => {
    if (selectedUser) {
      const rawPerms = selectedUser.permissions || '';
      const cleanPerms = rawPerms.startsWith('CUSTOM:') ? rawPerms.replace('CUSTOM:', '') : rawPerms;
      const permsArray = cleanPerms ? cleanPerms.split(',').map(p => p.trim()) : [];
      setSelectedPermissions(new Set(permsArray));
    } else {
      setSelectedPermissions(new Set());
    }
  }, [selectedUserId, selectedUser]);

  const isITOrAdmin = currentUser.role === 'admin' || currentUser.role === 'director' || currentUser.department?.name === 'IT';

  if (!isITOrAdmin) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center">
        <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Restricted Access</h3>
        <p className="text-sm text-slate-400">Only IT department members or Administrators can modify custom access level permissions.</p>
      </div>
    );
  }

  const togglePermission = (key: string) => {
    const next = new Set(selectedPermissions);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedPermissions(next);
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    setMessage(null);

    try {
      const permString = Array.from(selectedPermissions).join(',');
      // Always store with CUSTOM: prefix so getUserPermissions explicitly respects configured settings even if empty string
      const customPermPayload = `CUSTOM:${permString}`;

      const res = await fetch(`/api/v1/users/${selectedUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: customPermPayload }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Custom access levels saved successfully!' });
        if (onPermissionsUpdated) onPermissionsUpdated();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update access levels.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Custom Access Level Manager</h2>
            <p className="text-xs text-slate-400">Configure granular department permissions with instant enforcement (IT & Admin Controlled)</p>
          </div>
        </div>

        {selectedUserId && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 cursor-pointer text-xs"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Access Levels
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Select Team Member */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Team Member to Configure Permissions</label>
        <select
          value={selectedUserId || ''}
          onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
          className="w-full md:w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-amber-500/50 cursor-pointer"
        >
          <option value="">-- Choose a Team Member --</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role} - {u.department?.name || 'No Dept'})
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 font-mono uppercase">Configuring User</span>
              <h4 className="text-lg font-bold text-amber-400">{selectedUser.name}</h4>
              <p className="text-xs text-slate-400">{selectedUser.email} • {selectedUser.department?.name || 'Department Unassigned'} • {selectedUser.designation?.name || selectedUser.role}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const allKeys = [...DEPARTMENT_PERMISSIONS.sales, ...DEPARTMENT_PERMISSIONS.finance, ...DEPARTMENT_PERMISSIONS.ops].map(p => p.key);
                  setSelectedPermissions(new Set(allKeys));
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-all"
              >
                Grant All Permissions
              </button>
              <button
                type="button"
                onClick={() => setSelectedPermissions(new Set())}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs font-medium rounded-lg cursor-pointer transition-all"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Department Permission Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Sales Department */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-blue-400 text-sm uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" />
                  PSA & Sales Department
                </h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-mono font-bold">13 Levels</span>
              </div>

              <div className="space-y-2.5">
                {DEPARTMENT_PERMISSIONS.sales.map((item) => {
                  const active = selectedPermissions.has(item.key);
                  return (
                    <div
                      key={item.key}
                      onClick={() => togglePermission(item.key)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                        active
                          ? 'bg-blue-500/10 border-blue-500/40 text-slate-200 shadow-sm'
                          : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-semibold leading-relaxed pr-3">{item.label}</span>

                      {/* Interactive Toggle Switch */}
                      <div className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                        active ? 'bg-blue-500 shadow-md shadow-blue-500/30' : 'bg-slate-800 border border-slate-700/60'
                      }`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                          active ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Finance Department */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Finance Department
                </h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold">8 Levels</span>
              </div>

              <div className="space-y-2.5">
                {DEPARTMENT_PERMISSIONS.finance.map((item) => {
                  const active = selectedPermissions.has(item.key);
                  return (
                    <div
                      key={item.key}
                      onClick={() => togglePermission(item.key)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                        active
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200 shadow-sm'
                          : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-semibold leading-relaxed pr-3">{item.label}</span>

                      {/* Interactive Toggle Switch */}
                      <div className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                        active ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-800 border border-slate-700/60'
                      }`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                          active ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operations Department */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-purple-400 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Operations Department
                </h3>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-mono font-bold">8 Levels</span>
              </div>

              <div className="space-y-2.5">
                {DEPARTMENT_PERMISSIONS.ops.map((item) => {
                  const active = selectedPermissions.has(item.key);
                  return (
                    <div
                      key={item.key}
                      onClick={() => togglePermission(item.key)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                        active
                          ? 'bg-purple-500/10 border-purple-500/40 text-slate-200 shadow-sm'
                          : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-semibold leading-relaxed pr-3">{item.label}</span>

                      {/* Interactive Toggle Switch */}
                      <div className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                        active ? 'bg-purple-500 shadow-md shadow-purple-500/30' : 'bg-slate-800 border border-slate-700/60'
                      }`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                          active ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
