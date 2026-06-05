import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { ArrowRight, Sun, Zap, Shield, Sparkles } from 'lucide-react';
import Typewriter from './components/Typewriter';

export default async function LandingPage() {
  // Check if user is already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const portalLink = token ? '/dashboard' : '/login';
  const portalText = token ? 'Go to Dashboard' : 'Access CRM Portal';

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-yellow-400 selection:text-black overflow-hidden relative flex flex-col justify-between">
      {/* Decorative sun glow effects in background */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-yellow-500/5 blur-[150px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-yellow-500/5 blur-[150px] pointer-events-none animate-pulse-slow animation-delay-400" />

      {/* Header/Navbar */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 overflow-hidden rounded-lg bg-zinc-900 border border-yellow-500/20 p-1 flex items-center justify-center hover:scale-110 hover:border-yellow-400 transition-all duration-300">
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
              <span className="text-lg font-bold tracking-tight text-white block leading-none">
                Santori <span className="text-yellow-400">Solar</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block leading-none mt-0.5">
                Solutions
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href={portalLink}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-yellow-400 hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all duration-300 flex items-center gap-1.5 shadow-lg shadow-black/40 hover:scale-105 hover:shadow-yellow-450/20 active:scale-95"
            >
              {portalText}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-grow flex items-center py-4 lg:py-6 px-6 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-10 items-center w-full">
          <div className="lg:col-span-7 space-y-5 lg:space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[11px] font-bold uppercase tracking-wider animate-fade-in-up">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
              Empowering Sustainable Energy Systems
            </div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-tight animate-fade-in-up animation-delay-200">
              Next-Generation <br />
              <Typewriter texts={['Solar CRM Solutions', 'Solar Sales Operations', 'Solar Workflow Analytics']} />
            </h1>

            <p className="text-zinc-300 text-sm lg:text-base xl:text-lg leading-relaxed max-w-xl lg:max-w-2xl animate-fade-in-up animation-delay-400">
              Experience the synergy of high-efficiency solar panel installations and custom CRM automation. 
              Manage leads, schedule site visits, book customer meetings, punch sales orders, and streamline operations from a single workspace.
            </p>

            {/* Custom Premium Features */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl pt-1 animate-fade-in-up animation-delay-500">
              <div className="p-3 lg:p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/80 hover:border-yellow-500/20 hover:bg-zinc-900/50 transition-all duration-300 group/item">
                <span className="text-yellow-400 font-bold block text-sm lg:text-base mb-1 group-hover/item:text-yellow-300 transition-colors">Instant Site Audits</span>
                <span className="text-[10px] lg:text-[11px] text-zinc-500 block leading-normal">Schedule field surveys and inspect roof suitability.</span>
              </div>
              <div className="p-3 lg:p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/80 hover:border-yellow-500/20 hover:bg-zinc-900/50 transition-all duration-300 group/item">
                <span className="text-yellow-400 font-bold block text-sm lg:text-base mb-1 group-hover/item:text-yellow-300 transition-colors">Pipeline Tracking</span>
                <span className="text-[10px] lg:text-[11px] text-zinc-500 block leading-normal">Manage prospect pipelines from pitch to order dispatch.</span>
              </div>
              <div className="p-3 lg:p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/80 hover:border-yellow-500/20 hover:bg-zinc-900/50 transition-all duration-300 group/item">
                <span className="text-yellow-400 font-bold block text-sm lg:text-base mb-1 group-hover/item:text-yellow-300 transition-colors">Sales Booking</span>
                <span className="text-[10px] lg:text-[11px] text-zinc-500 block leading-normal">Instantly process customer sales orders and agreements.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1 animate-fade-in-up animation-delay-600">
              <Link 
                href={portalLink}
                className="px-8 py-3.5 text-center font-bold text-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 rounded-xl transition-all duration-300 shadow-xl shadow-yellow-500/15 hover:shadow-yellow-450/30 flex items-center justify-center gap-2 text-sm lg:text-base group hover:scale-105 active:scale-95"
              >
                Launch CRM Application
                <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Solar Graphic Container */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="absolute inset-0 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute w-[360px] h-[360px] rounded-full bg-gradient-to-tr from-yellow-500/10 via-amber-500/0 to-yellow-500/10 blur-3xl animate-spin-slow pointer-events-none" />
            
            <div className="relative w-full max-w-[400px] rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-6 lg:p-8 flex flex-col items-center justify-center shadow-2xl backdrop-blur-sm group hover:border-yellow-500/20 transition-all duration-500 animate-float shadow-yellow-500/[0.02]">
              
              <div className="relative w-44 h-44 mb-6 p-5 bg-zinc-950/90 rounded-2xl border-2 border-yellow-500/20 shadow-2xl flex items-center justify-center group-hover:scale-105 group-hover:shadow-yellow-500/20 group-hover:border-yellow-400 transition-all duration-500">
                <Image 
                  src="/logo.png" 
                  alt="Santori Solar Logo large" 
                  width={140} 
                  height={140} 
                  className="object-contain"
                />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl lg:text-2xl font-black text-white group-hover:text-yellow-400 transition-colors duration-300">Santori Solar Solutions</h3>
                <p className="text-zinc-400 text-xs lg:text-sm max-w-[280px] mx-auto leading-relaxed">
                  Premium solar panel installations paired with intelligent workflow analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-4 text-center text-zinc-600 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <p>© 2026 Santori Solar Solutions. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-zinc-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-zinc-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
