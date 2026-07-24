'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldAlert
} from 'lucide-react';

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!hasPermission('ops:delivered_orders')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[#111625] border border-slate-800 rounded-xl shadow-lg mt-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-md">
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

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    fetchCompletedOrders();
  }, [scope, clientType, startDate, endDate, selectedMemberFilter]);

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success && data.users) {
        setTeamMembers(data.users);
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
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <PackageCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">Completed Orders Portal</h1>
              <p className="text-sm text-slate-400">Comprehensive audit trail of fully commissioned and completed solar installations</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Orders</span>
            <span className="text-lg font-bold text-white">{totalCompletedCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Installed Capacity</span>
            <span className="text-lg font-bold text-amber-400">{totalKwInstalled.toFixed(1)} kW</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Value</span>
            <span className="text-lg font-bold text-emerald-400">₹{(totalRevenue / 100000).toFixed(2)}L</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Filtering Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          {/* Scope Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setScope('team')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                scope === 'team' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Team's Orders
            </button>
            <button
              onClick={() => setScope('my')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                scope === 'my' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Assigned
            </button>
            {(user?.role === 'admin' || user?.role === 'director' || user?.department?.name === 'IT') && (
              <button
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  scope === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                All System Orders
              </button>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by Code, Customer Name, Mobile, City..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all"
            >
              Search
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Team Member Filter */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Filter by Team Member</label>
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Team Members</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Client Type Filter */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Client / System Type</label>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All System Types</option>
              <option value="on_grid">On-Grid Solar</option>
              <option value="off_grid">Off-Grid Solar</option>
              <option value="hybrid">Hybrid Solar</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm font-medium">Loading completed orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <PackageCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Completed Orders Found</h3>
            <p className="text-xs text-slate-500">Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <th className="p-4">Order Code / Lead</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">System Size</th>
                  <th className="p-4">Total Value</th>
                  <th className="p-4">Sales / Finance / Ops</th>
                  <th className="p-4">Commissioned Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-amber-400 font-mono">{order.orderCode}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Lead: {order.lead.leadCode}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{order.lead.customerName}</div>
                      <div className="text-[11px] text-slate-400">{order.lead.mobile} • {order.lead.city}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-300">
                      {order.systemSizeKw} kW
                      <span className="block text-[10px] text-slate-400 font-normal uppercase">{order.clientType.replace('_', '-')}</span>
                    </td>
                    <td className="p-4 font-mono">
                      <span className="font-bold text-emerald-400">₹{order.totalValue.toLocaleString()}</span>
                      <span className="block text-[10px] text-slate-500">Paid: ₹{order.totalPaid.toLocaleString()}</span>
                    </td>
                    <td className="p-4 space-y-0.5 text-[11px]">
                      <div><span className="text-slate-500">Sales:</span> {order.submittedBy?.name || '-'}</div>
                      <div><span className="text-slate-500">Fin:</span> {order.assignedFinance?.name || order.financeProcessedBy?.name || '-'}</div>
                      <div><span className="text-slate-500">Ops:</span> {order.assignedOps?.name || '-'}</div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {order.actualCommissionedAt ? new Date(order.actualCommissionedAt).toLocaleDateString() : new Date(order.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-semibold rounded-xl text-xs transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6 md:p-8 relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{selectedOrder.orderCode}</h2>
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase rounded-full">Completed & Commissioned</span>
                </div>
                <p className="text-xs text-slate-400">Lead Reference: {selectedOrder.lead.leadCode} • Customer: {selectedOrder.lead.customerName}</p>
              </div>
            </div>

            {/* Grid Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Customer Info */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-400 uppercase font-mono text-[10px]">Customer & Site Info</h4>
                <div className="text-white font-semibold">{selectedOrder.lead.customerName}</div>
                <div className="text-slate-400">Phone: {selectedOrder.lead.mobile}</div>
                <div className="text-slate-400">Address: {selectedOrder.lead.address}, {selectedOrder.lead.city}, {selectedOrder.lead.state} - {selectedOrder.lead.pinCode}</div>
                {selectedOrder.lead.discomName && <div className="text-slate-400">Discom: {selectedOrder.lead.discomName}</div>}
              </div>

              {/* System Info */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-400 uppercase font-mono text-[10px]">Solar System Specification</h4>
                <div className="text-white font-semibold">{selectedOrder.systemSizeKw} kW Solar Plant</div>
                <div className="text-slate-400">Type: {selectedOrder.clientType.replace('_', ' ').toUpperCase()}</div>
                <div className="text-slate-400">Connection #: {selectedOrder.connectionNumber}</div>
                <div className="text-slate-400">Subsidy: {selectedOrder.subsidyApplicable ? `Applicable (₹${selectedOrder.subsidyAmount || 0})` : 'Not Applicable'}</div>
              </div>

              {/* Stakeholders */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-400 uppercase font-mono text-[10px]">Department Handlers</h4>
                <div className="text-slate-300"><span className="text-slate-500">Sales Member:</span> {selectedOrder.submittedBy?.name || '-'}</div>
                <div className="text-slate-300"><span className="text-slate-500">Finance Member:</span> {selectedOrder.assignedFinance?.name || selectedOrder.financeProcessedBy?.name || '-'}</div>
                <div className="text-slate-300"><span className="text-slate-500">Operations Member:</span> {selectedOrder.assignedOps?.name || '-'}</div>
              </div>
            </div>

            {/* Financial Ledger Section */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Financial Ledger & Payment History
                </h4>
                <div className="text-xs font-mono">
                  <span className="text-slate-400">Total Value: </span>
                  <span className="text-emerald-400 font-bold">₹{selectedOrder.totalValue.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                <div className="space-y-2">
                  {selectedOrder.payments.map(p => (
                    <div key={p.id} className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">₹{p.amount.toLocaleString()}</span>
                        <span className="text-slate-400 ml-2 font-mono text-[10px] uppercase">[{p.paymentMethod}]</span>
                        {p.transactionRef && <span className="text-slate-500 ml-2 text-[10px]">Ref: {p.transactionRef}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Recorded by {p.recordedBy?.name} on {new Date(p.paymentDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">No payments recorded.</div>
              )}
            </div>

            {/* Operations Lifecycle Milestones */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                <Wrench className="w-4 h-4 text-purple-400" />
                Operations Lifecycle Milestones
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">1. Delivery</span>
                  <span className="font-bold text-emerald-400 block mt-1">Delivered</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">2. Installation</span>
                  <span className="font-bold text-emerald-400 block mt-1">Installed</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">3. Metering</span>
                  <span className="font-bold text-emerald-400 block mt-1">Metered</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">4. Commissioning</span>
                  <span className="font-bold text-emerald-400 block mt-1">Commissioned</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">5. Subsidy</span>
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
