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
  TrendingUp,
  Upload,
  Loader2,
  User,
  Clock,
  CreditCard,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoPath, setEditPhotoPath] = useState('');
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [editPhotoPreviewUrl, setEditPhotoPreviewUrl] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const handleOpenProfile = () => {
    if (!user) return;
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

    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    if (!confirm('Are you sure you want to Check Out for today?')) return;
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
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchTodayAttendance();
      // Poll notifications every 20 seconds
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
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
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Sun className="w-12 h-12 text-amber-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Loading SolarCRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Sidebar navigation configuration based on permission keys
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      permission: null, // always visible
    },
    {
      name: 'Leads Pipeline',
      path: '/leads',
      icon: Layers,
      permission: 'leads:view',
    },
    {
      name: 'Finance and Payments',
      path: '/finance',
      icon: CreditCard,
      permission: 'orders:view',
    },
    {
      name: 'Operations',
      path: '/operations',
      icon: Wrench,
      permission: 'orders:view',
    },
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
      permission: 'team:view',
    },
    {
      name: 'Report & Analytics',
      path: '/reports',
      icon: LineChart,
      permission: 'reports:view',
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    director: { label: 'Director', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    sales_head: { label: 'Sales Head', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    finance: { label: 'Finance Manager', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    operations: { label: 'Operations Manager', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    psa_tl: { label: 'PSA Team Leader', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    psa: { label: 'PSA Consultant', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    tl: { label: 'Sales Team Leader', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    consultant: { label: 'Sales Consultant', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };

  const userRoleConfig = user.role.includes(':')
    ? { label: user.role.split(':')[1], color: roleLabels[user.role.split(':')[0]]?.color || 'bg-slate-500/10 text-slate-400' }
    : roleLabels[user.role] || { label: user.role, color: 'bg-slate-500/10 text-slate-400' };

  return (
    <div className="flex h-screen bg-[#090b11] text-slate-100 overflow-hidden">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#111625] border-r border-slate-800 shadow-xl">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-lg flex items-center justify-center shadow-md shadow-amber-500/10">
              <Sun className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-wide">
              Solar<span className="text-amber-400">CRM</span>
            </span>
          </Link>
        </div>

        {/* User Card */}
        <button
          onClick={handleOpenProfile}
          className="p-4 mx-4 my-6 bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-xl text-left cursor-pointer transition-all block w-[calc(100%-2rem)] focus:outline-none"
        >
          <div className="flex items-center gap-3">
            {user.photograph ? (
              <img
                src={`/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-850"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate mb-2">{user.email}</p>
            </div>
          </div>
          <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full mt-1 ${userRoleConfig.color}`}>
            {userRoleConfig.label}
          </span>
        </button>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/10 to-transparent text-amber-400 border-l-2 border-amber-500 pl-3.5'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 duration-200 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900/60 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/30 transition-all font-semibold text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Nav Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="relative w-64 max-w-xs bg-[#111625] flex flex-col h-full shadow-2xl animate-slide-in">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
              <span className="text-xl font-extrabold text-white tracking-wide">
                Solar<span className="text-amber-400">CRM</span>
              </span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={() => {
                setSidebarOpen(false);
                handleOpenProfile();
              }}
              className="p-4 mx-4 my-6 bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-xl text-left cursor-pointer transition-all block w-[calc(100%-2rem)] focus:outline-none"
            >
              <div className="flex items-center gap-3">
                {user.photograph ? (
                  <img
                    src={`/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-850"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-400 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate mb-2">{user.email}</p>
                </div>
              </div>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full mt-1 ${userRoleConfig.color}`}>
                {userRoleConfig.label}
              </span>
            </button>

            {/* Quick Attendance Mobile Widget */}
            <div className="mx-4 mb-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Attendance
                </span>
                <span className="text-[9px] font-bold text-amber-400 uppercase">
                  {!todayAttendance ? 'Not Checked In' : todayAttendance.checkOut ? 'Completed' : 'Checked In'}
                </span>
              </div>
              {!todayAttendance ? (
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); handleQuickCheckIn(); }}
                  disabled={attendanceActionLoading}
                  className="w-full py-1.5 px-3 bg-amber-500 text-slate-950 rounded-lg font-bold text-xs"
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

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
              {filteredMenuItems.map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500/10 to-transparent text-amber-400 border-l-2 border-amber-500'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900/60 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/30 transition-all font-semibold text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#111625] border-b border-slate-800 flex items-center justify-between px-6 z-10 relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-white focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {filteredMenuItems.find((item) => pathname === item.path || pathname.startsWith(item.path + '/'))?.name || 'System Details'}
            </h2>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Quick Attendance Check-in / Check-out Dropdown */}
            <div className="relative" ref={attendanceRef}>
              <button
                onClick={() => setAttendanceDropdownOpen(!attendanceDropdownOpen)}
                title="Daily Attendance Status"
                className="py-1.5 px-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all relative focus:outline-none cursor-pointer flex items-center gap-2 text-xs font-semibold"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Attendance:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                  !todayAttendance 
                    ? 'bg-slate-800 text-slate-400 border-slate-700' 
                    : todayAttendance.checkOut 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                }`}>
                  {!todayAttendance ? '⚪ Pending' : todayAttendance.checkOut ? '✅ Completed' : '🟢 Active'}
                </span>
              </button>

              {/* Attendance Dropdown Card */}
              {attendanceDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-[#111625] border border-slate-800 rounded-xl shadow-2xl z-50 p-4 space-y-3 animate-fade-in-down">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-200">Daily Attendance</span>
                    </div>
                  </div>

                  {todayAttendance ? (
                    <div className="text-[11px] text-slate-450 space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                      <div className="flex justify-between">
                        <span>Check In Time:</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {todayAttendance.checkOut ? (
                        <div className="flex justify-between">
                          <span>Check Out Time:</span>
                          <span className="font-mono font-semibold text-slate-200">
                            {new Date(todayAttendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span>Active duration:</span>
                          <span className="font-mono font-semibold text-amber-450">
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
                      className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
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
                      className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {attendanceActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                      <span>Check Out Now</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-center text-emerald-450 font-semibold py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      ✓ Completed ({Math.floor((todayAttendance.workDurationMin || 0) / 60)}h {(todayAttendance.workDurationMin || 0) % 60}m)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all relative focus:outline-none cursor-pointer flex items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-500" />
              )}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all relative focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white font-extrabold text-[9px] flex items-center justify-center shadow-lg border border-slate-900 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#111625] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-down">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
                    <span className="text-xs font-bold text-white tracking-wider uppercase">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`p-4 hover:bg-slate-900/60 cursor-pointer transition-colors ${
                            !notif.isRead ? 'bg-amber-500/[0.03]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5">
                              {notif.type === 'meeting_booked' && <Calendar className="w-4 h-4 text-cyan-400" />}
                              {notif.type === 'sale_done' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                              {notif.type === 'unreachable_lead' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                              {['lead_assigned', 'order_submitted', 'order_verified', 'order_rejected'].includes(notif.type) && (
                                <ChevronRight className="w-4 h-4 text-amber-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs text-white ${!notif.isRead ? 'font-bold' : 'font-medium'}`}>
                                {notif.title}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                {notif.body}
                              </p>
                              <p className="text-[9px] text-slate-500 mt-1">
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
              className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-900/40 border border-slate-800/50 hover:border-slate-700 rounded-lg text-left cursor-pointer transition-all focus:outline-none"
            >
              {user.photograph ? (
                <img
                  src={`/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-850"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-400 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                <p className="text-[9px] text-slate-400 mt-1 leading-none capitalize">{user.role.includes(':') ? user.role.split(':')[1] : user.role}</p>
              </div>
            </button>
          </div>
        </header>

        {/* Page Content Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#090b11]">
          {children}
        </main>
      </div>

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">My Profile Settings</h3>
              <button onClick={closeProfileModal} className="text-slate-400 hover:text-white cursor-pointer">
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
                <div className="flex items-center gap-4 p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
                  <div className="relative w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                    {editPhotoPreviewUrl || editPhotoPath ? (
                      <img
                        src={editPhotoPreviewUrl || `/api/v1/users/${user.id}/photograph?t=${Date.now()}`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-amber-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    {uploadingEditPhoto && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Profile Photograph</span>
                    <input
                      type="file"
                      accept="image/*"
                      id="layout-edit-photo-input"
                      onChange={handleEditPhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="layout-edit-photo-input"
                      className="py-1.5 px-3 bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit cursor-pointer transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Change photo</span>
                    </label>
                  </div>
                </div>

                {/* Own Information Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Full Name</span>
                      <span className="text-white text-xs font-semibold block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70">
                        {user.name}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Employee ID</span>
                      <span className="text-white text-xs font-mono block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70">
                        {user.employeeId || 'Not Set'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Email Address</span>
                      <span className="text-slate-300 text-xs font-mono block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70">
                        {user.email}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">System Role</span>
                      <span className="text-slate-355 text-xs block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg capitalize opacity-70">
                        {user.role.includes(':') ? user.role.split(':')[1] : (roleLabels[user.role]?.label || user.role)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                      <span className="text-slate-355 text-xs block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70">
                        {calculateYearsInCompany(user.joiningDate)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Update mobile number"
                      className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeProfileModal}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
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
    </div>
  );
}
