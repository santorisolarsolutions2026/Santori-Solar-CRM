'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  PackageCheck,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Zap,
  IndianRupee,
  Building,
  CheckCircle2,
  X,
  FileText,
  CreditCard,
  Wrench,
  Download,
  Image,
  Loader2,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  ChevronDown,
  Check
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

interface CompletedOrder {
  id: number;
  orderCode: string;
  connectionNumber: string;
  systemSizeKw: number;
  totalValue: number;
  downPayment: number;
  paymentMethod: string;
  remainingMethod: string;
  financeProvider: string | null;
  clientType: string;
  subsidyApplicable: boolean;
  subsidyAmount: number | null;
  status: string;
  opsStage: number;
  deliveryDate: string | null;
  actualDeliveryAt: string | null;
  installationDate: string | null;
  actualInstallationAt: string | null;
  isMeterInstalled: boolean;
  actualMeterInstalledAt: string | null;
  isCommissioned: boolean;
  actualCommissionedAt: string | null;
  isSubsidyApplied: boolean;
  actualSubsidyAppliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalPaid: number;
  balanceOutstanding: number;
  lead: {
    id: number;
    leadCode: string;
    customerName: string;
    mobile: string;
    mobileAlt: string | null;
    city: string;
    state: string;
    address: string;
    pinCode: string;
    sanctionedLoadKw: number | null;
    connectionType: string;
    leadSource: string | null;
    discomName: string | null;
  };
  submittedBy: { id: number; name: string; role: string };
  financeProcessedBy: { id: number; name: string } | null;
  assignedFinance: { id: number; name: string } | null;
  assignedOps: { id: number; name: string } | null;
  payments: {
    id: number;
    amount: number;
    paymentMethod: string;
    transactionRef: string | null;
    paymentDate: string;
    remarks: string | null;
    isDiscarded: boolean;
    recordedBy: { id: number; name: string };
  }[];
  documents: {
    id: number;
    docType: string;
    fileName: string;
    mimeType: string;
    filePath: string;
  }[];
  installationImages: {
    id: number;
    status: string;
    filePath: string;
    fileName: string;
  }[];
}

export default function CompletedOrdersPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!hasPermission('ops:delivered_orders')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-lg mt-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">
          You do not have the required custom access permission (Show Delivered Orders) to view Completed Orders. Please contact your administrator.
        </p>
      </div>
    );
  }

  // Filter states
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'team' | 'my' | 'all'>('team');
  const [clientType, setClientType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string; department?: { name: string } }[]>([]);
  
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateCitiesMap, setStateCitiesMap] = useState<Record<string, string[]>>({});
  const [dateShortcut, setDateShortcut] = useState('all');

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
      fetchLocations();
    }
  }, [user]);

  const fetchLocations = async () => {
    try {
      const cached = sessionStorage.getItem('stateCitiesMap');
      if (cached) {
        setStateCitiesMap(JSON.parse(cached));
        return;
      }
      const res = await fetch('/api/v1/leads/locations');
      const data = await res.json();
      if (data.success && data.data) {
        setStateCitiesMap(data.data);
        sessionStorage.setItem('stateCitiesMap', JSON.stringify(data.data));
      }
    } catch (e) {
      console.error('Failed to fetch locations', e);
    }
  };

  const applyDateShortcut = (shortcut: string) => {
    setDateShortcut(shortcut);

    if (shortcut === 'all' || shortcut === 'custom') {
      if (shortcut === 'all') {
        setStartDate('');
        setEndDate('');
      }
      return;
    }

    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (shortcut === 'today') {
      const dateStr = formatDate(today);
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (shortcut === 'this_week') {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(today.setDate(diff));
      const endOfWeek = new Date();
      setStartDate(formatDate(startOfWeek));
      setEndDate(formatDate(endOfWeek));
    } else if (shortcut === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date();
      setStartDate(formatDate(startOfMonth));
      setEndDate(formatDate(endOfMonth));
    }
  };

  useEffect(() => {
    fetchCompletedOrders();
  }, [scope, clientType, startDate, endDate, selectedMemberFilter, stateFilter, cityFilter]);

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      const userList = data.data || data.users;
      if (data.success && Array.isArray(userList)) {
        setTeamMembers(userList);
      }
    } catch (e) {
      console.error('Failed to fetch team members', e);
    }
  };

  const fetchCompletedOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('scope', scope);
      if (clientType !== 'all') params.append('clientType', clientType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (stateFilter) params.append('state', stateFilter);
      if (cityFilter) params.append('city', cityFilter);
      if (selectedMemberFilter) params.append('memberId', selectedMemberFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/v1/orders/completed?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to load completed orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCompletedOrders();
  };

  // Aggregate stats
  const totalCompletedCount = orders.length;
  const totalKwInstalled = orders.reduce((sum, o) => sum + (o.systemSizeKw || 0), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <PackageCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">Completed Orders Portal</h1>
              <p className="text-sm text-[var(--text-secondary)]">Comprehensive audit trail of fully commissioned and completed solar installations</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl text-center">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">Total Orders</span>
            <span className="text-lg font-bold text-white">{totalCompletedCount}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl text-center">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">Installed Capacity</span>
            <span className="text-lg font-bold text-emerald-400">{totalKwInstalled.toFixed(1)} kW</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl text-center">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">Total Value</span>
            <span className="text-lg font-bold text-emerald-400">₹{(totalRevenue / 100000).toFixed(2)}L</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Filtering Controls */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          {/* Scope Toggle */}
          <div className="flex items-center bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)] text-xs">
            <button
              onClick={() => setScope('team')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                scope === 'team' ? 'bg-emerald-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              My Team's Orders
            </button>
            <button
              onClick={() => setScope('my')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                scope === 'my' ? 'bg-emerald-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              My Assigned
            </button>
            {(user?.role === 'admin' || user?.role === 'director' || user?.department?.name === 'IT') && (
              <button
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  scope === 'all' ? 'bg-emerald-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                All System Orders
              </button>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by Code, Customer Name, Mobile, City..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-sm active:bg-emerald-800"
            >
              Search
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Team Member Filter */}
          <div>
            <label className="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1">Filter by Team Member</label>
            <CustomDropdown
              options={[
                { value: '', label: 'All Team Members' },
                ...teamMembers.map(m => ({ value: String(m.id), label: m.name }))
              ]}
              value={selectedMemberFilter}
              onChange={(val) => setSelectedMemberFilter(val)}
              className="w-full"
            />
          </div>

          {/* Client Type Filter */}
          <div>
            <label className="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1">Client / System Type</label>
            <CustomDropdown
              options={[
                { value: 'all', label: 'All System Types' },
                { value: 'on_grid', label: 'On-Grid Solar' },
                { value: 'off_grid', label: 'Off-Grid Solar' },
                { value: 'hybrid', label: 'Hybrid Solar' }
              ]}
              value={clientType}
              onChange={(val) => setClientType(val)}
              className="w-full"
            />
          </div>

          {/* Date Shortcut Select */}
          <div>
            <label className="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1">Date Shortcut</label>
            <CustomDropdown
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'this_week', label: 'This Week' },
                { value: 'this_month', label: 'This Month' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              value={dateShortcut}
              onChange={(val) => applyDateShortcut(val)}
              className="w-full"
            />
          </div>

          {/* Custom State Dropdown */}
          <div>
            <label className="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1">State Name</label>
            <CustomDropdown
              options={[
                { value: '', label: 'All States' },
                ...Object.keys(stateCitiesMap).map(state => ({ value: state, label: state }))
              ]}
              value={stateFilter}
              onChange={(val) => {
                setStateFilter(val);
                if (val && stateCitiesMap[val] && !stateCitiesMap[val].includes(cityFilter)) {
                  setCityFilter('');
                }
              }}
              className="w-full"
              placeholder="All States"
            />
          </div>

          {/* Custom City Dropdown */}
          <div>
            <label className="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1">City Name</label>
            <CustomDropdown
              options={[
                { value: '', label: 'All Cities' },
                ...(stateFilter && stateCitiesMap[stateFilter]
                  ? stateCitiesMap[stateFilter]
                  : Array.from(new Set(Object.values(stateCitiesMap).flat()))
                ).map(city => ({ value: city, label: city }))
              ]}
              value={cityFilter}
              onChange={(val) => setCityFilter(val)}
              className="w-full"
              placeholder="All Cities"
            />
          </div>
        </div>

        {/* Custom Date Range Picker inputs (Only shown when dateShortcut === 'custom') */}
        {dateShortcut === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-3 border-t border-[var(--border-color)]/60 animate-fade-in">
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[var(--text-secondary)] uppercase mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-secondary)] flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-medium">Loading completed orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">
            <PackageCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Completed Orders Found</h3>
            <p className="text-xs text-[var(--text-muted)]">Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="table-header-row text-[11px] font-mono uppercase text-[var(--text-muted)] dark:text-[var(--text-secondary)]">
                  <th className="p-4">Order Code / Lead</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">System Size</th>
                  <th className="p-4">Total Value</th>
                  <th className="p-4">Sales / Finance / Ops</th>
                  <th className="p-4">Commissioned Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-[var(--text-primary)]">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-[var(--bg-card)] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-emerald-400 font-mono">{order.orderCode}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">Lead: {order.lead.leadCode}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{order.lead.customerName}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{order.lead.mobile} • {order.lead.city}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      {order.systemSizeKw} kW
                      <span className="block text-[10px] text-[var(--text-secondary)] font-normal uppercase">{order.clientType.replace('_', '-')}</span>
                    </td>
                    <td className="p-4 font-mono">
                      <span className="font-bold text-emerald-400">₹{order.totalValue.toLocaleString()}</span>
                      <span className="block text-[10px] text-[var(--text-muted)]">Paid: ₹{order.totalPaid.toLocaleString()}</span>
                    </td>
                    <td className="p-4 space-y-0.5 text-[11px]">
                      <div><span className="text-[var(--text-muted)]">Sales:</span> {order.submittedBy?.name || '-'}</div>
                      <div><span className="text-[var(--text-muted)]">Fin:</span> {order.assignedFinance?.name || order.financeProcessedBy?.name || '-'}</div>
                      <div><span className="text-[var(--text-muted)]">Ops:</span> {order.assignedOps?.name || '-'}</div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-[var(--text-secondary)]">
                      {order.actualCommissionedAt ? new Date(order.actualCommissionedAt).toLocaleDateString() : new Date(order.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Full Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-main)] backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6 md:p-8 relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-6 right-6 p-2 bg-[var(--bg-card)] hover:bg-slate-700 rounded-full text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-[var(--border-color)] pb-5">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{selectedOrder.orderCode}</h2>
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase rounded-full">Completed & Commissioned</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Lead Reference: {selectedOrder.lead.leadCode} • Customer: {selectedOrder.lead.customerName}</p>
              </div>
            </div>

            {/* Grid Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Customer Info */}
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)] space-y-2">
                <h4 className="font-bold text-emerald-400 uppercase font-mono text-[10px]">Customer & Site Info</h4>
                <div className="text-white font-semibold">{selectedOrder.lead.customerName}</div>
                <div className="text-[var(--text-secondary)]">Phone: {selectedOrder.lead.mobile}</div>
                <div className="text-[var(--text-secondary)]">Address: {selectedOrder.lead.address}, {selectedOrder.lead.city}, {selectedOrder.lead.state} - {selectedOrder.lead.pinCode}</div>
                {selectedOrder.lead.discomName && <div className="text-[var(--text-secondary)]">Discom: {selectedOrder.lead.discomName}</div>}
              </div>

              {/* System Info */}
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)] space-y-2">
                <h4 className="font-bold text-emerald-400 uppercase font-mono text-[10px]">Solar System Specification</h4>
                <div className="text-white font-semibold">{selectedOrder.systemSizeKw} kW Solar Plant</div>
                <div className="text-[var(--text-secondary)]">Type: {selectedOrder.clientType.replace('_', ' ').toUpperCase()}</div>
                <div className="text-[var(--text-secondary)]">Connection #: {selectedOrder.connectionNumber}</div>
                <div className="text-[var(--text-secondary)]">Subsidy: {selectedOrder.subsidyApplicable ? `Applicable (₹${selectedOrder.subsidyAmount || 0})` : 'Not Applicable'}</div>
              </div>

              {/* Stakeholders */}
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)] space-y-2">
                <h4 className="font-bold text-emerald-400 uppercase font-mono text-[10px]">Department Handlers</h4>
                <div className="text-[var(--text-primary)]"><span className="text-[var(--text-muted)]">Sales Member:</span> {selectedOrder.submittedBy?.name || '-'}</div>
                <div className="text-[var(--text-primary)]"><span className="text-[var(--text-muted)]">Finance Member:</span> {selectedOrder.assignedFinance?.name || selectedOrder.financeProcessedBy?.name || '-'}</div>
                <div className="text-[var(--text-primary)]"><span className="text-[var(--text-muted)]">Operations Member:</span> {selectedOrder.assignedOps?.name || '-'}</div>
              </div>
            </div>

            {/* Financial Ledger Section */}
            <div className="bg-[var(--bg-main)] p-5 rounded-2xl border border-[var(--border-color)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Financial Ledger & Payment History
                </h4>
                <div className="text-xs font-mono">
                  <span className="text-[var(--text-secondary)]">Total Value: </span>
                  <span className="text-emerald-400 font-bold">₹{selectedOrder.totalValue.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                <div className="space-y-2">
                  {selectedOrder.payments.map(p => (
                    <div key={p.id} className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">₹{p.amount.toLocaleString()}</span>
                        <span className="text-[var(--text-secondary)] ml-2 font-mono text-[10px] uppercase">[{p.paymentMethod}]</span>
                        {p.transactionRef && <span className="text-[var(--text-muted)] ml-2 text-[10px]">Ref: {p.transactionRef}</span>}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        Recorded by {p.recordedBy?.name} on {new Date(p.paymentDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[var(--text-muted)] italic">No payments recorded.</div>
              )}
            </div>

            {/* Operations Lifecycle Milestones */}
            <div className="bg-[var(--bg-main)] p-5 rounded-2xl border border-[var(--border-color)] space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                <Wrench className="w-4 h-4 text-purple-400" />
                Operations Lifecycle Milestones
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">1. Delivery</span>
                  <span className="font-bold text-emerald-400 block mt-1">Delivered</span>
                </div>
                <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">2. Installation</span>
                  <span className="font-bold text-emerald-400 block mt-1">Installed</span>
                </div>
                <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">3. Metering</span>
                  <span className="font-bold text-emerald-400 block mt-1">Metered</span>
                </div>
                <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">4. Commissioning</span>
                  <span className="font-bold text-emerald-400 block mt-1">Commissioned</span>
                </div>
                <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block font-mono">5. Subsidy</span>
                  <span className="font-bold text-emerald-400 block mt-1">{selectedOrder.isSubsidyApplied ? 'Applied' : 'Complete'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
