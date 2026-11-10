'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

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
                'User-Agent': 'SolarCRM/1.0 (contact@santorisolar.com)',
                'Accept-Language': 'en',
              },
            }
          );
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
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
  const [rememberMe, setRememberMe] = useState(true);

  // Cloudflare Turnstile state
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);

  const renderTurnstile = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    const turnstile = (window as any).turnstile;
    if (turnstile && turnstileContainerRef.current) {
      if (widgetIdRef.current) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }

      try {
        const sitekey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
        widgetIdRef.current = turnstile.render(turnstileContainerRef.current, {
          sitekey,
          theme: 'light',
          callback: (token: string) => {
            setTurnstileToken(token);
            setError('');
          },
          'expired-callback': () => {
            setTurnstileToken('');
          },
          'error-callback': () => {
            setTurnstileToken('');
          },
        });
      } catch (err) {
        console.error('Turnstile render error:', err);
      }
    }
  }, []);

  React.useEffect(() => {
    if (turnstileReady) {
      renderTurnstile();
    }
  }, [turnstileReady, renderTurnstile]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).turnstile) {
      setTurnstileReady(true);
    }
    return () => {
      if (widgetIdRef.current && typeof window !== 'undefined' && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (e) {}
      }
    };
  }, []);
  
  // Setup Flow state
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [setupName, setSetupName] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupEmployeeId, setSetupEmployeeId] = useState('');

  const { login } = useAuth();
  const preloadedLocationRef = React.useRef<string>('');

  React.useEffect(() => {
    // Check cached location from device storage first for instant 0ms availability
    try {
      const cached = sessionStorage.getItem('last_user_location') || localStorage.getItem('last_user_location');
      if (cached && !cached.includes('Web Browser Login') && !cached.includes('Admin Setup')) {
        preloadedLocationRef.current = cached;
      }
    } catch {}

    // Silently pre-fetch fresh GPS location in background while user fills the login form
    getBrowserLocation(3500).then((loc) => {
      if (loc && !loc.startsWith('error_') && loc !== 'HTML5 Geolocation not supported') {
        preloadedLocationRef.current = loc;
        try {
          sessionStorage.setItem('last_user_location', loc);
          localStorage.setItem('last_user_location', loc);
        } catch {}
      }
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // LocalStorage access failsafe
    }

    async function checkSetup() {
      try {
        const res = await fetch('/api/v1/auth/setup');
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.isSetupRequired) {
            setIsSetupRequired(true);
          }
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
        let locationStr = preloadedLocationRef.current || 'Admin Setup';
        if (!preloadedLocationRef.current) {
          try {
            const geoResult = await Promise.race([
              getBrowserLocation(800),
              new Promise<string>((resolve) => setTimeout(() => resolve(''), 800))
            ]);
            if (geoResult && !geoResult.startsWith('error_') && geoResult !== 'HTML5 Geolocation not supported') {
              locationStr = geoResult;
            }
          } catch (e) {}
        }

        const loginRes = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, location: locationStr, turnstileToken }),
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

    if (!turnstileToken) {
      setError('Please complete the security captcha verification.');
      return;
    }

    setSubmitting(true);
    setError('');

    let locationStr = preloadedLocationRef.current || '';
    
    // If not preloaded yet (e.g. instant autofill), do a quick 400ms check or proceed immediately to Cloudflare
    if (!locationStr) {
      try {
        const quickLoc = await Promise.race([
          getBrowserLocation(400),
          new Promise<string>((resolve) => setTimeout(() => resolve(''), 400))
        ]);
        if (quickLoc && !quickLoc.startsWith('error_') && quickLoc !== 'HTML5 Geolocation not supported') {
          locationStr = quickLoc;
          preloadedLocationRef.current = quickLoc;
          try {
            sessionStorage.setItem('last_user_location', quickLoc);
            localStorage.setItem('last_user_location', quickLoc);
          } catch {}
        }
      } catch {}
    }

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, location: locationStr, turnstileToken }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        try {
          sessionStorage.setItem('last_user_location', locationStr);
          if (rememberMe) {
            localStorage.setItem('remembered_email', email);
          } else {
            localStorage.removeItem('remembered_email');
          }
        } catch {
          // LocalStorage access failsafe
        }
        login(data.data.token, data.data.user);
      } else {
        setError(data.message || 'Invalid credentials.');
        if (widgetIdRef.current && typeof window !== 'undefined' && (window as any).turnstile) {
          try {
            (window as any).turnstile.reset(widgetIdRef.current);
            setTurnstileToken('');
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      if (widgetIdRef.current && typeof window !== 'undefined' && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(widgetIdRef.current);
          setTurnstileToken('');
        } catch (e) {}
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFDFD]">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-full h-full animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="setup-loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0e876a" />
                    <stop offset="26%" stopColor="#1a7e8b" />
                    <stop offset="58%" stopColor="#2874af" />
                    <stop offset="100%" stopColor="#c79522" />
                  </linearGradient>
                </defs>
                <path
                  d="M21 12a9 9 0 1 1-6.219-8.56"
                  stroke="url(#setup-loader-gradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-slate-600 text-sm font-semibold tracking-wider uppercase">Checking setup status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="light login-page-container min-h-screen relative flex items-center justify-center selection:bg-emerald-600 selection:text-white bg-[#0D1117] overflow-x-hidden p-4 sm:p-6 lg:p-8">
      {/* Full Page Background Image - Clean & sharp as uploaded */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/solar_login_bg.jpg"
          alt="Santori Solar Panels Sunset Background"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Subtle dark tint only for text contrast, no blur */}
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />
      </div>
      <style>{`
        .login-page-container input:not([type="checkbox"]):not([type="submit"]):not([type="button"]),
        .login-page-container .login-input,
        .login-page-container input[type="email"],
        .login-page-container input[type="password"],
        .login-page-container input[type="text"] {
          background-color: #ffffff !important;
          background: #ffffff !important;
          color: #000000 !important;
          border: 1px solid #000000 !important;
          border-width: 1px !important;
          border-style: solid !important;
          border-color: #000000 !important;
          color-scheme: light !important;
          -webkit-text-fill-color: #000000 !important;
        }
        .login-page-container input::placeholder,
        .login-page-container .login-input::placeholder {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
        }
        .login-page-container input:focus,
        .login-page-container .login-input:focus {
          border-color: #000000 !important;
          outline: none !important;
          box-shadow: 0 0 0 1px #000000 !important;
        }
        .login-page-container input:-webkit-autofill,
        .login-page-container input:-webkit-autofill:hover,
        .login-page-container input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #000000 !important;
        }
        .login-page-container .login-submit-btn {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        .login-page-container .login-submit-btn:hover:not(:disabled) {
          background-color: #1f2937 !important;
          color: #ffffff !important;
          opacity: 1 !important;
        }
      `}</style>
      {/* Top Left Logo & Brand Name */}
      <div className="fixed top-5 left-5 sm:top-7 sm:left-8 flex items-center gap-3 z-30">
        <Link
          href="/"
          title="Back to Landing Page"
          className="p-1.5 text-white hover:text-white/80 hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
        >
          <ArrowLeft className="w-6 h-6 text-white stroke-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]" />
        </Link>
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white/95 border border-white/30 shadow-md p-1">
          <Image
            src="/logo.png"
            alt="Santori Solar CRM Logo"
            width={36}
            height={36}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <span
          style={{ color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
          className="text-base sm:text-lg font-bold tracking-tight text-white text-white-force select-none"
        >
          Santori Solar Solutions
        </span>
      </div>

      {/* Centered Glassmorphic Form Card */}
      <div className="relative z-10 w-full max-w-[440px] my-auto pt-16 sm:pt-12">
        <div className="w-full bg-white/95 dark:bg-white/95 rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/60 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {isSetupRequired ? 'Initial Admin Setup' : 'Welcome Back!'}
            </h1>
            <p className="text-sm text-slate-500 mt-2.5 max-w-sm mx-auto leading-relaxed">
              {isSetupRequired 
                ? 'Configure your primary administrator account to get started.' 
                : 'Manage leads, track customer interactions, and close more deals with ease.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 text-red-600 text-sm animate-shake text-center font-medium">
              {error}
            </div>
          )}

          {isSetupRequired ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              {/* Setup Full Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="e.g. Deepak Sir"
                  style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000000' }}
                  className="login-input block w-full bg-white border border-black rounded-xl py-3 px-4 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              {/* Setup Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@solarcrm.com"
                  style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000000' }}
                  className="login-input block w-full bg-white border border-black rounded-xl py-3 px-4 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              {/* Setup Employee ID */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={setupEmployeeId}
                  onChange={(e) => setSetupEmployeeId(e.target.value)}
                  placeholder="e.g. EMP-1001"
                  style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000000' }}
                  className="login-input block w-full bg-white border border-black rounded-xl py-3 px-4 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              {/* Setup Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000000' }}
                  className="login-input block w-full bg-white border border-black rounded-xl py-3 px-4 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              {/* Setup Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000000' }}
                    className="login-input block w-full bg-white border border-black rounded-xl py-3 pl-4 pr-11 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-black hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-black stroke-black" /> : <Eye className="w-5 h-5 text-black stroke-black" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="login-submit-btn w-full mt-6 bg-black text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
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
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{ backgroundColor: '#ffffff', color: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#000000' }}
                  className="login-input block w-full bg-white border border-black rounded-xl py-3 px-4 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ backgroundColor: '#ffffff', color: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#000000' }}
                    className="login-input block w-full bg-white border border-black rounded-xl py-3 pl-4 pr-11 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-black hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-black stroke-black" /> : <Eye className="w-5 h-5 text-black stroke-black" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forget Password Row */}
              <div className="flex items-center justify-between text-sm pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 font-medium text-sm">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-black bg-white border-slate-300 focus:ring-black accent-black cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setError('Please contact the Admin to reset your password.')}
                  className="text-slate-800 hover:text-black font-medium text-sm transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Cloudflare Turnstile Captcha */}
              <div className="flex justify-center my-2 min-h-[66px]">
                <div ref={turnstileContainerRef} id="turnstile-widget" />
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={submitting}
                className="login-submit-btn w-full mt-2 bg-black text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>


    <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setTurnstileReady(true)}
      />
    </div>
  );
}
