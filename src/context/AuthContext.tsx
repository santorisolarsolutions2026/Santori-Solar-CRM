'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function getBrowserLocation(timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve('HTML5 Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            {
              headers: {
                'Accept-Language': 'en',
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const address = data.address || {};
            const city = address.city || address.town || address.village || address.suburb || '';
            const state = address.state || '';
            const country = address.country || '';
            const locParts = [city, state, country].filter(Boolean);
            if (locParts.length > 0) {
              resolve(locParts.join(', '));
              return;
            }
          }
          resolve(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } catch (err) {
          resolve(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        }
      },
      (error) => {
        resolve(`error_${error.code}`);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
}


interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  employeeId?: string | null;
  role: string;
  isActive: boolean;
  joiningDate?: string | null;
  photograph?: string | null;
  permissions?: string[] | string | null;
  departmentId?: number | null;
  teamId?: number | null;
  department?: { id: number; name: string } | null;
  designation?: { id: number; name: string; level: number } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
      } else {
        setUser(null);
        if (pathname !== '/login' && pathname !== '/') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Fetch user error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  // Heartbeat tracking (Section 6.4)
  useEffect(() => {
    if (!user) return;

    // Send immediately on mount/login
    fetch('/api/v1/auth/heartbeat', { method: 'POST' }).catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/v1/auth/heartbeat', { method: 'POST' }).catch(() => {});
    }, 60000); // every 60s

    return () => clearInterval(interval);
  }, [user]);

  const login = (token: string, userData: User) => {
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      let locationStr = 'Unknown Location';
      
      // 1. Try browser Geolocation first (triggers the browser permission popup)
      const geoResult = await getBrowserLocation(5000);
      if (geoResult && !geoResult.startsWith('error_') && geoResult !== 'HTML5 Geolocation not supported') {
        locationStr = geoResult;
      } else {
        // 2. Fall back to IP Geolocation if HTML5 fails or is blocked
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          const geoRes = await fetch('https://ipapi.co/json/', { signal: controller.signal });
          clearTimeout(timeoutId);
          const contentType = geoRes.headers.get('content-type');
          if (geoRes.ok && contentType && contentType.includes('application/json')) {
            const geoData = await geoRes.json();
            const city = geoData.city || '';
            const region = geoData.region || '';
            const country = geoData.country_name || '';
            const locParts = [city, region, country].filter(Boolean);
            if (locParts.length > 0) {
              locationStr = locParts.join(', ');
            }
          }
        } catch (err) {
          console.warn('Geolocation fetch timed out or failed on logout:', err);
        }
      }

      await fetch('/api/v1/auth/logout', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: locationStr }),
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    const baseRole = user.role.includes(':') ? user.role.split(':')[0] : user.role;
    if (baseRole === 'admin' || baseRole === 'director' || user.department?.name === 'IT') return true;

    const rawPerms = user.permissions;
    let userPerms: string[] = [];
    if (Array.isArray(rawPerms)) {
      userPerms = rawPerms;
    } else if (typeof rawPerms === 'string') {
      userPerms = (rawPerms as string).split(',');
    }
    const cleanPerms = userPerms.map(p => String(p).replace(/^CUSTOM:/, '').trim()).filter(p => p !== '' && p !== 'none');
    const finalPerms = new Set<string>(cleanPerms);

    const clientMapping: Record<string, string[]> = {
      // Sales Access Levels
      'sales:add_lead': ['sales:lead_add', 'leads:create'],
      'sales:lead_add': ['sales:add_lead', 'leads:create'],
      'leads:create': ['sales:add_lead', 'sales:lead_add'],

      'sales:import_bulk_leads': ['sales:lead_import', 'leads:import'],
      'sales:lead_import': ['sales:import_bulk_leads', 'leads:import'],

      'sales:assign_leads': ['sales:lead_assign', 'leads:assign'],
      'sales:lead_assign': ['sales:assign_leads', 'leads:assign'],

      'sales:view_all_leads': ['sales:lead_view_all', 'leads:view_all'],
      'sales:lead_view_all': ['sales:view_all_leads', 'leads:view_all'],

      'sales:edit_lead': ['sales:lead_edit', 'leads:edit'],
      'sales:lead_edit': ['sales:edit_lead', 'leads:edit'],

      'sales:change_pipeline_stage': ['sales:stage_change', 'sales:meeting_book', 'leads:change_status', 'leads:manage_calling_stages'],
      'sales:stage_change': ['sales:change_pipeline_stage', 'leads:change_status'],

      'sales:record_meeting': ['sales:meeting_done', 'leads:meeting_done', 'meetings:complete'],
      'sales:meeting_done': ['sales:record_meeting', 'meetings:complete'],

      'sales:fill_order_form': ['sales:order_punch', 'orders:create', 'orders:submit_installation'],
      'sales:order_punch': ['sales:fill_order_form', 'orders:create'],

      'sales:view_track_journey': ['sales:lead_track', 'sales:lead_details_view', 'leads:track', 'leads:view_details'],
      'sales:lead_track': ['sales:view_track_journey', 'leads:track'],

      // Finance Access Levels
      'finance:view_all_orders': ['orders:finance_access', 'orders:view_all'],
      'finance:assign_orders': ['finance:order_assign', 'orders:assign_finance'],
      'finance:order_assign': ['finance:assign_orders', 'orders:assign_finance'],

      'finance:verify_orders': ['finance:order_verify_reject', 'orders:verify'],
      'finance:order_verify_reject': ['finance:verify_orders', 'orders:verify'],

      'finance:maintain_ledgers': ['finance:ledger_record', 'finance:ledger_delete', 'finance:manage_ledger'],
      'finance:ledger_record': ['finance:maintain_ledgers', 'finance:manage_ledger'],

      // Operations Access Levels
      'operations:view_all_orders': ['ops:delivered_orders', 'orders:operations', 'orders:view_all'],
      'operations:assign_orders': ['finance:ops_assign', 'orders:assign_ops'],
      'operations:manage_stages': ['ops:delivery_manage', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:subsidy_manage', 'ops:update_stages'],
      'ops:update_stages': ['operations:manage_stages'],

      // Administration Access Levels
      'admin:view_attendance': ['sales:attendance_view', 'finance:attendance_view', 'ops:attendance_view', 'attendance:view'],
      'admin:change_subordinate_designation': ['sales:designation_change', 'finance:designation_change', 'ops:designation_change', 'team:change_designation', 'team:manage'],
      'admin:view_analytics': ['sales:analytics_view', 'finance:analytics_view', 'ops:analytics_view', 'reports:view', 'reports:view_financials', 'logs:view'],
      'admin:manage_permissions': ['permissions:manage']
    };

    if (finalPerms.has(permission)) return true;

    const mapped = clientMapping[permission];
    if (mapped && mapped.some(m => finalPerms.has(m))) {
      return true;
    }

    // Page level implicit checks
    if (permission === 'leads:view') {
      const hasAnyLead = ['sales:add_lead', 'sales:import_bulk_leads', 'sales:assign_leads', 'sales:view_all_leads', 'sales:edit_lead', 'sales:change_pipeline_stage', 'sales:record_meeting', 'sales:view_track_journey', 'sales:lead_add', 'sales:lead_import', 'sales:stage_change', 'sales:lead_view_all', 'sales:lead_track', 'sales:lead_assign', 'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:view_all', 'leads:track', 'leads:assign', 'leads:view_sales_pipeline', 'leads:book_meeting', 'leads:meeting_done'].some(p => finalPerms.has(p));
      if (hasAnyLead) return true;
    }

    if (permission === 'orders:view') {
      const hasAnyOrder = ['sales:fill_order_form', 'finance:view_all_orders', 'finance:assign_orders', 'finance:verify_orders', 'finance:maintain_ledgers', 'operations:view_all_orders', 'operations:assign_orders', 'operations:manage_stages', 'sales:order_punch', 'finance:order_verify_reject', 'finance:order_assign', 'finance:ledger_record', 'finance:ops_assign', 'ops:delivery_manage', 'ops:delivered_orders', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:subsidy_manage', 'orders:create', 'orders:verify', 'orders:operations', 'orders:finance_access', 'orders:view_all', 'orders:submit_installation', 'finance:manage_ledger', 'ops:update_stages', 'ops:upload_drawings'].some(p => finalPerms.has(p));
      if (hasAnyOrder) return true;
    }

    if (permission === 'reports:view') {
      const hasAnyReport = ['admin:view_analytics', 'sales:analytics_view', 'finance:analytics_view', 'ops:analytics_view', 'reports:view', 'reports:view_financials'].some(p => finalPerms.has(p));
      if (hasAnyReport) return true;
    }

    return false;
  };


  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
