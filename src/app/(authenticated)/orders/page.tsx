'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  FileCheck,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Truck,
  Wrench,
  Loader2,
  Calendar,
  AlertTriangle,
  Download,
  X,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: number;
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
    customerName: string;
    mobile: string;
    city: string;
    leadCode: string;
  };
  submittedBy: { name: string };
  financeProcessedBy: { name: string } | null;
  documents: {
    id: number;
    docType: string;
    fileName: string;
    fileSizeOctets: number;
    mimeType: string;
  }[];
  installationImages?: {
    id: number;
    status: string;
    fileName: string;
    uploadedAt: string;
  }[];
}

const STATUS_BADGES: Record<string, { name: string; class: string }> = {
  draft: { name: 'Draft (Sales)', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  submitted: { name: 'Awaiting Finance ⏳', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-semibold' },
  finance_verified: { name: 'Finance Verified 💳', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ops_assigned: { name: 'Install Scheduled 🔧', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  completed: { name: 'Completed Installation 🎉', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold' },
};

const DOC_TYPES: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  electricity_bill: 'Electricity Bill',
  bank_passbook: 'Bank Passbook',
};

export default function OrdersQueuePage() {
  const { user } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected order details panel/modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'finance_verify' | 'ops_update'>('view');
  
  // Finance approval inputs
  const [financeRemark, setFinanceRemark] = useState('');
  const [financeActionLoading, setFinanceActionLoading] = useState(false);

  // Operations installation updates
  const [installationStatus, setInstallationStatus] = useState('ops_assigned');
  const [opsNotes, setOpsNotes] = useState('');
  const [opsActionLoading, setOpsActionLoading] = useState(false);

  // Operations installation images state
  const [installationImages, setInstallationImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
      });
      const res = await fetch(`/api/v1/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (selectedOrder) {
      fetchInstallationImages(selectedOrder.id);
    } else {
      setInstallationImages([]);
    }
  }, [selectedOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  // Finance Verification Action (Approve / Reject) (Section 9.4 & 10.4)
  const handleFinanceVerification = async (approve: boolean) => {
    if (!selectedOrder) return;
    if (!approve && !financeRemark) {
      alert('A rejection reason remark is required.');
      return;
    }

    setFinanceActionLoading(true);
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
        fetchOrders();
        alert(approve ? 'Order verified and sent to Operations.' : 'Order rejected and sent back to sales draft.');
      } else {
        alert(data.message || 'Failed to complete action.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinanceActionLoading(false);
    }
  };

  // Operations status update (Section 5.2 / 5.3)
  const handleOpsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setOpsActionLoading(true);
    try {
      // In this system, Operations changes Order status via PATCH /orders/:id
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: installationStatus,
          additionalNotes: opsNotes ? `[OPS NOTE] ${opsNotes}` : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Log status change on lead level to sync pipeline stages (Stage 13 terminal status)
        // If installation status is completed, the lead remains in Stage 13 but order status is completed.
        // We log the details in activity log.
        await fetch(`/api/v1/leads/${selectedOrder.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_status: 13, // Stay in Stage 13 but write installation updates
            remark: `[INSTALLATION UPDATE] Status: ${installationStatus}. Notes: ${opsNotes || 'none'}`,
          }),
        });

        setSelectedOrder(null);
        setOpsNotes('');
        fetchOrders();
        alert('Installation status updated successfully.');
      } else {
        alert(data.message || 'Failed to update installation details.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOpsActionLoading(false);
    }
  };

  const fetchInstallationImages = async (orderId: number) => {
    try {
      setLoadingImages(true);
      const res = await fetch(`/api/v1/orders/${orderId}/installation-images`);
      const data = await res.json();
      if (data.success) {
        setInstallationImages(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleInstallationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, status: string) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder) return;

    if (installationImages.length >= 7) {
      alert('Maximum limit of 7 installation images has been reached.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('status', status);

    try {
      setUploadingImage(true);
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/installation-images`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetchInstallationImages(selectedOrder.id);
        fetchOrders();
      } else {
        alert(data.message || 'Failed to upload image.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during file upload.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteInstallationImage = async (imageId: number) => {
    if (!selectedOrder) return;
    if (!confirm('Are you sure you want to delete this installation photo?')) return;

    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/installation-images/${imageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchInstallationImages(selectedOrder.id);
        fetchOrders();
      } else {
        alert(data.message || 'Failed to delete image.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during file deletion.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide">Orders Processing & Installation Queue</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review financial punching documents, verify down payments, and track installation status.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order Code / Meter / Client..."
              className="block w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs transition-all"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex flex-row gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block flex-1 sm:flex-initial px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
            >
              <option value="">All Order Statuses</option>
              <option value="submitted">Awaiting Finance Approval</option>
              <option value="finance_verified">Finance Verified (Scheduling)</option>
              <option value="ops_assigned">Installation Scheduled</option>
              <option value="completed">Completed Installations</option>
            </select>
            <button
              type="submit"
              className="py-2 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg font-bold text-xs shrink-0 cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Orders List Table */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-4 w-28">Order Code</th>
                <th className="py-4 px-4 w-48">Client Name</th>
                <th className="py-4 px-4 w-36">Meter Number</th>
                <th className="py-4 px-4 w-28">System Size</th>
                <th className="py-4 px-4 w-32">Total Value</th>
                <th className="py-4 px-4 w-32">Down Payment</th>
                <th className="py-4 px-4 w-44">Order Status</th>
                <th className="py-4 px-4 w-36 text-center">Process</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    Scanning database records...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No orders registered in queue.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const badge = STATUS_BADGES[order.status] || { name: order.status, class: 'bg-slate-500' };
                  return (
                    <tr key={order.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-350 w-28">{order.orderCode}</td>
                      <td className="py-3.5 px-4 font-bold text-white w-48">
                        <span>{order.lead.customerName}</span>
                        <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">{order.lead.city}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300 w-36">{order.connectionNumber || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-semibold w-28">{order.systemSizeKw} kW</td>
                      <td className="py-3.5 px-4 text-white font-bold w-32">₹ {order.totalValue.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-slate-400 w-32">₹ {order.downPayment.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 w-44">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 border rounded-full uppercase tracking-wider ${badge.class}`}>
                            {badge.name}
                          </span>
                          {order.status === 'completed' && (!order.installationImages || order.installationImages.filter((img) => img.status === 'completed').length === 0) && (
                            <span className="text-[9px] font-semibold text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded px-1.5 py-0.5 w-fit uppercase tracking-wider">
                              ⚠️ Photo Not Uploaded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center w-36">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setSelectedOrder(order); setModalMode('view'); }}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="View Order Sheets"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(user?.role === 'finance' || ['admin', 'director', 'sales_head'].includes(user?.role || '')) && order.status === 'submitted' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setModalMode('finance_verify'); }}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              Verify
                            </button>
                          )}
                          {(user?.role === 'operations' || ['admin', 'director', 'sales_head'].includes(user?.role || '')) && order.status === 'finance_verified' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setModalMode('ops_update'); setInstallationStatus('ops_assigned'); }}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              Schedule
                            </button>
                          )}
                          {(user?.role === 'operations' || ['admin', 'director', 'sales_head'].includes(user?.role || '')) && order.status === 'ops_assigned' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setModalMode('ops_update'); setInstallationStatus('completed'); }}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          {['admin', 'director', 'sales_head', 'operations'].includes(user?.role || '') && order.status === 'completed' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setModalMode('view'); }}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                              title="Upload/View Completed Photos"
                            >
                              Photos
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Detail Overlay Panel Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Order Details: {selectedOrder.orderCode}
                </h3>
                <span className="text-[10px] text-slate-400">Client: {selectedOrder.lead.customerName} ({selectedOrder.lead.leadCode})</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Punching details grid */}
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Punching Information</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs bg-slate-900/30 p-4 border border-slate-800/80 rounded-xl">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider font-semibold">Meter / Connection Number</span>
                    <p className="text-sm text-white font-mono mt-0.5">{selectedOrder.connectionNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider font-semibold">System Size</span>
                    <p className="text-sm text-white font-bold mt-0.5">{selectedOrder.systemSizeKw} kW ({selectedOrder.clientType.toUpperCase().replace('_', ' ')})</p>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider font-semibold">Total Cost</span>
                    <p className="text-sm text-white font-bold mt-0.5">₹ {selectedOrder.totalValue.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider font-semibold">Collected Down Payment</span>
                    <p className="text-sm text-white font-bold mt-0.5">₹ {selectedOrder.downPayment.toLocaleString('en-IN')} ({selectedOrder.paymentMethod.toUpperCase()})</p>
                  </div>
                  {selectedOrder.transactionRef && (
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider font-semibold">Transaction Reference</span>
                      <p className="text-sm text-white font-mono mt-0.5">{selectedOrder.transactionRef}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider font-semibold">Remaining Amount Scheme</span>
                    <p className="text-sm text-white mt-0.5 capitalize">
                      {selectedOrder.remainingMethod === 'finance'
                        ? `Finance (${selectedOrder.financeProvider || 'unspecified bank'})`
                        : selectedOrder.remainingMethod}
                    </p>
                  </div>
                  {selectedOrder.subsidyApplicable && selectedOrder.subsidyAmount && (
                    <div className="col-span-2">
                      <span className="text-slate-500 uppercase tracking-wider font-semibold">Government Subsidy Claim</span>
                      <p className="text-sm text-amber-400 font-bold mt-0.5">₹ {selectedOrder.subsidyAmount.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Documents */}
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Client Verification Documents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedOrder.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-300 block">{DOC_TYPES[doc.docType] || doc.docType}</span>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5">{doc.fileName}</span>
                      </div>
                      <a
                        href={`/api/v1/orders/${selectedOrder.id}/documents/${doc.id}`}
                        target="_blank"
                        className="py-1 px-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-amber-400 hover:text-amber-300 rounded font-semibold text-[10px] flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Installation Photos & Upload for Completed Orders */}
              {selectedOrder.status === 'completed' && ['admin', 'director', 'sales_head', 'operations'].includes(user?.role || '') ? (
                <div className="space-y-3 border-t border-slate-800/60 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Installation Photos ({installationImages.length}/7)
                    </h4>
                    {uploadingImage && (
                      <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading...
                      </span>
                    )}
                  </div>

                  {installationImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/10 p-4 border border-slate-800/80 rounded-xl">
                      {installationImages.map((img) => (
                        <div key={img.id} className="relative group rounded-xl border border-slate-800 bg-slate-950 overflow-hidden aspect-video">
                          <img
                            src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                            alt={img.fileName}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteInstallationImage(img.id)}
                              className="p-1.5 rounded-lg bg-red-650 hover:bg-red-505 text-white transition-all cursor-pointer flex items-center justify-center"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className={`absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 border rounded-full uppercase tracking-wider ${
                            img.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {img.status === 'completed' ? 'Installed' : 'In-Progress'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {installationImages.length < 7 && (
                    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
                      <div className="flex-1 space-y-1">
                        <span className="block text-slate-400 font-semibold text-xs">
                          Add Installed Solar Panel Photo
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          Open camera directly on mobile devices or upload image file. (Limit: 7 photos max)
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          id="completed-camera-capture-input"
                          onChange={(e) => handleInstallationImageUpload(e, 'completed')}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <label
                          htmlFor="completed-camera-capture-input"
                          className={`py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                            uploadingImage ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <Camera className="w-4 h-4 text-slate-400" />
                          <span>Open Camera</span>
                        </label>

                        <input
                          type="file"
                          accept="image/*"
                          id="completed-file-upload-input"
                          onChange={(e) => handleInstallationImageUpload(e, 'completed')}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <label
                          htmlFor="completed-file-upload-input"
                          className={`py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                            uploadingImage ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span>Upload Image</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                installationImages.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Installation Gallery</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/10 p-4 border border-slate-800/80 rounded-xl">
                      {installationImages.map((img) => (
                        <div key={img.id} className="relative rounded-lg overflow-hidden border border-slate-850 aspect-video">
                          <a href={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`} target="_blank" rel="noopener noreferrer">
                            <img
                              src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                              alt={img.fileName}
                              className="w-full h-full object-cover hover:scale-105 transition-all duration-300"
                            />
                          </a>
                          <span className={`absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 border rounded-full uppercase tracking-wider ${
                            img.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {img.status === 'completed' ? 'Installed' : 'In-Progress'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Modal Modes: Actions panels */}
              {modalMode === 'finance_verify' && (
                <div className="border-t border-slate-800/80 pt-6 space-y-4">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Finance Approval Options</h4>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-450 mb-1">Remarks / Rejection Reason</label>
                    <textarea
                      value={financeRemark}
                      onChange={(e) => setFinanceRemark(e.target.value)}
                      placeholder="Add payment verification codes or rejection explanations..."
                      className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs h-20"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => handleFinanceVerification(false)}
                      disabled={financeActionLoading}
                      className="py-2 px-4 rounded-lg bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/30 transition-all font-semibold text-xs flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject & Send to Sales Draft</span>
                    </button>
                    <button
                      onClick={() => handleFinanceVerification(true)}
                      disabled={financeActionLoading}
                      className="py-2 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-lg font-bold text-xs shadow-md flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve & Release to Ops</span>
                    </button>
                  </div>
                </div>
              )}

              {modalMode === 'ops_update' && (
                <form onSubmit={handleOpsUpdate} className="border-t border-slate-800/80 pt-6 space-y-4">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Operations Installation Update</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-450 mb-1">Installation Status</label>
                      <select
                        value={installationStatus}
                        onChange={(e) => setInstallationStatus(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                      >
                        <option value="ops_assigned">Installation Scheduled / In-Progress</option>
                        <option value="completed">Completed & Handed Over</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-450 mb-1">Operations Scheduling Notes</label>
                    <textarea
                      value={opsNotes}
                      onChange={(e) => setOpsNotes(e.target.value)}
                      placeholder="Add structure configurations, panels delivery date details, etc..."
                      className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs h-20"
                    />
                  </div>

                  {/* Installation Photos Section */}
                  <div className="space-y-3 border-t border-slate-800/60 pt-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">
                        Installation Photos ({installationImages.length}/7)
                      </h5>
                      {uploadingImage && (
                        <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Uploading...
                        </span>
                      )}
                    </div>

                    {/* Photo Grid */}
                    {installationImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {installationImages.map((img) => (
                          <div key={img.id} className="relative group rounded-xl border border-slate-800 bg-slate-950 overflow-hidden aspect-video">
                            <img
                              src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                              alt={img.fileName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteInstallationImage(img.id)}
                                className="p-1.5 rounded-lg bg-red-650 hover:bg-red-505 text-white transition-all cursor-pointer flex items-center justify-center"
                                title="Delete Photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className={`absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 border rounded-full uppercase tracking-wider ${
                              img.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}>
                              {img.status === 'completed' ? 'Installed' : 'In-Progress'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {installationImages.length < 7 && (
                      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
                        <div className="flex-1 space-y-1">
                          <span className="block text-slate-400 font-semibold text-xs">
                            {installationStatus === 'ops_assigned'
                              ? 'Add In-Progress Installation Photo'
                              : 'Add Installed Solar Panel Photo'}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            Open camera directly on mobile devices or upload image file. (Limit: 7 photos max)
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          {/* Camera Capture Input */}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            id="camera-capture-input"
                            onChange={(e) => handleInstallationImageUpload(e, installationStatus === 'completed' ? 'completed' : 'in_progress')}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                          <label
                            htmlFor="camera-capture-input"
                            className={`py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              uploadingImage ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            <Camera className="w-4 h-4 text-slate-400" />
                            <span>Open Camera</span>
                          </label>

                          {/* File Upload Input */}
                          <input
                            type="file"
                            accept="image/*"
                            id="file-upload-input"
                            onChange={(e) => handleInstallationImageUpload(e, installationStatus === 'completed' ? 'completed' : 'in_progress')}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                          <label
                            htmlFor="file-upload-input"
                            className={`py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              uploadingImage ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            <Upload className="w-4 h-4 text-slate-400" />
                            <span>Upload Image</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={opsActionLoading}
                      className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-lg font-bold text-xs shadow-md flex items-center gap-1"
                    >
                      {opsActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                      <span>Save Installation Update</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
