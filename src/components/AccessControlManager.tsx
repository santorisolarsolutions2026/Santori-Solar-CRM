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

          {/* Department Permission Sections Grouped by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Helper function to render grouped department permissions */}
            {([
              { title: 'PSA & Sales Department', deptKey: 'sales', color: 'blue', icon: User, items: DEPARTMENT_PERMISSIONS.sales },
              { title: 'Finance Department', deptKey: 'finance', color: 'emerald', icon: Building, items: DEPARTMENT_PERMISSIONS.finance },
              { title: 'Operations Department', deptKey: 'ops', color: 'purple', icon: Building, items: DEPARTMENT_PERMISSIONS.ops },
            ] as const).map(({ title, deptKey, color, icon: DeptIcon, items }) => {
              const activeCount = items.filter(i => selectedPermissions.has(i.key)).length;
              
              // Group items by item.group
              const grouped = items.reduce((acc, item) => {
                if (!acc[item.group]) acc[item.group] = [];
                acc[item.group].push(item);
                return acc;
              }, {} as Record<string, typeof items>);

              const colorClasses = {
                blue: {
                  headerText: 'text-blue-400',
                  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  subHeader: 'text-blue-400/90 border-blue-500/20 bg-blue-950/20',
                  activeBg: 'bg-blue-500/10 border-blue-500/40 text-slate-200',
                  activeToggle: 'bg-blue-500 shadow-blue-500/30',
                },
                emerald: {
                  headerText: 'text-emerald-400',
                  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  subHeader: 'text-emerald-400/90 border-emerald-500/20 bg-emerald-950/20',
                  activeBg: 'bg-emerald-500/10 border-emerald-500/40 text-slate-200',
                  activeToggle: 'bg-emerald-500 shadow-emerald-500/30',
                },
                purple: {
                  headerText: 'text-purple-400',
                  badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  subHeader: 'text-purple-400/90 border-purple-500/20 bg-purple-950/20',
                  activeBg: 'bg-purple-500/10 border-purple-500/40 text-slate-200',
                  activeToggle: 'bg-purple-500 shadow-purple-500/30',
                },
              }[color];

              return (
                <div key={deptKey} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className={`font-bold ${colorClasses.headerText} text-sm uppercase tracking-wider flex items-center gap-2`}>
                        <DeptIcon className="w-4 h-4" />
                        {title}
                      </h3>
                      <span className={`text-[10px] ${colorClasses.badge} border px-2 py-0.5 rounded-full font-mono font-bold`}>
                        {activeCount} / {items.length} Active
                      </span>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(grouped).map(([groupName, groupItems]) => {
                        const allGroupActive = groupItems.every(gi => selectedPermissions.has(gi.key));

                        return (
                          <div key={groupName} className="space-y-2 border border-slate-850/80 bg-slate-900/30 p-3 rounded-xl">
                            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                {groupName}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = new Set(selectedPermissions);
                                  if (allGroupActive) {
                                    groupItems.forEach(gi => next.delete(gi.key));
                                  } else {
                                    groupItems.forEach(gi => next.add(gi.key));
                                  }
                                  setSelectedPermissions(next);
                                }}
                                className="text-[9px] font-semibold text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                              >
                                {allGroupActive ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>

                            <div className="space-y-2 pt-1">
                              {groupItems.map((item) => {
                                const active = selectedPermissions.has(item.key);
                                return (
                                  <div
                                    key={item.key}
                                    onClick={() => togglePermission(item.key)}
                                    className={`flex items-start justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                                      active
                                        ? colorClasses.activeBg
                                        : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900/70'
                                    }`}
                                  >
                                    <div className="pr-2 space-y-0.5">
                                      <p className="text-xs font-semibold leading-tight text-slate-200">{item.label}</p>
                                      <p className="text-[10px] text-slate-500 leading-snug">{item.description}</p>
                                    </div>

                                    {/* Interactive Toggle Switch */}
                                    <div className={`relative shrink-0 w-8 h-4.5 rounded-full transition-colors duration-200 ease-in-out p-0.5 mt-0.5 ${
                                      active ? colorClasses.activeToggle : 'bg-slate-800 border border-slate-700/60'
                                    }`}>
                                      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                                        active ? 'translate-x-3.5' : 'translate-x-0'
                                      }`} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}
    </div>
  );
}

