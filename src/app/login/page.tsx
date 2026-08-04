'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, Mail, Loader2, ShieldAlert } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[var(--bg-main)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold tracking-wider uppercase">Checking setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 selection:bg-emerald-600 selection:text-white bg-white dark:bg-[var(--bg-main)]">
      {/* LEFT PANEL - Brand / Visual */}
      <div className="hidden lg:flex flex-col justify-center bg-[var(--bg-sidebar)] relative overflow-hidden p-12">
        <div className="absolute inset-0 bg-[url('/solar_background.png')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-[#111318]/80 to-transparent" />
        
        <div className="relative z-10 max-w-lg mx-auto w-full">
          <div className="mb-8">
            <Image 
              src="/logo.png" 
              alt="Santori Solar Solutions Logo" 
              width={80} 
              height={80} 
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Santori <span className="text-emerald-500">Solar</span>
          </h1>
          <h2 className="text-xl text-gray-300 font-medium mb-6">
            Powering Sustainable Futures
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md">
            Streamline your operations and manage customer relationships with our powerful, green-first CRM solution designed specifically for modern solar energy providers.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - Form */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 h-full bg-white dark:bg-[var(--bg-card)]">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <Image 
                src="/logo.png" 
                alt="Santori Solar Solutions Logo" 
                width={64} 
                height={64} 
                className="object-contain"
                priority
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isSetupRequired ? 'Initial Admin Setup' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {isSetupRequired ? 'Configure your primary administrator account to get started.' : 'Sign in to access your CRM portal'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm animate-shake">
              {error}
            </div>
          )}

          {isSetupRequired ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              {/* Setup Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="e.g. Deepak Sir"
                  className="block w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white transition-colors"
                />
              </div>

              {/* Setup Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@solarcrm.com"
                  className="block w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white transition-colors"
                />
              </div>

              {/* Setup Employee ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={setupEmployeeId}
                  onChange={(e) => setSetupEmployeeId(e.target.value)}
                  placeholder="e.g. EMP-1001"
                  className="block w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white transition-colors"
                />
              </div>

              {/* Setup Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="block w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white transition-colors"
                />
              </div>

              {/* Setup Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg py-2.5 pl-3 pr-10 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span>Configuring Admin...</span>
                  </>
                ) : (
                  <span>Create Admin & Launch Portal</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@solarcrm.com"
                    className="block w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setError('Please contact the Admin to reset your password.')}
                    className="text-xs text-emerald-600 hover:text-emerald-500 transition-colors font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
