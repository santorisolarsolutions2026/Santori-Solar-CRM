'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sun,
  ArrowLeft,
  Calendar,
  Layers,
  History,
  FileCheck,
  FileText,
  User,
  MapPin,
  Phone,
  AlertTriangle,
  Upload,
  CheckCircle,
  File,
  Loader2,
  Lock,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

interface Lead {
  id: number;
  leadCode: string;
  customerName: string;
  mobile: string;
  mobileAlt: string | null;
  connectionType: string;
  sanctionedLoadKw: number | null;
  address: string;
  pinCode: string;
  city: string;
  state: string;
  status: number;
  statusSub: string | null;
  leadSource: string | null;
  followupAt: string | null;
  isUnreachable: boolean;
  isActive: boolean;
  createdAt: string;
  consultant: { id: number; name: string; phone: string | null } | null;
  tl: { id: number; name: string } | null;
  manager: { id: number; name: string } | null;
  otherData?: string | null;
  discomName?: string | null;
  connectionNumber?: string | null;
  activityLogs: {
    id: number;
    remark: string | null;
    fromStatus: number | null;
    toStatus: number;
    createdAt: string;
    user: { name: string; role: string };
  }[];
  meetings: {
    id: number;
    address: string;
    pinCode: string;
    mobile: string;
    meetingDate: string;
    meetingTime: string;
    avgMonthlyBill: number;
    connectionType: string;
    notes: string | null;
  }[];
  order: {
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
    additionalNotes: string | null;
    status: string;
    documents: {
      id: number;
      docType: string;
      fileName: string;
      fileSizeOctets: number;
      mimeType: string;
      uploadedAt: string;
    }[];
  } | null;
}

const STAGE_BADGES: Record<number, { name: string; class: string }> = {
  0: { name: 'Uninitiated', class: 'bg-[#3b3a37] text-[#c9c5ba] border-[#4f4d45] font-bold' },
  1: { name: 'Fresh Lead', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  2: { name: 'DNP (No Answer)', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  3: { name: 'Follow Up', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  4: { name: 'Not Interested', class: 'bg-red-800/10 text-red-400 border-red-800/20' },
  5: { name: 'Call Later', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  6: { name: 'Already Installed', class: 'bg-slate-800/20 text-slate-500 border-slate-800/30' },
  7: { name: 'Decision Pending', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  8: { name: 'Meeting Booked 📅', class: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  9: { name: 'Meeting Done', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  10: { name: 'Disconnected', class: 'bg-slate-600/15 text-slate-400 border-slate-600/20' },
  11: { name: 'Switch Off', class: 'bg-slate-700/20 text-slate-400 border-slate-700/30' },
  12: { name: 'Can\'t Fit Solar', class: 'bg-stone-900 text-stone-400 border-stone-800/40' },
  13: { name: '✅ SALE DONE', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold' },
  14: { name: 'Meeting Ended', class: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
};

// Transition matrix for select dropdown option filters
const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  0: [1], // Uninitiated leads can only transition to Fresh Lead (automatically via assignment)
  1: [2, 3, 4, 5, 10, 11],
  2: [2, 3, 4, 5, 10, 11],
  3: [3, 4, 5, 7, 8, 10, 11],
  4: [3], // reactivate
  5: [2, 3, 4, 8, 10, 11],
  6: [],
  7: [3, 4, 5, 8],
  8: [9],
  9: [14],
  10: [2, 3, 4, 5],
  11: [2, 3, 4, 5],
  12: [],
  13: [],
  14: [3, 4, 13],
};

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [leadId, setLeadId] = useState<number | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'logs' | 'meeting' | 'order'>('info');

  // Inline edit state (Form A)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: '',
    mobileAlt: '',
    connectionType: '',
    sanctionedLoadKw: '',
    address: '',
    pinCode: '',
    city: '',
    state: '',
    leadSource: '',
    assignedTlId: '',
    assignedConsultantId: '',
    discomName: '',
    connectionNumber: '',
  });

  const [tls, setTls] = useState<{ id: number; name: string }[]>([]);
  const [consultants, setConsultants] = useState<{ id: number; name: string; reportsTo: number | null }[]>([]);

  // Fetch users for assignments selectors
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [tlsRes, consRes] = await Promise.all([
          fetch('/api/v1/users?role=tl'),
          fetch('/api/v1/users?role=consultant'),
        ]);

        const tlsData = await tlsRes.json();
        const consData = await consRes.json();

        if (tlsData.success) setTls(tlsData.data);
        if (consData.success) setConsultants(consData.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (user && isEditing) fetchUsers();
  }, [user, isEditing]);

  // Status widget state
  const [newStatus, setNewStatus] = useState('');
  const [statusRemark, setStatusRemark] = useState('');
  
  // Specific stage states
  const [followUpSub, setFollowUpSub] = useState('warm');
  const [followUpTime, setFollowUpTime] = useState('');
  const [disqualifiedReason, setDisqualifiedReason] = useState('Shading Issue');

  // Form B (Meeting Booking) modal state
  const [showFormB, setShowFormB] = useState(false);
  const [formBData, setFormBData] = useState({
    address: '',
    pinCode: '',
    mobile: '',
    alternateMobile: '',
    meetingDate: '',
    meetingTime: '11:00',
    avgMonthlyBill: '',
    connectionType: '',
    assignedExecutiveId: '',
    notes: '',
  });

  // Form C (Meeting Ended) modal state
  const [showFormC, setShowFormC] = useState(false);
  const [formCOutcome, setFormCOutcome] = useState('sale_done');
  const [formCSubStatus, setFormCSubStatus] = useState('warm'); // warm/hot or reason
  const [formCFollowUpAt, setFormCFollowUpAt] = useState('');
  const [formCRemark, setFormCRemark] = useState('');

  // Form D (Order Punching) Form state
  const [orderForm, setOrderForm] = useState({
    connectionNumber: '',
    systemSizeKw: '',
    totalValue: '',
    downPayment: '',
    paymentMethod: 'cash',
    transactionRef: '',
    remainingMethod: 'cash',
    financeProvider: '',
    clientType: 'on_grid',
    subsidyApplicable: false,
    subsidyAmount: '',
    additionalNotes: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Load Lead details
  const fetchLeadDetails = async () => {
    if (!leadId) return;
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLead(data.data);
        
        // Setup Form A edit values
        setEditForm({
          customerName: data.data.customerName,
          mobileAlt: data.data.mobileAlt || '',
          connectionType: data.data.connectionType,
          sanctionedLoadKw: data.data.sanctionedLoadKw?.toString() || '',
          address: data.data.address,
          pinCode: data.data.pinCode,
          city: data.data.city,
          state: data.data.state,
          leadSource: data.data.leadSource || 'whatsapp',
          assignedTlId: data.data.assignedTlId?.toString() || '',
          assignedConsultantId: data.data.assignedConsultantId?.toString() || '',
          discomName: data.data.discomName || '',
          connectionNumber: data.data.connectionNumber || '',
        });

        // Prepopulate Form B default values from lead
        setFormBData({
          address: data.data.address,
          pinCode: data.data.pinCode,
          mobile: data.data.mobile,
          alternateMobile: data.data.mobileAlt || '',
          meetingDate: '',
          meetingTime: '11:00',
          avgMonthlyBill: '2000',
          connectionType: data.data.connectionType,
          assignedExecutiveId: data.data.assignedConsultantId?.toString() || user?.id.toString() || '',
          notes: '',
        });

        // Setup Form D order values if order exists
        if (data.data.order) {
          setOrderForm({
            connectionNumber: data.data.order.connectionNumber || '',
            systemSizeKw: data.data.order.systemSizeKw?.toString() || '',
            totalValue: data.data.order.totalValue?.toString() || '',
            downPayment: data.data.order.downPayment?.toString() || '',
            paymentMethod: data.data.order.paymentMethod || 'cash',
            transactionRef: data.data.order.transactionRef || '',
            remainingMethod: data.data.order.remainingMethod || 'cash',
            financeProvider: data.data.order.financeProvider || '',
            clientType: data.data.order.clientType || 'on_grid',
            subsidyApplicable: data.data.order.subsidyApplicable,
            subsidyAmount: data.data.order.subsidyAmount?.toString() || '',
            additionalNotes: data.data.order.additionalNotes || '',
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    params.then((p) => {
      const parsedId = parseInt(p.id, 10);
      if (!isNaN(parsedId)) {
        setLeadId(parsedId);
      }
    });
  }, [params]);

  useEffect(() => {
    if (leadId) {
      fetchLeadDetails();
      const isEdit = searchParams.get('edit') === 'true';
      if (isEdit) setIsEditing(true);
    }
  }, [leadId]);

  // Handle Form A Edit Details submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        fetchLeadDetails();
        alert('Lead details updated successfully.');
      } else {
        alert(data.message || 'Failed to update details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle standard status change requests
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;

    const statusNum = parseInt(newStatus, 10);

    // Dynamic Popups Interception
    if (statusNum === 8) {
      setShowFormB(true);
      return;
    }

    if (statusNum === 14) {
      setShowFormC(true);
      return;
    }

    // Prepare standard change payload
    const payload: any = {
      to_status: statusNum,
      remark: statusRemark,
    };

    if (statusNum === 3) {
      payload.sub_status = followUpSub;
      payload.followup_at = followUpTime;
    } else if (statusNum === 5) {
      payload.followup_at = followUpTime;
    } else if (statusNum === 12) {
      payload.sub_status = disqualifiedReason;
    }

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setNewStatus('');
        setStatusRemark('');
        fetchLeadDetails();
        alert('Status updated successfully.');
      } else {
        alert(data.message || 'Failed to update status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Form B (Meeting Booked) status change
  const handleFormBSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: 8,
          remark: `Meeting Booked: ${formBData.notes || 'scheduled site visit'}`,
          formB: formBData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowFormB(false);
        setNewStatus('');
        setStatusRemark('');
        fetchLeadDetails();
        setActiveTab('meeting');
        alert('Meeting booked successfully.');
      } else {
        alert(data.message || 'Failed to book meeting.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Form C (Meeting Ended Outcomes) status change
  const handleFormCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCRemark) {
      alert('Remarks are required for saving outcome.');
      return;
    }

    try {
      const payload: any = {
        to_status: 14,
        remark: `Meeting Ended. Outcome: ${formCOutcome}. Notes: ${formCRemark}`,
        formC: {
          outcome: formCOutcome,
          remark: formCRemark,
          sub_status: formCSubStatus,
          followup_at: formCFollowUpAt,
        },
      };

      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowFormC(false);
        setNewStatus('');
        setStatusRemark('');
        fetchLeadDetails();
        alert('Meeting outcome logged successfully.');
      } else {
        alert(data.message || 'Failed to save meeting outcome.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save/Update Form D Order punching details
  const handleOrderDetailsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead?.order) return;
    try {
      const res = await fetch(`/api/v1/orders/${lead.order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderForm),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeadDetails();
        alert('Order punched details saved successfully.');
      } else {
        alert(data.message || 'Failed to save details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Document uploads (Aadhaar, PAN, Electricity Bill, Bank Passbook)
  const handleFileChange = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !lead?.order) return;
    
    setUploadingDoc(docType);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);

    try {
      const res = await fetch(`/api/v1/orders/${lead.order.id}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetchLeadDetails();
      } else {
        alert(data.message || 'File upload failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingDoc(null);
    }
  };

  // Submit punching order to Finance
  const handleSubmitOrderToFinance = async () => {
    if (!lead?.order) return;
    try {
      const res = await fetch(`/api/v1/orders/${lead.order.id}/submit`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchLeadDetails();
        alert('Order successfully submitted to Finance Team!');
      } else {
        alert(data.message || 'Failed to submit order.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this lead from the database? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Lead deleted successfully.');
        router.push('/leads');
      } else {
        alert(data.message || 'Failed to delete lead.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !lead) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <Sun className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  const stageBadge = STAGE_BADGES[lead.status] || { name: `Stage ${lead.status}`, class: 'bg-slate-500' };

  // Calculate dynamic allowed transitions for select input
  const nextStageIds = ALLOWED_TRANSITIONS[lead.status] || [];
  // Filter by user role permissions (Admin bypassed)
  const roleFilteredNextStages = nextStageIds.filter((statusNum) => {
    if (user?.role === 'admin' || user?.role === 'sales_head') return true;
    if (statusNum === 3 && ['consultant', 'psa', 'tl', 'manager'].includes(user?.role || '')) return true;
    if (statusNum === 4 && ['consultant', 'psa', 'tl', 'manager'].includes(user?.role || '')) return true;
    if (statusNum === 8 && ['consultant', 'tl'].includes(user?.role || '')) return true;
    if (statusNum === 13 && ['consultant'].includes(user?.role || '')) return true;
    if (statusNum === 14 && ['consultant', 'tl', 'manager'].includes(user?.role || '')) return true;
    // Standard sales rules
    return ['consultant', 'psa'].includes(user?.role || '');
  });

  // Calculate Order Document uploads checkboxes checks
  const getDocStatus = (docType: string) => {
    const doc = lead.order?.documents.find((d) => d.docType === docType);
    return {
      uploaded: !!doc,
      fileName: doc?.fileName || '',
      id: doc?.id || null,
    };
  };

  const docsChecklist = [
    { type: 'aadhaar', label: 'Aadhaar Card' },
    { type: 'pan', label: 'PAN Card' },
    { type: 'electricity_bill', label: 'Electricity Bill' },
    { type: 'bank_passbook', label: 'Bank Passbook' },
  ];

  const allDocsUploaded = lead.order
    ? docsChecklist.every((item) => getDocStatus(item.type).uploaded)
    : false;

  return (
    <div className="space-y-6">
      {/* Back button & Title Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all focus:outline-none"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">{lead.customerName}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${stageBadge.class}`}>
                {stageBadge.name}
              </span>
              {lead.isUnreachable && (
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
                  Unreachable ⚠️
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Lead ID: #{lead.leadCode}</p>
          </div>
        </div>

        {/* Action controls */}
        {user?.role === 'admin' && (
          <button
            onClick={() => handleDeleteLead(lead.id)}
            className="py-2 px-4 rounded-lg bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/30 transition-all font-semibold text-xs flex items-center gap-1.5"
          >
            Deactivate Lead
          </button>
        )}
      </div>

      {lead.status === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-xs flex items-start gap-3 shadow-md">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <strong className="text-white font-bold block mb-0.5">Uninitiated Lead Pool</strong>
            This lead is currently in the unassigned pool (Uninitiated). Assign a coordinator to move it to the active Sales Pipeline.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main tabs container */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            {/* Tabs selector */}
            <div className="flex border-b border-slate-800 bg-slate-900/10 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-4 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'info'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Info</span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex-1 py-4 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'logs'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Activity Log</span>
              </button>
              {lead.status >= 8 && (
                <button
                  onClick={() => setActiveTab('meeting')}
                  className={`flex-1 py-4 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'meeting'
                      ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Meeting Details</span>
                </button>
              )}
              
              {/*lead.status >= 13 && (
                <button
                  onClick={() => setActiveTab('order')}
                  className={`flex-1 py-4 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'order'
                      ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Order Punching & Documents</span>
                </button>
              )*/}
              
            </div>

            {/* Tab content panels */}
            <div className="p-6">
              {/* 1. INFO TAB */}
              {activeTab === 'info' && (
                <div>
                  {!isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Full Name</p>
                        <p className="text-sm font-semibold text-white mt-1.5">{lead.customerName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Primary Mobile</p>
                        <p className="text-sm font-mono text-white mt-1.5">{lead.mobile}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Alternate Mobile</p>
                        <p className="text-sm font-mono text-white mt-1.5">{lead.mobileAlt || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Connection Type</p>
                        <p className="text-sm capitalize text-white mt-1.5">{lead.connectionType}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sanctioned Load (kW)</p>
                        <p className="text-sm text-white mt-1.5">{lead.sanctionedLoadKw ? `${lead.sanctionedLoadKw} kW` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lead Source</p>
                        <p className="text-sm capitalize text-white mt-1.5">{lead.leadSource || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">DisCom Name</p>
                        <p className="text-sm text-white mt-1.5">{lead.discomName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Connection Number</p>
                        <p className="text-sm font-mono text-white mt-1.5">{lead.connectionNumber || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Full Address</p>
                        <p className="text-sm text-white mt-1.5 leading-relaxed">{lead.address}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pincode / City</p>
                        <p className="text-sm text-white mt-1.5">{lead.pinCode} - {lead.city}, {lead.state}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Assigned Team Hierarchy</p>
                        <div className="text-xs text-slate-400 mt-1.5 space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                          <div>Manager: <strong>{lead.manager?.name || 'Unassigned'}</strong></div>
                          <div>TL: <strong>{lead.tl?.name || 'Unassigned'}</strong></div>
                          <div>Consultant: <strong>{lead.consultant?.name || 'Unassigned'}</strong></div>
                        </div>
                      </div>

                      {lead.otherData && (() => {
                        try {
                          const parsed = JSON.parse(lead.otherData);
                          return (
                            <div className="md:col-span-2 pt-4 border-t border-slate-800/80">
                              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">CSV Metadata / Extra Fields</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
                                {Object.entries(parsed).map(([key, val]: [string, any]) => (
                                  <div key={key}>
                                    <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wide">{key}</span>
                                    <span className="text-xs text-white mt-1 block leading-normal">{val ? String(val) : '-'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}

                      {/* Edit Trigger */}
                      {['admin', 'sales_head', 'manager', 'tl'].includes(user?.role || '') && (
                        <div className="md:col-span-2 pt-4 border-t border-slate-800/80">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="py-2 px-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold transition-all"
                          >
                            Edit Information
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Inline Edit Form A
                    <form onSubmit={handleEditSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Name</label>
                          <input
                            type="text"
                            required
                            value={editForm.customerName}
                            onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Alternate Phone</label>
                          <input
                            type="text"
                            value={editForm.mobileAlt}
                            onChange={(e) => setEditForm({ ...editForm, mobileAlt: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Connection Type</label>
                          <select
                            value={editForm.connectionType}
                            onChange={(e) => setEditForm({ ...editForm, connectionType: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          >
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                            <option value="industrial">Industrial</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Sanctioned Load (kW)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={editForm.sanctionedLoadKw}
                            onChange={(e) => setEditForm({ ...editForm, sanctionedLoadKw: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">DisCom Name</label>
                          <input
                            type="text"
                            value={editForm.discomName}
                            onChange={(e) => setEditForm({ ...editForm, discomName: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Connection Number</label>
                          <input
                            type="text"
                            value={editForm.connectionNumber}
                            onChange={(e) => setEditForm({ ...editForm, connectionNumber: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 font-mono"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Full Address</label>
                          <textarea
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs h-20 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Pincode</label>
                          <input
                            type="text"
                            value={editForm.pinCode}
                            onChange={(e) => setEditForm({ ...editForm, pinCode: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">City</label>
                          <input
                            type="text"
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">State</label>
                          <input
                            type="text"
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Lead Source</label>
                          <select
                            value={editForm.leadSource}
                            onChange={(e) => setEditForm({ ...editForm, leadSource: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="cold_call">Cold Call</option>
                            <option value="referral">Referral</option>
                            <option value="walk_in">Walk-In</option>
                            <option value="google_ad">Google Ad</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        {/* Assignment Controls */}
                        {(['admin', 'sales_head', 'manager'].includes(user?.role || '') || (user?.role === 'tl' && !lead.tl)) && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Assign to Team Leader</label>
                            <select
                              value={editForm.assignedTlId}
                              onChange={(e) => {
                                const newTlId = e.target.value;
                                setEditForm({ ...editForm, assignedTlId: newTlId, assignedConsultantId: '' });
                              }}
                              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                            >
                              <option value="">Unassigned</option>
                              {tls.map((tl) => (
                                <option key={tl.id} value={tl.id}>
                                  {tl.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {['admin', 'sales_head', 'manager', 'tl'].includes(user?.role || '') && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Assign to Consultant</label>
                            <select
                              value={editForm.assignedConsultantId}
                              onChange={(e) => setEditForm({ ...editForm, assignedConsultantId: e.target.value })}
                              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                            >
                              <option value="">Unassigned</option>
                              {(user?.role === 'tl' ? consultants.filter(c => c.reportsTo === user.id) : consultants).map((con) => (
                                <option key={con.id} value={con.id}>
                                  {con.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 border-t border-slate-800/80 pt-4">
                        <button
                          type="submit"
                          className="py-2 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-lg font-bold text-xs shadow-md"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 2. ACTIVITY LOG TAB */}
              {activeTab === 'logs' && (
                <div className="relative border-l-2 border-slate-800 ml-3 pl-6 space-y-6">
                  {lead.activityLogs.map((log) => {
                    const fromStage = log.fromStatus ? STAGE_BADGES[log.fromStatus] : null;
                    const toStage = STAGE_BADGES[log.toStatus] || { name: `Stage ${log.toStatus}`, class: 'bg-slate-500' };

                    return (
                      <div key={log.id} className="relative">
                        {/* Bullet dot */}
                        <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-amber-500" />
                        
                        <div>
                          <p className="text-xs font-semibold text-slate-300">
                            {new Date(log.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {fromStage ? (
                              <>
                                <span className={`text-[9px] px-2 py-0.25 border rounded-full uppercase tracking-wider ${fromStage.class}`}>
                                  {fromStage.name}
                                </span>
                                <span className="text-slate-500">→</span>
                              </>
                            ) : null}
                            <span className={`text-[9px] px-2 py-0.25 border rounded-full uppercase tracking-wider ${toStage.class}`}>
                              {toStage.name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Updated by <strong>{log.user.name}</strong> ({log.user.role})
                          </p>
                          {log.remark && (
                            <p className="text-xs text-slate-500 italic mt-1 leading-normal border-l-2 border-slate-800 pl-2">
                              "{log.remark}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. MEETING TAB */}
              {activeTab === 'meeting' && (
                <div className="space-y-6">
                  {lead.meetings.map((meet, index) => (
                    <div
                      key={meet.id}
                      className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-4 shadow-sm"
                    >
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Meeting Booking #{index + 1}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500 uppercase tracking-wider font-semibold">Scheduled Date / Time</span>
                          <p className="text-sm font-semibold text-white mt-1">
                            {new Date(meet.meetingDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            at {meet.meetingTime}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase tracking-wider font-semibold">Monthly Electricity Bill</span>
                          <p className="text-sm font-bold text-white mt-1">₹ {meet.avgMonthlyBill.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase tracking-wider font-semibold">Meeting Contact</span>
                          <p className="text-sm text-white mt-1 font-mono">{meet.mobile}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase tracking-wider font-semibold">Connection Class</span>
                          <p className="text-sm text-white mt-1 capitalize">{meet.connectionType}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-500 uppercase tracking-wider font-semibold">Visit Address</span>
                          <p className="text-sm text-white mt-1 leading-relaxed">{meet.address} ({meet.pinCode})</p>
                        </div>
                        {meet.notes && (
                          <div className="sm:col-span-2">
                            <span className="text-slate-500 uppercase tracking-wider font-semibold">Special Instructions</span>
                            <p className="text-sm text-slate-400 mt-1 leading-normal italic bg-slate-950/20 p-2.5 rounded-lg border border-slate-850">
                              "{meet.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              

              {/* 4. ORDER PUNCHING TAB */}
              {activeTab === 'order' && lead.order && (
                <div className="space-y-8">
                  {/* Order Details form */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                      Order Punching details (Order Code: {lead.order.orderCode})
                    </h3>
                    
                    {lead.order.status !== 'draft' && user?.role === 'consultant' ? (
                      <div className="mb-6 p-4 rounded-xl bg-slate-950/40 border border-slate-850/80 text-slate-400 text-xs leading-normal flex items-start gap-2.5">
                        <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                          <strong className="text-white">Order Details Locked:</strong> This order has been submitted to Finance (Current Status: <span className="font-bold text-amber-400 capitalize">{lead.order.status}</span>). You can no longer modify the punching fields unless sent back to draft by Finance.
                        </div>
                      </div>
                    ) : null}

                    <form onSubmit={handleOrderDetailsSave} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Electricity Connection Number</label>
                          <input
                            type="text"
                            required
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            value={orderForm.connectionNumber}
                            onChange={(e) => setOrderForm({ ...orderForm, connectionNumber: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Proposed System Size (kW)</label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            value={orderForm.systemSizeKw}
                            onChange={(e) => setOrderForm({ ...orderForm, systemSizeKw: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Total System Value (₹)</label>
                          <input
                            type="number"
                            required
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            value={orderForm.totalValue}
                            onChange={(e) => setOrderForm({ ...orderForm, totalValue: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Collected Down Payment (₹)</label>
                          <input
                            type="number"
                            required
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            value={orderForm.downPayment}
                            onChange={(e) => setOrderForm({ ...orderForm, downPayment: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Transaction Method</label>
                          <select
                            value={orderForm.paymentMethod}
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="cheque">Cheque</option>
                            <option value="neft">NEFT / RTGS</option>
                            <option value="bank_transfer">Bank Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Transaction Reference</label>
                          <input
                            type="text"
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            value={orderForm.transactionRef}
                            onChange={(e) => setOrderForm({ ...orderForm, transactionRef: e.target.value })}
                            placeholder="UPI Reference / Cheque ID / NEFT number"
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Remaining Payment Scheme</label>
                          <select
                            value={orderForm.remainingMethod}
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            onChange={(e) => setOrderForm({ ...orderForm, remainingMethod: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          >
                            <option value="cash">Direct Cash/UPI</option>
                            <option value="finance">Finance Loan</option>
                            <option value="emi">EMI Plan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Finance Provider (if applicable)</label>
                          <input
                            type="text"
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            value={orderForm.financeProvider}
                            onChange={(e) => setOrderForm({ ...orderForm, financeProvider: e.target.value })}
                            placeholder="Bank / NBFC Name"
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Client Setup Type</label>
                          <select
                            value={orderForm.clientType}
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            onChange={(e) => setOrderForm({ ...orderForm, clientType: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          >
                            <option value="on_grid">On-Grid (Connected to Net Metering)</option>
                            <option value="off_grid">Off-Grid (Connected to Battery Banks)</option>
                            <option value="hybrid">Hybrid (Both)</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 mt-6 cursor-pointer select-none text-xs font-semibold text-slate-300">
                            <input
                              type="checkbox"
                              disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                              checked={orderForm.subsidyApplicable}
                              onChange={(e) => setOrderForm({ ...orderForm, subsidyApplicable: e.target.checked })}
                              className="w-4 h-4 bg-slate-950 border border-slate-800 rounded text-amber-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span>Government Subsidy Eligible?</span>
                          </label>
                        </div>
                        {orderForm.subsidyApplicable && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Subsidy Amount Claimable (₹)</label>
                            <input
                              type="number"
                              disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                              value={orderForm.subsidyAmount}
                              onChange={(e) => setOrderForm({ ...orderForm, subsidyAmount: e.target.value })}
                              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                            />
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Terrestrial/Structural Notes</label>
                          <textarea
                            value={orderForm.additionalNotes}
                            disabled={lead.order.status !== 'draft' && user?.role === 'consultant'}
                            onChange={(e) => setOrderForm({ ...orderForm, additionalNotes: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs h-20 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Display calculations */}
                      {orderForm.totalValue && orderForm.downPayment && (
                        <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-lg text-xs flex flex-wrap gap-x-8 gap-y-2 justify-between max-w-lg">
                          <div>
                            <span className="text-slate-500">Remaining Balance:</span>
                            <span className="text-sm font-bold text-white ml-2">
                              ₹ {(parseFloat(orderForm.totalValue) - parseFloat(orderForm.downPayment)).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {orderForm.subsidyApplicable && orderForm.subsidyAmount && (
                            <div>
                              <span className="text-slate-500">Net Cost to Client:</span>
                              <span className="text-sm font-extrabold text-amber-400 ml-2">
                                ₹ {(parseFloat(orderForm.totalValue) - parseFloat(orderForm.subsidyAmount)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Button */}
                      {(lead.order.status === 'draft' || user?.role !== 'consultant') && (
                        <div className="border-t border-slate-800/80 pt-4">
                          <button
                            type="submit"
                            className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs"
                          >
                            Save Punching Details
                          </button>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Document Checklist & Uploads */}
                  <div className="border-t border-slate-800/80 pt-8 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                        Order Documents Checklist
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Upload the 4 required client verification files. Only PDF, JPG, and PNG are allowed (Max 5MB).
                      </p>
                    </div>

                    {/* Green check boxes checklist representation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {docsChecklist.map((item) => {
                        const { uploaded, fileName, id } = getDocStatus(item.type);
                        return (
                          <div
                            key={item.type}
                            className={`p-4 rounded-xl border flex flex-col justify-between h-32 transition-all ${
                              uploaded
                                ? 'bg-emerald-500/[0.02] border-emerald-500/20'
                                : 'bg-slate-950/20 border-slate-850'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-slate-300 leading-snug">{item.label}</span>
                              {uploaded ? (
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-800" />
                              )}
                            </div>

                            <div className="mt-4">
                              {uploaded ? (
                                <div className="flex flex-col gap-1 min-w-0">
                                  <a
                                    href={`/api/v1/orders/${lead.order?.id}/documents/${id}`}
                                    target="_blank"
                                    className="text-[10px] text-amber-400 hover:underline truncate font-semibold flex items-center gap-1"
                                  >
                                    <File className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>
                                  <span className="text-[9px] text-slate-500 truncate">{fileName}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Not uploaded</span>
                              )}
                            </div>

                            {/* Upload trigger */}
                            {(lead.order?.status === 'draft' || user?.role !== 'consultant') && (
                              <div className="mt-2">
                                <label className="cursor-pointer text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-all flex items-center gap-1.5 w-fit">
                                  {uploadingDoc === item.type ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-3 h-3" />
                                      <span>{uploaded ? 'Replace File' : 'Upload File'}</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    className="hidden"
                                    disabled={uploadingDoc !== null}
                                    onChange={(e) => handleFileChange(item.type, e)}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Hard backend disabled submission button */}
                    {lead.order.status === 'draft' && (
                      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wide">Submit to Finance</h4>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Verify all documents have green checks and punching details are saved before submitting.
                          </p>
                        </div>
                        <div>
                          <button
                            onClick={handleSubmitOrderToFinance}
                            disabled={!allDocsUploaded}
                            className={`py-2.5 px-5 rounded-lg font-bold text-xs shadow-lg transition-all ${
                              allDocsUploaded
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 cursor-pointer shadow-emerald-500/10'
                                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                            }`}
                          >
                            Submit Order for Approval
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        

        {/* Dynamic transition widget panel in right sidebar */}
        <div className="space-y-6">
          <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>Pipeline Stage Control</span>
            </h3>

            {/* Allowed stage dropdown or locked notification */}
            {roleFilteredNextStages.length === 0 ? (
              <div className="p-4 bg-slate-950/40 border border-slate-850/80 rounded-xl text-slate-500 text-xs italic text-center">
                This lead has reached a terminal stage ({stageBadge.name}) or you do not have permissions to trigger transitions.
              </div>
            ) : (
              <form onSubmit={handleStatusSubmit} className="space-y-4">
                {/* Status Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Change Status To</label>
                  <select
                    value={newStatus}
                    required
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
                  >
                    <option value="">Select Next Status</option>
                    {roleFilteredNextStages.map((statusNum) => {
                      const badge = STAGE_BADGES[statusNum] || { name: `Stage ${statusNum}` };
                      return (
                        <option key={statusNum} value={statusNum}>
                          {badge.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Conditional Fields: Stage 3 (Follow Up) details */}
                {parseInt(newStatus, 10) === 3 && (
                  <div className="space-y-4 p-3 bg-slate-950/40 border border-slate-850 rounded-lg animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Sub-Type</label>
                      <select
                        value={followUpSub}
                        onChange={(e) => setFollowUpSub(e.target.value)}
                        className="block w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px]"
                      >
                        <option value="warm">Warm Lead (mild interest)</option>
                        <option value="hot">Hot Lead 🔥 (very interested)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Follow-Up Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
                        className="block w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Stage 5 (Call Later) details */}
                {parseInt(newStatus, 10) === 5 && (
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg animate-fade-in">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Call Back Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="block w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px]"
                    />
                  </div>
                )}

                {/* Conditional Fields: Stage 12 (Can't Fit Solar) details */}
                {parseInt(newStatus, 10) === 12 && (
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg animate-fade-in">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Reason for Infeasibility</label>
                    <select
                      value={disqualifiedReason}
                      onChange={(e) => setDisqualifiedReason(e.target.value)}
                      className="block w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px]"
                    >
                      <option value="Shading Issue">Too Much Shading</option>
                      <option value="Roof Structure">Roof Structurally Unsafe</option>
                      <option value="Rented Property">Rented Property</option>
                      <option value="Landlord Refusal">Landlord denied NOC</option>
                      <option value="Too Small">Terrace Area Too Small</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {/* Mandatory Remark */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Remarks / Summary of Interaction</label>
                  <textarea
                    required
                    value={statusRemark}
                    onChange={(e) => setStatusRemark(e.target.value)}
                    placeholder="Enter call notes or reasons for status change..."
                    className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs h-20 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md"
                >
                  Save Status Change
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Form B Modal: Meeting Booking Form */}
      {showFormB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Form B: Schedule Meeting / Site Visit</h3>
              <button onClick={() => setShowFormB(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormBSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Meeting Date</label>
                  <input
                    type="date"
                    required
                    value={formBData.meetingDate}
                    onChange={(e) => setFormBData({ ...formBData, meetingDate: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Meeting Time</label>
                  <input
                    type="time"
                    required
                    value={formBData.meetingTime}
                    onChange={(e) => setFormBData({ ...formBData, meetingTime: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Average Monthly Bill (₹)</label>
                  <input
                    type="number"
                    required
                    value={formBData.avgMonthlyBill}
                    onChange={(e) => setFormBData({ ...formBData, avgMonthlyBill: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Connection Type</label>
                  <select
                    value={formBData.connectionType}
                    onChange={(e) => setFormBData({ ...formBData, connectionType: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Visit Full Address</label>
                  <textarea
                    required
                    value={formBData.address}
                    onChange={(e) => setFormBData({ ...formBData, address: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs h-16"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">City Pincode</label>
                  <input
                    type="text"
                    required
                    value={formBData.pinCode}
                    onChange={(e) => setFormBData({ ...formBData, pinCode: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Contact Mobile</label>
                  <input
                    type="text"
                    required
                    value={formBData.mobile}
                    onChange={(e) => setFormBData({ ...formBData, mobile: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Special Executive Instructions</label>
                  <textarea
                    value={formBData.notes}
                    onChange={(e) => setFormBData({ ...formBData, notes: e.target.value })}
                    placeholder="Terrace accessibility details, shading objects information, etc."
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs h-16"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-800/80 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowFormB(false)}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md"
                >
                  Confirm Meeting Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Form C Modal: Meeting Ended Outcomes */}
      {showFormC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Form C: Document Meeting Outcome</h3>
              <button onClick={() => setShowFormC(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormCSubmit} className="p-6 space-y-4">
              {/* Select Outcome */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Meeting Outcome</label>
                <select
                  value={formCOutcome}
                  onChange={(e) => setFormCOutcome(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs"
                >
                  <option value="sale_done">Sale Done ⭐ (Confirms purchase - creates draft order)</option>
                  <option value="follow_up">Follow Up (Needs scheduled callback/warm lead)</option>
                  <option value="not_interested">Not Interested (Disqualified)</option>
                </select>
              </div>

              {/* Conditional outcome fields */}
              {formCOutcome === 'follow_up' && (
                <div className="space-y-4 p-3 bg-slate-950/40 border border-slate-850 rounded-lg">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-450 mb-1">Sub-Type</label>
                    <select
                      value={formCSubStatus}
                      onChange={(e) => setFormCSubStatus(e.target.value)}
                      className="block w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px]"
                    >
                      <option value="warm">Warm Lead</option>
                      <option value="hot">Hot Lead 🔥</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-450 mb-1">Follow-Up Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formCFollowUpAt}
                      onChange={(e) => setFormCFollowUpAt(e.target.value)}
                      className="block w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px]"
                    />
                  </div>
                </div>
              )}

              {formCOutcome === 'not_interested' && (
                <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg">
                  <label className="block text-[10px] font-semibold text-slate-450 mb-1">Reason for Disinterest</label>
                  <select
                    value={formCSubStatus}
                    onChange={(e) => setFormCSubStatus(e.target.value)}
                    className="block w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px]"
                  >
                    <option value="Price">Price too high</option>
                    <option value="Not Convinced">Not convinced of ROI</option>
                    <option value="Competitor">Chose a competitor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Remarks / Meeting Summary</label>
                <textarea
                  required
                  value={formCRemark}
                  onChange={(e) => setFormCRemark(e.target.value)}
                  placeholder="Summarize the site visit inspection and client discussions..."
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs h-24"
                />
              </div>

              <div className="flex gap-3 border-t border-slate-800/80 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowFormC(false)}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md"
                >
                  Save Meeting Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple close widget SVG
function X({ className, ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
