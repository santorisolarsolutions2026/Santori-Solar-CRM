'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentLocationString } from '@/lib/location';
import {
  Sun,
  Moon,
  LayoutDashboard,
  Users,
  Briefcase,
  Layers,
  LineChart,
  LogOut,
  Bell,
  Menu,
  X,
  FileCheck,
  UserCheck,
  Calendar,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  TrendingUp,
  Upload,
  Loader2,
  User,
  Clock,
  CreditCard,
  Wrench,
  Flame,
  CheckCircle,
  XCircle,
  Info,
  Trophy,
  Flag,
  Check,
  Database,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import LeaderboardDrawer from '@/components/LeaderboardDrawer';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  leadId: number | null;
  isRead: boolean;
  createdAt: string;
}

function calculateYearsInCompany(joiningDateStr: string | null | undefined): string {
  if (!joiningDateStr) return '-';
  const joiningDate = new Date(joiningDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - joiningDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = diffDays / 365.25;
  if (years < 0.1) {
    const months = Math.floor(diffDays / 30);
    if (months === 0) {
      return `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
    }
    return `${months} Month${months > 1 ? 's' : ''}`;
  }
  return `${years.toFixed(1)} Year${years.toFixed(1) !== '1.0' ? 's' : ''}`;
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout, refreshUser, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workspace: true,
    hr: true,
    admin: true,
  });
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [todayAlerts, setTodayAlerts] = useState<any[]>([]);
  const [showTodayAlertModal, setShowTodayAlertModal] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  // Broadcast News modal state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const handleBroadcastNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcasting(true);
    try {
      const res = await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          title: broadcastTitle,
          message: broadcastMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastModalOpen(false);
        setBroadcastTitle('');
        setBroadcastMessage('');
        fetchNotifications();
        setToasts((prev) => [...prev, { id: Date.now().toString(), message: data.message || 'News broadcast sent to all employees!', type: 'success' }]);
      } else {
        alert(data.message || 'Failed to broadcast news.');
      }
    } catch (err) {
      console.error('Broadcast news error:', err);
      alert('Failed to broadcast news. Please try again.');
    } finally {
      setBroadcasting(false);
    }
  };

  // Toast state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  // Custom Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    (window as any).showToast = addToast;
    
    // Override window.alert
    window.alert = (message: string) => {
      let type: 'success' | 'error' | 'info' = 'info';
      const msg = String(message).toLowerCase();
      if (
        msg.includes('success') || 
        msg.includes('done') || 
        msg.includes('recorded') || 
        msg.includes('booked') || 
        msg.includes('saved') ||
        msg.includes('uploaded') ||
        msg.includes('verified') ||
        msg.includes('updated') ||
        msg.includes('deleted') ||
        msg.includes('reactivated')
      ) {
        type = 'success';
      } else if (
        msg.includes('error') || 
        msg.includes('fail') || 
        msg.includes('invalid') || 
        msg.includes('require') || 
        msg.includes('could not') || 
        msg.includes('cannot') || 
        msg.includes('permission') ||
        msg.includes('warning')
      ) {
        type = 'error';
      }
      addToast(String(message), type);
    };

    // Expose showConfirm helper
    (window as any).showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
      setConfirmModal({
        message,
        onConfirm,
        onCancel: onCancel || (() => {}),
      });
    };
  }, []);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('solar-crm-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  // Global click listener for date and time inputs to open showPicker() on click
  useEffect(() => {
    const handleInputClick = (e: MouseEvent) => {
      // Only handle left clicks
      if (e.button !== 0) return;
      
      const target = e.target as HTMLElement;
      const input = target.closest('input');
      if (input && (input.type === 'date' || input.type === 'time')) {
        try {
          input.showPicker();
        } catch (err) {
          console.warn('showPicker is not supported or failed:', err);
        }
      }
    };

    document.addEventListener('click', handleInputClick);
    return () => document.removeEventListener('click', handleInputClick);
  }, []);

  // Fetch personalized daily alerts for the logged-in user once per session
  useEffect(() => {
    const hasBeenNotified = sessionStorage.getItem('solar-crm-login-notified');
    if (!hasBeenNotified && user) {
      const fetchAlerts = async () => {
        try {
          const res = await fetch('/api/v1/users/my-today-alerts');
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            setTodayAlerts(data.data);
            setShowTodayAlertModal(true);
          }
          // Set session storage flag to avoid annoying repeated popups
          sessionStorage.setItem('solar-crm-login-notified', 'true');
        } catch (err) {
          console.error('Failed to fetch login alerts:', err);
        }
      };
      fetchAlerts();
    }
  }, [user]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('solar-crm-theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    if (notifDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [notifDropdownOpen]);

  const [attendanceDropdownOpen, setAttendanceDropdownOpen] = useState(false);
  const attendanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (attendanceRef.current && !attendanceRef.current.contains(event.target as Node)) {
        setAttendanceDropdownOpen(false);
      }
    }
    if (attendanceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [attendanceDropdownOpen]);

  // Profile modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoPath, setEditPhotoPath] = useState('');
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [editPhotoPreviewUrl, setEditPhotoPreviewUrl] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const handleOpenProfile = () => {
    if (!user) return;
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditEmployeeId(user.employeeId || '');
    setEditPhone(user.phone || '');
    setEditPhotoPath(user.photograph || '');
    setEditPhotoPreviewUrl('');
    setUpdateError('');
    setProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    if (editPhotoPreviewUrl) {
      URL.revokeObjectURL(editPhotoPreviewUrl);
      setEditPhotoPreviewUrl('');
    }
  };

  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    if (editPhotoPreviewUrl) {
      URL.revokeObjectURL(editPhotoPreviewUrl);
    }
    setEditPhotoPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingEditPhoto(true);
      const res = await fetch('/api/v1/users/upload-photograph', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setEditPhotoPath(data.filePath);
      } else {
        alert(data.message || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading photo.');
    } finally {
      setUploadingEditPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdatingProfile(true);
    setUpdateError('');

    const isAdmin = user.role === 'admin' || user.role.startsWith('admin:');

    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: isAdmin ? editName : undefined,
          email: isAdmin ? editEmail : undefined,
          employeeId: isAdmin ? editEmployeeId : undefined,
          phone: editPhone,
          photograph: editPhotoPath,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Profile updated successfully!');
        closeProfileModal();
        await refreshUser();
      } else {
        setUpdateError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setUpdateError('An error occurred while saving profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/v1/notifications');
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  // Attendance states
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);

  const fetchTodayAttendance = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/v1/attendance/today');
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.data);
      }
    } catch (err) {
      console.error('Fetch attendance error:', err);
    }
  };

  const handleQuickCheckIn = async () => {
    try {
      setAttendanceActionLoading(true);
      const loc = await getCurrentLocationString();
      const res = await fetch('/api/v1/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc }),
      });
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.data);
        alert(data.message);
      } else {
        alert(data.message || 'Check-in failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  const handleQuickCheckOut = async () => {
    setConfirmModal({
      message: 'Are you sure you want to Check Out for today?',
      onConfirm: async () => {
        try {
          setAttendanceActionLoading(true);
          const loc = await getCurrentLocationString();
          const res = await fetch('/api/v1/attendance/check-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: loc }),
          });
          const data = await res.json();
          if (data.success) {
            setTodayAttendance(data.data);
            alert(data.message);
          } else {
            alert(data.message || 'Check-out failed');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setAttendanceActionLoading(false);
        }
      },
      onCancel: () => {},
    });
  };
  const fetchTopPerformers = async () => {
    try {
      const res = await fetch('/api/v1/leaderboard?timeframe=month&department=all');
      const data = await res.json();
      if (data.success) {
        setTopPerformers(data.data.slice(0, 3));
      }
    } catch (err) {
      console.error('Fetch top performers error:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchTodayAttendance();
      fetchTopPerformers();
      // Poll notifications every 20 seconds, and leaderboard every 60 seconds
      const interval = setInterval(fetchNotifications, 20000);
      const leaderboardInterval = setInterval(fetchTopPerformers, 60000);
      return () => {
        clearInterval(interval);
        clearInterval(leaderboardInterval);
      };
    }
  }, [user]);

  // Mark notification as read and navigate
  const handleNotifClick = async (notif: Notification) => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notif.id }),
      });
      fetchNotifications();
      setNotifDropdownOpen(false);
      if (notif.leadId) {
        router.push(`/leads/${notif.leadId}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Sun className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm font-semibold tracking-wider uppercase">Loading SolarCRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Sidebar navigation configuration based on permission keys
  const sidebarGroups = [
    {
      id: 'workspace',
      title: 'Workspace',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
          permission: null,
        },
        {
          name: 'Leads Pipeline',
          path: '/leads',
          icon: Layers,
          permission: 'leads:view',
        },
        {
          name: 'Finance & Payments',
          path: '/finance',
          icon: CreditCard,
          permission: 'orders:finance_access',
        },
        {
          name: 'Operations & Installs',
          path: '/operations',
          icon: Wrench,
          permission: 'orders:operations',
        },
        {
          name: 'Completed Orders',
          path: '/orders/completed',
          icon: PackageCheck,
          permission: 'ops:delivered_orders',
        },
      ]
    },
    {
      id: 'hr',
      title: 'Team & HR',
      items: [
        {
          name: 'Attendance',
          path: '/attendance',
          icon: UserCheck,
          permission: 'attendance:view',
        },
        {
          name: 'Santori Team',
          path: '/team',
          icon: Users,
          permission: null,
        },
      ]
    },
    {
      id: 'admin',
      title: 'Admin Console',
      items: [
        {
          name: 'Employee Audit',
          path: '/reports',
          icon: LineChart,
          permission: 'reports:view',
        },
      ]
    }
  ];

  const isCurrentUserAdmin = user?.role === 'admin' || user?.role?.startsWith('admin:');
  const isITUser = user?.department?.name === 'IT';

  const visibleGroups = sidebarGroups.map(group => {
    const filteredItems = group.items.filter(item => {
      if (item.permission === 'logs:view_only_it_admin') {
        return isCurrentUserAdmin || isITUser;
      }
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
    return { ...group, items: filteredItems };
  }).filter(group => group.items.length > 0);

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    director: { label: 'Director', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    sales_head: { label: 'Sales Head', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    finance: { label: 'Finance Manager', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    operations: { label: 'Operations Manager', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    psa_tl: { label: 'PSA Team Leader', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    psa: { label: 'PSA Consultant', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    tl: { label: 'Sales Team Leader', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    consultant: { label: 'Sales Consultant', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };

  const userRoleConfig = user.role.includes(':')
    ? { label: user.role.split(':')[1], color: roleLabels[user.role.split(':')[0]]?.color || 'bg-slate-500/10 text-[var(--text-secondary)]' }
    : roleLabels[user.role] || { label: user.role, color: 'bg-slate-500/10 text-[var(--text-secondary)]' };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden">
      {/* 1. Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] shadow-xl transition-all duration-250 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="h-16 flex items-center justify-between px-3 border-b border-[var(--border-color)] relative">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 flex-shrink-0 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-md shadow-black/20">
                <img
                  src="/logo.png"
                  alt="Santori Solar Solutions Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-extrabold text-[var(--text-primary)] tracking-wide truncate">
                Solar<span className="text-emerald-500">CRM</span>
              </span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center justify-center w-full">
              <div className="w-8 h-8 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg flex items-center justify-center overflow-hidden p-1">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
            </Link>
          )}
          <button
            onClick={toggleSidebarCollapsed}
            className={`sidebar-toggle-btn flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all focus:outline-none ${sidebarCollapsed ? 'ml-auto mr-0' : 'ml-2'}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* User Card */}
        <button
          onClick={handleOpenProfile}
          className={`bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color-hover)] rounded-xl text-left cursor-pointer transition-all focus:outline-none ${
            sidebarCollapsed ? 'p-2 mx-2 my-3 flex items-center justify-center' : 'p-4 mx-4 my-6 block w-[calc(100%-2rem)]'
          }`}
        >
          {sidebarCollapsed ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-[var(--border-color)] flex items-center justify-center text-emerald-500 shrink-0">
              {user.photograph ? (
                <img
                  src={`/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {user.photograph ? (
                  <img
                    src={`/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-[var(--border-color)] flex items-center justify-center text-emerald-500 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate mb-2">{user.email}</p>
                </div>
              </div>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full mt-1 ${userRoleConfig.color}`}>
                {userRoleConfig.label}
              </span>
            </>
          )}
        </button>

        {/* Nav Links */}
        <nav className={`flex-1 overflow-y-auto space-y-4 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
          {visibleGroups.map((group) => {
            const isExpanded = expandedGroups[group.id];
            return (
              <div key={group.id} className="space-y-1">
                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors select-none text-left cursor-pointer focus:outline-none"
                  >
                    <span>{group.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                    )}
                  </button>
                )}

                {/* Collapsed: show all items as icon-only */}
                {sidebarCollapsed ? (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          title={item.name}
                          className={`flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]'
                          }`}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  isExpanded && (
                    <div className="space-y-0.5 pl-1.5">
                      {group.items.map((item) => {
                        const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-500 border-l-2 border-emerald-500 pl-2.5'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-500' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </nav>



        {/* Logout */}
        <div className={`border-t border-[var(--border-color)] ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            title="Logout"
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--bg-card)] hover:bg-red-950/20 text-[var(--text-secondary)] hover:text-red-500 border border-[var(--border-color)] hover:border-red-900/30 transition-all font-semibold text-sm cursor-pointer ${
              sidebarCollapsed ? 'w-10 mx-auto px-0' : 'w-full px-4'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Nav Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="relative w-64 max-w-xs bg-[var(--bg-sidebar)] flex flex-col h-full shadow-2xl animate-slide-in">
            <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-color)]">
              <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                <div className="w-8 h-8 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-md shadow-black/20">
                  <img
                    src="/logo.png"
                    alt="Santori Solar Solutions Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl font-extrabold text-white tracking-wide">
                  Solar<span className="text-emerald-500">CRM</span>
                </span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-[var(--text-secondary)] hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={() => {
                setSidebarOpen(false);
                handleOpenProfile();
              }}
              className="p-4 mx-4 my-6 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color-hover)] rounded-xl text-left cursor-pointer transition-all block w-[calc(100%-2rem)] focus:outline-none"
            >
              <div className="flex items-center gap-3">
                {user.photograph ? (
                  <img
                    src={`/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-emerald-500 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate mb-2">{user.email}</p>
                </div>
              </div>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full mt-1 ${userRoleConfig.color}`}>
                {userRoleConfig.label}
              </span>
            </button>

            {/* Quick Attendance Mobile Widget */}
            <div className="mx-4 mb-4 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" /> Attendance
                </span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase">
                  {!todayAttendance ? 'Not Checked In' : todayAttendance.checkOut ? 'Completed' : 'Checked In'}
                </span>
              </div>
              {!todayAttendance ? (
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); handleQuickCheckIn(); }}
                  disabled={attendanceActionLoading}
                  className="w-full py-1.5 px-3 bg-blue-600 text-white rounded-lg font-bold text-xs"
                >
                  Check In
                </button>
              ) : !todayAttendance.checkOut ? (
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); handleQuickCheckOut(); }}
                  disabled={attendanceActionLoading}
                  className="w-full py-1.5 px-3 bg-emerald-600 text-white rounded-lg font-bold text-xs"
                >
                  Check Out
                </button>
              ) : null}
            </div>

            <nav className="flex-1 px-4 space-y-4 overflow-y-auto">
              {visibleGroups.map((group) => {
                const isExpanded = expandedGroups[group.id];
                return (
                  <div key={group.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-slate-350 transition-colors select-none text-left cursor-pointer focus:outline-none"
                    >
                      <span>{group.title}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="space-y-0.5 pl-1.5">
                        {group.items.map((item) => {
                          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              onClick={() => setSidebarOpen(false)}
                              href={item.path}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 pl-2.5 font-semibold'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                              }`}
                            >
                              <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 duration-200 ${isActive ? 'text-emerald-400' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>



            <div className="p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[var(--bg-card)] hover:bg-red-950/20 text-[var(--text-secondary)] hover:text-red-400 border border-[var(--border-color)] hover:border-red-900/30 transition-all font-semibold text-sm cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center justify-between px-6 z-10 relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-[var(--text-secondary)] hover:text-white focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {visibleGroups.flatMap(g => g.items).find((item) => pathname === item.path || pathname.startsWith(item.path + '/'))?.name || 'System Details'}
            </h2>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Santori Standings Top Bar Button */}
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              title="Santori Standings - View Team Leaderboard"
              className="py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 transition-all focus:outline-none cursor-pointer flex items-center gap-2 text-xs font-bold shadow-sm"
            >
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Santori Standings</span>
            </button>

            {/* Quick Attendance Check-in / Check-out Dropdown */}
            <div className="relative" ref={attendanceRef}>
              <button
                onClick={() => setAttendanceDropdownOpen(!attendanceDropdownOpen)}
                title="Daily Attendance Status"
                className="py-1.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-all relative focus:outline-none cursor-pointer flex items-center gap-2 text-xs font-semibold"
              >
                <Clock className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Attendance:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                  !todayAttendance 
                    ? 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]' 
                    : todayAttendance.checkOut 
                      ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/20' 
                      : 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/20 animate-pulse'
                }`}>
                  {!todayAttendance ? 'Pending' : todayAttendance.checkOut ? 'Completed' : 'Active'}
                </span>
              </button>

              {/* Attendance Dropdown Card */}
              {attendanceDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-4 space-y-3 animate-fade-in-down">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">Daily Attendance</span>
                    </div>
                  </div>

                  {todayAttendance ? (
                    <div className="text-[11px] text-slate-450 space-y-1 bg-[var(--bg-main)] p-2 rounded-lg border border-[var(--border-color)]">
                      <div className="flex justify-between">
                        <span>Check In Time:</span>
                        <span className="font-mono font-semibold text-[var(--text-primary)]">
                          {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {todayAttendance.checkOut ? (
                        <div className="flex justify-between">
                          <span>Check Out Time:</span>
                          <span className="font-mono font-semibold text-[var(--text-primary)]">
                            {new Date(todayAttendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span>Active duration:</span>
                          <span className="font-mono font-semibold text-emerald-500">
                            Active Now
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-450 py-1">
                      You haven't recorded attendance for today yet.
                    </p>
                  )}

                  {!todayAttendance ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickCheckIn();
                        setAttendanceDropdownOpen(false);
                      }}
                      disabled={attendanceActionLoading}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {attendanceActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                      <span>Check In Now</span>
                    </button>
                  ) : !todayAttendance.checkOut ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickCheckOut();
                        setAttendanceDropdownOpen(false);
                      }}
                      disabled={attendanceActionLoading}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {attendanceActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                      <span>Check Out Now</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-center text-emerald-450 font-semibold py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      Completed ({Math.floor((todayAttendance.workDurationMin || 0) / 60)}h {(todayAttendance.workDurationMin || 0) % 60}m)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dark/Light Mode Switcher Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer focus:outline-none"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-emerald-500" /> : <Moon className="w-4 h-4 text-emerald-500" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all relative focus:outline-none cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Card */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-down">
                  <div className="p-3 bg-[var(--bg-main)]/60 border-b border-[var(--border-color)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-emerald-500 hover:underline font-semibold cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Broadcast News Button for Admins */}
                    {isCurrentUserAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotifDropdownOpen(false);
                          setBroadcastModalOpen(true);
                        }}
                        className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Broadcast News to Employees</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-[var(--text-muted)] text-xs">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`p-4 hover:bg-[var(--bg-card)] dark:hover:bg-[var(--bg-card)] active:bg-slate-700/30 dark:active:bg-[var(--bg-card)] cursor-pointer transition-colors ${
                            !notif.isRead ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5">
                              {notif.type === 'meeting_booked' && <Calendar className="w-4 h-4 text-cyan-400" />}
                              {notif.type === 'sale_done' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                              {notif.type === 'unreachable_lead' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                              {['lead_assigned', 'order_submitted', 'order_verified', 'order_rejected'].includes(notif.type) && (
                                <ChevronRight className="w-4 h-4 text-emerald-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs text-white ${!notif.isRead ? 'font-bold' : 'font-medium'}`}>
                                {notif.title}
                              </p>
                              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-normal">
                                {notif.body}
                              </p>
                              <p className="text-[9px] text-[var(--text-muted)] mt-1">
                                {new Date(notif.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Brief Info */}
            <button
              onClick={handleOpenProfile}
              className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color-hover)] rounded-lg text-left cursor-pointer transition-all focus:outline-none"
            >
              {user.photograph ? (
                <img
                  src={`/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-emerald-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                <p className="text-[9px] text-[var(--text-secondary)] mt-1 leading-none capitalize">{user.role.includes(':') ? user.role.split(':')[1] : user.role}</p>
              </div>
            </button>
          </div>
        </header>

        {/* Page Content Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--bg-main)]">
          {children}
        </main>
      </div>

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-[var(--border-color)] transparent flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">My Profile Settings</h3>
              <button onClick={closeProfileModal} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="p-6 space-y-6">
                {updateError && (
                  <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs font-semibold">
                    {updateError}
                  </div>
                )}

                {/* Profile Picture Upload Section */}
                <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                  <div className="relative w-16 h-16 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                    {editPhotoPreviewUrl || editPhotoPath ? (
                      <img
                        src={editPhotoPreviewUrl || `/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--bg-card)] flex items-center justify-center text-emerald-500">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    {uploadingEditPhoto && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px]">Profile Photograph</span>
                    <input
                      type="file"
                      accept="image/*"
                      id="layout-edit-photo-input"
                      onChange={handleEditPhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="layout-edit-photo-input"
                      className="py-1.5 px-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color-hover)] text-[var(--text-primary)] rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit cursor-pointer transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>Change photo</span>
                    </label>
                  </div>
                </div>

                {/* Own Information Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Full Name</span>
                      {user.role === 'admin' || user.role.startsWith('admin:') ? (
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-white text-xs focus:ring-blue-500 focus:outline-none"
                        />
                      ) : (
                        <span className="text-white text-xs font-semibold block bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-2 rounded-lg opacity-70 truncate" title={user.name}>
                          {user.name}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Employee ID</span>
                      {user.role === 'admin' || user.role.startsWith('admin:') ? (
                        <input
                          type="text"
                          required
                          value={editEmployeeId}
                          onChange={(e) => setEditEmployeeId(e.target.value)}
                          className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-white text-xs focus:ring-blue-500 focus:outline-none font-mono"
                        />
                      ) : (
                        <span className="text-white text-xs font-mono block bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-2 rounded-lg opacity-70 truncate" title={user.employeeId || 'Not Set'}>
                          {user.employeeId || 'Not Set'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Email Address</span>
                      {user.role === 'admin' || user.role.startsWith('admin:') ? (
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-white text-xs focus:ring-blue-500 focus:outline-none font-mono"
                        />
                      ) : (
                        <span className="text-[var(--text-primary)] text-xs font-mono block bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-2 rounded-lg opacity-70 truncate" title={user.email}>
                          {user.email}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">System Role</span>
                      <span className="text-slate-355 text-xs block bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-2 rounded-lg capitalize opacity-70 truncate" title={user.role.includes(':') ? user.role.split(':')[1] : (roleLabels[user.role]?.label || user.role)}>
                        {user.role.includes(':') ? user.role.split(':')[1] : (roleLabels[user.role]?.label || user.role)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                      <span className="text-slate-355 text-xs block bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-2 rounded-lg opacity-70 truncate" title={calculateYearsInCompany(user.joiningDate)}>
                        {calculateYearsInCompany(user.joiningDate)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1">Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Update mobile number"
                      className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-white text-xs focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--border-color)] transparent flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeProfileModal}
                  className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {updatingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Personalized Login Today Alerts Modal */}
      {showTodayAlertModal && todayAlerts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-[var(--border-color)] transparent flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Flame className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Your Tasks Scheduled Today</h3>
                  <p className="text-[10px] text-[var(--text-secondary)]">You have {todayAlerts.length} personalized action item(s) today.</p>
                </div>
              </div>
              <button onClick={() => setShowTodayAlertModal(false)} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {todayAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex items-start gap-3 hover:border-[var(--border-color)] transition-colors"
                >
                  <div className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded shrink-0">
                    {alert.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white leading-snug">{alert.title}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1 truncate">{alert.detail}</p>
                  </div>
                  <Link
                    href={`/leads/${alert.leadId}`}
                    onClick={() => setShowTodayAlertModal(false)}
                    className="text-[10px] text-emerald-500 hover:text-emerald-500 font-bold self-center px-2 py-1 rounded hover:bg-[var(--bg-card)] transition-colors"
                  >
                    View Lead
                  </Link>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-[var(--border-color)] transparent flex justify-end">
              <button
                type="button"
                onClick={() => setShowTodayAlertModal(false)}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md cursor-pointer"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-xl shadow-2xl border pointer-events-auto flex items-start gap-3 animate-slide-in-right transition-all bg-[var(--bg-card)] border-[var(--border-color)] backdrop-blur-md"
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-emerald-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white leading-normal">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="shrink-0 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-[var(--border-color)] transparent flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Confirm Action</h3>
              <button
                onClick={() => {
                  confirmModal.onCancel();
                  setConfirmModal(null);
                }}
                className="text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onCancel();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-[var(--border-color-hover)] rounded-lg text-[var(--text-primary)] hover:text-white transition-all font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white font-bold rounded-lg transition-all text-xs cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-5 border-b border-[var(--border-color)] transparent flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Logout Confirmation</h3>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium">
                Are you sure you want to log out of the company portal?
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-[var(--border-color-hover)] rounded-lg text-[var(--text-primary)] hover:text-white transition-all font-semibold text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white font-bold rounded-lg transition-all text-[11px] cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Slide Drawer */}
      <LeaderboardDrawer isOpen={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />

      {/* Broadcast News Modal */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Broadcast News to Employees</span>
              </h3>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBroadcastNews} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider block mb-1">
                  News Title / Headline
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Holiday Notice, Policy Update..."
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-[var(--accent-color)] rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider block mb-1">
                  Announcement Message
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter complete news details to notify all active employees..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-[var(--accent-color)] rounded-lg px-3 py-2 text-white text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {broadcasting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Send to All Employees</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
