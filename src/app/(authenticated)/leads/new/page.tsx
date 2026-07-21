'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Sun, ArrowLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewLeadPage() {
  const { user, hasPermission } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    customerName: '',
    mobile: '',
    mobileAlt: '',
    connectionType: 'residential',
    sanctionedLoadKw: '',
    address: '',
    pinCode: '',
    city: '',
    state: '',
    leadSource: 'whatsapp',
    assignedManagerId: '',
    assignedTlId: '',
    assignedConsultantId: '',
    notes: '',
    discomName: '',
    connectionNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // List of active employees for allocation selectors
  const [employees, setEmployees] = useState<any[]>([]);

  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');

  useEffect(() => {
    const val = form.assignedConsultantId || form.assignedTlId || form.assignedManagerId;
    if (val) {
      setSelectedAssigneeId(val);
    }
  }, [form.assignedConsultantId, form.assignedTlId, form.assignedManagerId]);

  const handleSelectAssignee = (userIdStr: string) => {
    setSelectedAssigneeId(userIdStr);
    if (!userIdStr) {
      setForm((prev) => ({
        ...prev,
        assignedManagerId: '',
        assignedTlId: '',
        assignedConsultantId: '',
      }));
      return;
    }

    const userId = parseInt(userIdStr, 10);
    const targetUser = employees.find(u => u.id === userId);
    if (!targetUser) return;

    const level = targetUser.designation?.level ?? 6;
    if (level <= 3) {
      setForm((prev) => ({
        ...prev,
        assignedManagerId: userIdStr,
        assignedTlId: '',
        assignedConsultantId: '',
      }));
    } else if (level === 4) {
      setForm((prev) => ({
        ...prev,
        assignedManagerId: '',
        assignedTlId: userIdStr,
        assignedConsultantId: '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        assignedManagerId: '',
        assignedTlId: '',
        assignedConsultantId: userIdStr,
      }));
    }
  };

  // Filter Sales & Marketing department users (and admin)
  const isSalesOrAdmin = (emp: any) => {
    const deptName = emp.department?.name || '';
    const isSales = deptName === 'Sales' || deptName === 'Sales & Marketing';
    const isAdmin = emp.role === 'admin' || emp.designation?.name === 'Admin';
    return isSales || isAdmin;
  };

  const managers = employees.filter((emp) => {
    if (!isSalesOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    const roleLower = emp.role.toLowerCase();
    return desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || roleLower === 'admin';
  });

  const tls = employees.filter((emp) => {
    if (!isSalesOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    const roleLower = emp.role.toLowerCase();
    return desName.includes('TL') || desName.includes('Team Leader') || desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || roleLower === 'admin';
  });

  const consultants = employees.filter((emp) => {
    if (!isSalesOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    const roleLower = emp.role.toLowerCase();
    return desName.includes('Consultant') || desName.includes('TL') || desName.includes('Team Leader') || desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || roleLower === 'admin';
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem('solar_crm_new_lead_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setForm((prev) => ({
            ...prev,
            ...parsed,
          }));
        } catch (e) {
          console.error('Error parsing lead draft:', e);
        }
      }
      setIsDataLoaded(true);
    }
  }, []);

  // Save form changes to localStorage
  useEffect(() => {
    if (isDataLoaded && typeof window !== 'undefined') {
      localStorage.setItem('solar_crm_new_lead_draft', JSON.stringify(form));
    }
  }, [form, isDataLoaded]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/v1/users');
        const data = await res.json();
        if (data.success) {
          const activeEmployees = data.data.filter((u: any) => u.isActive);
          setEmployees(activeEmployees);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (user) fetchUsers();
  }, [user]);

  // Inline Duplicate Check on phone entry (debounced or blur)
  const handlePhoneBlur = async () => {
    const cleanPhone = form.mobile.replace(/[\s-]/g, '');
    if (cleanPhone.length !== 10) {
      setDuplicateWarning('');
      setShowOverride(false);
      return;
    }

    setCheckingDuplicate(true);
    setDuplicateWarning('');
    setShowOverride(false);

    try {
      // Query database if lead with phone number exists
      const res = await fetch(`/api/v1/leads?search=${cleanPhone}`);
      const data = await res.json();
      if (data.success && data.data?.leads.length > 0) {
        const existing = data.data.leads[0];
        const assignedName = existing.consultant?.name || 'Unassigned';
        setDuplicateWarning(
          `A lead with this number already exists. Lead ID: #${existing.leadCode} — assigned to ${assignedName}.`
        );
        if (hasPermission('leads:edit') || user?.role === 'admin') {
          setShowOverride(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // Auto pincode loader
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value;
    setForm({ ...form, pinCode: pin });

    if (pin.length === 6 && /^\d+$/.test(pin)) {
      try {
        // Fetch city/state from postoffices API (or mock for speed)
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0]?.Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          setForm((prev) => ({
            ...prev,
            pinCode: pin,
            city: postOffice.District,
            state: postOffice.State,
          }));
        }
      } catch (err) {
        console.error('Pincode fetch error:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateWarning && !overrideDuplicate) {
      alert('Cannot create duplicate lead. Check warning.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          overrideDuplicate,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('solar_crm_new_lead_draft');
        }
        alert('Lead added successfully!');
        router.push(`/leads/${data.data.id}`);
      } else {
        alert(data.message || 'Failed to create lead.');
      }
    } catch (err) {
      console.error(err);
      alert('Internal server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header back anchor */}
      <div className="flex items-center gap-3">
        <Link
          href="/leads"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Create New Sales Lead</h1>
          <p className="text-xs text-slate-400 mt-1">Form A: Add Lead details and assign team pool.</p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-5%] w-[40%] h-[150%] rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          {/* Customer name and phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Customer Full Name *
              </label>
              <input
                type="text"
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="e.g. Rajesh Singhania"
                className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Mobile Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  onBlur={handlePhoneBlur}
                  placeholder="10-digit number"
                  className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none font-mono"
                />
                {checkingDuplicate && (
                  <span className="absolute right-3 top-2.5">
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Duplicate warnings alerts */}
          {duplicateWarning && (
            <div className="p-4 bg-red-950/40 border border-red-900 rounded-lg text-red-200 text-xs flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
              {showOverride && (
                <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overrideDuplicate}
                    onChange={(e) => setOverrideDuplicate(e.target.checked)}
                    className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 text-red-600 focus:ring-0 rounded"
                  />
                  <span className="font-semibold text-[11px] text-red-300">
                    Admin Override: Create this duplicate lead anyway.
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Alternate Mobile and Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Alternate Mobile
              </label>
              <input
                type="text"
                value={form.mobileAlt}
                onChange={(e) => setForm({ ...form, mobileAlt: e.target.value })}
                placeholder="Alternate phone"
                className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Lead Source
              </label>
              <select
                value={form.leadSource}
                onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
                className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="cold_call">Cold Call</option>
                <option value="referral">Referral</option>
                <option value="walk_in">Walk-In</option>
                <option value="google_ad">Google Ad</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Connection and Load */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Connection Type
              </label>
              <select
                value={form.connectionType}
                onChange={(e) => setForm({ ...form, connectionType: e.target.value })}
                className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Sanctioned Load (kW)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.sanctionedLoadKw}
                onChange={(e) => setForm({ ...form, sanctionedLoadKw: e.target.value })}
                placeholder="kW from electricity bill"
                className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
              />
            </div>
          </div>

          {/* DisCom Name and Connection Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                DisCom Name
              </label>
              <input
                type="text"
                value={form.discomName}
                onChange={(e) => setForm({ ...form, discomName: e.target.value })}
                placeholder="e.g. UPPCL"
                className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Connection Number
              </label>
              <input
                type="text"
                value={form.connectionNumber}
                onChange={(e) => setForm({ ...form, connectionNumber: e.target.value })}
                placeholder="Consumer/Connection Number"
                className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Address details */}
          <div className="space-y-4 border-t border-slate-800/80 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Site Location Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Full Street Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House number, flat, apartment, street address details..."
                  className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs h-16 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  value={form.pinCode}
                  onChange={handlePincodeChange}
                  placeholder="6-digit pincode"
                  className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-lg text-white text-xs focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Optional Initial Assignments (Admins or authorized team members can assign) */}
          <div className="space-y-4 border-t border-slate-800/80 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Team Allocation</h3>
              {!(hasPermission('leads:assign') || user?.role === 'admin' || user?.role === 'director' || user?.role?.startsWith('admin:')) && (
                <span className="text-[10px] text-slate-500 italic">🔒 Team allocation restricted</span>
              )}
            </div>

            {(hasPermission('leads:assign') || user?.role === 'admin' || user?.role === 'director' || user?.role?.startsWith('admin:')) ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Assign Sales or PSA Operator
                </label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => handleSelectAssignee(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-350 text-xs focus:ring-amber-500"
                >
                  <option value="">Select Member</option>
                  {employees.filter((emp) => {
                    const deptName = (emp.department?.name || '').toLowerCase();
                    const roleLower = (emp.role || '').toLowerCase();
                    const isSalesOrPsaDept = deptName.includes('sales') || deptName.includes('marketing') || deptName.includes('psa');
                    const isSalesOrPsaRole = roleLower.includes('sales') || roleLower.includes('psa') || roleLower.includes('consultant');
                    return isSalesOrPsaDept || isSalesOrPsaRole;
                  }).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department?.name || 'Shared'} - {emp.designation?.name || emp.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg text-slate-400 text-xs italic">
                You do not have custom permission to manually assign team members to leads. Lead will be registered in your default pool.
              </div>
            )}
          </div>

          {/* Initial remark */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Initial Remarks / Caller Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Initial details about client requirements..."
              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs h-20 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4 border-t border-slate-800/80">
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-lg shadow-amber-500/10 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Lead Opportunity...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Register Lead Opportunity</span>
                </>
              )}
            </button>
            <Link
              href="/leads"
              className="py-3 px-6 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs hover:text-white flex items-center justify-center transition-all"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
