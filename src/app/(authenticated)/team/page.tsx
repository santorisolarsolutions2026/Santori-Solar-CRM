'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  X,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Shield,
  Loader2,
  Lock,
  Sun,
} from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  reportsTo: number | null;
  isActive: boolean;
  lastSeenAt: string | null;
  supervisor?: { id: number; name: string } | null;
}

const ROLE_LABELS: Record<string, { label: string; class: string }> = {
  admin: { label: 'Admin (Deepak Sir)', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
  sales_head: { label: 'Sales Head', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  manager: { label: 'Manager', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  tl: { label: 'Team Leader', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  consultant: { label: 'Consultant', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  psa: { label: 'PSA Caller', class: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  finance: { label: 'Finance Team', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  operations: { label: 'Operations Team', class: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
};

export default function TeamManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [managersAndTls, setManagersAndTls] = useState<{ id: number; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add User Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'consultant',
    password: '',
    reportsTo: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch team members
  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success && data.data) {
        setMembers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch managers & TLs to populate reportsTo dropdown
  const fetchSupervisors = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success && data.data) {
        // Supervisors must be admin, sales_head, manager, or tl
        const filtered = data.data.filter((u: any) =>
          ['admin', 'sales_head', 'manager', 'tl'].includes(u.role)
        );
        setManagersAndTls(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      // Access Control: Only admin or manager
      if (!['admin', 'manager'].includes(user.role)) {
        router.push('/dashboard');
        return;
      }

      fetchTeam();
      fetchSupervisors();
    }
  }, [user]);

  // Toggle user activation status (deactivate soft-delete with reassignments)
  const handleToggleActive = async (member: TeamMember) => {
    const actionText = member.isActive ? 'deactivate' : 'reactivate';
    let warning = `Are you sure you want to ${actionText} this user profile?`;
    
    if (member.isActive && member.role === 'consultant') {
      warning = `Warning: Deactivating Consultant "${member.name}" will automatically reassign all their active leads up the hierarchy to their Team Leader (TL). Do you want to proceed?`;
    }

    if (!window.confirm(warning)) return;

    try {
      const res = await fetch(`/api/v1/users/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      
      const data = await res.json();
      if (data.success) {
        alert(data.message || `User status changed successfully.`);
        fetchTeam();
      } else {
        alert(data.message || 'Failed to update user status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add User submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setForm({
          name: '',
          email: '',
          phone: '',
          role: 'consultant',
          password: '',
          reportsTo: '',
        });
        fetchTeam();
        alert('Team member registered successfully!');
      } else {
        setFormError(data.message || 'Failed to register team member.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Internal server error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <Sun className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Team & Access Control</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage user profiles, assign roles, and handle account deactivations.
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Users table card */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Full Name</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Contact Number</th>
                <th className="py-4 px-6">Assigned System Role</th>
                <th className="py-4 px-6">Direct Supervisor</th>
                <th className="py-4 px-6 text-center">Status</th>
                {user?.role === 'admin' && <th className="py-4 px-6 text-center">Control</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No team members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const roleConfig = ROLE_LABELS[member.role] || { label: member.role, class: 'bg-slate-500/15' };
                  
                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-900/10 transition-colors ${
                        !member.isActive ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                        <span>{member.name}</span>
                        {member.id === user?.id && (
                          <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded px-1.5 font-extrabold uppercase">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-mono text-xs">{member.email}</td>
                      <td className="py-4 px-6 text-slate-300 font-mono text-xs">{member.phone || '-'}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${roleConfig.class}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {member.supervisor?.name || <span className="text-slate-600 text-xs italic">None</span>}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${
                            member.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {member.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      {user?.role === 'admin' && (
                        <td className="py-4 px-6 text-center">
                          {member.id !== user.id ? (
                            <button
                              onClick={() => handleToggleActive(member)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                member.isActive
                                  ? 'bg-red-950/20 text-red-400 border-red-900/30 hover:bg-red-950/40'
                                  : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30 hover:bg-emerald-950/40'
                              }`}
                              title={member.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                            >
                              {member.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs italic">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Add User Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Register New Team Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ramesh Singh"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. ramesh@solarcrm.com"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Contact number"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">System Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="sales_head">Sales Head</option>
                    <option value="manager">Manager</option>
                    <option value="tl">Team Leader (TL)</option>
                    <option value="consultant">Consultant</option>
                    <option value="psa">PSA Caller</option>
                    <option value="finance">Finance Team</option>
                    <option value="operations">Operations Team</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Direct Supervisor (Reports To)</label>
                  <select
                    value={form.reportsTo}
                    onChange={(e) => setForm({ ...form, reportsTo: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                  >
                    <option value="">No Supervisor (Reports to Admin)</option>
                    {managersAndTls.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-800/80 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      <span>Register Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
