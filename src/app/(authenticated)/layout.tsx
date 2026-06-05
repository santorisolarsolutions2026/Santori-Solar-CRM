'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  Sun,
  LayoutDashboard,
  Users,
  Briefcase,
  Layers,
  LineChart,
  Tv,
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

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

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

  useEffect(() => {
    if (user) {
      fetchNotifications();
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

  // Sidebar navigation configuration based on role
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'sales_head', 'manager', 'tl', 'consultant', 'psa', 'finance', 'operations'],
    },
    {
      name: 'Leads Pipeline',
      path: '/leads',
      icon: Layers,
      roles: ['admin', 'sales_head', 'manager', 'tl', 'consultant', 'psa'],
    },
    /*
    {
      name: 'Orders Queue',
      path: '/orders',
      icon: FileCheck,
      roles: ['admin', 'sales_head', 'finance', 'operations'],
    },
    {
      name: 'Live War-Room',
      path: '/live',
      icon: Tv,
      roles: ['admin', 'sales_head'],
    },
    {
      name: 'Team Management',
      path: '/team',
      icon: Users,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Reports & Analytics',
      path: '/reports',
      icon: LineChart,
      roles: ['admin', 'sales_head', 'manager', 'tl', 'finance'],
    },
    */
    
  ];

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user.role));

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin (Deepak Sir)', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    sales_head: { label: 'Sales Head', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    manager: { label: 'Manager', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    tl: { label: 'Team Leader', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    consultant: { label: 'Consultant', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    psa: { label: 'PSA Caller', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    finance: { label: 'Finance Team', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    operations: { label: 'Operations Team', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  };

  const userRoleConfig = roleLabels[user.role] || { label: user.role, color: 'bg-slate-500/10 text-slate-400' };

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
        <div className="p-4 mx-4 my-6 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
          <p className="text-[10px] text-slate-400 truncate mb-2">{user.email}</p>
          <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${userRoleConfig.color}`}>
            {userRoleConfig.label}
          </span>
        </div>

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

            <div className="p-4 mx-4 my-6 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate mb-2">{user.email}</p>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${userRoleConfig.color}`}>
                {userRoleConfig.label}
              </span>
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
            {/* Notification Bell Dropdown */}
            <div className="relative">
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
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-900/40 border border-slate-800/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-amber-400 uppercase">
                {user.name.substring(0, 2)}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                <p className="text-[9px] text-slate-400 mt-1 leading-none capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Workspace Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#090b11]">
          {children}
        </main>
      </div>
    </div>
  );
}
