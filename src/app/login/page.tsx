'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';

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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Setup Flow state
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [setupName, setSetupName] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupEmployeeId, setSetupEmployeeId] = useState('');

  const { login } = useAuth();

  React.useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/v1/auth/setup');
        const data = await res.json();
        if (data.success && data.isSetupRequired) {
          setIsSetupRequired(true);
        }
      } catch (err) {
        console.error('Error checking setup:', err);
      } finally {
        setCheckingSetup(false);
      }
    }
    checkSetup();
  }, []);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName || !email || !password || !setupEmployeeId) {
      setError('Please fill in all required fields (Name, Email, Employee ID, Password).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setupName,
          email,
          phone: setupPhone,
          employeeId: setupEmployeeId,
          password,
        }),
      });

      const data = await res.json();
      if (data.success) {
        let locationStr = 'Unknown Location';
        try {
          const geoResult = await getBrowserLocation(5000);
          if (geoResult && !geoResult.startsWith('error_') && geoResult !== 'HTML5 Geolocation not supported') {
            locationStr = geoResult;
          }
        } catch (e) {}

        const loginRes = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, location: locationStr }),
        });

        const loginData = await loginRes.json();
        if (loginData.success && loginData.data) {
          login(loginData.data.token, loginData.data.user);
        } else {
          setIsSetupRequired(false);
          setError('Admin account created successfully! Please log in.');
        }
      } else {
        setError(data.message || 'Setup failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    let locationStr = 'Unknown Location';
    
    // 1. Try browser Geolocation first (triggers the browser permission popup)
    const geoResult = await getBrowserLocation(5000);
    if (geoResult && !geoResult.startsWith('error_') && geoResult !== 'HTML5 Geolocation not supported') {
      locationStr = geoResult;
    } else {
      // 2. Fall back to IP Geolocation if HTML5 fails, is blocked, or is not supported
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
        console.warn('IP Geolocation fallback timed out or failed:', err);
      }
    }


    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, location: locationStr }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        login(data.data.token, data.data.user);
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden px-4 font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
          <p className="text-zinc-500 text-sm font-semibold tracking-wider uppercase">Checking setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden px-4 font-sans selection:bg-yellow-400 selection:text-black">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-500/5 blur-[120px] pointer-events-none" />

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293706_1px,transparent_1px),linear-gradient(to_bottom,#1f293706_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />

      <div className="relative w-full max-w-md">
        {/* Decorative Ring */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 opacity-20 blur-md pointer-events-none" />

        {/* Card */}
        <div className="relative bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          {/* Logo / Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="relative w-14 h-14 bg-zinc-900 border border-yellow-500/20 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-black mb-4">
              <Image 
                src="/logo.png" 
                alt="Santori Solar Solutions Logo" 
                width={40} 
                height={40} 
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-none">
              Santori <span className="text-yellow-400">Solar</span>
            </h1>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mt-1">
              {isSetupRequired ? 'Initial Admin Setup' : 'CRM Portal'}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm animate-shake">
              {error}
            </div>
          )}

          {isSetupRequired ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <p className="text-xs text-zinc-400 mb-4 text-center">
                Welcome to SolarCRM! Let's set up your primary administrator account. This will lock setup for this server.
              </p>
              
              {/* Setup Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="e.g. Deepak Sir"
                  className="block w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-xs"
                />
              </div>

              {/* Setup Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@solarcrm.com"
                  className="block w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-xs"
                />
              </div>

              {/* Setup Employee ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={setupEmployeeId}
                  onChange={(e) => setSetupEmployeeId(e.target.value)}
                  placeholder="e.g. EMP-1001"
                  className="block w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-xs"
                />
              </div>

              {/* Setup Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="block w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-xs"
                />
              </div>

              {/* Setup Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-3 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="relative w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 rounded-lg font-bold shadow-lg shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2 overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Configuring Admin...</span>
                  </>
                ) : (
                  <span>Create Admin & Launch Portal</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@solarcrm.com"
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <a href="#" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="relative w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 rounded-lg font-bold shadow-lg shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Access Dashboard</span>
                )}
              </button>
            </form>
          )}


        </div>
      </div>
    </div>
  );
}
