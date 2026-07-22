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
  Mic,
  Square,
  Trash2,
  Eye,
  Check,
  Sparkles,
  PhoneOff,
  Clock,
  ThumbsDown,
  Hourglass,
  XCircle,
  CheckCircle2,
  Download,
  Truck,
  Camera,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { BeautifulAudioPlayer } from '@/components/BeautifulAudioPlayer';
import { MeetingLocationDisplay } from '@/components/MeetingLocationDisplay';
import { LeadTrackingTimeline } from '@/components/LeadTrackingTimeline';

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
    meetingLatitude: number | null;
    meetingLongitude: number | null;
    meetingCity: string | null;
    meetingLocality: string | null;
    meetingPinCode: string | null;
    audioRecordingPath: string | null;
    meetingDurationSec: number | null;
    meetingStartedAt: string | null;
    meetingEndedAt: string | null;
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
    rejectionReason: string | null;
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
  8: { name: 'Meeting Booked', class: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  9: { name: 'Meeting Done', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  10: { name: 'Disconnected', class: 'bg-slate-600/15 text-slate-400 border-slate-600/20' },
  11: { name: 'Switch Off', class: 'bg-slate-700/20 text-slate-400 border-slate-700/30' },
  12: { name: 'Can\'t Fit Solar', class: 'bg-stone-900 text-stone-400 border-stone-800/40' },
  13: { name: 'Sale Done', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold' },
};

// Transition matrix for select dropdown option filters
const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  0: [1], // Uninitiated leads can only transition to Fresh Lead (automatically via assignment)
  1: [2, 3, 4, 5, 6, 8, 10, 11],
  2: [2, 3, 4, 5, 6, 8, 10, 11],
  3: [3, 4, 5, 6, 7, 8, 10, 11],
  4: [3], // reactivate
  5: [2, 3, 4, 6, 8, 10, 11],
  6: [],
  7: [3, 4, 5, 6, 8],
  8: [9],
  9: [3, 4, 13],
  10: [2, 3, 4, 5, 6, 8],
  11: [2, 3, 4, 5, 6, 8],
  12: [],
  13: [],
};

const getStageConfig = (statusNum: number) => {
  const configs: Record<number, { name: string; desc: string; icon: string; bg: string; text: string }> = {
    0: { name: 'Uninitiated', desc: 'Unassigned, fresh lead', icon: 'AlertTriangle', bg: 'bg-[#3b3a37]/10', text: 'text-[#c9c5ba]' },
    1: { name: 'Fresh Lead', desc: 'Coordinator assigned', icon: 'Sparkles', bg: 'bg-blue-500/5', text: 'text-blue-400' },
    2: { name: 'DNP (No Answer)', desc: 'Did Not Pick up', icon: 'PhoneOff', bg: 'bg-slate-500/5', text: 'text-slate-405' },
    3: { name: 'Follow Up', desc: 'Follow-up call scheduled', icon: 'Calendar', bg: 'bg-amber-500/5', text: 'text-amber-400' },
    4: { name: 'Not Interested', desc: 'Lead declined offer', icon: 'ThumbsDown', bg: 'bg-red-800/5', text: 'text-red-400' },
    5: { name: 'Call Later', desc: 'Callback requested later', icon: 'Clock', bg: 'bg-purple-500/5', text: 'text-purple-400' },
    6: { name: 'Already Installed', desc: 'Solar already exists', icon: 'CheckCircle', bg: 'bg-slate-800/10', text: 'text-slate-500' },
    7: { name: 'Decision Pending', desc: 'Pending lead decision', icon: 'Hourglass', bg: 'bg-yellow-500/5', text: 'text-yellow-400' },
    8: { name: 'Book Meeting', desc: 'Schedule visit / Form B', icon: 'Calendar', bg: 'bg-teal-500/5', text: 'text-teal-400' },
    9: { name: 'Meeting Done', desc: 'Site visit completed', icon: 'FileCheck', bg: 'bg-cyan-500/5', text: 'text-cyan-400' },
    10: { name: 'Disconnected', desc: 'Call could not connect', icon: 'PhoneOff', bg: 'bg-slate-600/5', text: 'text-slate-400' },
    11: { name: 'Switch Off', desc: 'Phone is switched off', icon: 'PowerOff', bg: 'bg-slate-700/5', text: 'text-slate-400' },
    12: { name: "Can't Fit Solar", desc: 'Site is infeasible', icon: 'XCircle', bg: 'bg-stone-900/10', text: 'text-stone-400' },
    13: { name: 'Sale Done', desc: 'Convert to order / Form D', icon: 'CheckCircle2', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
  };

  return configs[statusNum] || { name: `Stage ${statusNum}`, desc: 'Pipeline Status', icon: 'Layers', bg: 'bg-slate-900/10', text: 'text-slate-400' };
};

const renderStageIcon = (iconName: string, className: string = "w-4 h-4") => {
  switch (iconName) {
    case 'AlertTriangle': return <AlertTriangle className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'PhoneOff': return <PhoneOff className={className} />;
    case 'Calendar': return <Calendar className={className} />;
    case 'ThumbsDown': return <ThumbsDown className={className} />;
    case 'Clock': return <Clock className={className} />;
    case 'CheckCircle': return <CheckCircle className={className} />;
    case 'Hourglass': return <Hourglass className={className} />;
    case 'FileCheck': return <FileCheck className={className} />;
    case 'PowerOff': return <CheckCircle className={className} />; // Fallback to CheckCircle or add custom if needed
    case 'XCircle': return <XCircle className={className} />;
    case 'CheckCircle2': return <CheckCircle2 className={className} />;
    default: return <Layers className={className} />;
  }
};

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [leadId, setLeadId] = useState<number | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'action' | 'track' | 'meeting' | 'order'>('info');

  // Workflow, tasks, assignments and documents history states
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [leadDocuments, setLeadDocuments] = useState<any[]>([]);
  const [leadAuditLogs, setLeadAuditLogs] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignPriority, setAssignPriority] = useState('medium');
  const [assigningEmployee, setAssigningEmployee] = useState(false);
  const [assigningTeam, setAssigningTeam] = useState(false);

  // Camera Modal States
  const [cameraModal, setCameraModal] = useState<{
    isOpen: boolean;
    onCapture: (file: File) => void;
  }>({
    isOpen: false,
    onCapture: () => {},
  });

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      alert('Could not access camera. Please check permissions.');
      setCameraModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCapturedPhoto(null);
  };

  useEffect(() => {
    if (cameraModal.isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraModal.isOpen]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      if (cameraStream) {
        cameraStream.getVideoTracks().forEach(track => track.enabled = false);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    if (cameraStream) {
      cameraStream.getVideoTracks().forEach(track => track.enabled = true);
    }
  };

  const confirmPhoto = () => {
    if (!capturedPhoto) return;
    const byteString = atob(capturedPhoto.split(',')[1]);
    const mimeString = capturedPhoto.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new window.File([blob], `camera_snapshot_${Date.now()}.jpg`, { type: 'image/jpeg' });
    cameraModal.onCapture(file);
    setCameraModal(prev => ({ ...prev, isOpen: false }));
  };

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
    assignedManagerId: '',
    assignedTlId: '',
    assignedConsultantId: '',
    discomName: '',
    connectionNumber: '',
  });

  const [employees, setEmployees] = useState<any[]>([]);

  // Fetch users for assignments selectors
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
    assignedManagerId: '',
    assignedTlId: '',
    notes: '',
  });

  // Form C (Meeting Ended) modal state
  const [showFormC, setShowFormC] = useState(false);
  const [formCOutcome, setFormCOutcome] = useState('sale_done');
  const [formCSubStatus, setFormCSubStatus] = useState('warm'); // warm/hot or reason
  const [formCFollowUpAt, setFormCFollowUpAt] = useState('');
  const [formCRemark, setFormCRemark] = useState('');

  // Helper to check if employee belongs to Sales & Marketing department and is NOT in a PSA role
  const isSalesNonPsaOrAdmin = (emp: any) => {
    const deptName = emp.department?.name || '';
    const isSales = deptName === 'Sales' || deptName === 'Sales & Marketing';
    const desName = emp.designation?.name || '';
    const isPsa = desName.includes('PSA');
    const isAdmin = emp.role === 'admin' || emp.designation?.name === 'Admin';
    return (isSales && !isPsa) || isAdmin;
  };

  const salesManagers = employees.filter((emp) => {
    if (!isSalesNonPsaOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    return desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || emp.role === 'admin';
  });

  const salesTls = employees.filter((emp) => {
    if (!isSalesNonPsaOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    return desName.includes('TL') || desName.includes('Team Leader') || desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || emp.role === 'admin';
  });

  const salesConsultants = employees.filter((emp) => {
    if (!isSalesNonPsaOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    return desName.includes('Consultant') || desName.includes('TL') || desName.includes('Team Leader') || desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || emp.role === 'admin';
  });

  // Helper to check if employee belongs to Finance department
  const isFinanceOrAdmin = (emp: any) => {
    const deptName = emp.department?.name || '';
    const isFinance = deptName === 'Finance';
    const isAdmin = emp.role === 'admin' || emp.designation?.name === 'Admin';
    return isFinance || isAdmin;
  };

  const financeManagers = employees.filter((emp) => {
    if (!isFinanceOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    return desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || emp.role === 'admin';
  });

  const financeTls = employees.filter((emp) => {
    if (!isFinanceOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    return desName.includes('TL') || desName.includes('Team Leader') || desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || emp.role === 'admin';
  });

  const financeConsultants = employees.filter((emp) => {
    if (!isFinanceOrAdmin(emp)) return false;
    const desName = emp.designation?.name || '';
    return desName.includes('Consultant') || desName.includes('TL') || desName.includes('Team Leader') || desName.includes('Manager') || desName.includes('Head') || desName.includes('Admin') || emp.role === 'admin';
  });

  const handleSelectFinanceAssignee = (userIdStr: string) => {
    if (!userIdStr) {
      setFinanceManagerId('');
      setFinanceTlId('');
      setFinanceConsultantId('');
      return;
    }

    const userId = parseInt(userIdStr, 10);
    const targetUser = employees.find(u => u.id === userId);
    if (!targetUser) return;

    const level = targetUser.designation?.level ?? 6;
    if (level <= 3) {
      setFinanceManagerId(userIdStr);
      setFinanceTlId('');
      setFinanceConsultantId('');
    } else if (level === 4) {
      setFinanceManagerId('');
      setFinanceTlId(userIdStr);
      setFinanceConsultantId('');
    } else {
      setFinanceManagerId('');
      setFinanceTlId('');
      setFinanceConsultantId(userIdStr);
    }
  };

  // Image Lightbox State & Helper
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const isImageFile = (fileName: string) => {
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext ? ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) : false;
  };

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
    additionalNotes: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeManagerId, setFinanceManagerId] = useState('');
  const [financeTlId, setFinanceTlId] = useState('');
  const [financeConsultantId, setFinanceConsultantId] = useState('');

  // Meeting recording & tracking states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Load Lead details
  const fetchLeadDetails = async () => {
    if (!leadId) return;
    setIsDataLoaded(false);
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLead(data.data);
        setLeadTasks(data.data.tasks || []);
        setLeadDocuments(data.data.documents || []);
        setLeadAuditLogs(data.data.auditLogs || []);
        setSelectedTeamId(data.data.assignedTeamId?.toString() || '');
        const activeAssign = data.data.employeeAssignments?.find((a: any) => a.isActive);
        setSelectedEmpId(activeAssign?.employeeId?.toString() || data.data.assignedConsultantId?.toString() || '');
        
        // Setup Form A edit values
        const savedEditForm = typeof window !== 'undefined' ? localStorage.getItem(`solar_crm_lead_edit_form_${data.data.id}`) : null;
        if (!savedEditForm) {
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
            assignedManagerId: data.data.assignedManagerId?.toString() || '',
            assignedTlId: data.data.assignedTlId?.toString() || '',
            assignedConsultantId: data.data.assignedConsultantId?.toString() || '',
            discomName: data.data.discomName || '',
            connectionNumber: data.data.connectionNumber || '',
          });
        }

        // Prepopulate Form B default values from lead
        const savedFormBData = typeof window !== 'undefined' ? localStorage.getItem(`solar_crm_lead_form_b_data_${data.data.id}`) : null;
        if (!savedFormBData) {
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
            assignedManagerId: data.data.assignedManagerId?.toString() || '',
            assignedTlId: data.data.assignedTlId?.toString() || '',
            notes: '',
          });
        }

        // Setup Form D order values if order exists
        const savedOrderForm = typeof window !== 'undefined' ? localStorage.getItem(`solar_crm_lead_order_form_${data.data.id}`) : null;
        if (!savedOrderForm) {
          if (data.data.order) {
            setOrderForm({
              connectionNumber: data.data.order.connectionNumber || data.data.connectionNumber || '',
              systemSizeKw: data.data.order.systemSizeKw?.toString() || '',
              totalValue: data.data.order.totalValue?.toString() || '',
              downPayment: data.data.order.downPayment?.toString() || '',
              paymentMethod: data.data.order.paymentMethod || 'cash',
              transactionRef: data.data.order.transactionRef || '',
              remainingMethod: data.data.order.remainingMethod || 'cash',
              financeProvider: data.data.order.financeProvider || '',
              clientType: data.data.order.clientType || 'on_grid',
              additionalNotes: data.data.order.additionalNotes || '',
            });
          } else {
            setOrderForm((prev) => ({
              ...prev,
              connectionNumber: data.data.connectionNumber || '',
            }));
          }
        }
        setIsDataLoaded(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeams = async () => {
    try {
      const res = await fetch('/api/v1/teams');
      const data = await res.json();
      if (data.success && data.data) {
        setAllTeams(data.data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const handleToggleTask = async (taskId: number, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, isCompleted }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeadDetails();
      } else {
        alert(data.message || 'Failed to update task.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating task.');
    }
  };

  const handleAssignTeam = async (teamId: string) => {
    if (!teamId) return;
    setAssigningTeam(true);
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTeamId(teamId);
        fetchLeadDetails();
      } else {
        alert(data.message || 'Failed to assign team.');
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning team.');
    } finally {
      setAssigningTeam(false);
    }
  };

  const handleAssignEmployee = async (empId: string) => {
    if (!empId) return;
    setAssigningEmployee(true);
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: empId,
          dueDate: assignDueDate || null,
          priority: assignPriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedEmpId(empId);
        fetchLeadDetails();
      } else {
        alert(data.message || 'Failed to assign employee.');
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning employee.');
    } finally {
      setAssigningEmployee(false);
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
      fetchAllTeams();
      const isEdit = searchParams.get('edit') === 'true';
      if (isEdit) setIsEditing(true);
    }
  }, [leadId]);

  // ----------------- DRAFT PERSISTENCE EFFECTS -----------------
  // Load drafts on mount when leadId is available
  useEffect(() => {
    if (!leadId || typeof window === 'undefined') return;

    const savedTab = localStorage.getItem(`solar_crm_lead_active_tab_${leadId}`);
    if (savedTab && ['info', 'action', 'track', 'meeting', 'order'].includes(savedTab)) {
      setActiveTab(savedTab as 'info' | 'action' | 'track' | 'meeting' | 'order');
    }

    const savedIsEditing = localStorage.getItem(`solar_crm_lead_is_editing_${leadId}`);
    if (savedIsEditing === 'true') setIsEditing(true);

    const savedEditForm = localStorage.getItem(`solar_crm_lead_edit_form_${leadId}`);
    if (savedEditForm) {
      try {
        setEditForm((prev) => ({ ...prev, ...JSON.parse(savedEditForm) }));
      } catch (e) {
        console.error(e);
      }
    }

    const savedShowFormB = localStorage.getItem(`solar_crm_lead_show_form_b_${leadId}`);
    if (savedShowFormB === 'true') setShowFormB(true);

    const savedFormBData = localStorage.getItem(`solar_crm_lead_form_b_data_${leadId}`);
    if (savedFormBData) {
      try {
        setFormBData((prev) => ({ ...prev, ...JSON.parse(savedFormBData) }));
      } catch (e) {
        console.error(e);
      }
    }

    const savedShowFormC = localStorage.getItem(`solar_crm_lead_show_form_c_${leadId}`);
    if (savedShowFormC === 'true') setShowFormC(true);

    const savedOutcome = localStorage.getItem(`solar_crm_lead_form_c_outcome_${leadId}`);
    if (savedOutcome) setFormCOutcome(savedOutcome);

    const savedSubStatus = localStorage.getItem(`solar_crm_lead_form_c_sub_status_${leadId}`);
    if (savedSubStatus) setFormCSubStatus(savedSubStatus);

    const savedFollowUpAt = localStorage.getItem(`solar_crm_lead_form_c_follow_up_at_${leadId}`);
    if (savedFollowUpAt) setFormCFollowUpAt(savedFollowUpAt);

    const savedRemark = localStorage.getItem(`solar_crm_lead_form_c_remark_${leadId}`);
    if (savedRemark) setFormCRemark(savedRemark);

    const savedOrderForm = localStorage.getItem(`solar_crm_lead_order_form_${leadId}`);
    if (savedOrderForm) {
      try {
        setOrderForm((prev) => ({ ...prev, ...JSON.parse(savedOrderForm) }));
      } catch (e) {
        console.error(e);
      }
    }
  }, [leadId]);

  // Save active tab draft
  useEffect(() => {
    if (isDataLoaded && leadId && typeof window !== 'undefined') {
      localStorage.setItem(`solar_crm_lead_active_tab_${leadId}`, activeTab);
    }
  }, [activeTab, leadId, isDataLoaded]);

  // Save editForm draft
  useEffect(() => {
    if (isDataLoaded && leadId && typeof window !== 'undefined') {
      localStorage.setItem(`solar_crm_lead_is_editing_${leadId}`, isEditing.toString());
      localStorage.setItem(`solar_crm_lead_edit_form_${leadId}`, JSON.stringify(editForm));
    }
  }, [isEditing, editForm, leadId, isDataLoaded]);

  // Save formBData draft
  useEffect(() => {
    if (isDataLoaded && leadId && typeof window !== 'undefined') {
      localStorage.setItem(`solar_crm_lead_show_form_b_${leadId}`, showFormB.toString());
      localStorage.setItem(`solar_crm_lead_form_b_data_${leadId}`, JSON.stringify(formBData));
    }
  }, [showFormB, formBData, leadId, isDataLoaded]);

  // Save formC drafts
  useEffect(() => {
    if (isDataLoaded && leadId && typeof window !== 'undefined') {
      localStorage.setItem(`solar_crm_lead_show_form_c_${leadId}`, showFormC.toString());
      localStorage.setItem(`solar_crm_lead_form_c_outcome_${leadId}`, formCOutcome);
      localStorage.setItem(`solar_crm_lead_form_c_sub_status_${leadId}`, formCSubStatus);
      localStorage.setItem(`solar_crm_lead_form_c_follow_up_at_${leadId}`, formCFollowUpAt);
      localStorage.setItem(`solar_crm_lead_form_c_remark_${leadId}`, formCRemark);
    }
  }, [showFormC, formCOutcome, formCSubStatus, formCFollowUpAt, formCRemark, leadId, isDataLoaded]);

  // Save orderForm draft
  useEffect(() => {
    if (isDataLoaded && leadId && typeof window !== 'undefined') {
      localStorage.setItem(`solar_crm_lead_order_form_${leadId}`, JSON.stringify(orderForm));
    }
  }, [orderForm, leadId, isDataLoaded]);

  // Cancel handlers to wipe drafts
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (leadId && typeof window !== 'undefined') {
      localStorage.removeItem(`solar_crm_lead_is_editing_${leadId}`);
      localStorage.removeItem(`solar_crm_lead_edit_form_${leadId}`);
    }
  };

  const handleCancelFormB = () => {
    setShowFormB(false);
    if (leadId && typeof window !== 'undefined') {
      localStorage.removeItem(`solar_crm_lead_show_form_b_${leadId}`);
      localStorage.removeItem(`solar_crm_lead_form_b_data_${leadId}`);
    }
  };

  const handleCancelFormC = () => {
    setShowFormC(false);
    if (leadId && typeof window !== 'undefined') {
      localStorage.removeItem(`solar_crm_lead_show_form_c_${leadId}`);
      localStorage.removeItem(`solar_crm_lead_form_c_outcome_${leadId}`);
      localStorage.removeItem(`solar_crm_lead_form_c_sub_status_${leadId}`);
      localStorage.removeItem(`solar_crm_lead_form_c_follow_up_at_${leadId}`);
      localStorage.removeItem(`solar_crm_lead_form_c_remark_${leadId}`);
    }
  };

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
        if (leadId && typeof window !== 'undefined') {
          localStorage.removeItem(`solar_crm_lead_is_editing_${leadId}`);
          localStorage.removeItem(`solar_crm_lead_edit_form_${leadId}`);
        }
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

    if (statusNum === 9) {
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
      const finalExecutiveId = formBData.assignedExecutiveId || lead?.consultant?.id?.toString() || user?.id?.toString() || '';
      const finalConnectionType = formBData.connectionType || lead?.connectionType || 'residential';

      if (!finalExecutiveId) {
        alert('No executive could be assigned. Please ensure a consultant is assigned to the lead or you are logged in.');
        return;
      }

      const payload = {
        ...formBData,
        assignedExecutiveId: finalExecutiveId,
        connectionType: finalConnectionType,
      };

      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: 8,
          remark: `Meeting Booked: ${formBData.notes || 'scheduled site visit'}`,
          formB: payload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowFormB(false);
        setNewStatus('');
        setStatusRemark('');
        if (leadId && typeof window !== 'undefined') {
          localStorage.removeItem(`solar_crm_lead_show_form_b_${leadId}`);
          localStorage.removeItem(`solar_crm_lead_form_b_data_${leadId}`);
        }
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
        to_status: 9,
        remark: `Meeting Done. Outcome: ${formCOutcome}. Notes: ${formCRemark}`,
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
        if (leadId && typeof window !== 'undefined') {
          localStorage.removeItem(`solar_crm_lead_show_form_c_${leadId}`);
          localStorage.removeItem(`solar_crm_lead_form_c_outcome_${leadId}`);
          localStorage.removeItem(`solar_crm_lead_form_c_sub_status_${leadId}`);
          localStorage.removeItem(`solar_crm_lead_form_c_follow_up_at_${leadId}`);
          localStorage.removeItem(`solar_crm_lead_form_c_remark_${leadId}`);
        }
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
        if (leadId && typeof window !== 'undefined') {
          localStorage.removeItem(`solar_crm_lead_order_form_${leadId}`);
        }
        fetchLeadDetails();
        alert('Order punched details saved successfully.');
      } else {
        alert(data.message || 'Failed to save details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeDocUpload = async (docType: string, file: File) => {
    if (!lead?.order) return;
    setUploadingDoc(docType);
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

  // Handle Document uploads (Aadhaar, PAN, Electricity Bill, Bank Passbook)
  const handleFileChange = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !lead?.order) return;
    const file = e.target.files[0];
    await executeDocUpload(docType, file);
  };

  // Handle Document removal
  const handleDeleteDocument = async (docType: string, docId: number) => {
    if (!lead?.order) return;
    const orderId = lead.order.id;
    
    const proceed = async () => {
      setUploadingDoc(docType); // reuse uploadingDoc to show loading state
      try {
        const res = await fetch(`/api/v1/orders/${orderId}/documents/${docId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          fetchLeadDetails();
        } else {
          alert(data.message || 'Failed to remove document.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUploadingDoc(null);
      }
    };

    if ((window as any).showConfirm) {
      (window as any).showConfirm('Are you sure you want to remove this document?', proceed);
    } else if (window.confirm('Are you sure you want to remove this document?')) {
      proceed();
    }
  };

  // Submit punching order to Finance
  const handleSubmitOrderToFinance = async (finManagerId?: string, finTlId?: string, finConsultantId?: string) => {
    if (!lead?.order) return;
    try {
      const res = await fetch(`/api/v1/orders/${lead.order.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financeManagerId: finManagerId || null,
          financeTlId: finTlId || null,
          financeConsultantId: finConsultantId || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowFinanceModal(false);
        setFinanceManagerId('');
        setFinanceTlId('');
        setFinanceConsultantId('');
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
    const proceed = async () => {
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

    if ((window as any).showConfirm) {
      (window as any).showConfirm('Are you sure you want to permanently delete this lead from the database? This action cannot be undone.', proceed);
    } else if (window.confirm('Are you sure you want to permanently delete this lead from the database? This action cannot be undone.')) {
      proceed();
    }
  };

  const handleActivateLead = async (leadId: number) => {
    const proceed = async () => {
      try {
        const res = await fetch(`/api/v1/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });
        const data = await res.json();
        if (data.success) {
          alert('Lead reactivated successfully.');
          fetchLeadDetails();
        } else {
          alert(data.message || 'Failed to reactivate lead.');
        }
      } catch (err) {
        console.error(err);
      }
    };

    if ((window as any).showConfirm) {
      (window as any).showConfirm('Are you sure you want to reactivate this lead?', proceed);
    } else if (window.confirm('Are you sure you want to reactivate this lead?')) {
      proceed();
    }
  };

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  const handleStartMeeting = async (meetingId: number) => {
    setIsStartingMeeting(true);
    let lat: number | null = null;
    let lng: number | null = null;

    // 1. Get location coordinates
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
        });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch (err) {
      console.warn('Geolocation failed or permission denied:', err);
      alert('Location access is required to verify the meeting location. Proceeding with location payload marked as null.');
    }

    // 2. Start audio media stream
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access is required to start the meeting recording.');
      setIsStartingMeeting(false);
      return;
    }

    // 3. Initialize MediaRecorder
    try {
      const recorderInstance = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorderInstance.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorderInstance.onstop = async () => {
        const durationSec = recordingStartTimeRef.current
          ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
          : 0;
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await uploadAudioBlob(meetingId, audioBlob, durationSec);
        stream.getTracks().forEach((track) => track.stop());
      };

      // 4. Call start API
      const res = await fetch(`/api/v1/meetings/${meetingId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = await res.json();

      if (data.success) {
        recordingStartTimeRef.current = Date.now();
        recorderInstance.start(1000); // collect chunks every second
        setMediaRecorder(recorderInstance);
        setIsRecording(true);
        setRecordingElapsed(0);
        setAudioChunks([]);
        setAudioUploaded(false);
        fetchLeadDetails();
      } else {
        alert(data.message || 'Failed to start meeting.');
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err: any) {
      console.error(err);
      alert('Error initializing recorder: ' + err.message);
    } finally {
      setIsStartingMeeting(false);
    }
  };

  const handleStartRecordingOnly = async (meetingId: number) => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access is required to start recording.');
      return;
    }

    try {
      const recorderInstance = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorderInstance.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorderInstance.onstop = async () => {
        const durationSec = recordingStartTimeRef.current
          ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
          : 0;
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await uploadAudioBlob(meetingId, audioBlob, durationSec);
        stream.getTracks().forEach((track) => track.stop());
      };

      recordingStartTimeRef.current = Date.now();
      recorderInstance.start(1000);
      setMediaRecorder(recorderInstance);
      setIsRecording(true);
      setRecordingElapsed(0);
      setAudioChunks([]);
      setAudioUploaded(false);
    } catch (err: any) {
      console.error(err);
      alert('Error starting recorder: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const uploadAudioBlob = async (meetingId: number, blob: Blob, durationSec?: number) => {
    setIsUploadingAudio(true);
    const formData = new FormData();
    formData.append('file', blob, 'meeting_recording.webm');
    if (durationSec !== undefined) {
      formData.append('duration', durationSec.toString());
    }

    try {
      const res = await fetch(`/api/v1/meetings/${meetingId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAudioUploaded(true);
        alert('Audio recording saved successfully!');
        fetchLeadDetails();
      } else {
        alert(data.message || 'Failed to upload audio recording.');
      }
    } catch (err) {
      console.error('Audio upload error:', err);
      alert('Error uploading audio file.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleStopMeeting = async (meetingId: number) => {
    setIsEndingMeeting(true);
    try {
      const res = await fetch(`/api/v1/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark: 'Meeting ended. Waiting for outcome logging.' }),
      });
      const data = await res.json();
      if (data.success) {
        setMediaRecorder(null);
        setShowFormC(true);
      } else {
        alert(data.message || 'Failed to stop meeting.');
      }
    } catch (err) {
      console.error(err);
      alert('Error stopping meeting.');
    } finally {
      setIsEndingMeeting(false);
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

  // Helper variables to govern order form disable state
  const isOrderFormLocked = lead.order?.status !== 'draft';
  const isOrderFormDisabled = !hasPermission('orders:create') || isOrderFormLocked;

  // Helper variables to govern lead edit locks
  const baseRole = user?.role ? (user.role.includes(':') ? user.role.split(':')[0] : user.role) : '';
  const isPsaUser = baseRole === 'psa';
  const isSalesUser = ['consultant', 'tl', 'manager'].includes(baseRole) && !user?.role.includes('finance') && !user?.role.includes('operations') && !user?.role.includes('admin') && !user?.role.includes('it');
  
  const isPsaLocked = isPsaUser && [8, 9, 13].includes(lead.status);
  const isSalesLocked = isSalesUser && lead.order && lead.order.status !== 'draft';
  const isLeadLocked = isPsaLocked || isSalesLocked;

  // Calculate dynamic allowed transitions for select input
  const nextStageIds = ALLOWED_TRANSITIONS[lead.status] || [];
  // Filter by user role permissions (Admin bypassed)
  let roleFilteredNextStages = nextStageIds.filter((statusNum) => {
    if (isLeadLocked) return false;
    if (!hasPermission('leads:change_status')) return false;
    // Transitioning to stage 13 requires orders:create permission
    if (statusNum === 13) {
      return hasPermission('orders:create');
    }
    return true;
  });

  // Block transition to Stage 6 (Already Installed) if a meeting has been booked or completed, or if lead is in Stage 13
  const hasMeetings = lead.meetings && lead.meetings.length > 0;
  if (hasMeetings || lead.status === 8 || lead.status === 9 || lead.status === 13) {
    roleFilteredNextStages = roleFilteredNextStages.filter((statusNum) => statusNum !== 6);
  }

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
    { type: 'aadhaar', label: 'Aadhaar Card', sublabel: 'National Identity Proof (Front & Back)' },
    { type: 'pan', label: 'PAN Card', sublabel: 'Permanent Account Number Card' },
    { type: 'electricity_bill', label: 'Electricity Bill', sublabel: 'Recent Utility Bill (Max 3 months old)' },
    { type: 'bank_passbook', label: 'Bank Passbook / Cheque', sublabel: 'Bank details for Direct Benefit Subsidy' },
  ];

  const allDocsUploaded = lead.order
    ? docsChecklist.every((item) => getDocStatus(item.type).uploaded)
    : false;

  const canToggleTask = (taskName: string) => {
    if (!user) return false;
    const baseRole = user.role.includes(':') ? user.role.split(':')[0] : user.role;
    if (['admin', 'director'].includes(baseRole)) return true;

    const userDept = (user as any).department?.name || '';
    if (userDept === 'IT') return true;

    const financeTaskNames = ['Verify Documents', 'Verify Payments', 'Ledger Entry'];
    const opsTaskNames = ['Engineering', 'Installation', 'Plant Commissioning', 'Subsidy Applied'];

    if (financeTaskNames.includes(taskName)) return userDept === 'Finance';
    if (opsTaskNames.includes(taskName)) return userDept === 'Operations';

    const task = leadTasks.find(t => t.taskName === taskName);
    if (!task) return false;
    
    if (task.stageNum <= 7) return userDept === 'PSA';
    if (task.stageNum === 8 || task.stageNum === 9 || task.stageNum === 14) return userDept === 'Sales';

    return false;
  };

  const currentStep = (() => {
    if (!lead) return 0;
    if ([1, 2, 3, 5, 7, 10, 11].includes(lead.status)) return 0; // PSA
    if ([8, 9, 14].includes(lead.status)) return 1; // Sales
    if (lead.status === 13) {
      if (lead.order?.status === 'submitted') return 2; // Finance
      if (['finance_verified', 'ops_assigned', 'completed'].includes(lead.order?.status || '')) {
        return lead.order?.status === 'completed' ? 4 : 3; // Completed vs Operations
      }
    }
    if (lead.status === 6 || lead.status === 12) return 4;
    return 0;
  })();

  const steps = [
    { label: 'PSA Calling', desc: 'Calling & Appointment' },
    { label: 'Sales Visit', desc: 'Audit & Deal Close' },
    { label: 'Finance Verify', desc: 'Docs & Payments' },
    { label: 'Ops Install', desc: 'Solar Commissioning' },
    { label: 'Handover', desc: 'Subsidy & Handover' }
  ];

  return (
    <div className="space-y-6">
      {/* Sequential Department Workflow Stepper */}
      <div className="bg-[#111625]/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 relative">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;

            return (
              <div key={idx} className="flex items-start md:flex-col gap-3 relative">
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute left-[26px] top-4 w-[calc(100%-36px)] h-0.5 bg-slate-800">
                    <div
                      className="h-full bg-amber-500 transition-all duration-550"
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
                
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-300 z-10 ${
                  isActive
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 ring-4 ring-amber-500/15 scale-105'
                    : isCompleted
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-800 bg-slate-950 text-slate-500'
                }`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>

                <div className="min-w-0">
                  <p className={`text-[11px] font-extrabold uppercase tracking-wider ${
                    isActive ? 'text-amber-400' : isCompleted ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-semibold truncate uppercase">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
              <span>Lead ID: <strong className="text-white font-mono">#{lead.leadCode}</strong></span>
              <span className="text-slate-650">•</span>
              <span>Mobile: <strong className="text-white font-mono">{lead.mobile}</strong></span>
              {lead.mobileAlt && (
                <>
                  <span className="text-slate-650">•</span>
                  <span>Alt Mobile: <strong className="text-white font-mono">{lead.mobileAlt}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action controls */}
        {(hasPermission('leads:edit') || hasPermission('leads:delete')) && (
          <div className="flex gap-2">
            {!lead.isActive && hasPermission('leads:edit') && (
              <button
                onClick={() => handleActivateLead(lead.id)}
                className="py-2 px-4 rounded-lg bg-emerald-950/20 text-emerald-400 hover:text-emerald-300 border border-emerald-900/30 transition-all font-semibold text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Activate Lead</span>
              </button>
            )}
            {hasPermission('leads:delete') && (
              <button
                onClick={() => handleDeleteLead(lead.id)}
                className="py-2 px-4 rounded-lg bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/30 transition-all font-semibold text-xs flex items-center gap-1.5"
              >
                Delete Lead
              </button>
            )}
          </div>
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

      {/* Main tabs container */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          {/* Tabs selector */}
          <div className="flex border-b border-slate-800 bg-slate-900/10 text-xs font-semibold overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-5 py-4 border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${
                activeTab === 'info'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Info</span>
            </button>
            {(lead.status === 9 || roleFilteredNextStages.length > 0) && (
              <button
                onClick={() => setActiveTab('action')}
                className={`px-5 py-4 border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${
                  activeTab === 'action'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Action</span>
              </button>
            )}
              {hasPermission('leads:track') && (
                <button
                  onClick={() => setActiveTab('track')}
                  className={`px-5 py-4 border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${
                    activeTab === 'track'
                      ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Track Progress</span>
                </button>
              )}
              {lead.status >= 8 && (
                <button
                  onClick={() => setActiveTab('meeting')}
                  className={`px-5 py-4 border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${
                    activeTab === 'meeting'
                      ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Meeting Details</span>
                </button>
              )}
              
              {lead.order && (hasPermission('orders:view') || hasPermission('orders:create')) && (
                <button
                  onClick={() => setActiveTab('order')}
                  className={`px-5 py-4 border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${
                    activeTab === 'order'
                      ? 'border-amber-500 text-amber-400 bg-amber-500/[0.02]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Order Punching & Documents</span>
                </button>
              )}
              
            </div>

            {/* Tab content panels */}
            <div className="p-6">
              {/* ACTION TAB */}
              {activeTab === 'action' && (
                <div className="space-y-6">
                  {lead.status === 9 ? (
                    <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 space-y-3">
                      <p className="text-xs text-slate-400 leading-normal">
                        The site meeting has been completed. Please document the client's final outcome to advance the lead.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowFormC(true)}
                        className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-lg font-bold text-xs shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Sun className="w-4 h-4" />
                        <span>Document Meeting Outcome</span>
                      </button>
                    </div>
                  ) : roleFilteredNextStages.length > 0 ? (
                    <div className="bg-[#111625] border border-slate-800 rounded-xl p-6 space-y-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-500" />
                        <span>Pipeline Stage Control</span>
                      </h3>

                      {/* Mandatory Stage Tasks Checklist */}
                      <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-4 shadow-inner">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Workflow Requirements Checklist</span>
                        </h4>
                        {leadTasks.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No checklist tasks assigned to this lead.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {leadTasks.map((task) => {
                              const allowed = canToggleTask(task.taskName);
                              return (
                                <label
                                  key={task.id}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                    task.isCompleted
                                      ? 'border-emerald-950/80 bg-emerald-950/10 text-slate-400'
                                      : 'border-slate-850 bg-slate-950/20 text-slate-300'
                                  } ${allowed ? 'cursor-pointer hover:border-slate-800 hover:bg-slate-900/10' : 'opacity-60 cursor-not-allowed'}`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!allowed}
                                    checked={task.isCompleted}
                                    onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                                    className="mt-0.5 rounded border-slate-800 bg-slate-900 text-amber-550 focus:ring-amber-500 cursor-pointer"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-bold ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                      {task.taskName}
                                    </p>
                                    <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wide font-mono font-semibold">
                                      {task.isMandatory ? 'Mandatory' : 'Optional'} 
                                      {task.isCompleted && ` • Done by ${task.completedBy?.name || 'User'}`}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleStatusSubmit} className="space-y-4">
                        {/* Visual Custom Status Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-2.5">Select Next Status</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-1">
                            {roleFilteredNextStages.map((statusNum) => {
                              const config = getStageConfig(statusNum);
                              const isSelected = newStatus === statusNum.toString();
                              return (
                                <button
                                  key={statusNum}
                                  type="button"
                                  onClick={() => setNewStatus(statusNum.toString())}
                                  className={`flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer outline-none relative overflow-hidden ${
                                    isSelected
                                      ? `${config.text} ${config.bg} border-amber-500 bg-amber-500/[0.03] ring-1 ring-amber-500/20 translate-x-[2px]`
                                      : `border-slate-800/80 bg-slate-950/20 text-slate-400 hover:border-slate-700/80 hover:bg-slate-900/10 hover:text-slate-300`
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg border ${
                                    isSelected
                                      ? `bg-amber-500/15 border-amber-500/30 text-amber-400`
                                      : `bg-slate-900/40 border-slate-800 text-slate-400`
                                  } transition-all`}>
                                    {renderStageIcon(config.icon, "w-4 h-4")}
                                  </div>
                                  <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-xs font-bold uppercase tracking-wider">{config.name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{config.desc}</p>
                                  </div>
                                  {isSelected && (
                                    <div className="absolute right-3 top-3.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
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
                                <option value="warm">Warm Lead</option>
                                <option value="hot">Hot Lead</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Follow-Up Date & Time *</label>
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
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Call Back Date & Time *</label>
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
                          <label className="block text-xs font-semibold text-slate-400 mb-2">Remarks / Summary of Interaction *</label>
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
                          disabled={!newStatus}
                          className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          Save Status Change
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-900/10 border border-slate-800 rounded-xl">
                      No status transitions or actions are available for this lead at stage: <span className="font-bold text-white uppercase tracking-wider">{stageBadge.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TRACK TAB */}
              {activeTab === 'track' && lead && (
                <div className="space-y-4">
                  {user?.role === 'admin' && !(lead.status === 13 || (lead.order && lead.order.status !== 'draft')) && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to permanently clear the lead tracking journey logs? This will leave a clean slate.')) {
                            return;
                          }
                          try {
                            const res = await fetch(`/api/v1/leads/${lead.id}/journey`, {
                              method: 'DELETE'
                            });
                            const data = await res.json();
                            alert(data.message);
                            if (data.success) {
                              fetchLeadDetails();
                            }
                          } catch (err) {
                            console.error(err);
                            alert('Failed to clear lead tracking journey history.');
                          }
                        }}
                        className="py-1.5 px-3 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg text-xs font-medium transition-all cursor-pointer font-sans"
                      >
                        Wipe Tracking Journey History
                      </button>
                    </div>
                  )}
                  <LeadTrackingTimeline lead={lead} />
                </div>
              )}

              {/* 1. INFO TAB */}
              {activeTab === 'info' && (
                <div>
                  {isLeadLocked && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs flex items-start gap-3 shadow-md mb-6 animate-fade-in-up">
                      <Lock className="w-5 h-5 shrink-0" />
                      <div>
                        <strong className="text-white font-bold block mb-0.5">Lead Details Locked</strong>
                        {isPsaLocked
                          ? "This lead's details are locked for PSA editing because a meeting has been booked. They will unlock if the sales team schedules a follow-up or calls later."
                          : "This lead's details are locked for Sales editing because the order has been submitted to Finance."}
                      </div>
                    </div>
                  )}
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
                          <div>
                            Manager:{' '}
                            <strong>
                              {lead.manager ? (
                                <Link href={`/team?userId=${lead.manager.id}`} className="text-amber-400 hover:underline">
                                  {lead.manager.name}
                                </Link>
                              ) : (
                                'Unassigned'
                              )}
                            </strong>
                          </div>
                          <div>
                            TL:{' '}
                            <strong>
                              {lead.tl ? (
                                <Link href={`/team?userId=${lead.tl.id}`} className="text-amber-400 hover:underline">
                                  {lead.tl.name}
                                </Link>
                              ) : (
                                'Unassigned'
                              )}
                            </strong>
                          </div>
                          <div>
                            Consultant:{' '}
                            <strong>
                              {lead.consultant ? (
                                <Link href={`/team?userId=${lead.consultant.id}`} className="text-amber-400 hover:underline">
                                  {lead.consultant.name}
                                </Link>
                              ) : (
                                'Unassigned'
                              )}
                            </strong>
                          </div>
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

                      {/* Team Member Assignment Panel */}
                      <div className="md:col-span-2 pt-6 mt-6 border-t border-slate-800/80 animate-fade-in">
                        <div className="bg-slate-950/20 border border-slate-850 rounded-2xl p-5 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-500" />
                            <span>Team & Operator Assignment</span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Assign this lead to a department team or designate an operator with a priority level and due date.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Team Selection */}
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-450 uppercase mb-1.5 font-mono">Assigned Team / Department</label>
                              <select
                                disabled={assigningTeam}
                                value={selectedTeamId}
                                onChange={(e) => handleAssignTeam(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:ring-amber-500 focus:outline-none cursor-pointer"
                              >
                                <option value="">Select a team...</option>
                                {allTeams.map((t) => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.department?.name})</option>
                                ))}
                              </select>
                            </div>

                            {/* Employee Selection within Team */}
                            {selectedTeamId && (
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-455 uppercase mb-1.5">Assign Operator</label>
                                <div className="space-y-3">
                                  <select
                                    value={selectedEmpId}
                                    onChange={(e) => setSelectedEmpId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:ring-amber-500 focus:outline-none cursor-pointer"
                                  >
                                    <option value="">Select employee...</option>
                                    {(allTeams.find(t => t.id === parseInt(selectedTeamId, 10))?.users || []).map((u: any) => (
                                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                  </select>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[8px] font-semibold text-slate-500 uppercase mb-1">Due Date</label>
                                      <input
                                        type="date"
                                        value={assignDueDate}
                                        onChange={(e) => setAssignDueDate(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-slate-955 border border-slate-800 rounded-lg text-slate-300 text-[10px] focus:ring-amber-500 focus:outline-none cursor-pointer"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-semibold text-slate-500 uppercase mb-1">Priority</label>
                                      <select
                                        value={assignPriority}
                                        onChange={(e) => setAssignPriority(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-slate-955 border border-slate-800 rounded-lg text-slate-300 text-[10px] focus:ring-amber-500 focus:outline-none cursor-pointer"
                                      >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                      </select>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={assigningEmployee || !selectedEmpId}
                                    onClick={() => handleAssignEmployee(selectedEmpId)}
                                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-955 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {assigningEmployee ? 'Assigning...' : 'Assign Operator'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit Trigger */}
                      {hasPermission('leads:edit') && !isLeadLocked && (
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
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Name *</label>
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
                        {hasPermission('leads:edit') && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Sales or PSA Member</label>
                            <select
                              value={editForm.assignedConsultantId || editForm.assignedTlId || editForm.assignedManagerId || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) {
                                  setEditForm({ ...editForm, assignedManagerId: '', assignedTlId: '', assignedConsultantId: '' });
                                  return;
                                }
                                const targetUser = employees.find(u => u.id === parseInt(val, 10));
                                if (!targetUser) return;
                                const level = targetUser.designation?.level ?? 6;
                                if (level <= 3) {
                                  setEditForm({ ...editForm, assignedManagerId: val, assignedTlId: '', assignedConsultantId: '' });
                                } else if (level === 4) {
                                  setEditForm({ ...editForm, assignedManagerId: '', assignedTlId: val, assignedConsultantId: '' });
                                } else {
                                  setEditForm({ ...editForm, assignedManagerId: '', assignedTlId: '', assignedConsultantId: val });
                                }
                              }}
                              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500"
                            >
                              <option value="">Unassigned</option>
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
                          onClick={handleCancelEdit}
                          className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}


              {/* 3. MEETING TAB */}
              {activeTab === 'meeting' && (
                <div className="space-y-6">
                  {lead.meetings.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-900/10 border border-slate-800 rounded-xl">
                      No meetings booked for this lead.
                    </div>
                  ) : (
                    lead.meetings.map((meet, index) => (
                      <div
                        key={meet.id}
                        className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-4 shadow-sm"
                      >
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                            Meeting Booking #{lead.meetings.length - index}
                          </h4>
                          {meet.meetingStartedAt && meet.meetingEndedAt && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
                              Completed ✅
                            </span>
                          )}
                          {meet.meetingStartedAt && !meet.meetingEndedAt && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Active Session</span>
                            </span>
                          )}
                        </div>

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

                        {/* Interactive Meeting Controls for Active Lead Meeting */}
                        {lead.status === 8 && index === 0 && (
                          <div className="border-t border-slate-800/80 pt-4 space-y-4">
                            <h5 className="text-[11px] font-bold text-amber-500 uppercase tracking-wide">
                              Live Meeting Tracker
                            </h5>
                            
                            {!meet.meetingStartedAt ? (
                              <div className="p-4 bg-slate-950/45 border border-slate-850 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-left">
                                  <span className="text-xs font-bold text-white block">Ready to start the site visit?</span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    This will request microphone and location permissions to log coordinates and record meeting audio.
                                  </p>
                                </div>
                                {hasPermission('orders:create') ? (
                                  <button
                                    type="button"
                                    disabled={isStartingMeeting}
                                    onClick={() => handleStartMeeting(meet.id)}
                                    className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 disabled:opacity-50 transition-all cursor-pointer"
                                  >
                                    {isStartingMeeting ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Mic className="w-3.5 h-3.5" />
                                    )}
                                    <span>Start Meeting</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">🔒 Restricted to Sales team</span>
                                )}
                              </div>
                            ) : !meet.meetingEndedAt ? (
                              <div className="p-4 bg-slate-950/45 border border-slate-850 rounded-xl space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                                      Meeting Session In Progress
                                    </span>
                                  </div>
                                  <div className="text-sm font-mono font-bold text-amber-400">
                                    {Math.floor(recordingElapsed / 60).toString().padStart(2, '0')}:
                                    {(recordingElapsed % 60).toString().padStart(2, '0')}
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full">
                                  {hasPermission('orders:create') ? (
                                    <>
                                      {isRecording ? (
                                        <button
                                          type="button"
                                          onClick={handleStopRecording}
                                          className="w-full sm:w-auto py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                        >
                                          <Square className="w-3.5 h-3.5" />
                                          <span>Stop Recording</span>
                                        </button>
                                      ) : !audioUploaded && !meet.audioRecordingPath ? (
                                        <button
                                          type="button"
                                          onClick={() => handleStartRecordingOnly(meet.id)}
                                          className="w-full sm:w-auto py-2.5 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-amber-400 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                        >
                                          <Mic className="w-3.5 h-3.5" />
                                          <span>Start Audio Recording</span>
                                        </button>
                                      ) : null}

                                      {(audioUploaded || meet.audioRecordingPath || (!isRecording && !mediaRecorder)) && (
                                        <button
                                          type="button"
                                          disabled={isEndingMeeting || isUploadingAudio}
                                          onClick={() => handleStopMeeting(meet.id)}
                                          className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-lg font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                          {isEndingMeeting ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Square className="w-3.5 h-3.5" />
                                          )}
                                          <span>Stop Meeting & Log Outcome</span>
                                        </button>
                                      )}

                                      {isUploadingAudio && (
                                        <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 w-full sm:w-auto mt-1 sm:mt-0">
                                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                          <span>Uploading audio file to server...</span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">🔒 Restricted to Sales team</span>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Completed Meeting Review & Playback */}
                        {meet.meetingStartedAt && (
                          <div className="border-t border-slate-800/80 pt-4 space-y-3">
                            <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                              <span>Meeting Session Details & Playback</span>
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                              <div>
                                <span className="text-slate-500 uppercase tracking-wider font-semibold">Location Tracked</span>
                                {meet.meetingLatitude && meet.meetingLongitude ? (
                                  <div className="mt-1">
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${meet.meetingLatitude},${meet.meetingLongitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-amber-400 hover:underline inline-flex items-start gap-1.5 font-semibold transition-colors duration-150"
                                      title="Open in Google Maps"
                                    >
                                      <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                      <span className="text-slate-200 hover:text-amber-400 leading-tight">
                                        <MeetingLocationDisplay
                                          latitude={meet.meetingLatitude}
                                          longitude={meet.meetingLongitude}
                                          dbLocality={meet.meetingLocality}
                                          dbCity={meet.meetingCity}
                                          dbPinCode={meet.meetingPinCode}
                                        />
                                      </span>
                                    </a>
                                    <span className="block text-[9px] text-slate-500 mt-1">({meet.meetingLatitude.toFixed(6)}, {meet.meetingLongitude.toFixed(6)})</span>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 mt-1 italic">Location permission was denied.</p>
                                )}
                              </div>
                              <div>
                                <span className="text-slate-500 uppercase tracking-wider font-semibold">Duration & Timing</span>
                                <p className="text-sm text-white mt-1">
                                  <span className="font-bold text-amber-400">
                                    {meet.meetingDurationSec !== null && meet.meetingDurationSec !== undefined
                                      ? meet.meetingDurationSec >= 60
                                        ? `${Math.floor(meet.meetingDurationSec / 60)}m ${meet.meetingDurationSec % 60}s`
                                        : `${meet.meetingDurationSec}s`
                                      : 'Under 1 minute'}
                                  </span>
                                  <span className="block text-[9px] text-slate-500 mt-1">
                                    Started: {new Date(meet.meetingStartedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    {meet.meetingEndedAt && (
                                      <>
                                        {' | '}
                                        Ended: {new Date(meet.meetingEndedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </>
                                    )}
                                  </span>
                                </p>
                              </div>
                              {meet.audioRecordingPath && (
                                <div className="md:col-span-2">
                                  <span className="text-slate-500 uppercase tracking-wider font-semibold block mb-2">Recorded Audio</span>
                                  <BeautifulAudioPlayer
                                    src={`/api/v1/meetings/${meet.id}/audio`}
                                    defaultDuration={meet.meetingDurationSec}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    ))
                  )}
                </div>
              )}
              

              {/* 4. ORDER PUNCHING TAB */}
              {activeTab === 'order' && lead.order && (
                <div className="space-y-8">
                  {lead.order.status === 'draft' && lead.order.rejectionReason && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs leading-normal flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                      <div>
                        <strong className="text-white block mb-1">⚠️ Order Rejected by Finance:</strong> 
                        <span className="text-slate-200">{lead.order.rejectionReason}</span>
                        <p className="mt-2 text-slate-400">
                          Please rectify the details or documents below and click the **Submit Order for Approval** button at the bottom to send it back to the Finance team.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Details form */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                      Order Punching details (Order Code: {lead.order.orderCode})
                    </h3>
                    
                    {isOrderFormLocked ? (
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
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Electricity Connection Number *</label>
                          <input
                            type="text"
                            required
                            disabled={isOrderFormDisabled}
                            value={orderForm.connectionNumber}
                            onChange={(e) => setOrderForm({ ...orderForm, connectionNumber: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Proposed System Size (kW) *</label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            disabled={isOrderFormDisabled}
                            value={orderForm.systemSizeKw}
                            onChange={(e) => setOrderForm({ ...orderForm, systemSizeKw: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Total System Value (₹) *</label>
                          <input
                            type="number"
                            required
                            disabled={isOrderFormDisabled}
                            value={orderForm.totalValue}
                            onChange={(e) => setOrderForm({ ...orderForm, totalValue: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Collected Down Payment (₹) *</label>
                          <input
                            type="number"
                            required
                            disabled={isOrderFormDisabled}
                            value={orderForm.downPayment}
                            onChange={(e) => setOrderForm({ ...orderForm, downPayment: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Transaction Method</label>
                          <select
                            value={orderForm.paymentMethod}
                            disabled={isOrderFormDisabled}
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
                            disabled={isOrderFormDisabled}
                            value={orderForm.transactionRef}
                            onChange={(e) => setOrderForm({ ...orderForm, transactionRef: e.target.value })}
                            placeholder="UPI Reference / Cheque ID / NEFT number"
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          />
                        </div>

                        <div className="md:col-span-2 p-4 bg-slate-900/30 border border-slate-850 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-350 uppercase tracking-wider">Downpayment Receipt</span>
                            {getDocStatus('downpayment_receipt').uploaded && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                Uploaded
                              </span>
                            )}
                          </div>

                          {getDocStatus('downpayment_receipt').uploaded ? (
                            <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="text-xs text-slate-350 truncate">{getDocStatus('downpayment_receipt').fileName}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <a
                                  href={`/api/v1/orders/${lead.order?.id}/documents/${getDocStatus('downpayment_receipt').id}`}
                                  download={getDocStatus('downpayment_receipt').fileName || true}
                                  target="_blank"
                                  className="py-1 px-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all"
                                >
                                  <Download className="w-3 h-3 text-amber-400" />
                                  <span>Download</span>
                                </a>
                                {isImageFile(getDocStatus('downpayment_receipt').fileName) && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({
                                      src: `/api/v1/orders/${lead.order?.id}/documents/${getDocStatus('downpayment_receipt').id}`,
                                      title: `Downpayment Receipt: ${getDocStatus('downpayment_receipt').fileName}`
                                    })}
                                    className="py-1 px-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-amber-400 hover:text-amber-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Preview</span>
                                  </button>
                                )}
                                {!isOrderFormDisabled && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument('downpayment_receipt', getDocStatus('downpayment_receipt').id!)}
                                    className="py-1 px-2 bg-slate-900 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/30 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <label className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                                isOrderFormDisabled 
                                  ? 'border-slate-850 bg-slate-950/20 cursor-not-allowed opacity-60' 
                                  : uploadingDoc === 'downpayment_receipt'
                                    ? 'border-amber-500/50 bg-amber-500/[0.02] cursor-wait' 
                                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-900/30 cursor-pointer'
                              }`}>
                                {uploadingDoc === 'downpayment_receipt' ? (
                                  <div className="flex flex-col items-center gap-1.5 py-1">
                                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                                    <span className="text-xs font-semibold text-amber-400">Uploading receipt...</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1.5 py-1">
                                    <Upload className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-300">Click to upload receipt</span>
                                    <span className="text-[10px] text-slate-500">PDF, JPG, or PNG (Max 5MB)</span>
                                  </div>
                                )}
                                <input
                                  type="file"
                                  className="hidden"
                                  disabled={uploadingDoc !== null || isOrderFormDisabled}
                                  onChange={(e) => handleFileChange('downpayment_receipt', e)}
                                />
                              </label>

                              {!isOrderFormDisabled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraModal({
                                      isOpen: true,
                                      onCapture: (file) => executeDocUpload('downpayment_receipt', file)
                                    });
                                  }}
                                  className="sm:w-48 py-4 px-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                                >
                                  <Camera className="w-5 h-5 text-slate-400" />
                                  <span>Open Camera</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Remaining Payment Scheme</label>
                          <select
                            value={orderForm.remainingMethod}
                            disabled={isOrderFormDisabled}
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
                            disabled={isOrderFormDisabled}
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
                            disabled={isOrderFormDisabled}
                            onChange={(e) => setOrderForm({ ...orderForm, clientType: e.target.value })}
                            className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs disabled:opacity-50"
                          >
                            <option value="on_grid">On-Grid (Connected to Net Metering)</option>
                            <option value="off_grid">Off-Grid (Connected to Battery Banks)</option>
                            <option value="hybrid">Hybrid (Both)</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Terrestrial/Structural Notes</label>
                          <textarea
                            value={orderForm.additionalNotes}
                            disabled={isOrderFormDisabled}
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
                        </div>
                      )}

                      {/* Button */}
                      {!isOrderFormDisabled && (
                        <div className="border-t border-slate-800/80 pt-4">
                          <button
                            type="submit"
                            className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md flex items-center justify-center transition-all"
                          >
                            Save Punching Details
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                     {/* Document Vault Header */}
                  <div className="border-t border-slate-800/80 pt-8 space-y-6">
                    <div className="p-5 bg-gradient-to-r from-slate-900/80 via-[#131b2e] to-slate-900/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <FileCheck className="w-5 h-5 text-amber-400" />
                          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                            Client KYC & Verification Vault
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Securely upload required verification documents. Supports PDF, JPG, and PNG (Max 5MB per file).
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2.5 border border-slate-800 rounded-xl w-fit">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Verification Progress</span>
                          <span className="text-xs font-bold text-white font-mono">
                            {docsChecklist.filter(item => getDocStatus(item.type).uploaded).length} / {docsChecklist.length} Verified
                          </span>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          docsChecklist.every(item => getDocStatus(item.type).uploaded) 
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' 
                            : 'bg-amber-500'
                        }`} />
                      </div>
                    </div>

                    {/* Smooth 2-Column Document Dropzones Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {docsChecklist.map((item) => {
                        const { uploaded, fileName, id } = getDocStatus(item.type);
                        const isUploading = uploadingDoc === item.type;

                        return (
                          <div
                            key={item.type}
                            className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                              uploaded
                                ? 'bg-gradient-to-br from-emerald-950/10 via-slate-900/30 to-slate-950/40 border-emerald-500/30 shadow-md shadow-emerald-950/10'
                                : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            {/* Card Header: Title & Status Badge */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                  uploaded 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white tracking-wide">{item.label}</h4>
                                  <span className="text-[10px] text-slate-500 block">{item.sublabel}</span>
                                </div>
                              </div>

                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                                uploaded
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
                              }`}>
                                {uploaded ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>Uploaded</span>
                                  </>
                                ) : (
                                  <span>Required</span>
                                )}
                              </span>
                            </div>

                            {/* Card Content & Upload Area */}
                            <div className="flex-1 flex flex-col justify-center min-h-[70px]">
                              {uploaded ? (
                                <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <File className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span className="text-xs text-slate-300 truncate font-medium">{fileName}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={`/api/v1/orders/${lead.order?.id}/documents/${id}`}
                                      download={fileName || true}
                                      target="_blank"
                                      className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                                      title="Download Document"
                                    >
                                      <Download className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Download</span>
                                    </a>
                                    {isImageFile(fileName) && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImage({
                                          src: `/api/v1/orders/${lead.order?.id}/documents/${id}`,
                                          title: `${item.label}: ${fileName}`
                                        })}
                                        className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-amber-400 hover:text-amber-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                        title="Preview Image"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                                    isOrderFormDisabled 
                                      ? 'border-slate-850 bg-slate-950/20 cursor-not-allowed opacity-60' 
                                      : isUploading 
                                        ? 'border-amber-500/50 bg-amber-500/[0.02] cursor-wait' 
                                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-900/30 cursor-pointer'
                                  }`}>
                                    {isUploading ? (
                                      <div className="flex flex-col items-center gap-2 py-1">
                                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                                        <span className="text-xs font-semibold text-amber-400">Uploading document...</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-1.5 py-1">
                                        <Upload className="w-5 h-5 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-300">Click to upload {item.label}</span>
                                        <span className="text-[10px] text-slate-500">PDF, JPG, or PNG (Max 5MB)</span>
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      className="hidden"
                                      disabled={uploadingDoc !== null || isOrderFormDisabled}
                                      onChange={(e) => handleFileChange(item.type, e)}
                                    />
                                  </label>

                                  {!isOrderFormDisabled && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCameraModal({
                                          isOpen: true,
                                          onCapture: (file) => executeDocUpload(item.type, file)
                                        });
                                      }}
                                      className="w-full py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-350 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      <Camera className="w-3.5 h-3.5 text-slate-450" />
                                      <span>Or Open Camera</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Card Footer Actions (Replace / Remove) */}
                            {uploaded && !isOrderFormDisabled && (
                              <div className="flex items-center justify-end gap-4 pt-2 border-t border-slate-850/60">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraModal({
                                      isOpen: true,
                                      onCapture: (file) => executeDocUpload(item.type, file)
                                    });
                                  }}
                                  className="text-xs font-semibold text-slate-400 hover:text-amber-400 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Snap Photo</span>
                                </button>
                                <label className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-amber-400 transition-all flex items-center gap-1.5">
                                  {isUploading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                  ) : (
                                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                                  )}
                                  <span>Replace</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    disabled={uploadingDoc !== null}
                                    onChange={(e) => handleFileChange(item.type, e)}
                                  />
                                </label>
                                {id !== null && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(item.type, id)}
                                    className="text-xs font-semibold text-slate-400 hover:text-red-400 transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                    {/* Hard backend disabled submission button */}
                    {lead.order.status === 'draft' && (
                      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wide">Submit to Finance</h4>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Verify order details are saved before submitting. Document upload is optional.
                          </p>
                        </div>
                        <div>
                          <button
                            onClick={() => setShowFinanceModal(true)}
                            className="py-2.5 px-5 rounded-lg font-bold text-xs shadow-lg transition-all bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 cursor-pointer shadow-emerald-500/10 focus:outline-none"
                          >
                            Submit Order for Approval
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Document Vault (with Version History) */}
                    <div className="mt-8 pt-8 border-t border-slate-800 animate-fade-in">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span>Document Vault & Version History</span>
                      </h3>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Upload form */}
                        <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl space-y-4 h-fit">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Upload Document</h4>
                          
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const fd = new FormData(form);
                            try {
                              const res = await fetch(`/api/v1/leads/${leadId}/documents`, {
                                method: 'POST',
                                body: fd,
                              });
                              const data = await res.json();
                              if (data.success) {
                                form.reset();
                                fetchLeadDetails();
                              } else {
                                alert(data.message || 'Failed to upload document.');
                              }
                            } catch (err) {
                              console.error(err);
                              alert('Error uploading document.');
                            }
                          }} className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-450 uppercase mb-1.5 font-mono">Document Type *</label>
                              <select name="doc_type" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-xs focus:ring-amber-500 focus:outline-none cursor-pointer">
                                <option value="">Select doc type...</option>
                                <option value="quotation">Quotation / Proposal</option>
                                <option value="site_photo">Site & Layout Photos</option>
                                <option value="agreement">Signed Customer Agreement</option>
                                <option value="kyc">KYC Documents (Aadhaar/PAN)</option>
                                <option value="payment_receipt">Payment Receipt</option>
                                <option value="order_punching_form">Order Punching Form</option>
                                <option value="installation">Installation Report</option>
                                <option value="commissioning">Plant Commissioning Cert</option>
                                <option value="subsidy">Government Subsidy Form</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-455 uppercase mb-1.5 font-mono">Select File * (PDF, PNG, JPG)</label>
                              <input type="file" name="file" required className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-slate-300 file:text-xs file:font-semibold hover:file:bg-slate-850 cursor-pointer" />
                            </div>
                            <button type="submit" className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-955 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer">
                              Upload Document Version
                            </button>
                          </form>
                        </div>

                        {/* List & History */}
                        <div className="lg:col-span-2 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Vault Contents</h4>
                          {leadDocuments.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-6 bg-slate-955/20 border border-slate-850 rounded-2xl text-center">No documents uploaded to this lead yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {/* Group leadDocuments by docType and show latest active and history */}
                              {Array.from(new Set(leadDocuments.map((d) => d.docType))).map((type) => {
                                const versions = leadDocuments.filter((d) => d.docType === type);
                                const activeDoc = versions.find((v) => v.isActive) || versions[0];

                                return (
                                  <div key={type} className="bg-slate-955/20 border border-slate-850 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-850 pb-2">
                                      <div>
                                        <span className="text-xs font-extrabold text-white uppercase tracking-wider">{type.replace('_', ' ')}</span>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Active Version: v{activeDoc.version} • Uploaded by {activeDoc.uploader?.name}</p>
                                      </div>
                                      <a
                                        href={activeDoc.filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-1 px-3 bg-slate-900 border border-slate-800 text-[11px] text-amber-400 hover:text-amber-300 hover:border-slate-700 rounded-lg font-bold flex items-center gap-1.5 transition-all"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download v{activeDoc.version}</span>
                                      </a>
                                    </div>

                                    {/* History dropdown */}
                                    {versions.length > 1 && (
                                      <details className="group">
                                        <summary className="text-[10px] font-bold text-slate-450 hover:text-white uppercase tracking-widest cursor-pointer list-none flex items-center gap-1">
                                          <span>▶ View Version History ({versions.length} versions)</span>
                                        </summary>
                                        <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-slate-850 animate-fade-in">
                                          {versions.map((v) => (
                                            <div key={v.id} className="flex justify-between items-center text-[10px] text-slate-400">
                                              <span>v{v.version}: <span className="font-mono text-slate-500">{v.fileName}</span> ({Math.round(v.fileSize / 1024)} KB)</span>
                                              <div className="flex gap-2">
                                                <span>by {v.uploader?.name}</span>
                                                <span className="text-slate-650">|</span>
                                                <a href={v.filePath} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Download</a>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
            </div>
          </div>

      {/* ============================================================== */}
      {/* Form B Modal: Meeting Booking Form */}
      {showFormB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Form B: Schedule Meeting / Site Visit</h3>
              <button onClick={handleCancelFormB} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormBSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Meeting Date *</label>
                  <input
                    type="date"
                    required
                    value={formBData.meetingDate}
                    onChange={(e) => setFormBData({ ...formBData, meetingDate: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Meeting Time *</label>
                  <input
                    type="time"
                    required
                    value={formBData.meetingTime}
                    onChange={(e) => setFormBData({ ...formBData, meetingTime: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Average Monthly Bill (₹) *</label>
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
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Visit Full Address *</label>
                  <textarea
                    required
                    value={formBData.address}
                    onChange={(e) => setFormBData({ ...formBData, address: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs h-16"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">City Pincode *</label>
                  <input
                    type="text"
                    required
                    value={formBData.pinCode}
                    onChange={(e) => setFormBData({ ...formBData, pinCode: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Contact Mobile *</label>
                  <input
                    type="text"
                    required
                    value={formBData.mobile}
                    onChange={(e) => setFormBData({ ...formBData, mobile: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  />
                </div>
                {/* Sales Team allocation selectors */}
                <div className="sm:col-span-2 border-t border-slate-800/60 pt-3 mt-1">
                  <h4 className="text-[11px] font-bold uppercase text-amber-400 tracking-wider">Reassign to Sales Team</h4>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Assign to Sales Manager *</label>
                  <select
                    required
                    value={formBData.assignedManagerId}
                    onChange={(e) => setFormBData({ ...formBData, assignedManagerId: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  >
                    <option value="">Select Manager</option>
                    {salesManagers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation?.name || emp.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Assign to Sales TL *</label>
                  <select
                    required
                    value={formBData.assignedTlId}
                    onChange={(e) => setFormBData({ ...formBData, assignedTlId: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  >
                    <option value="">Select Team Leader</option>
                    {salesTls.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation?.name || emp.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Assign to Sales Consultant *</label>
                  <select
                    required
                    value={formBData.assignedExecutiveId}
                    onChange={(e) => setFormBData({ ...formBData, assignedExecutiveId: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                  >
                    <option value="">Select Consultant</option>
                    {salesConsultants.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation?.name || emp.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
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
                  onClick={handleCancelFormB}
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

      {/* Finance Allocation Modal */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Assign Finance Team</h3>
              <button onClick={() => setShowFinanceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleSubmitOrderToFinance(financeManagerId, financeTlId, financeConsultantId);
            }} className="p-6 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Please assign the Finance department team members who will verify the down-payment and punch details for this order.
              </p>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Assign Finance Operator *</label>
                <select
                  required
                  value={financeConsultantId || financeTlId || financeManagerId}
                  onChange={(e) => handleSelectFinanceAssignee(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">Select Finance Member</option>
                  {employees.filter((emp) => {
                    const deptName = (emp.department?.name || '').toLowerCase();
                    const roleLower = (emp.role || '').toLowerCase();
                    const isFinanceDept = deptName.includes('finance');
                    const isFinanceRole = roleLower.includes('finance');
                    return isFinanceDept || isFinanceRole;
                  }).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department?.name || 'Finance'} - {emp.designation?.name || emp.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 border-t border-slate-800/80 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowFinanceModal(false)}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-lg font-bold text-xs shadow-md"
                >
                  Submit Order to Finance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Form C Modal: Meeting Done Outcomes */}
      {showFormC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Form C: Document Meeting Outcome</h3>
              <button onClick={handleCancelFormC} className="text-slate-400 hover:text-white">
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
                  <option value="sale_done">Sale Done</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="not_interested">Not Interested</option>
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
                      <option value="hot">Hot Lead</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-455 mb-1">Follow-Up Date & Time *</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-2">Remarks / Meeting Summary *</label>
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
                  onClick={handleCancelFormC}
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

      {/* Photo Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg z-[1000]"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.src}
              alt={previewImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-t-2xl"
            />
            {previewImage.title && (
              <div className="w-full bg-slate-900/80 backdrop-blur-sm border-t border-slate-800/60 p-3 text-xs font-semibold text-slate-300 text-center tracking-wide rounded-b-2xl">
                {previewImage.title}
              </div>
            )}
          </div>
        </div>
      )}
      {/* WebRTC Camera Modal */}
      {cameraModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 text-center text-white animate-fade-in-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Capture Proof Photo</span>
              <button 
                type="button" 
                onClick={() => setCameraModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center">
              {capturedPhoto ? (
                <img 
                  src={capturedPhoto} 
                  alt="Captured Preview" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex gap-3 justify-center pt-2">
              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="w-1/2 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={confirmPhoto}
                    className="w-1/2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    Use Photo
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCameraModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-1/3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-250 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-2/3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </button>
                </>
              )}
            </div>
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
