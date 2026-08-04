'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, User, Building, AlertCircle, Save, Loader2 } from 'lucide-react';
import { DEPARTMENT_PERMISSIONS, getDefaultPermissionsForRole } from '@/lib/permissions';
import UserSelect from '@/components/UserSelect';

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
      if (typeof rawPerms === 'string' && rawPerms.startsWith('CUSTOM:')) {
        const cleanPerms = rawPerms.replace('CUSTOM:', '');
        const permsArray = cleanPerms ? cleanPerms.split(',').map(p => p.trim()).filter(p => p !== '' && p !== 'none') : [];
        setSelectedPermissions(new Set(permsArray));
      } else {
        const baseRole = selectedUser.role.includes(':') ? selectedUser.role.split(':')[0] : selectedUser.role;
        const defaultPerms = getDefaultPermissionsForRole(baseRole);
        setSelectedPermissions(new Set(defaultPerms));
      }
    } else {
      setSelectedPermissions(new Set());
    }
  }, [selectedUserId, selectedUser]);

  const isITOrAdmin = currentUser.role === 'admin' || currentUser.role === 'director' || currentUser.department?.name === 'IT';

  if (!isITOrAdmin) {
    return (
      <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-center">
        <Lock className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Restricted Access</h3>
        <p className="text-sm text-[var(--text-secondary)]">Only IT department members or Administrators can modify custom access level permissions.</p>
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
        if (selectedUser) {
          selectedUser.permissions = customPermPayload;
        }
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
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Custom Access Level Manager</h2>
            <p className="text-xs text-[var(--text-secondary)]">Configure granular department permissions with instant enforcement (IT & Admin Controlled)</p>
          </div>
        </div>

        {selectedUserId && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 cursor-pointer text-xs border border-transparent"
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
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Select Team Member to Configure Permissions</label>
        <div className="w-full md:w-1/2">
          <UserSelect
            users={users.map(u => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              department: u.department?.name,
              designation: u.designation?.name,
            }))}
            value={selectedUserId}
            onChange={(val) => setSelectedUserId(val ? Number(val) : null)}
            placeholder="-- Select Team Member --"
          />
        </div>
      </div>

      {selectedUser && (
        <div className="space-y-6 pt-4 border-t border-[var(--border-color)]">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[var(--text-secondary)] font-mono uppercase">Configuring User</span>
              <h4 className="text-lg font-bold text-emerald-400">{selectedUser.name}</h4>
              <p className="text-xs text-[var(--text-secondary)]">{selectedUser.email} â€¢ {selectedUser.department?.name || 'Department Unassigned'} â€¢ {selectedUser.designation?.name || selectedUser.role}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const allKeys = [...DEPARTMENT_PERMISSIONS.sales, ...DEPARTMENT_PERMISSIONS.finance, ...DEPARTMENT_PERMISSIONS.ops, ...DEPARTMENT_PERMISSIONS.admin].map(p => p.key);
                  setSelectedPermissions(new Set(allKeys));
                }}
                className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-slate-750 text-[var(--text-primary)] text-xs font-medium rounded-lg cursor-pointer transition-all"
              >
                Grant All Permissions
              </button>
              <button
                type="button"
                onClick={() => setSelectedPermissions(new Set())}
                className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-slate-750 text-[var(--text-secondary)] text-xs font-medium rounded-lg cursor-pointer transition-all"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Department Permission Sections Grouped by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            {/* Helper function to render grouped department permissions */}
            {([
              { title: 'PSA & Sales Department', deptKey: 'sales', color: 'blue', icon: User, items: DEPARTMENT_PERMISSIONS.sales },
              { title: 'Finance Department', deptKey: 'finance', color: 'emerald', icon: Building, items: DEPARTMENT_PERMISSIONS.finance },
              { title: 'Operations Department', deptKey: 'ops', color: 'purple', icon: Building, items: DEPARTMENT_PERMISSIONS.ops },
              { title: 'Administration & Supervision', deptKey: 'admin', color: 'amber', icon: ShieldCheck, items: DEPARTMENT_PERMISSIONS.admin },
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
                  headerText: 'text-emerald-400',
                  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  subHeader: 'text-emerald-400/90 border-emerald-500/20 bg-emerald-950/20',
                  activeBg: 'bg-emerald-500/10 border-emerald-500/40 text-[var(--text-primary)]',
                  activeToggle: 'bg-emerald-500 shadow-emerald-500/30',
                },
                emerald: {
                  headerText: 'text-emerald-400',
                  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  subHeader: 'text-emerald-400/90 border-emerald-500/20 bg-emerald-950/20',
                  activeBg: 'bg-emerald-500/10 border-emerald-500/40 text-[var(--text-primary)]',
                  activeToggle: 'bg-emerald-500 shadow-emerald-500/30',
                },
                purple: {
                  headerText: 'text-purple-400',
                  badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  subHeader: 'text-purple-400/90 border-purple-500/20 bg-purple-950/20',
                  activeBg: 'bg-purple-500/10 border-purple-500/40 text-[var(--text-primary)]',
                  activeToggle: 'bg-purple-500 shadow-purple-500/30',
                },
                amber: {
                  headerText: 'text-amber-400',
                  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  subHeader: 'text-amber-400/90 border-amber-500/20 bg-amber-950/20',
                  activeBg: 'bg-amber-500/10 border-amber-500/40 text-[var(--text-primary)]',
                  activeToggle: 'bg-amber-500 shadow-amber-500/30',
                },
              }[color];

              return (
                <div key={deptKey} className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-5 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
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
                          <div key={groupName} className="space-y-2 border border-[var(--border-color)] bg-[var(--bg-card)]/30 p-3 rounded-xl">
                            <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-2">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
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
                                className="text-[9px] font-semibold text-[var(--text-secondary)] hover:text-emerald-400 transition-colors cursor-pointer"
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
                                        : 'bg-[var(--bg-card)]/40 border-[var(--border-color)]/60 text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--bg-card)]/70'
                                    }`}
                                  >
                                    <div className="pr-2 space-y-0.5">
                                      <p className="text-xs font-semibold leading-tight text-[var(--text-primary)]">{item.label}</p>
                                      <p className="text-[10px] text-[var(--text-muted)] leading-snug">{item.description}</p>
                                    </div>

                                    {/* Interactive Toggle Switch */}
                                    <div className={`relative shrink-0 w-8 h-4.5 rounded-full transition-colors duration-200 ease-in-out p-0.5 mt-0.5 ${
                                      active ? colorClasses.activeToggle : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
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

