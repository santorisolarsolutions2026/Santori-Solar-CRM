import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { ArrowRight, Sparkles } from 'lucide-react';
import Typewriter from './components/Typewriter';
const TYPEWRITER_PHRASES = ['Solar CRM Workflows', 'Access Control Systems', 'Performance Dashboards'];

export default async function LandingPage() {
  // Check if user is already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const portalLink = token ? '/dashboard' : '/login';
  const portalText = token ? 'Go to Dashboard' : 'Access CRM Portal';

  return (
    <div className="h-screen text-zinc-100 font-sans selection:bg-emerald-600 selection:text-white overflow-hidden relative flex flex-col justify-between">
      {/* Background Image with Premium Dark Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-20 scale-105 transition-transform duration-1000"
        style={{ backgroundImage: 'url("/23424-1.jpg")' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-[#0D1117]/95 backdrop-blur-[2px] -z-10" />

      {/* Header/Navbar */}
      <header className="border-b border-white/10 dark:border-zinc-800/40 bg-black/15 dark:bg-zinc-950/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[86%] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 overflow-hidden rounded-lg p-0.5 flex items-center justify-center hover:scale-110 transition-all duration-300">
              <Image 
                src="/logo.png" 
                alt="Santori Solar Solutions Logo" 
                width={30} 
                height={30} 
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block leading-none">
                Santori Solar
              </span>
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block leading-none mt-0.5">
                SOLUTIONS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href={portalLink}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-white/10 dark:bg-[var(--bg-card)] border border-white/20 dark:border-[var(--border-color)] text-white hover:border-emerald-500/40 hover:text-emerald-400 transition-all duration-300 flex items-center gap-1.5 shadow-lg backdrop-blur-sm hover:scale-105 active:scale-95"
            >
              {portalText}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-grow flex items-center py-4 lg:py-6 px-6 max-w-[86%] mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-10 items-center w-full">
          <div className="lg:col-span-7 space-y-5 lg:space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider animate-fade-in-up backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Empowering Sustainable Energy Systems
            </div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-tight animate-fade-in-up animation-delay-200">
              Next-Generation <br />
              <Typewriter texts={TYPEWRITER_PHRASES} />
            </h1>

            <p className="text-[var(--text-primary)] dark:text-zinc-300 text-sm lg:text-base xl:text-lg leading-relaxed max-w-xl lg:max-w-2xl animate-fade-in-up animation-delay-400">
              Experience the synergy of high-efficiency solar panel installations and custom CRM automation. 
              Manage leads, schedule site visits, book customer meetings, punch sales orders, and streamline operations from a single workspace.
            </p>

            {/* Glassmorphic Small Features Cards */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl pt-1 animate-fade-in-up animation-delay-500">
              <div className="p-3 lg:p-4 rounded-xl bg-white/10 dark:bg-[var(--bg-card)] border border-white/20 dark:border-[var(--border-color)] backdrop-blur-md hover:border-emerald-500/30 hover:bg-white/15 transition-all duration-300 group/item shadow-lg">
                <span className="text-slate-900 dark:text-white font-bold block text-sm lg:text-base mb-1">Instant Site Audits</span>
                <span className="text-[10px] lg:text-[11px] text-slate-700 dark:text-zinc-400 block leading-normal font-medium">Schedule field surveys and inspect roof suitability.</span>
              </div>
              <div className="p-3 lg:p-4 rounded-xl bg-white/10 dark:bg-[var(--bg-card)] border border-white/20 dark:border-[var(--border-color)] backdrop-blur-md hover:border-emerald-500/30 hover:bg-white/15 transition-all duration-300 group/item shadow-lg">
                <span className="text-slate-900 dark:text-white font-bold block text-sm lg:text-base mb-1">Pipeline Tracking</span>
                <span className="text-[10px] lg:text-[11px] text-slate-700 dark:text-zinc-400 block leading-normal font-medium">Manage prospect pipelines from pitch to order dispatch.</span>
              </div>
              <div className="p-3 lg:p-4 rounded-xl bg-white/10 dark:bg-[var(--bg-card)] border border-white/20 dark:border-[var(--border-color)] backdrop-blur-md hover:border-emerald-500/30 hover:bg-white/15 transition-all duration-300 group/item shadow-lg">
                <span className="text-slate-900 dark:text-white font-bold block text-sm lg:text-base mb-1">Sales Booking</span>
                <span className="text-[10px] lg:text-[11px] text-slate-700 dark:text-zinc-400 block leading-normal font-medium">Instantly process customer sales orders and agreements.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1 animate-fade-in-up animation-delay-600">
              <Link 
                href={portalLink}
                className="px-8 py-3.5 text-center font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border border-emerald-500/30 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 text-sm lg:text-base group hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                Launch CRM Application
                <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Large Glass Card */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative w-full max-w-[400px] rounded-2xl bg-white/10 dark:bg-[var(--bg-card)] border border-white/20 dark:border-[var(--border-color)] p-6 lg:p-8 flex flex-col items-center justify-center shadow-2xl backdrop-blur-lg group hover:border-emerald-500/40 transition-all duration-500 animate-float">
              
              <div className="relative w-44 h-44 mb-6 bg-white rounded-2xl border border-white/20 dark:border-[var(--border-color)] shadow-2xl flex items-center justify-center overflow-hidden group-hover:scale-105 transition-all duration-500">
                <Image 
                  src="/logo.png" 
                  alt="Santori Solar Logo large" 
                  width={176} 
                  height={176} 
                  className="object-contain w-full h-full scale-[1.12]"
                />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl lg:text-2xl font-black text-white">Santori Solar Solutions</h3>
                <p className="text-[var(--text-primary)] dark:text-zinc-400 text-xs lg:text-sm max-w-[280px] mx-auto leading-relaxed font-medium">
                  Premium solar panel installations paired with intelligent workflow analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 dark:border-zinc-900/60 py-4 text-center text-slate-350 dark:text-zinc-500 text-xs bg-black/10 backdrop-blur-sm">
        <div className="max-w-[86%] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <p>© 2026 Santori Solar Solutions. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
