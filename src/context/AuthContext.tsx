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
  role: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchUser }}>
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
