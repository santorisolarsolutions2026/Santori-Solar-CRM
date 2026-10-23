'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Trash2,
  Laptop,
  Smartphone,
  Globe,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import Link from 'next/link';
import LeaderboardDrawer from '@/components/LeaderboardDrawer';
import BroadcastDrawer from '@/components/BroadcastDrawer';
import { parseBroadcastBody } from '@/lib/broadcastUtils';

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
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const c = sessionStorage.getItem('cached_notifications_data');
        if (c) return JSON.parse(c).notifications || [];
      }
    } catch {}
    return [];
  });
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined') {
        const c = sessionStorage.getItem('cached_notifications_data');
        if (c) return JSON.parse(c).unreadCount || 0;
      }
    } catch {}
    return 0;
  });
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [todayAlerts, setTodayAlerts] = useState<any[]>([]);
  const [showTodayAlertModal, setShowTodayAlertModal] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [topPerformers, setTopPerformers] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const c = sessionStorage.getItem('cached_top_performers');
        if (c) {
          const parsed = JSON.parse(c);
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) return parsed.data || [];
        }
      }
    } catch {}
    return [];
  });

  // Broadcast News drawer state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);

  const handleDeleteBroadcast = (notifId: number) => {
    setConfirmModal({
      message: 'Are you sure you want to delete this broadcast message for all employees?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/notifications?id=${notifId}`, {
            method: 'DELETE',
          });
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success) {
              fetchNotifications();
              setToasts((prev) => [...prev, { id: Date.now().toString(), message: data.message || 'Broadcast message deleted successfully!', type: 'success' }]);
            } else {
              alert(data.message || 'Failed to delete broadcast message.');
            }
          }
        } catch {
          alert('Failed to delete broadcast message. Please try again.');
        }
      },
      onCancel: () => { },
    });
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
        onCancel: onCancel || (() => { }),
      });
    };
  }, []);

  // Initialize theme from localStorage on mount (defaults to dark if not set)
  useEffect(() => {
    const savedTheme = localStorage.getItem('solar-crm-theme') as 'dark' | 'light' | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  // Synchronize document.documentElement class and localStorage whenever theme changes
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('solar-crm-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Global click listener for date and time inputs to open showPicker() on click
  useEffect(() => {
    const handleInputClick = (e: MouseEvent) => {
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
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success && data.data && data.data.length > 0) {
              setTodayAlerts(data.data);
              setShowTodayAlertModal(true);
            }
          }
          sessionStorage.setItem('solar-crm-login-notified', 'true');
        } catch (err) {
          console.error('Failed to fetch login alerts:', err);
        }
      };
      fetchAlerts();
    }
  }, [user]);

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
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [killingSessionId, setKillingSessionId] = useState<number | null>(null);

  const fetchMySessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('/api/v1/auth/sessions');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setUserSessions(data.data);
        }
      }
    } catch {
      // Suppress network disconnect logs during local dev server restarts
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleKillSession = async (sessionId: number, isCurrent = false) => {
    try {
      setKillingSessionId(sessionId);
      const res = await fetch(`/api/v1/auth/sessions?id=${sessionId}`, {
        method: 'DELETE',
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setUserSessions((prev) => prev.filter((s) => s.id !== sessionId));
          addToast(data.message || 'Session killed successfully.', 'success');
          if (isCurrent) {
            logout();
          }
        } else {
          alert(data.message || 'Failed to kill session.');
        }
      }
    } catch {
      alert('Failed to kill session.');
    } finally {
      setKillingSessionId(null);
    }
  };

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
    fetchMySessions();
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
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
        if (data.data.recentBroadcasts) {
          setRecentBroadcasts(data.data.recentBroadcasts);
        }
        try {
          sessionStorage.setItem('cached_notifications_data', JSON.stringify({
            notifications: data.data.notifications,
            unreadCount: data.data.unreadCount,
            recentBroadcasts: data.data.recentBroadcasts || [],
            timestamp: Date.now()
          }));
        } catch {}
      }
    } catch {
      // Suppress network disconnect logs during local dev server restarts
    }
  };

  // Attendance states
  const [todayAttendance, setTodayAttendance] = useState<any>(() => {
    try {
      if (typeof window !== 'undefined') {
        const c = sessionStorage.getItem('cached_today_attendance');
        if (c) {
          const parsed = JSON.parse(c);
          if (Date.now() - parsed.timestamp < 3 * 60 * 1000) return parsed.data;
        }
      }
    } catch {}
    return null;
  });
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);

  const fetchTodayAttendance = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/v1/attendance/today');
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.data);
        try {
          sessionStorage.setItem('cached_today_attendance', JSON.stringify({
            data: data.data,
            timestamp: Date.now()
          }));
        } catch {}
      }
    } catch {
      // Suppress network disconnect logs during local dev server restarts
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
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setTodayAttendance(data.data);
          alert(data.message);
        } else {
          alert(data.message || 'Check-in failed');
        }
      } else {
        alert('Check-in failed. Please try again.');
      }
    } catch {
      alert('Check-in failed. Please try again.');
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
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success) {
              setTodayAttendance(data.data);
              alert(data.message);
            } else {
              alert(data.message || 'Check-out failed');
            }
          } else {
            alert('Check-out failed. Please try again.');
          }
        } catch {
          alert('Check-out failed. Please try again.');
        } finally {
          setAttendanceActionLoading(false);
        }
      },
      onCancel: () => { },
    });
  };
  const fetchTopPerformers = async () => {
    try {
      const res = await fetch('/api/v1/leaderboard?timeframe=month&department=all');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.data) {
          const performers = data.data.slice(0, 3);
          setTopPerformers(performers);
          try {
            sessionStorage.setItem('cached_top_performers', JSON.stringify({
              data: performers,
              timestamp: Date.now()
            }));
          } catch {}
        }
      }
    } catch {
      // Suppress network disconnect logs during local dev server restarts
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchTodayAttendance();
      fetchTopPerformers();

      // Smart Polling: Skip when document is hidden (user switched tabs or minimized browser)
      const pollNotifications = () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchNotifications();
      };

      const pollLeaderboard = () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchTopPerformers();
      };

      // Poll notifications every 60s, and leaderboard every 180s (3 mins) when tab is active
      const interval = setInterval(pollNotifications, 60000);
      const leaderboardInterval = setInterval(pollLeaderboard, 180000);

      // Instantly refresh notifications when user switches back to this tab
      const handleVisibilityChange = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchNotifications();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        clearInterval(leaderboardInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      if (notif.type === 'announcement' || notif.title.startsWith('📢')) {
        setBroadcastModalOpen(true);
        return;
      }
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
          <div className="relative flex items-center justify-center">
            {/* Ambient glow matching Pic 2 gradient */}
            <div
              className="absolute -inset-1.5 rounded-full blur-md opacity-40 animate-pulse pointer-events-none"
              style={{
                background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)',
              }}
            />
            {/* Round circular loader with Pic 2 gradient background */}
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl border border-white/25"
              style={{
                background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)',
              }}
            >
              <div className="w-13 h-13 rounded-full bg-white/20 border border-white/30 backdrop-blur-xs flex items-center justify-center shadow-inner">
                <Sun className="w-7 h-7 text-white animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-semibold tracking-wider uppercase">Loading SolarCRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      window.location.href = '/login';
    }
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
      <aside
        style={{ backgroundColor: theme === 'dark' ? '#8BBB92' : '#091413' }}
        className={`hidden md:flex flex-col border-r border-[var(--border-color)] shadow-xl transition-all duration-250 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        <div className="h-16 flex items-center justify-between px-3 border-b border-[var(--border-color)] relative">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 flex-shrink-0 bg-white border border-white/20 rounded-lg flex items-center justify-center overflow-hidden p-0.5 shadow-md shadow-black/20">
                <img
                  src="/logo.png"
                  alt="Santori Solar CRM Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span
                className="santori-brand-text text-[15px] font-bold tracking-tight truncate select-none"
                style={{
                  background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Santori Solar CRM
              </span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center justify-center w-full">
              <div className="w-8 h-8 bg-white border border-white/20 rounded-lg flex items-center justify-center overflow-hidden p-0.5">
                <img src="/logo.png" alt="Santori Solar CRM Logo" className="w-full h-full object-contain" />
              </div>
            </Link>
          )}
          <button
            onClick={toggleSidebarCollapsed}
            className={`sidebar-toggle-btn flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-transparent border-0 text-slate-400 hover:text-white hover:bg-white/5 transition-all focus:outline-none cursor-pointer ${sidebarCollapsed ? 'ml-auto mr-0' : 'ml-2'}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className={`flex-1 overflow-y-auto space-y-4 ${sidebarCollapsed ? 'px-2' : 'px-3.5'} pt-4 pb-2`}>
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
                          className={`sidebar-nav-item flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-150 ${isActive
                              ? 'sidebar-nav-active bg-white/[0.08] text-emerald-400 shadow-xs'
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                            }`}
                        >
                          <Icon className={`w-[18px] h-[18px] transition-colors duration-150 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  isExpanded && (
                    <div className="space-y-1 pl-1">
                      {group.items.map((item) => {
                        const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`sidebar-nav-item flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group select-none ${isActive
                                ? 'sidebar-nav-active bg-white/[0.08] text-emerald-400 shadow-xs font-semibold'
                                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                              }`}
                          >
                            <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-150 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                            <span className={isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 group-hover:text-white'}>{item.name}</span>
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



        {/* Territory Map Widget (Admin & Sales Management) */}
        {(user?.role === 'admin' || user?.role === 'director' || user?.role === 'sales_head' || (user?.role === 'manager' && (user?.department?.name === 'Sales' || !user?.department?.name)) || user?.department?.name === 'IT' || hasPermission('sales:lead_assign')) && (
          <div className={`border-t border-[var(--border-color)] ${sidebarCollapsed ? 'p-2' : 'px-3 py-2.5'}`}>
            {sidebarCollapsed ? (
              <Link
                href="/leads-map"
                title="Territory Map (Admin Reference)"
                style={{
                  background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)',
                }}
                className={`w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-all border border-white/20 shadow-sm ${
                  pathname === '/leads-map' ? 'ring-2 ring-white/50' : 'hover:brightness-110'
                }`}
              >
                <Globe className="w-4 h-4 text-white" />
              </Link>
            ) : (
              <Link
                href="/leads-map"
                style={{
                  background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)',
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl transition-all border shadow-sm ${
                  pathname === '/leads-map'
                    ? 'ring-2 ring-white/50 border-white/30'
                    : 'border-white/20 hover:border-white/30 hover:brightness-105'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-white/20 border border-white/25 text-white shrink-0 backdrop-blur-xs">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white drop-shadow-xs">
                      Territory Map
                    </div>
                    <div className="text-[10px] text-white/90 truncate font-medium drop-shadow-xs">
                      Geo Distribution & Insights
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:text-white transition-all shrink-0" />
              </Link>
            )}
          </div>
        )}

        {/* Logout */}
        <div className={`border-t border-[var(--border-color)] ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            title="Logout"
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1c2128] hover:bg-[#2d333b] text-slate-200 hover:text-white border border-slate-800/80 transition-all font-semibold text-xs cursor-pointer shadow-sm ${sidebarCollapsed ? 'w-10 mx-auto px-0' : 'w-full px-4'
              }`}
          >
            <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
            {!sidebarCollapsed && <span className="font-semibold tracking-wide">Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Nav Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div
            style={{ backgroundColor: theme === 'dark' ? '#8BBB92' : '#091413' }}
            className="relative w-64 max-w-xs flex flex-col h-full shadow-2xl animate-slide-in"
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-color)]">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
                <div className="w-8 h-8 bg-white border border-white/20 rounded-lg flex items-center justify-center overflow-hidden p-0.5 shadow-md shadow-black/20">
                  <img
                    src="/logo.png"
                    alt="Santori Solar CRM Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span
                  className="santori-brand-text text-[15px] font-bold tracking-tight select-none"
                  style={{
                    background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Santori Solar CRM
                </span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-[var(--text-secondary)] hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>



            {/* Quick Attendance Mobile Widget */}
            <div className="mx-4 mb-4 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#4A943E]" /> Attendance
                </span>
                <span className="text-[9px] font-bold text-[#4A943E] uppercase">
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
                  className="w-full py-1.5 px-3 bg-[#4A943E] hover:bg-[#3E7D34] text-white rounded-lg font-bold text-xs"
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
                      <div className="space-y-1 pl-1 animate-fade-in-down">
                        {group.items.map((item) => {
                          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              onClick={() => setSidebarOpen(false)}
                              href={item.path}
                              className={`sidebar-nav-item flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group select-none ${isActive
                                  ? 'sidebar-nav-active bg-white/[0.08] text-emerald-400 shadow-xs font-semibold'
                                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                }`}
                            >
                              <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-150 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                              <span className={isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 group-hover:text-white'}>{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>



            {/* Territory Map Widget (Mobile - Admin & Sales Management) */}
            {(user?.role === 'admin' || user?.role === 'director' || user?.role === 'sales_head' || (user?.role === 'manager' && (user?.department?.name === 'Sales' || !user?.department?.name)) || user?.department?.name === 'IT' || hasPermission('sales:lead_assign')) && (
              <div className="px-4 py-2 border-t border-[var(--border-color)]">
                <Link
                  href="/leads-map"
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)',
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl transition-all border shadow-sm ${
                    pathname === '/leads-map'
                      ? 'ring-2 ring-white/50 border-white/30'
                      : 'border-white/20 hover:border-white/30 hover:brightness-105'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-white/20 border border-white/25 text-white shrink-0 backdrop-blur-xs">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white drop-shadow-xs">
                        Territory Map
                      </div>
                      <div className="text-[10px] text-white/90 truncate font-medium drop-shadow-xs">
                        Geo Distribution & Insights
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:text-white transition-all shrink-0" />
                </Link>
              </div>
            )}

            <div className="p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#1c2128] hover:bg-[#2d333b] text-slate-200 hover:text-white border border-slate-800/80 transition-all font-semibold text-xs cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center justify-between px-6 z-30 relative">
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
            <style>{`
              #santori-standings-top-btn,
              .dark #santori-standings-top-btn,
              .light #santori-standings-top-btn,
              header #santori-standings-top-btn,
              .dark header #santori-standings-top-btn,
              .dark button[title*="Santori Standings"],
              button[title*="Santori Standings"] {
                background-color: #4A943E !important;
                background: #4A943E !important;
                border-color: #4A943E !important;
                color: #FFFFFF !important;
              }
              #santori-standings-top-btn:hover,
              .dark #santori-standings-top-btn:hover,
              .dark button[title*="Santori Standings"]:hover {
                background-color: #3E7D34 !important;
                background: #3E7D34 !important;
                border-color: #3E7D34 !important;
                filter: none !important;
              }
              #santori-standings-top-btn *,
              #santori-standings-top-btn span,
              #santori-standings-top-btn svg,
              .dark #santori-standings-top-btn *,
              .dark #santori-standings-top-btn span,
              .dark #santori-standings-top-btn svg,
              .dark button[title*="Santori Standings"] *,
              .dark button[title*="Santori Standings"] span,
              .dark button[title*="Santori Standings"] svg {
                color: #FFFFFF !important;
                stroke: #FFFFFF !important;
                -webkit-text-fill-color: #FFFFFF !important;
              }
            `}</style>
            <button
              id="santori-standings-top-btn"
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              title="Santori Standings - View Team Leaderboard"
              style={{
                backgroundColor: '#4A943E',
                borderColor: '#4A943E',
                color: '#FFFFFF',
              }}
              className="py-1.5 px-3 rounded-lg border border-[#4A943E] bg-[#4A943E] hover:bg-[#3E7D34] text-white transition-all focus:outline-none cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs group"
            >
              <Trophy
                className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform text-white"
                style={{
                  color: '#FFFFFF',
                  stroke: '#FFFFFF',
                }}
              />
              <span
                className="hidden sm:inline font-bold text-white"
                style={{
                  color: '#FFFFFF',
                }}
              >
                Santori Standings
              </span>
            </button>

            {/* Quick Attendance Check-in / Check-out Dropdown */}
            <div className="relative" ref={attendanceRef}>
              <button
                onClick={() => {
                  setAttendanceDropdownOpen(!attendanceDropdownOpen);
                  setNotifDropdownOpen(false);
                }}
                title="Daily Attendance Status"
                className={`py-1.5 px-3 rounded-lg bg-transparent border ${
                  theme === 'dark' ? 'border-[#8BBB92] hover:bg-[#8BBB92]/10' : 'border-[#091413] hover:bg-[#091413]/5'
                } text-[var(--text-primary)] transition-all relative focus:outline-none cursor-pointer flex items-center gap-2 text-xs font-semibold`}
              >
                <Clock className={`w-4 h-4 shrink-0 ${theme === 'dark' ? 'text-[#8BBB92]' : 'text-[#091413]'}`} />
                <span className="hidden sm:inline font-semibold">Attendance:</span>
                <span
                  style={
                    todayAttendance
                      ? { backgroundColor: '#6FAF4F', color: '#000000', borderColor: '#6FAF4F' }
                      : undefined
                  }
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border ${!todayAttendance
                    ? theme === 'dark'
                      ? 'bg-[#8BBB92]/20 text-[#8BBB92] border-[#8BBB92]/40'
                      : 'bg-[#091413]/10 text-[#091413] border-[#091413]/30'
                    : 'bg-[#6FAF4F] text-black border-[#6FAF4F] attendance-active-badge'
                  }`}>
                  {!todayAttendance ? 'Pending' : todayAttendance.checkOut ? 'Completed' : 'Active'}
                </span>
              </button>

              {/* Attendance Dropdown Card */}
              {attendanceDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-4 space-y-3 animate-fade-in-down">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#4A943E]" />
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
                          <span className="font-mono font-semibold text-[#4A943E]">
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
                      className="w-full py-2 px-3 bg-[#4A943E] hover:bg-[#3E7D34] text-white rounded-lg font-bold text-xs shadow-md shadow-[#4A943E]/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
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
                      className="w-full py-2 px-3 bg-[#4A943E] hover:bg-[#3E7D34] text-white rounded-lg font-bold text-xs shadow-md shadow-[#4A943E]/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {attendanceActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                      <span>Check Out Now</span>
                    </button>
                  ) : (
                    <div 
                      className="text-[11px] text-center font-bold py-1.5 bg-[#4A943E]/15 border border-[#4A943E]/40 text-[#4A943E] rounded-lg transition-all"
                      style={{ color: '#4A943E' }}
                    >
                      Completed ({Math.floor((todayAttendance.workDurationMin || 0) / 60)}h {(todayAttendance.workDurationMin || 0) % 60}m)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dark/Light Mode Switcher Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg bg-transparent border ${
                theme === 'dark' ? 'border-[#8BBB92] hover:bg-[#8BBB92]/10 text-[#8BBB92]' : 'border-[#091413] hover:bg-[#091413]/5 text-[#091413]'
              } transition-all cursor-pointer focus:outline-none`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#8BBB92]" />
              ) : (
                <Moon className="w-4 h-4 text-[#091413]" />
              )}
            </button>

            {/* Broadcast Announcements Live Button */}
            <button
              type="button"
              onClick={() => {
                setBroadcastModalOpen(true);
                setNotifDropdownOpen(false);
                setAttendanceDropdownOpen(false);
              }}
              className={`p-2 rounded-lg bg-transparent border ${
                theme === 'dark' ? 'border-[#8BBB92] hover:bg-[#8BBB92]/10 text-[#8BBB92]' : 'border-[#091413] hover:bg-[#091413]/5 text-[#091413]'
              } transition-all cursor-pointer focus:outline-none relative`}
              title="Team Broadcast & Announcements"
            >
              <Radio className={`w-4 h-4 ${theme === 'dark' ? 'text-[#8BBB92]' : 'text-[#091413]'}`} />
              {recentBroadcasts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#4F7D32] animate-pulse" />
              )}
            </button>



            {/* Profile Brief Info */}
            <button
              onClick={handleOpenProfile}
              className={`hidden sm:flex items-center gap-3 px-3 py-1.5 bg-transparent border ${
                theme === 'dark' ? 'border-[#8BBB92] hover:bg-[#8BBB92]/10' : 'border-[#091413] hover:bg-[#091413]/5'
              } rounded-lg text-left cursor-pointer transition-all focus:outline-none`}
            >
              {user.photograph ? (
                <img
                  src={`/api/v1/users/${user.id}/photograph`}
                  alt={user.name}
                  className={`w-8 h-8 rounded-full object-cover border ${theme === 'dark' ? 'border-[#8BBB92]' : 'border-[#091413]'}`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className={`w-8 h-8 rounded-full ${
                  theme === 'dark' ? 'bg-[#8BBB92]/20 border border-[#8BBB92] text-[#8BBB92]' : 'bg-[#091413]/10 border border-[#091413] text-[#091413]'
                } flex items-center justify-center shrink-0`}>
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-[var(--text-primary)] leading-none">{user.name}</p>
                <p className="text-[9px] text-[var(--text-secondary)] mt-1 leading-none capitalize">{user.role.includes(':') ? user.role.split(':')[1] : user.role}</p>
              </div>
            </button>
          </div>
        </header>

        {/* Page Content Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--bg-main)] relative overflow-x-hidden">
          {/* Aurora Glow Backdrops */}
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.04] blur-[130px] pointer-events-none z-0 animate-aurora-1" />
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[450px] h-[450px] rounded-full bg-teal-500/[0.015] blur-[140px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-15%] right-[-15%] w-[600px] h-[600px] rounded-full bg-emerald-600/[0.02] blur-[150px] pointer-events-none z-0 animate-aurora-2" />

          <div key={pathname} className="relative z-10 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--border-color)] transparent flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">My Profile Settings</h3>
              <button onClick={closeProfileModal} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                        src={editPhotoPreviewUrl || `/api/v1/users/${user.id}/photograph`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--bg-card)] flex items-center justify-center text-[#4F7D32]">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    {uploadingEditPhoto && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-[#4F7D32] animate-spin" />
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

                {/* Active Login Sessions Section */}
                <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#4F7D32]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                          Active Login Sessions ({userSessions.length} / 3)
                        </h4>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        Max 3 simultaneous logins allowed across devices & browsers.
                      </p>
                    </div>
                    {loadingSessions && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F7D32]" />}
                  </div>

                  <div className="space-y-2">
                    {userSessions.length === 0 && !loadingSessions && (
                      <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
                        No registered active sessions found.
                      </div>
                    )}

                    {userSessions.map((s) => {
                      const isMobile = s.deviceInfo?.toLowerCase().includes('mobile') || s.deviceInfo?.toLowerCase().includes('android') || s.deviceInfo?.toLowerCase().includes('iphone');
                      return (
                        <div
                          key={s.id}
                          className="p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl flex items-center justify-between gap-3 hover:border-[var(--border-color-hover)] transition-all"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 mt-0.5">
                              {isMobile ? <Smartphone className="w-4 h-4 text-[#4F7D32]" /> : <Laptop className="w-4 h-4 text-[#4F7D32]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white truncate">
                                  {s.deviceInfo || 'Unknown Browser / Device'}
                                </span>
                                {s.isCurrentSession && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#4F7D32]/10 text-[#4F7D32] border border-[#4F7D32]/20 rounded">
                                    Current Device
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] mt-1 flex-wrap">
                                <span className="flex items-center gap-1 truncate">
                                  <Globe className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                                  <span>{s.location || 'Unknown Location'}</span>
                                </span>
                                <span className="flex items-center gap-1 font-mono text-[9px] text-[var(--text-muted)]">
                                  <Clock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                                  <span>
                                    {new Date(s.createdAt).toLocaleString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={killingSessionId === s.id}
                            onClick={() => handleKillSession(s.id, s.isCurrentSession)}
                            className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                            title={s.isCurrentSession ? 'Kill this session and log out' : 'Kill this session'}
                          >
                            {killingSessionId === s.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span>Kill Session</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--border-color)] transparent flex justify-end gap-3 shrink-0">
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
                  className="py-2 px-5 bg-[#4F7D32] hover:bg-[#436A2B] text-white rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
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
                <div className="w-8 h-8 rounded-xl bg-[#4F7D32]/10 border border-[#4F7D32]/25 flex items-center justify-center text-[#4F7D32]">
                  <Flame className="w-4.5 h-4.5 text-[#4F7D32]" />
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
                  <div className="text-xs font-mono font-bold text-[#4F7D32] bg-[#4F7D32]/10 border border-[#4F7D32]/25 px-2 py-1 rounded shrink-0">
                    {alert.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white leading-snug">{alert.title}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1 truncate">{alert.detail}</p>
                  </div>
                  <Link
                    href={`/leads/${alert.leadId}`}
                    onClick={() => setShowTodayAlertModal(false)}
                    className="text-[10px] text-[#4F7D32] hover:text-[#4F7D32] hover:opacity-80 font-bold self-center px-2 py-1 rounded hover:bg-[var(--bg-card)] transition-colors"
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
                className="py-2 px-5 bg-[#4F7D32] hover:bg-[#436A2B] text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
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
            className="toast-card p-4 rounded-xl shadow-2xl border pointer-events-auto flex items-start gap-3 animate-slide-in-right transition-all"
            style={{
              backgroundColor: theme === 'dark' ? '#161B22' : '#FFFFFF',
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
              boxShadow: theme === 'dark' ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-[#4F7D32]" style={{ color: '#4F7D32' }} />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[#4F7D32]" style={{ color: '#4F7D32' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="text-xs font-semibold leading-normal text-white-force"
                style={{ color: theme === 'dark' ? '#F0F6FC' : '#111827' }}
              >
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="shrink-0 transition-colors cursor-pointer"
              style={{ color: theme === 'dark' ? '#8B949E' : '#64748B' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Confirm Modal */}
      {confirmModal &&
        (mounted
          ? createPortal(
              <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/75 backdrop-blur-md px-4 font-sans animate-fade-in">
                <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                  <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
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
                        className="px-4 py-2 bg-[#4F7D32] hover:bg-[#436A2B] text-white font-bold rounded-lg transition-all text-xs cursor-pointer shadow-md shadow-[#4F7D32]/20 font-sans"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null)}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm &&
        (mounted
          ? createPortal(
              <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/75 backdrop-blur-md px-4 font-sans animate-fade-in">
                <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden animate-fade-in-up">
                  <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Logout Confirmation</h3>
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
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
                        className="px-4 py-2 bg-[var(--bg-main)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] transition-all font-semibold text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLogoutConfirm(false);
                          logout();
                        }}
                        className="px-4 py-2 bg-[#4F7D32] hover:bg-[#436A2B] text-white font-bold rounded-lg transition-all text-[11px] cursor-pointer shadow-md shadow-[#4F7D32]/20"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null)}

      {/* Leaderboard Slide Drawer */}
      <LeaderboardDrawer isOpen={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />

      {/* Broadcast News Slide Drawer (Chat style) */}
      <BroadcastDrawer
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        isCurrentUserAdmin={isCurrentUserAdmin}
        recentBroadcasts={recentBroadcasts}
        onBroadcastSent={() => {
          fetchNotifications();
          setToasts((prev) => [
            ...prev,
            { id: Date.now().toString(), message: 'News broadcast sent to all employees!', type: 'success' },
          ]);
        }}
        onDeleteBroadcast={handleDeleteBroadcast}
      />
    </div>
  );
}
