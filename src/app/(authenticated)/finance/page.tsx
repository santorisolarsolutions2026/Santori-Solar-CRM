'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  X,
  PlusCircle,
  IndianRupee,
  Calendar,
  FileText,
  User,
  ArrowDownLeft,
} from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: number;
  amount: number;
  paymentMethod: string;
  transactionRef: string | null;
  receiptPath: string | null;
  paymentDate: string;
  remarks: string | null;
  recordedBy: { id: number; name: string };
}

interface Order {
  id: number;
  leadId: number;
  orderCode: string;
  connectionNumber: string;
  systemSizeKw: number;
  totalValue: number;
  downPayment: number;
  paymentMethod: string;
  transactionRef: string | null;
  remainingMethod: string;
  financeProvider: string | null;
  clientType: string;
  subsidyApplicable: boolean;
  subsidyAmount: number | null;
  status: string;
  createdAt: string;
  lead: {
    id: number;
    customerName: string;
    mobile: string;
    city: string;
    leadCode: string;
  };
  submittedBy: { id: number; name: string };
  financeProcessedBy: { id: number; name: string } | null;
  payments: Payment[];
  totalPaid: number;
  balanceOutstanding: number;
  documents: {
    id: number;
    docType: string;
    fileName: string;
    mimeType: string;
  }[];
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'neft', label: 'NEFT' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash 💵',
  upi: 'UPI 📱',
  cheque: 'Cheque ✍️',
  neft: 'NEFT 🏦',
  bank_transfer: 'Bank Transfer 🏛️',
};

const DOC_TYPES: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  electricity_bill: 'Electricity Bill',
  bank_passbook: 'Bank Passbook',
};

export default function FinancePage() {
  const { user, loading: authLoading, hasPermission } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!hasPermission('orders:finance_access')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[#111625] border border-slate-800 rounded-xl shadow-lg mt-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-md">
          You do not have the required permissions to view Finance & Payments details. Please contact your administrator if you believe this is in error.
        </p>
      </div>
    );
  }
  
  const [activeTab, setActiveTab] = useState<'pending' | 'ledger'>('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals & Panels
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<'verify' | 'ledger_detail'>('verify');
  
  // Verification action inputs
  const [financeRemark, setFinanceRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Record new payment inputs
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('upi');
  const [newPaymentRef, setNewPaymentRef] = useState('');
  const [newPaymentRemarks, setNewPaymentRemarks] = useState('');
  const [newPaymentReceiptPath, setNewPaymentReceiptPath] = useState('');
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [paymentRecording, setPaymentRecording] = useState(false);

  // Filters and summaries
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState({
    totalBookedValue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    cash: 0,
    upi: 0,
    neft: 0,
    cheque: 0,
  });

  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        paymentMethod: filterMethod,
        status: filterStatus,
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
      const res = await fetch(`/api/v1/finance/ledger?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryData = async () => {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        paymentMethod: filterMethod,
        status: filterStatus,
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
      const res = await fetch(`/api/v1/finance/ledger/summary?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSummaryData(data.data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLedgerData();
      fetchSummaryData();
    }
  }, [user, filterMethod, filterStatus, filterStartDate, filterEndDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLedgerData();
    fetchSummaryData();
  };

  // Verify/Reject action
  const handleVerifyOrder = async (approve: boolean) => {
    if (!selectedOrder) return;
    if (!approve && !financeRemark) {
      alert('Please provide a rejection reason in the remarks field.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approve,
          remark: financeRemark,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedOrder(null);
        setFinanceRemark('');
        fetchLedgerData();
        alert(approve ? 'Order successfully verified!' : 'Order rejected and returned to sales draft.');
      } else {
        alert(data.message || 'Failed to complete action.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type validation
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      alert('Only JPEG, PNG, WEBP images or PDF files are allowed.');
      return;
    }

    // Size validation (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    setReceiptUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/finance/ledger/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setNewPaymentReceiptPath(data.filePath);
        alert('Receipt uploaded successfully.');
      } else {
        alert(data.message || 'Upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file.');
    } finally {
      setReceiptUploading(false);
    }
  };

  // Add ledger payment action
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const amt = parseFloat(newPaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    setPaymentRecording(true);
    try {
      const res = await fetch('/api/v1/finance/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          amount: amt,
          paymentMethod: newPaymentMethod,
          transactionRef: newPaymentRef,
          remarks: newPaymentRemarks,
          receiptPath: newPaymentReceiptPath,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Update local selectedOrder state with the new payment
        const newPayment: Payment = data.data;
        const updatedOrder = {
          ...selectedOrder,
          payments: [newPayment, ...selectedOrder.payments],
          totalPaid: selectedOrder.totalPaid + amt,
          balanceOutstanding: Math.max(0, selectedOrder.balanceOutstanding - amt),
        };
        setSelectedOrder(updatedOrder);
        
        // Reset form
        setNewPaymentAmount('');
        setNewPaymentRef('');
        setNewPaymentRemarks('');
        setNewPaymentReceiptPath('');
        
        // Refresh full list
        fetchLedgerData();
        fetchSummaryData();
        alert('Payment successfully recorded in ledger.');
      } else {
        alert(data.message || 'Failed to record payment.');
      }
    } catch (err) {
      console.error(err);
      alert('Error recording payment.');
    } finally {
      setPaymentRecording(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'submitted');
  const verifiedOrders = orders.filter(o => o.status !== 'submitted');

  // Stats calculation
  const totalValue = verifiedOrders.reduce((sum, o) => sum + o.totalValue, 0);
  const totalCollected = verifiedOrders.reduce((sum, o) => sum + o.totalPaid, 0);
  const totalOutstanding = verifiedOrders.reduce((sum, o) => sum + o.balanceOutstanding, 0);

  return (
    <div className="space-y-6">
      {/* Search & Filters Controls Bar */}
      <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-500" /> Filter & Report Controls
          </h3>
          
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterMethod('all');
              setFilterStatus('all');
              setFilterStartDate('');
              setFilterEndDate('');
            }}
            className="self-end lg:self-auto py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold hover:border-slate-700 transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Text Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search client/order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700 placeholder-slate-655"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Payment Method */}
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700"
          >
            <option value="all">All Payment Methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Order Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700"
          >
            <option value="all">All Order Statuses</option>
            <option value="submitted">Awaiting Verification</option>
            <option value="finance_verified">Finance Verified</option>
            <option value="ops_assigned">Ops Assigned</option>
            <option value="completed">Completed</option>
          </select>

          {/* Start Date */}
          <div className="relative">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
            />
          </div>
        </form>
      </div>

      {/* Analytics Summary - Main Ledger Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-slate-900 to-[#111625] border border-slate-800/80 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Filtered Booked Value</span>
            <span className="text-xl font-extrabold text-white mt-1 block">₹{summaryData.totalBookedValue.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-slate-900 to-[#111625] border border-slate-800/80 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payments Collected</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1 block">₹{summaryData.totalCollected.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-slate-900 to-[#111625] border border-slate-800/80 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Outstanding Balance</span>
            <span className="text-xl font-extrabold text-amber-500 mt-1 block">₹{summaryData.totalOutstanding.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Collection Breakdown by Payment Channels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#111625]/40 border border-slate-800/50 rounded-xl p-4 shadow-md">
        <div className="text-center md:border-r border-slate-800/70 last:border-0 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Cash 💵</span>
          <span className="text-md font-extrabold text-white">₹{summaryData.cash.toLocaleString('en-IN')}</span>
        </div>
        <div className="text-center md:border-r border-slate-800/70 last:border-0 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">UPI 📱</span>
          <span className="text-md font-extrabold text-cyan-400">₹{summaryData.upi.toLocaleString('en-IN')}</span>
        </div>
        <div className="text-center md:border-r border-slate-800/70 last:border-0 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Bank Transfer 🏦</span>
          <span className="text-md font-extrabold text-indigo-400">₹{summaryData.neft.toLocaleString('en-IN')}</span>
        </div>
        <div className="text-center py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Cheque ✍️</span>
          <span className="text-md font-extrabold text-amber-500">₹{summaryData.cheque.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Awaiting Verification</span>
          {pendingOrders.length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Active Ledgers</span>
          <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
            {verifiedOrders.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading ledger data...</p>
        </div>
      ) : activeTab === 'pending' ? (
        // Awaiting Verification Table
        pendingOrders.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/30 border border-slate-800 rounded-xl">
            <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold text-sm">All Clean! No Pending Orders</p>
            <p className="text-xs text-slate-500 mt-1">Incoming orders punched by the sales team will appear here for review.</p>
          </div>
        ) : (
          <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-semibold">
                    <th className="py-4 px-4">Order Code</th>
                    <th className="py-4 px-4">Client Name</th>
                    <th className="py-4 px-4">System Size</th>
                    <th className="py-4 px-4">Total Contract Value</th>
                    <th className="py-4 px-4">Down Payment</th>
                    <th className="py-4 px-4">Submitted By</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pendingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-900/30 transition-all text-slate-300">
                      <td className="py-4 px-4 font-mono font-bold text-slate-100">{order.orderCode}</td>
                      <td className="py-4 px-4 font-semibold">
                        <Link href={`/leads/${order.lead.id}`} className="text-amber-400 hover:underline">
                          {order.lead.customerName}
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-400">{order.systemSizeKw} kW</td>
                      <td className="py-4 px-4 font-extrabold text-white">₹{order.totalValue.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 font-bold text-amber-400">
                        ₹{order.downPayment.toLocaleString('en-IN')}
                        <span className="block text-[10px] text-slate-500 font-normal">Method: {order.paymentMethod.toUpperCase()}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        <Link href={`/team?userId=${order.submittedBy.id}`} className="text-amber-400 hover:underline font-bold">
                          {order.submittedBy.name}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => { setSelectedOrder(order); setModalMode('verify'); }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Verify Order</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        // Active Ledger Table
        verifiedOrders.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/30 border border-slate-800 rounded-xl">
            <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold text-sm">No Active Ledgers</p>
            <p className="text-xs text-slate-500 mt-1">Verified orders will display here to manage ledger entries and payment schedules.</p>
          </div>
        ) : (
          <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-semibold">
                    <th className="py-4 px-4">Order Code</th>
                    <th className="py-4 px-4">Client Name</th>
                    <th className="py-4 px-4">Total Value</th>
                    <th className="py-4 px-4">Down Payment</th>
                    <th className="py-4 px-4">Total Paid</th>
                    <th className="py-4 px-4">Outstanding Balance</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {verifiedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-900/30 transition-all text-slate-300">
                      <td className="py-4 px-4 font-mono font-bold text-slate-100">{order.orderCode}</td>
                      <td className="py-4 px-4 font-semibold">
                        <Link href={`/leads/${order.lead.id}`} className="text-amber-400 hover:underline">
                          {order.lead.customerName}
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-white">₹{order.totalValue.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 font-bold text-slate-400">₹{order.downPayment.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 font-extrabold text-emerald-400">₹{order.totalPaid.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 font-extrabold text-amber-500">
                        ₹{order.balanceOutstanding.toLocaleString('en-IN')}
                        {order.balanceOutstanding === 0 && (
                          <span className="inline-block text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 ml-2">Paid</span>
                        )}
                      </td>
                      <td className="py-4 px-4 capitalize">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full ${
                          order.status === 'finance_verified' 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : order.status === 'ops_assigned'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {order.status === 'finance_verified' ? 'verified' : order.status === 'ops_assigned' ? 'scheduled' : order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => { setSelectedOrder(order); setModalMode('ledger_detail'); }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 rounded font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Ledger</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal dialogs */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {modalMode === 'verify' ? 'Review & Verify Order' : `Financial Ledger — Order ${selectedOrder.orderCode}`}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Client:{' '}
                  <Link href={`/leads/${selectedOrder.lead.id}`} className="text-amber-400 hover:underline font-bold">
                    {selectedOrder.lead.customerName}
                  </Link>{' '}
                  ({selectedOrder.lead.city})
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Common details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Total Contract Value</span>
                  <span className="text-sm font-extrabold text-white">₹{selectedOrder.totalValue.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Down Payment Punched</span>
                  <span className="text-sm font-bold text-amber-400">₹{selectedOrder.downPayment.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Total Payments Cleared</span>
                  <span className="text-sm font-extrabold text-emerald-400">₹{selectedOrder.totalPaid.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Outstanding Balance</span>
                  <span className="text-sm font-extrabold text-amber-500">₹{selectedOrder.balanceOutstanding.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {modalMode === 'verify' ? (
                // Verify Mode Content
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Order Details and Documents */}
                  <div className="space-y-6">
                    <div className="space-y-3.5 bg-slate-900/20 p-4 border border-slate-850 rounded-xl text-xs">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Order Punching Fields</h4>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                        <div>
                          <span className="text-slate-450 block font-semibold">Electricity Connection No.</span>
                          <span className="font-mono text-slate-205">{selectedOrder.connectionNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-450 block font-semibold">System Size (kW)</span>
                          <span className="text-slate-205">{selectedOrder.systemSizeKw} kW</span>
                        </div>
                        <div>
                          <span className="text-slate-450 block font-semibold">Client Type</span>
                          <span className="text-slate-205 capitalize">{selectedOrder.clientType.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="text-slate-450 block font-semibold">Remaining Amount Method</span>
                          <span className="text-slate-205 capitalize">{selectedOrder.remainingMethod}</span>
                        </div>
                        {selectedOrder.financeProvider && (
                          <div className="col-span-2">
                            <span className="text-slate-450 block font-semibold">Finance Provider</span>
                            <span className="text-slate-205">{selectedOrder.financeProvider}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-450 block font-semibold">Govt. Subsidy Applicable</span>
                          <span className="text-slate-205">{selectedOrder.subsidyApplicable ? 'Yes' : 'No'}</span>
                        </div>
                        {selectedOrder.subsidyAmount && (
                          <div>
                            <span className="text-slate-450 block font-semibold">Subsidy Amount</span>
                            <span className="text-slate-205 font-bold text-emerald-450">₹{selectedOrder.subsidyAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Uploaded Documents List */}
                    <div className="bg-slate-900/20 p-4 border border-slate-850 rounded-xl text-xs space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Mandatory Documents</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['aadhaar', 'pan', 'electricity_bill', 'bank_passbook'].map((type) => {
                          const doc = selectedOrder.documents?.find(d => d.docType === type);
                          return (
                            <div key={type} className="p-2.5 bg-slate-950/40 border border-slate-850 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-500 font-semibold block">{DOC_TYPES[type]}</span>
                                <span className={`text-[10px] font-bold ${doc ? 'text-emerald-400' : 'text-rose-450'}`}>
                                  {doc ? '✓ Uploaded' : '✗ Missing'}
                                </span>
                              </div>
                              {doc && (
                                <a
                                  href={`/api/v1/orders/${selectedOrder.id}/documents/${doc.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-amber-400 hover:underline font-bold"
                                >
                                  View File
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Approval Action */}
                  <div className="bg-slate-900/20 p-5 border border-slate-850 rounded-xl flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Verification Action</h4>
                      
                      <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-slate-300 text-xs leading-normal">
                        Please inspect all file uploads, client load capacity, connection numbers, and initial payment methods. 
                        Approving moves this order to **Operations** and records the initial down payment in the active ledger.
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Remarks / Rejection Reason</label>
                        <textarea
                          placeholder="Provide approval notes or a detailed rejection reason if declining..."
                          value={financeRemark}
                          onChange={(e) => setFinanceRemark(e.target.value)}
                          className="w-full h-24 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700 placeholder-slate-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => handleVerifyOrder(false)}
                        disabled={actionLoading}
                        className="flex-1 py-2.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>Reject Order</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyOrder(true)}
                        disabled={actionLoading}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold text-xs shadow-md shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        <span>Approve & Verify</span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                // Ledger Detail Mode Content
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  
                  {/* Ledger list: 3 columns */}
                  <div className="md:col-span-3 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Payment Transaction History</h4>
                    
                    {selectedOrder.payments.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs">No payments recorded.</div>
                    ) : (
                      <div className="space-y-3.5 max-h-[45vh] overflow-y-auto pr-1">
                        {selectedOrder.payments.map((pmt) => (
                          <div key={pmt.id} className="p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl text-xs space-y-1.5 hover:bg-slate-900/60 transition-all">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-white text-sm">₹{pmt.amount.toLocaleString('en-IN')}</span>
                              <span className="font-mono text-[9px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-400 capitalize">
                                {METHOD_LABELS[pmt.paymentMethod] || pmt.paymentMethod}
                              </span>
                            </div>
                            
                            {pmt.transactionRef && (
                              <p className="text-[10px] text-slate-400 font-mono">Ref: {pmt.transactionRef}</p>
                            )}
                            {pmt.remarks && (
                              <p className="text-[11px] text-slate-300 italic">"{pmt.remarks}"</p>
                            )}

                            <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium pt-1.5 border-t border-slate-800/40">
                              <span className="flex items-center gap-1">
                                <User className="w-2.5 h-2.5 text-slate-500" />
                                Recorded by{' '}
                                <Link href={`/team?userId=${pmt.recordedBy.id}`} className="text-amber-400 hover:underline font-bold">
                                  {pmt.recordedBy.name}
                                </Link>
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-2.5 h-2.5 text-slate-500" />
                                {new Date(pmt.paymentDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {pmt.receiptPath && (
                              <div className="flex items-center justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setActiveReceiptUrl(pmt.receiptPath)}
                                  className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 hover:underline cursor-pointer focus:outline-none"
                                >
                                  <Eye className="w-3 h-3" /> View Receipt
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Record Payment Form: 2 columns */}
                  <div className="md:col-span-2 bg-slate-900/20 p-4 border border-slate-850 rounded-xl">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-4">Record Payment Receipt</h4>
                    
                    <form onSubmit={handleRecordPayment} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Amount *</label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min="1"
                            step="any"
                            placeholder="Amount in INR"
                            value={newPaymentAmount}
                            onChange={(e) => setNewPaymentAmount(e.target.value)}
                            disabled={selectedOrder.balanceOutstanding === 0}
                            className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700 placeholder-slate-600 font-extrabold"
                          />
                          <span className="absolute left-3 top-2 text-slate-500 font-bold">₹</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method *</label>
                        <select
                          value={newPaymentMethod}
                          onChange={(e) => setNewPaymentMethod(e.target.value)}
                          disabled={selectedOrder.balanceOutstanding === 0}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700 capitalize"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction Ref / Cheque No.</label>
                        <input
                          type="text"
                          placeholder="Ref ID, Cheque No, Bank Details"
                          value={newPaymentRef}
                          onChange={(e) => setNewPaymentRef(e.target.value)}
                          disabled={selectedOrder.balanceOutstanding === 0}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700 placeholder-slate-600 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remarks / Note</label>
                        <textarea
                          placeholder="e.g. 2nd Milestone payment, Loan Disbursal part, etc."
                          value={newPaymentRemarks}
                          onChange={(e) => setNewPaymentRemarks(e.target.value)}
                          disabled={selectedOrder.balanceOutstanding === 0}
                          className="w-full h-20 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700 placeholder-slate-600"
                        />
                      </div>

                      {/* Receipt Uploader Field */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Upload Receipt / Snap Photo (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleReceiptUpload}
                            disabled={receiptUploading || selectedOrder.balanceOutstanding === 0}
                            className="hidden"
                            id="receipt-file-input"
                          />
                          <label
                            htmlFor="receipt-file-input"
                            className={`flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              receiptUploading ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            {receiptUploading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <PlusCircle className="w-3.5 h-3.5" />
                            )}
                            <span>Choose File or Take Photo</span>
                          </label>

                          {newPaymentReceiptPath && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300">
                              <span className="font-semibold text-emerald-450 truncate max-w-[120px]">Receipt Uploaded</span>
                              <button
                                type="button"
                                onClick={() => setNewPaymentReceiptPath('')}
                                className="text-slate-500 hover:text-rose-405 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedOrder.balanceOutstanding === 0 ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-bold text-center">
                          ✓ This ledger has been fully cleared.
                        </div>
                      ) : (
                        <button
                          type="submit"
                          disabled={paymentRecording || receiptUploading}
                          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {paymentRecording ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                          <span>Record Receipt</span>
                        </button>
                      )}
                    </form>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}
      {/* Receipt Viewer Overlay Modal */}
      {activeReceiptUrl && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-3xl w-full bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Payment Receipt Document</h3>
              <button
                onClick={() => setActiveReceiptUrl(null)}
                className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950/20 min-h-[300px]">
              {activeReceiptUrl.toLowerCase().includes('.pdf') ? (
                <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
                  <FileText className="w-16 h-16 text-slate-500" />
                  <p className="text-xs text-slate-400 font-medium">Receipt PDF Document is ready for download.</p>
                  <a
                    href={activeReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-450 hover:to-yellow-450 text-slate-950 font-bold rounded-lg transition-all text-xs cursor-pointer shadow-lg shadow-amber-500/10 flex items-center gap-2"
                  >
                    <span>Open in new window</span>
                  </a>
                </div>
              ) : (
                <img
                  src={activeReceiptUrl}
                  alt="Payment Receipt"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-850 shadow-md"
                />
              )}
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex justify-end shrink-0">
              <a
                href={activeReceiptUrl}
                download={`receipt_${Date.now()}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-lg text-slate-300 hover:text-white transition-all font-bold text-xs cursor-pointer"
              >
                Download Receipt
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
