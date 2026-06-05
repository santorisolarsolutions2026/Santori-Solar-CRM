'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
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
              CRM Portal
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm animate-shake">
              {error}
            </div>
          )}

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
              className="relative w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 rounded-lg font-bold shadow-lg shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 overflow-hidden group"
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

          {/* Quick Login Info for testing */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-400 font-semibold mb-3 text-center uppercase tracking-wide">
              Quick Testing Logins (Password: Password123)
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
              <div><strong className="text-amber-400">Admin:</strong> admin@solarcrm.com</div>
              <div><strong className="text-amber-400">Sales Head:</strong> saleshead@solarcrm.com</div>
              <div><strong className="text-amber-400">Manager:</strong> manager1@solarcrm.com</div>
              <div><strong className="text-amber-400">TL:</strong> tl1@solarcrm.com</div>
              <div><strong className="text-amber-400">Consultant:</strong> consultant1@solarcrm.com</div>
              <div><strong className="text-amber-400">PSA:</strong> psa1@solarcrm.com</div>
              <div><strong className="text-amber-400">Finance:</strong> finance@solarcrm.com</div>
              <div><strong className="text-amber-400">Operations:</strong> ops@solarcrm.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
