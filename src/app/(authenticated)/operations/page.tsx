'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  Wrench,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Loader2,
  Calendar,
  X,
  Camera,
  Upload,
  Trash2,
  MapPin,
  Truck,
  Activity,
  Zap,
  Phone,
  User,
  Info,
  DollarSign,
  Gift,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
} from 'lucide-react';

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
  status: string;
  deliveryDate: string | null;
  deliveryTime: string | null;
  isDelivered: boolean;
  actualDeliveryAt: string | null;
  installationDate: string | null;
  installationTime: string | null;
  isInstalled: boolean;
  actualInstallationAt: string | null;
  isMeterInstalled: boolean;
  actualMeterInstalledAt: string | null;
  isCommissioned: boolean;
  actualCommissionedAt: string | null;
  isSubsidyApplied: boolean;
  actualSubsidyAppliedAt: string | null;
  subsidyApplicable: boolean;
  subsidyAmount: number | null;
  createdAt: string;
  assignedOpsId?: number | null;
  assignedOps?: { id?: number; name: string; role?: string; designation?: { name: string } | null } | null;
  lead: {
    id: number;
    customerName: string;
    mobile: string;
    city: string;
    state: string;
    address: string;
    pinCode: string;
    leadCode: string;
  };
  payments?: {
    id: number;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
  }[];
}

interface InstallationImage {
  id: number;
  status: string;
  filePath: string;
  fileName: string;
  uploadedAt: string;
}

export default function OperationsPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!hasPermission('orders:operations')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-lg mt-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">
          You do not have the required permissions to view Operations details. Please contact your administrator if you believe this is in error.
        </p>
      </div>
    );
  }
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterManagerId, setFilterManagerId] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetUserId, setAssignTargetUserId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const canAssignOps = user?.role === 'admin' || user?.role === 'director' || user?.department?.name === 'IT' || hasPermission('ops:order_assign') || hasPermission('finance:ops_assign') || hasPermission('orders:operations') || hasPermission('orders:assign');

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
    fetchUsers();
  }, []);

  const getClientSubordinateIds = (userId: number): number[] => {
    const result: number[] = [];
    const queue = [userId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const emp of employees) {
        if (emp.reportsTo === current && !result.includes(emp.id)) {
          result.push(emp.id);
          queue.push(emp.id);
        }
      }
    }
    return result;
  };

  const isITOrAdmin = user?.role === 'admin' || user?.role === 'director' || user?.department?.name === 'IT';
  const eligibleAssignees = isITOrAdmin
    ? employees
    : user
      ? employees.filter((emp) => {
          const subIds = getClientSubordinateIds(user.id);
          return (subIds.includes(emp.id) || emp.id === user.id) && emp.isActive;
        })
      : [];

  const handleSingleAssign = async (orderId: number, targetUserId: string) => {
    try {
      const res = await fetch('/api/v1/orders/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: [orderId],
          targetUserId,
          department: 'ops',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
      } else {
        alert(data.message || 'Failed to assign order.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during assignment.');
    }
  };

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleAllOrders = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleBulkAssign = async () => {
    if (!assignTargetUserId || selectedOrderIds.length === 0) return;
    setAssignLoading(true);
    try {
      const res = await fetch('/api/v1/orders/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          targetUserId: assignTargetUserId,
          department: 'ops',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Orders assigned successfully!');
        setSelectedOrderIds([]);
        setShowAssignModal(false);
        setAssignTargetUserId('');
        fetchOrders(); // re-fetch orders after assignment
      } else {
        alert(data.message || 'Failed to assign orders.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during assignment.');
    } finally {
      setAssignLoading(false);
    }
  };

  
  // Selected order details panel/modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Delivery Schedule Form State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  // Actual Delivery Form State
  const [showActualDeliveryForm, setShowActualDeliveryForm] = useState(false);
  const [actualDeliveryDate, setActualDeliveryDate] = useState('');
  const [actualDeliveryTime, setActualDeliveryTime] = useState('');

  // Installation Schedule Form State
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [installDate, setInstallDate] = useState('');
  const [installTime, setInstallTime] = useState('');
  const [installLoading, setInstallLoading] = useState(false);

  // Actual Installation Form State
  const [showActualInstallForm, setShowActualInstallForm] = useState(false);
  const [actualInstallDate, setActualInstallDate] = useState('');
  const [actualInstallTime, setActualInstallTime] = useState('');

  // Actual Meter Form State
  const [showActualMeterForm, setShowActualMeterForm] = useState(false);
  const [actualMeterDate, setActualMeterDate] = useState('');
  const [actualMeterTime, setActualMeterTime] = useState('');
  const [meterLoading, setMeterLoading] = useState(false);

  // Actual Commissioning Form State
  const [showActualCommissionForm, setShowActualCommissionForm] = useState(false);
  const [actualCommissionDate, setActualCommissionDate] = useState('');
  const [actualCommissionTime, setActualCommissionTime] = useState('');
  const [commissionLoading, setCommissionLoading] = useState(false);

  // Actual Subsidy Form State
  const [actualSubsidyDate, setActualSubsidyDate] = useState('');
  const [actualSubsidyTime, setActualSubsidyTime] = useState('');
  const [subsidyLoading, setSubsidyLoading] = useState(false);
  const [newSubsidyAmount, setNewSubsidyAmount] = useState('');

  // Custom right-click Calendar / Time Picker State
  const [customPicker, setCustomPicker] = useState<{
    isOpen: boolean;
    type: 'date' | 'time';
    x: number;
    y: number;
    value: string;
    onChange: (val: string) => void;
  }>({
    isOpen: false,
    type: 'date',
    x: 0,
    y: 0,
    value: '',
    onChange: () => {},
  });

  // Calendar view state (for date type picker)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Time picker selection state (for time type picker)
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');

  useEffect(() => {
    if (customPicker.isOpen) {
      if (customPicker.type === 'date') {
        const d = customPicker.value ? new Date(customPicker.value) : new Date();
        if (!isNaN(d.getTime())) {
          setCalendarMonth(d.getMonth());
          setCalendarYear(d.getFullYear());
        } else {
          setCalendarMonth(new Date().getMonth());
          setCalendarYear(new Date().getFullYear());
        }
      } else if (customPicker.type === 'time') {
        if (customPicker.value && customPicker.value.includes(':')) {
          const parts = customPicker.value.split(':');
          setSelectedHour(parts[0].padStart(2, '0'));
          setSelectedMinute(parts[1].padStart(2, '0'));
        } else {
          setSelectedHour('12');
          setSelectedMinute('00');
        }
      }
    }
  }, [customPicker.isOpen, customPicker.type, customPicker.value]);

  const handleInputContextMenu = (e: React.MouseEvent, type: 'date' | 'time', currentVal: string, onChange: (val: string) => void) => {
    e.preventDefault();
    let posX = e.clientX;
    let posY = e.clientY;
    
    // Check viewport bounds
    if (posX + 260 > window.innerWidth) {
      posX = window.innerWidth - 280;
    }
    if (posY + 320 > window.innerHeight) {
      posY = window.innerHeight - 340;
    }
    
    setCustomPicker({
      isOpen: true,
      type,
      x: posX,
      y: posY,
      value: currentVal,
      onChange,
    });
  };

  // Custom Alert and Confirm States
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setCustomAlert({
      isOpen: true,
      message,
      type,
    });
  };

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
      showAlert('Could not access camera. Please check permissions.', 'error');
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

  // Media items list
  const [allMedia, setAllMedia] = useState<InstallationImage[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Lightbox preview state
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/v1/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        // Only show orders that are finance_verified, ops_assigned, or completed
        const opsOrders = data.data.filter((o: Order) => 
          ['finance_verified', 'ops_assigned', 'completed'].includes(o.status)
        );
        setOrders(opsOrders);
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
  }, [user, search]);

  useEffect(() => {
    if (selectedOrder) {
      fetchMedia(selectedOrder.id);
      // Pre-fill schedule forms
      setScheduleDate(selectedOrder.deliveryDate || '');
      setScheduleTime(selectedOrder.deliveryTime || '');
      setInstallDate(selectedOrder.installationDate || '');
      setInstallTime(selectedOrder.installationTime || '');
      
      // Pre-fill actual dates with current local time
      const now = new Date();
      const localDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const localTime = now.toTimeString().substring(0, 5); // HH:MM
      setActualDeliveryDate(localDate);
      setActualDeliveryTime(localTime);
      setActualInstallDate(localDate);
      setActualInstallTime(localTime);
      setActualMeterDate(localDate);
      setActualMeterTime(localTime);
      setActualCommissionDate(localDate);
      setActualCommissionTime(localTime);
      setActualSubsidyDate(localDate);
      setActualSubsidyTime(localTime);
    } else {
      setAllMedia([]);
    }
  }, [selectedOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const fetchMedia = async (orderId: number) => {
    try {
      setLoadingMedia(true);
      const res = await fetch(`/api/v1/orders/${orderId}/installation-images`);
      const data = await res.json();
      if (data.success && data.data) {
        setAllMedia(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Helper to format date strings nicely
  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Filtered media items lists
  const deliveredImages = allMedia.filter(img => img.status === 'delivered_items');
  const installedImages = allMedia.filter(img => img.status === 'installation_done');
  const meterImages = allMedia.filter(img => img.status === 'meter_sealing_paper');
  const commissionedImages = allMedia.filter(img => img.status === 'plant_commissioned');

  // Submit delivery schedule form
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSchedulingLoading(true);
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate: scheduleDate,
          deliveryTime: scheduleTime,
          status: 'ops_assigned',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Log transition in Lead history
        await fetch(`/api/v1/leads/${selectedOrder.leadId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_status: 13,
            remark: `[DELIVERY SCHEDULED] Date: ${scheduleDate}, Time: ${scheduleTime}`,
          }),
        });

        // Update local state
        const updated = {
          ...selectedOrder,
          deliveryDate: scheduleDate,
          deliveryTime: scheduleTime,
          status: 'ops_assigned',
        };
        setSelectedOrder(updated);
        setShowScheduleForm(false);
        fetchOrders();
        showAlert('Delivery schedule saved successfully!', 'success');
      } else {
        showAlert(data.message || 'Failed to save delivery schedule.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error saving delivery schedule.', 'error');
    } finally {
      setSchedulingLoading(false);
    }
  };

  // Confirm actual delivery completed
  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // Combine date and time
    const actualDeliveryTimestamp = new Date(`${actualDeliveryDate}T${actualDeliveryTime}`).toISOString();

    setSchedulingLoading(true);
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDelivered: true,
          actualDeliveryAt: actualDeliveryTimestamp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Log transition in Lead history
        await fetch(`/api/v1/leads/${selectedOrder.leadId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_status: 13,
            remark: `[MATERIALS DELIVERED] Delivery verified. Actual Date/Time: ${formatDateTime(actualDeliveryTimestamp)}`,
          }),
        });

        // Update local state
        const updated = {
          ...selectedOrder,
          isDelivered: true,
          actualDeliveryAt: actualDeliveryTimestamp,
        };
        setSelectedOrder(updated);
        setShowActualDeliveryForm(false);
        fetchOrders();
        showAlert('Status updated: Materials Delivered!', 'success');
      } else {
        showAlert(data.message || 'Failed to mark as delivered.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating delivery status.', 'error');
    } finally {
      setSchedulingLoading(false);
    }
  };

  // Submit installation schedule form
  const handleSaveInstallSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setInstallLoading(true);
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationDate: installDate,
          installationTime: installTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Log transition in Lead history
        await fetch(`/api/v1/leads/${selectedOrder.leadId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_status: 13,
            remark: `[INSTALLATION SCHEDULED] Date: ${installDate}, Time: ${installTime}`,
          }),
        });

        // Update local state
        const updated = {
          ...selectedOrder,
          installationDate: installDate,
          installationTime: installTime,
        };
        setSelectedOrder(updated);
        setShowInstallForm(false);
        fetchOrders();
        showAlert('Installation schedule saved successfully!', 'success');
      } else {
        showAlert(data.message || 'Failed to save installation schedule.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error saving installation schedule.', 'error');
    } finally {
      setInstallLoading(false);
    }
  };

  // Confirm actual installation completed
  const handleConfirmInstallation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // Combine date and time
    const actualInstallTimestamp = new Date(`${actualInstallDate}T${actualInstallTime}`).toISOString();

    setInstallLoading(true);
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isInstalled: true,
          actualInstallationAt: actualInstallTimestamp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Log transition in Lead history
        await fetch(`/api/v1/leads/${selectedOrder.leadId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_status: 13,
            remark: `[INSTALLATION COMPLETED] Solar structure installed. Actual Date/Time: ${formatDateTime(actualInstallTimestamp)}`,
          }),
        });

        // Update local state
        const updated = {
          ...selectedOrder,
          isInstalled: true,
          actualInstallationAt: actualInstallTimestamp,
        };
        setSelectedOrder(updated);
        setShowActualInstallForm(false);
        fetchOrders();
        showAlert('Status updated: Installation Done!', 'success');
      } else {
        showAlert(data.message || 'Failed to mark installation as completed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating installation status.', 'error');
    } finally {
      setInstallLoading(false);
    }
  };

  // Confirm actual Net Meter installed
  const handleConfirmMeterInstallation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const actualMeterTimestamp = new Date(`${actualMeterDate}T${actualMeterTime}`).toISOString();

    setMeterLoading(true);
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isMeterInstalled: true,
          actualMeterInstalledAt: actualMeterTimestamp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Log transition in Lead history
        await fetch(`/api/v1/leads/${selectedOrder.leadId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_status: 13,
            remark: `[NET METER INSTALLED] Net meter successfully installed by Electricity Department. Actual Date/Time: ${formatDateTime(actualMeterTimestamp)}.`,
          }),
        });

        // Update local state
        const updated = {
          ...selectedOrder,
          isMeterInstalled: true,
          actualMeterInstalledAt: actualMeterTimestamp,
        };
        setSelectedOrder(updated);
        setShowActualMeterForm(false);
        fetchOrders();
        showAlert('Status updated: Net Meter Installed!', 'success');
      } else {
        showAlert(data.message || 'Failed to update meter status.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating meter status.', 'error');
    } finally {
      setMeterLoading(false);
    }
  };

  // Confirm actual plant commissioned
  const handleConfirmPlantCommissioning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const actualCommissionTimestamp = new Date(`${actualCommissionDate}T${actualCommissionTime}`).toISOString();

    setCommissionLoading(true);
    try {
      // If subsidy is NOT applicable, this commissioned confirmation completes the order immediately!
      const shouldCompleteOrder = !selectedOrder.subsidyApplicable;

      const patchBody: any = {
        isCommissioned: true,
        actualCommissionedAt: actualCommissionTimestamp,
      };

      if (shouldCompleteOrder) {
        patchBody.status = 'completed';
      }

      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      const data = await res.json();
      if (data.success) {
        // Log transition in Lead history
        await fetch(`/api/v1/leads/${selectedOrder.leadId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_status: 13,
            remark: `[PLANT COMMISSIONED] Plant is properly working and commissioned. Actual Date/Time: ${formatDateTime(actualCommissionTimestamp)}.${shouldCompleteOrder ? ' Order completed.' : ''}`,
          }),
        });

        // Update local state
        const updated = {
          ...selectedOrder,
          isCommissioned: true,
          actualCommissionedAt: actualCommissionTimestamp,
          status: shouldCompleteOrder ? 'completed' : selectedOrder.status,
        };
        setSelectedOrder(updated);
        setShowActualCommissionForm(false);
        fetchOrders();
        showAlert(`Status updated: Plant Commissioned!${shouldCompleteOrder ? ' Order completed.' : ''}`, 'success');
      } else {
        showAlert(data.message || 'Failed to update commissioning status.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating commissioning status.', 'error');
    } finally {
      setCommissionLoading(false);
    }
  };

  // Confirm actual subsidy applied
  const handleConfirmSubsidy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newSubsidyAmount) return;

    const amountNum = parseFloat(newSubsidyAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert('Please enter a valid subsidy amount.', 'error');
      return;
    }

    const actualSubsidyTimestamp = new Date(`${actualSubsidyDate}T${actualSubsidyTime}`).toISOString();

    setSubsidyLoading(true);
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSubsidyApplied: true,
          actualSubsidyAppliedAt: actualSubsidyTimestamp,
          subsidyApplicable: true,
          subsidyAmount: amountNum,
          status: 'completed', // Complete the overall order lifecycle
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Log transition in Lead history
        await fetch(`/api/v1/leads/${selectedOrder.leadId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_status: 13,
            remark: `[SUBSIDY APPLIED] Government subsidy registered as applied. Actual Date/Time: ${formatDateTime(actualSubsidyTimestamp)}. Expected Amount: â‚¹${amountNum.toLocaleString('en-IN')}. Order completed successfully.`,
          }),
        });

        // Update local state
        const updated = {
          ...selectedOrder,
          isSubsidyApplied: true,
          actualSubsidyAppliedAt: actualSubsidyTimestamp,
          subsidyApplicable: true,
          subsidyAmount: amountNum,
          status: 'completed',
        };
        setSelectedOrder(updated);
        setNewSubsidyAmount('');
        fetchOrders();
        showAlert('Status updated: Subsidy Registered! Order completed successfully.', 'success');
      } else {
        showAlert(data.message || 'Failed to update subsidy status.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating subsidy status.', 'error');
    } finally {
      setSubsidyLoading(false);
    }
  };



  const executeUpload = async (file: File, uploadStatus: 'delivered_items' | 'installation_done' | 'meter_sealing_paper' | 'plant_commissioned') => {
    if (!selectedOrder) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('status', uploadStatus);

    setUploadingFile(true);
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/installation-images`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetchMedia(selectedOrder.id);
        showAlert('File uploaded successfully.', 'success');
      } else {
        showAlert(data.message || 'Failed to upload file.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error uploading file.', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  // Upload photo/video file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, uploadStatus: 'delivered_items' | 'installation_done' | 'meter_sealing_paper' | 'plant_commissioned') => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder) return;
    await executeUpload(file, uploadStatus);
  };

  // Delete uploaded proof file
  const handleDeleteFile = async (imageId: number) => {
    if (!selectedOrder) return;
    setCustomConfirm({
      isOpen: true,
      message: 'Are you sure you want to delete this file proof?',
      onConfirm: () => executeDeleteFile(imageId),
    });
  };

  const executeDeleteFile = async (imageId: number) => {
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder!.id}/installation-images/${imageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchMedia(selectedOrder!.id);
      } else {
        showAlert(data.message || 'Failed to remove file.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };


  // Derived Data
  const uniqueManagers = Array.from(new Set(orders.map(o => o.assignedOps?.name).filter(Boolean))).map(name => {
    const order = orders.find(o => o.assignedOps?.name === name);
    return { id: order?.assignedOpsId, name };
  });

  const filteredOrders = orders.filter(o => {
    // 1. Search Filter
    if (search) {
      const q = search.toLowerCase();
      if (!o.orderCode?.toLowerCase().includes(q) && !o.lead.customerName?.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    // 2. Manager Filter
    if (filterManagerId !== 'all') {
      if (o.assignedOpsId?.toString() !== filterManagerId) return false;
    }
    
    // 3. Stage Filter
    if (filterStage !== 'all') {
      if (filterStage === 'delivery_scheduled' && !o.isDelivered && o.deliveryDate) {}
      else if (filterStage === 'delivered' && o.isDelivered && !o.isInstalled) {}
      else if (filterStage === 'installation_scheduled' && !o.isInstalled && o.installationDate) {}
      else if (filterStage === 'installed' && o.isInstalled && !o.isMeterInstalled) {}
      else if (filterStage === 'meter_installed' && o.isMeterInstalled && !o.isCommissioned) {}
      else if (filterStage === 'commissioned' && o.isCommissioned && (!o.subsidyApplicable || (o.subsidyApplicable && !o.isSubsidyApplied))) {}
      else if (filterStage === 'subsidy_applied' && o.isSubsidyApplied) {}
      else { return false; }
    }
    
    // 4. Date Filter (Order Created At)
    if (filterDateFrom) {
      const orderDate = new Date(o.createdAt);
      const fromDate = new Date(filterDateFrom);
      if (orderDate < fromDate) return false;
    }
    if (filterDateTo) {
      const orderDate = new Date(o.createdAt);
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (orderDate > toDate) return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Operations & Delivery</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Manage delivery, solar structure installation, net meter installation, plant commissioning, subsidies, and track completion logs.</p>
        </div>
        

      </div>

      {/* Filter Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-lg">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Search Orders</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by client or order code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-color)] placeholder-slate-500"
            />
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="w-full sm:w-auto min-w-[150px]">
          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Assigned To</label>
          <select
            value={filterManagerId}
            onChange={(e) => setFilterManagerId(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-color)]"
          >
            <option value="all">All Managers</option>
            {uniqueManagers.map(m => (
              <option key={m.id || 'unassigned'} value={m.id || 'unassigned'}>{m.name || 'Unassigned'}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto min-w-[180px]">
          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Current Stage</label>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-color)]"
          >
            <option value="all">All Stages</option>
            <option value="delivery_scheduled">Delivery Scheduled</option>
            <option value="delivered">Materials Delivered</option>
            <option value="installation_scheduled">Installation Scheduled</option>
            <option value="installed">Solar Installed</option>
            <option value="meter_installed">Net Meter Installed</option>
            <option value="commissioned">Plant Commissioned</option>
            <option value="subsidy_applied">Subsidy Applied</option>
          </select>
        </div>

        <div className="flex gap-4">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Order Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-color)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Order Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-color)]"
            />
          </div>
        </div>
      </div>

      {/* List View */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
          <p className="text-xs text-[var(--text-secondary)]">Loading operations queue...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-lg">
          <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-[var(--text-primary)] font-semibold text-sm">No Orders Found</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <>
          {/* Bulk Assign Operations Member Bar */}
          {canAssignOps && selectedOrderIds.length > 0 && (
            <div className="flex items-center justify-between bg-emerald-600/10 border border-emerald-600/20 px-4 py-3 rounded-xl mb-4 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Users className="w-4 h-4" />
                <span>Selected {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Assign / Reassign Operations Member</span>
              </button>
            </div>
          )}

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-card)]/50 border-b border-[var(--border-color)]">
                  {canAssignOps && (
                    <th className="px-3 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                        onChange={toggleAllOrders}
                        className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Order Details</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Assigned To</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Current Stage</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Order Date</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((order) => {
                  let stageText = 'Awaiting Schedule â³';
                  let stageClass = 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]';

                  if (order.isSubsidyApplied || (order.isCommissioned && !order.subsidyApplicable)) {
                    stageText = 'Completed âœ…';
                    stageClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                  } else if (order.isCommissioned) {
                    stageText = 'Subsidy Pending â³';
                    stageClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                  } else if (order.isMeterInstalled) {
                    stageText = 'Commissioning Pending âš¡';
                    stageClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  } else if (order.isInstalled) {
                    stageText = 'Meter Pending âš¡';
                    stageClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  } else if (order.isDelivered) {
                    stageText = 'Delivered ðŸšš';
                    stageClass = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
                  } else if (order.deliveryDate) {
                    stageText = 'Scheduled ðŸšš';
                    stageClass = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
                  }

                  return (
                    <tr key={order.id} className={`hover:bg-[var(--bg-card)]/30 transition-colors group ${selectedOrderIds.includes(order.id) ? 'bg-emerald-500/5' : ''}`}>
                      {canAssignOps && (
                        <td className="px-3 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-white text-xs">{order.orderCode}</span>
                          <Link href={`/leads/${order.lead.id}`} className="text-sm font-bold text-emerald-400 hover:underline mt-1">
                            {order.lead.customerName}
                          </Link>
                          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-1 truncate max-w-[250px]">
                            <MapPin className="w-3 h-3" />
                            <span>{order.lead.address}, {order.lead.city}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--bg-card)] flex items-center justify-center border border-[var(--border-color)] shrink-0">
                            <User className="w-3 h-3 text-[var(--text-secondary)]" />
                          </div>
                          <div className="flex flex-col gap-1">
                            {canAssignOps ? (
                              <select
                                value={order.assignedOpsId || ''}
                                onChange={(e) => handleSingleAssign(order.id, e.target.value)}
                                className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                              >
                                <option value="">-- Unassigned --</option>
                                {eligibleAssignees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.name} {emp.designation?.name ? `(${emp.designation.name})` : emp.role ? `(${emp.role.toUpperCase()})` : ''} {emp.id === user?.id ? '(You)' : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {order.assignedOps?.name || 'Unassigned'}
                              </span>
                            )}
                            {(() => {
                              const currentAssignee = employees.find(e => e.id === order.assignedOpsId) || (order.assignedOps as any);
                              const desig = currentAssignee?.designation?.name || currentAssignee?.role;
                              if (!desig || !order.assignedOpsId) return null;
                              return (
                                <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit uppercase tracking-wider">
                                  {desig}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 border rounded-full uppercase tracking-wider whitespace-nowrap ${stageClass}`}>
                          {stageText}
                        </span>
                        {order.deliveryDate && !order.isDelivered && (
                          <div className="text-[10px] text-[var(--text-secondary)] mt-2">
                            Scheduled: {order.deliveryDate} {order.deliveryTime}
                          </div>
                        )}
                        {order.installationDate && !order.isInstalled && order.isDelivered && (
                          <div className="text-[10px] text-[var(--text-secondary)] mt-2">
                            Install: {order.installationDate} {order.installationTime}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--text-secondary)] font-mono">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => { setSelectedOrder(order); setShowScheduleForm(false); setShowInstallForm(false); setShowActualDeliveryForm(false); setShowActualInstallForm(false); setShowActualMeterForm(false); setShowActualCommissionForm(false); setNewSubsidyAmount(''); }}
                          className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-emerald-400 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Selected Order Detail Modal - Widescreen dual column layout */}
      {selectedOrder && (() => {
        // Calculate financial state
        const totalPaid = selectedOrder.payments ? selectedOrder.payments.reduce((sum, p) => sum + p.amount, 0) : selectedOrder.downPayment;
        const balanceOutstanding = Math.max(0, selectedOrder.totalValue - totalPaid);
        const isAdmin = user?.role === 'admin';
        
        // Subsidy can only be applied when balance outstanding is 0
        const canApplySubsidy = balanceOutstanding <= 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-5xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="p-5 border-b border-[var(--border-color)]/60 bg-[var(--bg-card)]/10 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Operations & Scheduling Panel</span>
                    <span className="text-[var(--text-muted)] font-mono text-xs font-normal">({selectedOrder.orderCode})</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Project manager view for solar deployment workflow.</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="text-[var(--text-secondary)] hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Grid Dual Column Layout */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* LEFT COLUMN: Operations Phase Stepper Workflow (Takes 2/3 space) */}
                  <div className="lg:col-span-2 space-y-8 pr-0 lg:pr-2">
                    
                    {/* ==================== 1. DELIVERY PHASE ==================== */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono text-[10px]">1</span>
                        <span>Material Delivery Phase</span>
                      </h4>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                        <div>
                          <span className="text-[var(--text-muted)] block uppercase tracking-wider text-[8px] font-bold">Delivery Status</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Truck className={`w-4 h-4 ${selectedOrder.isDelivered ? 'text-emerald-400' : selectedOrder.deliveryDate ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[var(--text-primary)]">
                                {selectedOrder.isDelivered 
                                  ? 'Materials Delivered' 
                                  : selectedOrder.deliveryDate 
                                    ? `Scheduled: ${selectedOrder.deliveryDate} at ${selectedOrder.deliveryTime || 'N/A'}` 
                                    : 'Awaiting Schedule'}
                              </span>
                              {selectedOrder.isDelivered && (
                                <span className="text-[10px] text-emerald-400 mt-0.5">Delivered on: {formatDateTime(selectedOrder.actualDeliveryAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                          {/* Delivery Schedule Action */}
                          {!selectedOrder.isDelivered && (
                            <button
                              onClick={() => { setShowScheduleForm(!showScheduleForm); setShowInstallForm(false); setShowActualDeliveryForm(false); setShowActualCommissionForm(false); }}
                              className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-350 hover:text-white rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{selectedOrder.deliveryDate ? 'Re-schedule' : 'Schedule Delivery'}</span>
                            </button>
                          )}

                          {/* Delivered Action button */}
                          {selectedOrder.deliveryDate && !selectedOrder.isDelivered && !showActualDeliveryForm && (
                            <button
                              onClick={() => { setShowActualDeliveryForm(true); setShowScheduleForm(false); }}
                              disabled={schedulingLoading || deliveredImages.length === 0}
                              className={`px-4 py-1.5 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all ${
                                deliveredImages.length === 0
                                  ? 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed opacity-60'
                                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/10'
                              }`}
                              title={deliveredImages.length === 0 ? "You must upload at least one Delivered Items proof file first." : "Mark as Delivered"}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Delivered</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Delivery Schedule Form */}
                      {showScheduleForm && (
                        <form onSubmit={handleSaveSchedule} className="p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-lg space-y-4">
                          <h5 className="text-[11px] font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5">Set Delivery Date & Time</h5>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Delivery Date *</label>
                              <input
                                type="date"
                                required
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                onContextMenu={(e) => handleInputContextMenu(e, 'date', scheduleDate, setScheduleDate)}
                                className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Delivery Time *</label>
                              <input
                                type="time"
                                required
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                onContextMenu={(e) => handleInputContextMenu(e, 'time', scheduleTime, setScheduleTime)}
                                className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowScheduleForm(false)}
                              className="px-3 py-1 bg-slate-955 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={schedulingLoading}
                              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-955 rounded font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              {schedulingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                              <span>Confirm Schedule</span>
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Actual Delivery Logging Form */}
                      {showActualDeliveryForm && (
                        <form onSubmit={handleConfirmDelivery} className="p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-lg space-y-4">
                          <div className="border-b border-[var(--border-color)] pb-1.5">
                            <h5 className="text-[11px] font-bold text-emerald-450 uppercase tracking-wider">Confirm Actual Material Delivery</h5>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Please confirm the actual date and time when the materials were delivered at site.</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Actual Delivery Date *</label>
                              <input
                                type="date"
                                required
                                value={actualDeliveryDate}
                                onChange={(e) => setActualDeliveryDate(e.target.value)}
                                onContextMenu={(e) => handleInputContextMenu(e, 'date', actualDeliveryDate, setActualDeliveryDate)}
                                className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Actual Delivery Time *</label>
                              <input
                                type="time"
                                required
                                value={actualDeliveryTime}
                                onChange={(e) => setActualDeliveryTime(e.target.value)}
                                onContextMenu={(e) => handleInputContextMenu(e, 'time', actualDeliveryTime, setActualDeliveryTime)}
                                className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowActualDeliveryForm(false)}
                              className="px-3 py-1 bg-slate-955 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={schedulingLoading}
                              className="px-3.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              {schedulingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              <span>Confirm Delivery</span>
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Upload Delivered items proof and gallery */}
                      {(selectedOrder.deliveryDate || selectedOrder.isDelivered) && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                            <div>
                              <h5 className="text-[10px] font-bold text-slate-350 uppercase tracking-wider">Delivered Items Photos & Videos</h5>
                              <p className="text-[10px] text-[var(--text-muted)]">Upload photos/videos of delivered solar inventory at the site.</p>
                            </div>

                            {/* Upload Button */}
                            {!selectedOrder.isDelivered && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraModal({
                                      isOpen: true,
                                      onCapture: (file) => executeUpload(file, 'delivered_items')
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                                >
                                  <Camera className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                  <span>Open Camera</span>
                                </button>
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) => handleFileUpload(e, 'delivered_items')}
                                    id="delivery-file-input"
                                    disabled={uploadingFile}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor="delivery-file-input"
                                    className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                                  >
                                    {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                                    <span>Upload File</span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Delivery Media Grid */}
                          {deliveredImages.length === 0 ? (
                            <div className="py-4 text-center text-[10px] text-slate-550 bg-slate-955/10 rounded-lg">
                              No delivered item files uploaded yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {deliveredImages.map((img) => {
                                const isVideo = img.fileName.endsWith('.mp4') || img.fileName.endsWith('.mov') || img.fileName.endsWith('.webm') || img.fileName.endsWith('.avi');
                                
                                return (
                                  <div key={img.id} className="relative group rounded overflow-hidden bg-slate-955 border border-[var(--border-color)] aspect-video flex items-center justify-center">
                                    {isVideo ? (
                                      <video
                                        src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                                        className="w-full h-full object-cover"
                                        controls
                                      />
                                    ) : (
                                      <img
                                        src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                                        alt={img.fileName}
                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all duration-300"
                                        onClick={() => setPreviewImage({
                                          src: `/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`,
                                          title: img.fileName
                                        })}
                                      />
                                    )}
                                    
                                    {/* Delete button (only when not delivered yet) */}
                                    {!selectedOrder.isDelivered && (
                                      <button
                                        onClick={() => handleDeleteFile(img.id)}
                                        className="absolute top-1 right-1 p-0.5 bg-red-650/80 hover:bg-red-600 rounded text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ==================== 2. INSTALLATION PHASE ==================== */}
                    {selectedOrder.isDelivered ? (
                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5 flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono text-[10px]">2</span>
                          <span>Solar Installation Phase</span>
                        </h4>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                          <div>
                            <span className="text-[var(--text-muted)] block uppercase tracking-wider text-[8px] font-bold">Installation Status</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Wrench className={`w-4 h-4 ${selectedOrder.isInstalled ? 'text-emerald-400' : selectedOrder.installationDate ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}`} />
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-[var(--text-primary)]">
                                  {selectedOrder.isInstalled 
                                    ? 'Installation Completed' 
                                    : selectedOrder.installationDate 
                                      ? `Scheduled: ${selectedOrder.installationDate} at ${selectedOrder.installationTime || 'N/A'}` 
                                      : 'Awaiting Schedule'}
                                </span>
                                {selectedOrder.isInstalled && (
                                  <span className="text-[10px] text-emerald-405 text-emerald-400 mt-0.5">Installed on: {formatDateTime(selectedOrder.actualInstallationAt)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 w-full sm:w-auto">
                            {/* Installation Schedule Action */}
                            {!selectedOrder.isInstalled && (
                              <button
                                onClick={() => { setShowInstallForm(!showInstallForm); setShowScheduleForm(false); setShowActualInstallForm(false); setShowActualCommissionForm(false); }}
                                className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-350 hover:text-white rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{selectedOrder.installationDate ? 'Re-schedule' : 'Schedule Installation'}</span>
                              </button>
                            )}

                            {/* Installation Done Action button */}
                            {selectedOrder.installationDate && !selectedOrder.isInstalled && !showActualInstallForm && (
                              <button
                                onClick={() => { setShowActualInstallForm(true); setShowInstallForm(false); }}
                                disabled={installLoading || installedImages.length === 0}
                                className={`px-4 py-1.5 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all ${
                                  installedImages.length === 0
                                    ? 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed opacity-60'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/10'
                                }`}
                                title={installedImages.length === 0 ? "You must upload at least one Completed Installation proof photo/video first." : "Mark Installation as Done"}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Installation Done</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Installation Schedule Form */}
                        {showInstallForm && (
                          <form onSubmit={handleSaveInstallSchedule} className="p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-lg space-y-4">
                            <h5 className="text-[11px] font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5">Set Installation Date & Time</h5>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Installation Date *</label>
                                <input
                                  type="date"
                                  required
                                  value={installDate}
                                  onChange={(e) => setInstallDate(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'date', installDate, setInstallDate)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Installation Time *</label>
                                <input
                                  type="time"
                                  required
                                  value={installTime}
                                  onChange={(e) => setInstallTime(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'time', installTime, setInstallTime)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowInstallForm(false)}
                                className="px-3 py-1 bg-slate-955 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={installLoading}
                                className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-955 rounded font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                {installLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                <span>Confirm Schedule</span>
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Actual Installation Logging Form */}
                        {showActualInstallForm && (
                          <form onSubmit={handleConfirmInstallation} className="p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-lg space-y-4 animate-fade-in-up">
                            <div className="border-b border-[var(--border-color)] pb-1.5">
                              <h5 className="text-[11px] font-bold text-emerald-450 uppercase tracking-wider">Confirm Actual Installation Completed</h5>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Please confirm the actual date and time when the solar structure was fully installed.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Actual Installation Date *</label>
                                <input
                                  type="date"
                                  required
                                  value={actualInstallDate}
                                  onChange={(e) => setActualInstallDate(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'date', actualInstallDate, setActualInstallDate)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Actual Installation Time *</label>
                                <input
                                  type="time"
                                  required
                                  value={actualInstallTime}
                                  onChange={(e) => setActualInstallTime(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'time', actualInstallTime, setActualInstallTime)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowActualInstallForm(false)}
                                className="px-3 py-1 bg-slate-955 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={installLoading}
                                className="px-3.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                              >
                                {installLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                <span>Confirm Installation</span>
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Upload Completed Installation proofs and gallery */}
                        {(selectedOrder.installationDate || selectedOrder.isInstalled) && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                              <div>
                                <h5 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Installation Completion Photos & Videos</h5>
                                <p className="text-[10px] text-[var(--text-muted)]">Upload photos/videos of the final completed solar structure on-site.</p>
                              </div>

                              {/* Upload Button */}
                              {!selectedOrder.isInstalled && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCameraModal({
                                        isOpen: true,
                                        onCapture: (file) => executeUpload(file, 'installation_done')
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                                  >
                                    <Camera className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <span>Open Camera</span>
                                  </button>
                                  <div className="relative">
                                    <input
                                      type="file"
                                      accept="image/*,video/*"
                                      onChange={(e) => handleFileUpload(e, 'installation_done')}
                                      id="install-file-input"
                                      disabled={uploadingFile}
                                      className="hidden"
                                    />
                                    <label
                                      htmlFor="install-file-input"
                                      className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-slate-355 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                                    >
                                      {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                                      <span>Upload File</span>
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Installation Media Grid */}
                            {installedImages.length === 0 ? (
                              <div className="py-4 text-center text-[10px] text-[var(--text-muted)] bg-slate-955/10 rounded-lg">
                                No installation completed files uploaded yet.
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {installedImages.map((img) => {
                                  const isVideo = img.fileName.endsWith('.mp4') || img.fileName.endsWith('.mov') || img.fileName.endsWith('.webm') || img.fileName.endsWith('.avi');
                                  
                                  return (
                                    <div key={img.id} className="relative group rounded overflow-hidden bg-slate-955 border border-[var(--border-color)] aspect-video flex items-center justify-center">
                                      {isVideo ? (
                                        <video
                                          src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                                          className="w-full h-full object-cover"
                                          controls
                                        />
                                      ) : (
                                        <img
                                          src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                                          alt={img.fileName}
                                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all duration-300"
                                          onClick={() => setPreviewImage({
                                            src: `/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`,
                                            title: img.fileName
                                          })}
                                        />
                                      )}
                                      
                                      {/* Delete button (only when not finished yet) */}
                                      {!selectedOrder.isInstalled && (
                                        <button
                                          onClick={() => handleDeleteFile(img.id)}
                                          className="absolute top-1 right-1 p-0.5 bg-red-650/80 hover:bg-red-600 rounded text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-[11px] text-slate-550 italic bg-slate-955/20 rounded-lg">
                        ðŸ”’ Installation phase will unlock once materials are marked as Delivered.
                      </div>
                    )}

                    {/* ==================== 3. NET METERING PHASE ==================== */}
                    {selectedOrder.isInstalled ? (
                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5 flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono text-[10px]">3</span>
                          <span>Net Metering Phase</span>
                        </h4>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                          <div>
                            <span className="text-[var(--text-muted)] block uppercase tracking-wider text-[8px] font-bold">Meter Status</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Activity className={`w-4 h-4 ${selectedOrder.isMeterInstalled ? 'text-emerald-400' : 'text-rose-400'}`} />
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-[var(--text-primary)]">
                                  {selectedOrder.isMeterInstalled 
                                    ? 'Net Meter Installed' 
                                    : 'Meter Installation Pending (Electricity Dept)'}
                                </span>
                                {selectedOrder.isMeterInstalled && (
                                  <span className="text-[10px] text-emerald-400 mt-0.5">Activated on: {formatDateTime(selectedOrder.actualMeterInstalledAt)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 w-full sm:w-auto">
                            {/* Meter Installed Action button */}
                            {!selectedOrder.isMeterInstalled && !showActualMeterForm && (
                              <button
                                onClick={() => { setShowActualMeterForm(true); setShowInstallForm(false); setShowScheduleForm(false); setShowActualCommissionForm(false); }}
                                disabled={meterLoading || meterImages.length === 0}
                                className={`px-4 py-1.5 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all ${
                                  meterImages.length === 0
                                    ? 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed opacity-60'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/10'
                                }`}
                                title={meterImages.length === 0 ? "You must upload the Meter Sealing Paper first." : "Mark Meter as Installed"}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Meter Installed</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Actual Meter Logging Form */}
                        {showActualMeterForm && (
                          <form onSubmit={handleConfirmMeterInstallation} className="p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-lg space-y-4">
                            <div className="border-b border-[var(--border-color)] pb-1.5">
                              <h5 className="text-[11px] font-bold text-emerald-450 uppercase tracking-wider">Confirm Meter Installation Date & Time</h5>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Please confirm when the Net Meter was officially sealed and activated by the department.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Activation Date *</label>
                                <input
                                  type="date"
                                  required
                                  value={actualMeterDate}
                                  onChange={(e) => setActualMeterDate(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'date', actualMeterDate, setActualMeterDate)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Activation Time *</label>
                                <input
                                  type="time"
                                  required
                                  value={actualMeterTime}
                                  onChange={(e) => setActualMeterTime(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'time', actualMeterTime, setActualMeterTime)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowActualMeterForm(false)}
                                className="px-3 py-1 bg-slate-955 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={meterLoading}
                                className="px-3.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                              >
                                {meterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                <span>Confirm Installed</span>
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Upload Meter Sealing Paper proof and gallery */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                            <div>
                              <h5 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Meter Sealing Paper</h5>
                              <p className="text-[10px] text-[var(--text-muted)]">Upload a scan/photo of the official Meter Sealing paper from the Electricity Dept.</p>
                            </div>

                            {/* Upload Button */}
                            {!selectedOrder.isMeterInstalled && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraModal({
                                      isOpen: true,
                                      onCapture: (file) => executeUpload(file, 'meter_sealing_paper')
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                                >
                                  <Camera className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                  <span>Open Camera</span>
                                </button>
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => handleFileUpload(e, 'meter_sealing_paper')}
                                    id="meter-file-input"
                                    disabled={uploadingFile}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor="meter-file-input"
                                    className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                                  >
                                    {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                                    <span>Upload Sealing Paper</span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Meter Media Grid */}
                          {meterImages.length === 0 ? (
                            <div className="py-4 text-center text-[10px] text-slate-550 bg-slate-955/10 rounded-lg">
                              No meter sealing paper uploaded yet. Upload required to complete stage.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {meterImages.map((img) => {
                                const isPDF = img.fileName.endsWith('.pdf');
                                
                                return (
                                  <div key={img.id} className="relative group rounded overflow-hidden bg-[var(--bg-main)] border border-[var(--border-color)] aspect-video flex items-center justify-center">
                                    {isPDF ? (
                                      <a
                                        href={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full h-full flex flex-col items-center justify-center p-2 text-red-400 hover:text-red-305 font-bold font-mono text-[9px] hover:bg-[var(--bg-card)]/35 transition-all"
                                      >
                                        <span>ðŸ“„ PDF Document</span>
                                        <span className="text-[8px] text-[var(--text-muted)] truncate max-w-full mt-1 font-semibold">{img.fileName}</span>
                                      </a>
                                    ) : (
                                      <img
                                        src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                                        alt={img.fileName}
                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all duration-300"
                                        onClick={() => setPreviewImage({
                                          src: `/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`,
                                          title: img.fileName
                                        })}
                                      />
                                    )}
                                    
                                    {/* Delete button (only when not confirmed yet) */}
                                    {!selectedOrder.isMeterInstalled && (
                                      <button
                                        onClick={() => handleDeleteFile(img.id)}
                                        className="absolute top-1 right-1 p-0.5 bg-red-650/80 hover:bg-red-600 rounded text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                    ) : (
                      <div className="py-4 text-center text-[11px] text-slate-550 italic bg-slate-955/20 rounded-lg">
                        ðŸ”’ Meter Installation phase will unlock once solar structure is marked as Installed.
                      </div>
                    )}

                    {/* ==================== 4. COMMISSIONING PHASE ==================== */}
                    {selectedOrder.isMeterInstalled ? (
                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5 flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono text-[10px]">4</span>
                          <span>Plant Commissioning Phase</span>
                        </h4>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-555 block uppercase tracking-wider text-[8px] font-bold">Commissioning Status</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Zap className={`w-4 h-4 ${selectedOrder.isCommissioned ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400 animate-pulse'}`} />
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-[var(--text-primary)]">
                                  {selectedOrder.isCommissioned 
                                    ? 'Plant Commissioned' 
                                    : 'Plant Commissioning Pending'}
                                </span>
                                {selectedOrder.isCommissioned && (
                                  <span className="text-[10px] text-emerald-400 mt-0.5">Commissioned on: {formatDateTime(selectedOrder.actualCommissionedAt)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 w-full sm:w-auto">
                            {/* Plant Commissioned Action button */}
                            {!selectedOrder.isCommissioned && !showActualCommissionForm && (
                              <button
                                onClick={() => { setShowActualCommissionForm(true); setShowInstallForm(false); setShowScheduleForm(false); setShowActualMeterForm(false); }}
                                disabled={commissionLoading || commissionedImages.length === 0}
                                className={`px-4 py-1.5 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all ${
                                  commissionedImages.length === 0
                                    ? 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed opacity-60'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/10'
                                }`}
                                title={commissionedImages.length === 0 ? "You must upload at least one commissioning photo/video of the working solar plant first." : "Mark Plant as Commissioned"}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Plant Commissioned</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Actual Commissioning Logging Form */}
                        {showActualCommissionForm && (
                          <form onSubmit={handleConfirmPlantCommissioning} className="p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-lg space-y-4">
                            <div className="border-b border-[var(--border-color)] pb-1.5">
                              <h5 className="text-[11px] font-bold text-emerald-450 uppercase tracking-wider">Confirm Commissioning Date & Time</h5>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Please confirm when the plant was officially commissioned, powered up, and verified as fully functional.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Commission Date *</label>
                                <input
                                  type="date"
                                  required
                                  value={actualCommissionDate}
                                  onChange={(e) => setActualCommissionDate(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'date', actualCommissionDate, setActualCommissionDate)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Commission Time *</label>
                                <input
                                  type="time"
                                  required
                                  value={actualCommissionTime}
                                  onChange={(e) => setActualCommissionTime(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'time', actualCommissionTime, setActualCommissionTime)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowActualCommissionForm(false)}
                                className="px-3 py-1 bg-slate-955 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={commissionLoading}
                                className="px-3.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                              >
                                {commissionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                <span>Confirm Commissioned</span>
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Upload Commissioning proof and gallery */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                            <div>
                              <h5 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Commissioning Photos & Videos</h5>
                              <p className="text-[10px] text-[var(--text-muted)]">Upload photos/videos proving the solar plant is properly working (generation screen, inverter lights, etc.).</p>
                            </div>

                            {/* Upload Button */}
                            {!selectedOrder.isCommissioned && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraModal({
                                      isOpen: true,
                                      onCapture: (file) => executeUpload(file, 'plant_commissioned')
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                                >
                                  <Camera className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                  <span>Open Camera</span>
                                </button>
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) => handleFileUpload(e, 'plant_commissioned')}
                                    id="commission-file-input"
                                    disabled={uploadingFile}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor="commission-file-input"
                                    className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-slate-350 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                                  >
                                    {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                                    <span>Upload Proof</span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Commission Media Grid */}
                          {commissionedImages.length === 0 ? (
                            <div className="py-4 text-center text-[10px] text-slate-550 bg-slate-955/10 rounded-lg">
                              No commissioning proof uploaded yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {commissionedImages.map((img) => {
                                const isVideo = img.fileName.endsWith('.mp4') || img.fileName.endsWith('.mov') || img.fileName.endsWith('.webm') || img.fileName.endsWith('.avi');
                                
                                return (
                                  <div key={img.id} className="relative group rounded overflow-hidden bg-slate-955 border border-[var(--border-color)] aspect-video flex items-center justify-center">
                                    {isVideo ? (
                                      <video
                                        src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                                        className="w-full h-full object-cover"
                                        controls
                                      />
                                    ) : (
                                      <img
                                        src={`/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`}
                                        alt={img.fileName}
                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all duration-300"
                                        onClick={() => setPreviewImage({
                                          src: `/api/v1/orders/${selectedOrder.id}/installation-images/${img.id}`,
                                          title: img.fileName
                                        })}
                                      />
                                    )}
                                    
                                    {/* Delete button */}
                                    {!selectedOrder.isCommissioned && (
                                      <button
                                        onClick={() => handleDeleteFile(img.id)}
                                        className="absolute top-1 right-1 p-0.5 bg-red-650/80 hover:bg-red-600 rounded text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-[11px] text-slate-550 italic bg-slate-955/20 rounded-lg">
                        ðŸ”’ Plant Commissioning phase will unlock once Net Meter is marked as Installed.
                      </div>
                    )}

                    {/* ==================== 5. SUBSIDY PHASE ==================== */}
                    {selectedOrder.isCommissioned ? (
                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5 flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono text-[10px]">5</span>
                          <span>Government Subsidy Stage</span>
                        </h4>
                        {selectedOrder.isSubsidyApplied ? (
                          // Already Applied
                          <div className="p-4 bg-[var(--bg-card)]/10 border border-[var(--border-color)] rounded-lg text-xs space-y-2">
                            <div className="flex items-center gap-2 text-emerald-450 font-bold">
                              <Gift className="w-4 h-4 text-emerald-400" />
                              <span>Government Subsidy Applied & Verified</span>
                            </div>
                            <div className="text-slate-350 text-[11px] space-y-1">
                              <div><span className="text-[var(--text-muted)]">Applied Date:</span> {formatDateTime(selectedOrder.actualSubsidyAppliedAt)}</div>
                              <div><span className="text-[var(--text-muted)]">Subsidy Amount:</span> â‚¹{selectedOrder.subsidyAmount?.toLocaleString('en-IN') || '0'}</div>
                            </div>
                          </div>
                        ) : balanceOutstanding > 0 ? (
                          // Money remaining -> cannot be applied
                          <div className="py-3 px-4 bg-[var(--bg-card)]/15 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-2.5">
                            <Info className="w-4 h-4 shrink-0 text-red-400" />
                            <span>
                              âš ï¸ Subsidy cannot be applied because there is an outstanding balance of <strong>â‚¹{balanceOutstanding.toLocaleString('en-IN')}</strong>. Please clear all remaining payments first.
                            </span>
                          </div>
                        ) : (
                          // Dues paid -> Eligible for subsidy! Show the registration form.
                          <form onSubmit={handleConfirmSubsidy} className="p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-lg space-y-4 animate-fade-in-up">
                            <div className="border-b border-[var(--border-color)] pb-1.5">
                              <h5 className="text-[11px] font-bold text-emerald-450 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Apply Government Subsidy</span>
                              </h5>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Dues are fully paid (â‚¹0 outstanding). Please record the government subsidy details below.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Expected Subsidy Amount (â‚¹) *</label>
                                <input
                                  type="number"
                                  required
                                  value={newSubsidyAmount}
                                  onChange={(e) => setNewSubsidyAmount(e.target.value)}
                                  placeholder="e.g. 78000"
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)] font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Registration Date *</label>
                                <input
                                  type="date"
                                  required
                                  value={actualSubsidyDate}
                                  onChange={(e) => setActualSubsidyDate(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'date', actualSubsidyDate, setActualSubsidyDate)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Registration Time *</label>
                                <input
                                  type="time"
                                  required
                                  value={actualSubsidyTime}
                                  onChange={(e) => setActualSubsidyTime(e.target.value)}
                                  onContextMenu={(e) => handleInputContextMenu(e, 'time', actualSubsidyTime, setActualSubsidyTime)}
                                  className="w-full px-3 py-1.5 bg-slate-955 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="submit"
                                disabled={subsidyLoading || !newSubsidyAmount}
                                className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                              >
                                {subsidyLoading ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <Gift className="w-3.5 h-3.5" />
                                    <span>Apply Subsidy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-[11px] text-slate-550 italic bg-slate-955/20 rounded-lg">
                        ðŸ”’ Subsidy stage will unlock once solar plant is marked as Commissioned.
                      </div>
                    )}

                  </div>

                  {/* RIGHT COLUMN: Client Inspector Panel (Takes 1/3 space) */}
                  <div className="lg:col-span-1 space-y-6 lg:border-l lg:border-[var(--border-color)]/80 lg:pl-6">
                    
                    {/* Client Details Section */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Client Information</span>
                      </h4>
                      
                      <div className="space-y-3.5 text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase tracking-wider">Customer Name</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            <Link href={`/leads/${selectedOrder.lead.id}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                              {selectedOrder.lead.customerName}
                            </Link>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase tracking-wider">Site Address</span>
                          <span className="font-medium text-[var(--text-primary)] leading-relaxed block mt-0.5">
                            {selectedOrder.lead.address}, {selectedOrder.lead.city}, {selectedOrder.lead.state} - {selectedOrder.lead.pinCode}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase tracking-wider">Mobile Number</span>
                          <a href={`tel:${selectedOrder.lead.mobile}`} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline block mt-0.5">
                            {selectedOrder.lead.mobile}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Project Details Section */}
                    <div className="space-y-4 pt-4 border-t border-[var(--border-color)]/60">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Project Specs</span>
                      </h4>
                      
                      <div className="space-y-3.5 text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase tracking-wider">Capacity & Client Type</span>
                          <span className="font-bold text-[var(--text-primary)] block mt-0.5">
                            {selectedOrder.systemSizeKw} kW ({selectedOrder.clientType.toUpperCase().replace('_', ' ')})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase tracking-wider">Connection Number</span>
                          <span className="font-mono text-[var(--text-primary)] block mt-0.5">{selectedOrder.connectionNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase tracking-wider">Financial Status</span>
                          <div className="mt-1.5 space-y-1.5">
                            <div className="flex justify-between text-[var(--text-secondary)] text-[11px]">
                              <span>Contract Value:</span>
                              <span className="font-bold text-[var(--text-primary)]">â‚¹{selectedOrder.totalValue.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-[var(--text-secondary)] text-[11px]">
                              <span>Total Paid:</span>
                              <span className="text-emerald-400 font-bold">â‚¹{totalPaid.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between border-t border-[var(--border-color)]/60 pt-1.5 text-[11px]">
                              <span className="text-[var(--text-primary)] font-semibold">Remaining Balance:</span>
                              <span className={`font-mono font-bold ${balanceOutstanding <= 0 ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                â‚¹{balanceOutstanding.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Media Lightbox Preview */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-5 right-5 p-2 bg-[var(--bg-card)] rounded-full text-[var(--text-secondary)] hover:text-white cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3">
            <img 
              src={previewImage.src} 
              alt={previewImage.title}
              className="max-w-full max-h-[80vh] rounded-lg border border-[var(--border-color)] object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-[var(--text-secondary)] text-xs font-mono">{previewImage.title}</span>
          </div>
        </div>
      )}

      {/* Custom Right-Click Date / Time Picker Popup */}
      {customPicker.isOpen && (
        <>
          {/* Overlay to close on click outside */}
          <div 
            className="fixed inset-0 z-[999] bg-transparent" 
            onClick={() => setCustomPicker(prev => ({ ...prev, isOpen: false }))}
          />
          <div 
            style={{ top: customPicker.y, left: customPicker.x, position: 'fixed' }}
            className="z-[1000] backdrop-blur-md bg-[var(--bg-card)]/95 border border-[var(--border-color)] rounded-xl shadow-2xl p-4 w-64 animate-fade-in text-white"
          >
            {customPicker.type === 'date' ? (
              // Calendar Date Picker UI
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(prev => prev - 1);
                      } else {
                        setCalendarMonth(prev => prev - 1);
                      }
                    }}
                    className="p-1 hover:bg-[var(--bg-card)] rounded text-[var(--text-secondary)] hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(prev => prev + 1);
                      } else {
                        setCalendarMonth(prev => prev + 1);
                      }
                    }}
                    className="p-1 hover:bg-[var(--bg-card)] rounded text-[var(--text-secondary)] hover:text-white cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) {
                      cells.push(<div key={`pad-${i}`} className="w-7 h-7" />);
                    }
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = customPicker.value === dateStr;
                      cells.push(
                        <button
                          key={`day-${day}`}
                          type="button"
                          onClick={() => {
                            customPicker.onChange(dateStr);
                            setCustomPicker(prev => ({ ...prev, isOpen: false }));
                          }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold cursor-pointer transition-all hover:bg-[var(--bg-card)] ${
                            isSelected 
                              ? 'bg-emerald-600 text-white font-bold hover:bg-emerald-500' 
                              : 'text-slate-350 hover:text-white'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      customPicker.onChange(dateStr);
                      setCustomPicker(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPicker(prev => ({ ...prev, isOpen: false }))}
                    className="text-[10px] text-[var(--text-secondary)] hover:text-slate-350 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              // Time Picker UI
              <div className="space-y-3">
                <div className="text-xs font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-color)] text-center uppercase tracking-wider">
                  Select Time
                </div>

                <div className="flex gap-4 justify-center py-2">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Hour</span>
                    <div className="h-32 overflow-y-auto w-14 bg-slate-955 border border-[var(--border-color)] rounded-lg py-1 scrollbar-thin">
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setSelectedHour(h)}
                          className={`w-full text-center py-0.5 text-xs cursor-pointer hover:bg-[var(--bg-card)] ${
                            selectedHour === h ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-[var(--bg-card)]' : 'text-slate-350 hover:text-white'
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Minute</span>
                    <div className="h-32 overflow-y-auto w-14 bg-slate-955 border border-[var(--border-color)] rounded-lg py-1 scrollbar-thin">
                      {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedMinute(m)}
                          className={`w-full text-center py-0.5 text-xs cursor-pointer hover:bg-[var(--bg-card)] ${
                            selectedMinute === m ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-[var(--bg-card)]' : 'text-slate-350 hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setCustomPicker(prev => ({ ...prev, isOpen: false }))}
                    className="px-2.5 py-1 bg-[var(--bg-card)] hover:bg-slate-750 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-[10px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      customPicker.onChange(`${selectedHour}:${selectedMinute}`);
                      setCustomPicker(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[10px] cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {/* Custom Alert Modal */}
      {customAlert.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl max-w-sm w-full space-y-4 text-center animate-fade-in-up">
            <div className="flex justify-center">
              {customAlert.type === 'success' ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                </div>
              ) : customAlert.type === 'error' ? (
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                  <X className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Info className="w-6 h-6" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {customAlert.type === 'success' ? 'Success' : customAlert.type === 'error' ? 'Error' : 'Notification'}
              </h4>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium pt-1">
                {customAlert.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
                className={`w-full py-2 rounded-lg font-bold text-xs cursor-pointer shadow-md transition-all ${
                  customAlert.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10'
                    : customAlert.type === 'error'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/10'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10'
                }`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {customConfirm.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl max-w-sm w-full space-y-4 text-center animate-fade-in-up">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <Info className="w-6 h-6" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Confirm Action</h4>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium pt-1">
                {customConfirm.message}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))}
                className="w-1/2 py-2 bg-[var(--bg-card)] hover:bg-slate-750 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(prev => ({ ...prev, isOpen: false }));
                }}
                className="w-1/2 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-red-500/10"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WebRTC Camera Modal */}
      {cameraModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 text-center text-white animate-fade-in-up">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Capture Proof Photo</span>
              <button 
                type="button" 
                onClick={() => setCameraModal(prev => ({ ...prev, isOpen: false }))}
                className="text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center">
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
                    className="w-1/2 py-2 bg-[var(--bg-card)] hover:bg-slate-750 text-slate-350 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={confirmPhoto}
                    className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    Use Photo
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCameraModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-1/3 py-2 bg-[var(--bg-card)] hover:bg-slate-750 text-[var(--text-secondary)] hover:text-slate-250 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-2/3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
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

      {/* Bulk Assign Operations Member Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden p-6 animate-fade-in-up space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assign Operations Member</h3>
              <button onClick={() => { setShowAssignModal(false); setAssignTargetUserId(''); }} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-primary)]">
              Assign <strong className="text-white">{selectedOrderIds.length}</strong> selected order{selectedOrderIds.length > 1 ? 's' : ''} to an operations member in your reporting hierarchy.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Select Team Member</label>
              <select
                value={assignTargetUserId}
                onChange={(e) => setAssignTargetUserId(e.target.value)}
                className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-white text-xs focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Choose Team Member --</option>
                {eligibleAssignees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.designation?.name ? `(${emp.designation.name})` : ''} {emp.id === user?.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setAssignTargetUserId(''); }}
                className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-xs font-bold hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={!assignTargetUserId || assignLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
              >
                {assignLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
