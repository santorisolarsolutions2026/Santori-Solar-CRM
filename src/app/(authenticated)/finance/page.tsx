'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Camera,
  Upload,
  Trash2,
  Image,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: number;
  amount: number;
  paymentMethod: string;
  transactionRef: string | null;
  paymentDate: string;
  remarks: string | null;
  recordedBy: { id: number; name: string };
  receiptUrl?: string | null;
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
  downpayment_receipt: 'Downpayment Receipt',
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
  const [paymentRecording, setPaymentRecording] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptUploading, setReceiptUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState('all'); // all | today | yesterday | last7 | last30 | custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all'); // all | cash | upi | cheque | neft | bank_transfer
  const [filterBalanceStatus, setFilterBalanceStatus] = useState('all'); // all | cleared | outstanding
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterOrderStatus, setFilterOrderStatus] = useState('all'); // all | submitted | finance_verified | ops_assigned | completed

  const handleResetFilters = () => {
    setFilterDateRange('all');
    setStartDate('');
    setEndDate('');
    setFilterPaymentMethod('all');
    setFilterBalanceStatus('all');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterOrderStatus('all');
  };

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
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

  useEffect(() => {
    if (user) {
      fetchLedgerData();
    }
  }, [user, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLedgerData();
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

  // Handle receipt image upload
  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed as receipt copies.');
      return;
    }

    setReceiptFile(file);
    setReceiptUploading(true);
    setReceiptUrl('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/finance/receipt-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setReceiptUrl(data.url);
      } else {
        alert(data.message || 'Failed to upload receipt copy.');
        setReceiptFile(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading receipt copy.');
      setReceiptFile(null);
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
          receiptUrl: receiptUrl || null,
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
        setReceiptFile(null);
        setReceiptUrl('');
        
        // Refresh full list
        fetchLedgerData();
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

  const filteredOrders = orders.filter((order) => {
    // 1. Order Status Filter
    if (filterOrderStatus !== 'all') {
      if (order.status !== filterOrderStatus) return false;
    }

    // 2. Payment Method Filter
    if (filterPaymentMethod !== 'all') {
      const hasMatchingPayment = order.payments.some(p => p.paymentMethod === filterPaymentMethod);
      const matchesDownPayment = order.paymentMethod === filterPaymentMethod;
      if (!hasMatchingPayment && !matchesDownPayment) return false;
    }

    // 3. Outstanding Balance Status Filter
    if (filterBalanceStatus !== 'all') {
      if (filterBalanceStatus === 'cleared' && order.balanceOutstanding > 0) return false;
      if (filterBalanceStatus === 'outstanding' && order.balanceOutstanding === 0) return false;
    }

    // 4. Amount Range Filter
    const val = order.totalValue;
    if (filterMinAmount) {
      const min = parseFloat(filterMinAmount);
      if (!isNaN(min) && val < min) return false;
    }
    if (filterMaxAmount) {
      const max = parseFloat(filterMaxAmount);
      if (!isNaN(max) && val > max) return false;
    }

    // 5. Date Filter
    if (filterDateRange !== 'all') {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (filterDateRange === 'today') {
        if (orderDate < startOfToday) return false;
      } else if (filterDateRange === 'yesterday') {
        const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
        if (orderDate < startOfYesterday || orderDate >= startOfToday) return false;
      } else if (filterDateRange === 'last7') {
        const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (orderDate < sevenDaysAgo) return false;
      } else if (filterDateRange === 'last30') {
        const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (orderDate < thirtyDaysAgo) return false;
      } else if (filterDateRange === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0,0,0,0);
          if (orderDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23,59,59,999);
          if (orderDate > end) return false;
        }
      }
    }

    return true;
  });

  const pendingOrders = filteredOrders.filter(o => o.status === 'submitted');
  const verifiedOrders = filteredOrders.filter(o => o.status !== 'submitted');

  // Stats calculation
  const totalValue = verifiedOrders.reduce((sum, o) => sum + o.totalValue, 0);
  const totalCollected = verifiedOrders.reduce((sum, o) => sum + o.totalPaid, 0);
  const totalOutstanding = verifiedOrders.reduce((sum, o) => sum + o.balanceOutstanding, 0);

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Finance & Payments Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">Verify incoming sales orders and maintain the financial transaction ledger.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by client, order, connection..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-slate-700 placeholder-slate-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </form>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showFilters || filterDateRange !== 'all' || filterPaymentMethod !== 'all' || filterBalanceStatus !== 'all' || filterMinAmount || filterMaxAmount || filterOrderStatus !== 'all'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-750'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="relative">
              Filters
              {(filterDateRange !== 'all' || filterPaymentMethod !== 'all' || filterBalanceStatus !== 'all' || filterMinAmount || filterMaxAmount || filterOrderStatus !== 'all') && (
                <span className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-slate-900/40 border border-slate-805 rounded-xl shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
              <span>Advanced Filters</span>
            </h3>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] text-rose-450 hover:text-rose-400 hover:underline font-bold"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Date Range Filter */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date Created</label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700 capitalize"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700 capitalize"
              >
                <option value="all">All Methods</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Outstanding Balance Filter */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Balance Status</label>
              <select
                value={filterBalanceStatus}
                onChange={(e) => setFilterBalanceStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700"
              >
                <option value="all">All Ledgers</option>
                <option value="cleared">Fully Cleared (Paid)</option>
                <option value="outstanding">Outstanding Balance</option>
              </select>
            </div>

            {/* Order Status Filter */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Order Status</label>
              <select
                value={filterOrderStatus}
                onChange={(e) => setFilterOrderStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-700 capitalize"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted (Awaiting)</option>
                <option value="finance_verified">Verified</option>
                <option value="ops_assigned">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/40">
            {/* Custom Date Inputs */}
            {filterDateRange === 'custom' ? (
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custom Date Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-805 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                  />
                  <span className="text-slate-500 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-805 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>
            ) : (
              <div className="hidden md:block" />
            )}

            {/* Contract Value Range */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contract Value Range (₹)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min Value"
                  value={filterMinAmount}
                  onChange={(e) => setFilterMinAmount(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-805 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700 placeholder-slate-700"
                />
                <span className="text-slate-500 text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max Value"
                  value={filterMaxAmount}
                  onChange={(e) => setFilterMaxAmount(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-805 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-700 placeholder-slate-700"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-slate-900 to-[#111625] border border-slate-800/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Booked Value</span>
            <span className="text-xl font-extrabold text-white mt-1 block">₹{totalValue.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-slate-900 to-[#111625] border border-slate-800/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payments Collected</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1 block">₹{totalCollected.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-slate-900 to-[#111625] border border-slate-800/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Outstanding Balance</span>
            <span className="text-xl font-extrabold text-amber-500 mt-1 block">₹{totalOutstanding.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
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
                        {['aadhaar', 'pan', 'electricity_bill', 'bank_passbook', 'downpayment_receipt'].map((type) => {
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
                        {(() => {
                          const downpaymentDoc = selectedOrder.documents?.find(d => d.docType === 'downpayment_receipt');
                          return selectedOrder.payments.map((pmt) => (
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
                              {(pmt.receiptUrl || (pmt.remarks?.includes('Initial Down Payment') && downpaymentDoc)) ? (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <span className="text-[10px] text-slate-400">Receipt copy:</span>
                                  <a 
                                    href={pmt.receiptUrl || `/api/v1/orders/${selectedOrder.id}/documents/${downpaymentDoc?.id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[10px] text-amber-400 hover:underline font-bold flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3 text-amber-400" />
                                    <span>{pmt.receiptUrl ? 'View Image' : 'View Receipt'}</span>
                                  </a>
                                </div>
                              ) : null}

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
                          </div>
                        ))
                      })()}
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

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Receipt Image</label>
                        
                        {/* Hidden file inputs */}
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleReceiptFileChange}
                          disabled={selectedOrder.balanceOutstanding === 0 || receiptUploading}
                          className="hidden"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          ref={cameraInputRef}
                          onChange={handleReceiptFileChange}
                          disabled={selectedOrder.balanceOutstanding === 0 || receiptUploading}
                          className="hidden"
                        />

                        {/* State 1: Uploading */}
                        {receiptUploading && (
                          <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 border border-dashed border-amber-500/40 rounded-xl space-y-2 animate-pulse">
                            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Receipt is Uploading</span>
                          </div>
                        )}

                        {/* State 2: Uploaded (Success Preview) */}
                        {!receiptUploading && receiptUrl && (
                          <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-3 relative group overflow-hidden">
                            <div className="absolute top-2 right-2 z-10">
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptUrl('');
                                  setReceiptFile(null);
                                }}
                                className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 hover:bg-rose-500/25 rounded-lg transition-all cursor-pointer"
                                title="Remove Receipt"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${receiptUrl})` }}>
                                {!receiptUrl && <Image className="w-5 h-5 text-slate-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-emerald-400 truncate flex items-center gap-1">
                                  <span>✓ Uploaded Successfully</span>
                                </p>
                                <a 
                                  href={receiptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline mt-0.5 inline-block"
                                >
                                  View Full Receipt Image
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* State 3: Ready to Upload (Empty Form) */}
                        {!receiptUploading && !receiptUrl && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={selectedOrder.balanceOutstanding === 0}
                              className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-amber-500/30 rounded-xl space-y-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
                            >
                              <div className="w-8 h-8 bg-slate-900 border border-slate-800 group-hover:border-amber-500/20 rounded-lg flex items-center justify-center transition-all">
                                <Upload className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">Upload File</span>
                              <span className="text-[8px] text-slate-500">From Device</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => cameraInputRef.current?.click()}
                              disabled={selectedOrder.balanceOutstanding === 0}
                              className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-amber-500/30 rounded-xl space-y-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
                            >
                              <div className="w-8 h-8 bg-slate-900 border border-slate-800 group-hover:border-amber-500/20 rounded-lg flex items-center justify-center transition-all">
                                <Camera className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">Take Photo</span>
                              <span className="text-[8px] text-slate-500">Open Camera</span>
                            </button>
                          </div>
                        )}
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

    </div>
  );
}
