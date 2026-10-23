import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import FadeIn from '@/components/FadeIn';
import LandingHeader from '@/components/LandingHeader';
import { 
  ArrowRight, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  Compass, 
  ShieldCheck, 
  Camera, 
  Clock, 
  Zap,
  Check
} from 'lucide-react';

export default async function LandingPage() {
  // Check if user is already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const portalLink = token ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-[#FBFDFD] text-slate-900 font-sans antialiased selection:bg-emerald-600 selection:text-white">
      {/* 1. Header / Navbar - Full Width Container */}
      <LandingHeader portalLink={portalLink} />

      {/* 2. Main Content - Full Width Container */}
      <main className="w-full px-6 sm:px-10 lg:px-14 pt-12 pb-4">
        {/* Top Tag Badge & Headline */}
        <FadeIn>
          <div className="inline-block px-3 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-amber-700 text-[11px] font-bold tracking-wider uppercase mb-5">
            ENTERPRISE SOLAR EPC OPERATING SYSTEM
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12] max-w-4xl mb-5">
            One connected workspace for every solar lead, site audit, and rooftop solar project.
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-3xl mb-6 font-normal">
            Built specifically for solar operations. Unify 250,000+ clean energy inquiries, satellite territory clustering, field rooftop audits, and net-metering in one platform.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Link 
              href={portalLink}
              className="px-5 py-2.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm transition-all flex items-center gap-2"
            >
              Launch CRM Portal →
            </Link>
          </div>

          {/* Live Operational Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Nationwide Solar Operations: Live Across India
          </div>
        </FadeIn>

        {/* Hero Image Card - Expansive Full Width (1920px HD Crisp) */}
        <FadeIn delay={120}>
          <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-900 aspect-[4/3] sm:aspect-[3/2] max-h-[560px] sm:max-h-[640px] w-full mb-12">
            <Image 
              src="/images/solar-engineer-tablet.jpg" 
              alt="Site audit inspection" 
              fill 
              unoptimized
              className="object-cover object-center" 
              priority 
            />
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 shadow-sm border border-slate-200/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Site audit · A. Srivastava · 11:30 AM
            </div>
          </div>
        </FadeIn>

        {/* 3. Customer Solar Value & Benefits Showcase */}
        <FadeIn>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 mb-16 w-full shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 mb-6 gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Solar Advantage
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Key Benefits of Installing Solar for Home &amp; Business
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  PM Surya Ghar Approved
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Net-Metering Ready
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
              {/* Card 1: Bill Reduction */}
              <div className="rounded-2xl border border-slate-800 bg-[#0B1528] p-5 sm:p-6 hover:border-pink-500/30 transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/60 text-pink-300 flex items-center justify-center mb-3">
                    <Zap className="w-4 h-4 text-pink-300" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-pink-300 mb-1">
                    Up to 90%
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white tracking-tight mb-1.5">
                    Electricity Bill Reduction
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4 font-normal">
                    Offset daytime consumption with bidirectional net-metering. Monthly power bills drop to minimum fixed charges.
                  </p>
                </div>
                <div className="pt-3.5 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-pink-300" />
                    </div>
                    <span>₹3,500 – ₹8,000 monthly savings</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-pink-300" />
                    </div>
                    <span>Protection from unit rate hikes</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Direct Govt Subsidy */}
              <div className="rounded-2xl border border-pink-500/25 bg-[#0B1528] p-5 sm:p-6 hover:border-pink-400/40 transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/60 text-pink-300 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-pink-300" />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide text-pink-300 bg-pink-500/10 border border-pink-400/20 px-2 py-0.5 rounded-full uppercase">
                      Direct DBT
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-pink-300 mb-1">
                    ₹1,08,000
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white tracking-tight mb-1.5">
                    Direct Government Subsidy
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4 font-normal">
                    Direct Benefit Transfer (DBT) deposited straight to customer bank accounts under the national PM Surya Ghar scheme.
                  </p>
                </div>
                <div className="pt-3.5 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-pink-300" />
                    </div>
                    <span>Tier-based slabs: ₹30k to ₹1,08,000</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-pink-300" />
                    </div>
                    <span>100% portal paperwork handled</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Payback & Warranty */}
              <div className="rounded-2xl border border-slate-800 bg-[#0B1528] p-5 sm:p-6 hover:border-pink-500/30 transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/60 text-pink-300 flex items-center justify-center mb-3">
                    <Clock className="w-4 h-4 text-pink-300" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-pink-300 mb-1">
                    3–4 Years
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white tracking-tight mb-1.5">
                    Complete Investment Payback
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4 font-normal">
                    Solar setup cost is fully recovered within 36 to 48 months, delivering over two decades of free electricity.
                  </p>
                </div>
                <div className="pt-3.5 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-pink-300" />
                    </div>
                    <span>25-year panel performance warranty</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-pink-300" />
                    </div>
                    <span>High-efficiency TOPCon Bifacial cells</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Grid Independence */}
              <div className="rounded-2xl border border-slate-800 bg-[#0B1528] p-5 sm:p-6 hover:border-pink-500/30 transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/60 text-pink-300 flex items-center justify-center mb-3">
                    <Layers className="w-4 h-4 text-pink-300" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-pink-300 mb-1">
                    24 / 7
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white tracking-tight mb-1.5">
                    Continuous Power Reliability
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4 font-normal">
                    Hybrid inverter compatibility supports heavy domestic loads like air conditioners, coolers, and pumps during outages.
                  </p>
                </div>
                <div className="pt-3.5 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-pink-300" />
                    </div>
                    <span>Zero power cut interruptions</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-pink-500/10 border border-pink-400/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-pink-300" />
                    </div>
                    <span>Consistent voltage for appliances</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* 4. Real-Time Operations Metrics Strip - Gradient Card Centered */}
        <FadeIn>
          <div 
            className="my-14 sm:my-18 mx-auto max-w-5xl rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-white/10"
            style={{ background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)' }}
          >
            <div className="p-7 sm:p-10 lg:p-11 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 text-white relative">
              {/* Left Column */}
              <div className="space-y-8 sm:space-y-10 md:pr-8">
                <div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
                    250,000+
                  </div>
                  <div className="text-sm sm:text-base text-white/90 mt-2 font-medium">
                    Clean energy inquiries evaluated
                  </div>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
                    ₹1,08,000
                  </div>
                  <div className="text-sm sm:text-base text-white/90 mt-2 font-medium">
                    Max PM Surya Ghar subsidy processed per household
                  </div>
                </div>
              </div>

              {/* Right Column with Left Divider Line */}
              <div className="space-y-8 sm:space-y-10 md:pl-10 md:border-l md:border-white/25">
                <div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
                    Pan India
                  </div>
                  <div className="text-sm sm:text-base text-white/90 mt-2 font-medium leading-relaxed">
                    Active nationwide coverage: Varanasi HQ &amp; solar installation network across India
                  </div>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
                    30,000+
                  </div>
                  <div className="text-sm sm:text-base text-white/90 mt-2 font-medium">
                    Rooftop audits &amp; feasibility checks completed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* 5. Territory Satellite GIS Map Section (Page 3 of Reference PDF) - Full Width */}
        <FadeIn>
          <div id="workflow" className="mb-20 w-full">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Allocate Thousands of Leads with Zero Territory Overlap.
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-4xl mb-8 font-normal">
            Territory GIS plots every lead on satellite imagery, then splits the city into zones your teams own.
          </p>

          {/* 3 Core Points Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 w-full">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-sky-400 transition-colors duration-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Discrete Locality Clustering</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Leads are automatically grouped into exact centroids: Gaughat, Katra, Naini, DLW, Bazardiha, Assi.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-sky-400 transition-colors duration-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Google Satellite & Street View</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect rooftop space and road accessibility before deploying field engineers.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-sky-400 transition-colors duration-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">1-Click Hierarchy Allocation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sales Heads can assign 500+ localized leads directly to Team Leaders and Field Consultants with zero duplicate visits.
              </p>
            </div>
          </div>

          {/* Territory GIS Satellite Map Component Widget - Wide Expansive */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 shadow-sm w-full">
            {/* Widget Top Header */}
            <div className="bg-slate-900/90 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-slate-200 text-xs sm:text-sm">Territory GIS · Satellite view</span>
              </div>
              <span className="font-mono text-slate-400 font-medium">3 zones · 31,674 leads</span>
            </div>

            {/* Dark Satellite Surface with Realistic GIS Terrain & Solid Red Lead Points */}
            <div className="relative h-[380px] sm:h-[440px] lg:h-[480px] bg-[#070b14] p-4 sm:p-8 overflow-hidden flex items-center justify-center">
              {/* Detailed GIS Topographic & Satellite Vector Map Base */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Lat/Long Grid Matrix */}
                <div 
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage: `linear-gradient(#64748b 1px, transparent 1px), linear-gradient(to right, #64748b 1px, transparent 1px)`,
                    backgroundSize: '48px 48px'
                  }}
                />

                {/* Satellite GIS Map Arteries: Rivers (Ganga & Yamuna) & Highways (NH19) */}
                <svg className="w-full h-full opacity-40" preserveAspectRatio="none" viewBox="0 0 1000 600">
                  {/* Subtle Topographic Elevation Contours */}
                  <path d="M 0,280 Q 250,230 500,260 T 1000,210" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                  <path d="M 0,380 Q 250,340 500,390 T 1000,340" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                  <path d="M 0,480 Q 300,450 600,480 T 1000,460" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                  
                  {/* Highway / Road Grid Corridors (NH19 & GT Road) */}
                  <path d="M 0,220 L 320,290 L 580,310 L 750,280 L 1000,260" fill="none" stroke="#334155" strokeWidth="3" strokeDasharray="6 3" />
                  <path d="M 180,0 L 280,600" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />
                  <path d="M 780,0 L 820,600" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />
                  <path d="M 280,300 L 400,600" fill="none" stroke="#1e293b" strokeWidth="1.5" />

                  {/* Yamuna River (Flowing from SW to Sangam) */}
                  <path d="M 0,420 Q 140,390 280,360" fill="none" stroke="#0284c7" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
                  {/* Ganga River (Flowing from NW through Sangam to Varanasi East) */}
                  <path d="M 120,0 Q 200,200 280,360 Q 420,440 620,380 Q 780,320 860,260 T 1000,220" fill="none" stroke="#0284c7" strokeWidth="10" strokeLinecap="round" opacity="0.6" />
                  <path d="M 120,0 Q 200,200 280,360 Q 420,440 620,380 Q 780,320 860,260 T 1000,220" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.8" />
                </svg>

                {/* Solid Red Lead Points / Map Pins (Realistic CRM GIS Leads - NO GLOW) */}
                {/* Prayagraj Cluster Points */}
                <div className="absolute top-[22%] left-[8%] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/80">Katra (142)</span>
                </div>
                <div className="absolute top-[32%] left-[22%] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/80">Civil Lines (318)</span>
                </div>
                <div className="absolute top-[52%] left-[10%] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/80">Gaughat (96)</span>
                </div>
                <div className="absolute top-[66%] left-[18%] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/80">Kareli (84)</span>
                </div>
                <div className="absolute top-[76%] left-[26%] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">Naini (110)</span>
                </div>
                <div className="absolute top-[16%] left-[18%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>
                <div className="absolute top-[42%] left-[4%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>
                <div className="absolute top-[58%] left-[28%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>
                <div className="absolute top-[38%] left-[32%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>

                {/* Central Corridor Highway Leads (Between Prayagraj & Varanasi) */}
                <div className="absolute top-[48%] left-[46%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>
                <div className="absolute top-[52%] left-[54%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>

                {/* Varanasi Cluster Points */}
                <div className="absolute top-[22%] right-[32%] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/80">DLW (240)</span>
                </div>
                <div className="absolute top-[36%] right-[18%] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/80">Kakarmatta (128)</span>
                </div>
                <div className="absolute top-[54%] right-[28%] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/80">Bazardiha (94)</span>
                </div>
                <div className="absolute top-[68%] right-[14%] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-xs"></span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/80">Assi (186)</span>
                </div>
                <div className="absolute top-[16%] right-[22%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>
                <div className="absolute top-[48%] right-[6%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>
                <div className="absolute top-[74%] right-[24%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>
                <div className="absolute top-[30%] right-[10%]">
                  <span className="w-2 h-2 rounded-full bg-red-600 border border-white shadow-xs inline-block"></span>
                </div>

                {/* GIS Coordinates & Scale Legend (Realistic GIS Controls) */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-[10px] font-mono text-slate-400 backdrop-blur-xs">
                  <span className="text-emerald-400">● GPS</span>
                  <span>25.43°N, 81.84°E</span>
                </div>
                <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-[10px] font-mono text-slate-400 backdrop-blur-xs">
                  <span>Scale</span>
                  <span className="w-10 h-1 bg-slate-600 inline-block"></span>
                  <span>10 km</span>
                </div>
              </div>

              {/* Map Layout Grid: Zone 1 & Zone 2 (Prayagraj) on Left, Zone 3 (Varanasi) on Right */}
              <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left: Prayagraj Core & Yamuna Bank */}
                <div className="md:col-span-6 space-y-4">
                  {/* Zone 1 Box (Prayagraj Core) */}
                  <div className="border border-emerald-500/60 bg-emerald-950/25 rounded-xl p-4 sm:p-5 backdrop-blur-xs relative">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs font-bold text-emerald-400">Zone 1 · Prayagraj Core</span>
                      <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">12,400 leads</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">Katra</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">Civil Lines</span>
                      </div>
                    </div>
                  </div>

                  {/* Zone 2 Box (Yamuna Bank / Gaughat) */}
                  <div className="border border-sky-500/60 bg-sky-950/25 rounded-xl p-4 sm:p-5 backdrop-blur-xs relative">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs font-bold text-sky-400">Zone 2 · Yamuna Bank</span>
                      <span className="text-[10px] font-mono text-sky-300 font-bold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/30">10,354 leads</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">Gaughat</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">Kareli</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Varanasi South (Zone 3) */}
                <div className="md:col-span-6">
                  <div className="border border-amber-500/60 bg-amber-950/25 rounded-xl p-4 sm:p-5 backdrop-blur-xs relative">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs font-bold text-amber-400">Zone 3 · Varanasi South</span>
                      <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">8,920 leads</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">DLW</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">Kakarmatta</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">Bazardiha</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">Assi</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-3 border-t border-amber-500/20 flex items-center justify-between">
                      <span>Yamuna / Ganga corridor</span>
                      <span className="text-amber-300 font-mono">0 overlap</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Zones Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-900 px-6 py-4 border-t border-slate-800/80">
              <div className="py-2 md:py-0 md:pr-4">
                <div className="text-xs font-semibold text-emerald-400">Zone 1 · Prayagraj Core</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Civil Lines & Katra</div>
                <div className="text-sm font-bold text-white mt-1">12,400 leads</div>
              </div>
              <div className="py-2 md:py-0 md:px-4">
                <div className="text-xs font-semibold text-sky-400">Zone 2 · Yamuna Bank</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Gaughat & Kareli</div>
                <div className="text-sm font-bold text-white mt-1">10,354 leads</div>
              </div>
              <div className="py-2 md:py-0 md:pl-4">
                <div className="text-xs font-semibold text-amber-400">Zone 3 · Varanasi South</div>
                <div className="text-[11px] text-slate-400 mt-0.5">DLW & Kakarmatta</div>
                <div className="text-sm font-bold text-white mt-1">8,920 leads</div>
              </div>
            </div>
          </div>
        </div>
        </FadeIn>



        {/* 9. Meet the Experts / Leadership Section */}
        <FadeIn>
          <section className="mb-12 sm:mb-16 w-full">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Leadership &amp; Vision
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2.5 font-normal">
              Guided by experienced leaders driving India&apos;s clean energy transition.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-14 lg:gap-20 max-w-5xl mx-auto">
            {/* Deepak Pandey - CEO & Founder */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white shadow-[0_10px_25px_rgba(0,0,0,0.12)] bg-white relative transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/images/team-deepak-pandey.png"
                  alt="Deepak Pandey - CEO & Founder"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 192px"
                  unoptimized
                  priority
                />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 mt-4 tracking-tight">
                Deepak Pandey
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-emerald-600 mt-1">
                CEO &amp; Founder
              </p>
            </div>

            {/* Sachin Pandey - Co-Founder */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white shadow-[0_10px_25px_rgba(0,0,0,0.12)] bg-white relative transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/images/team-sachin-pandey.jpg"
                  alt="Sachin Pandey - Co-Founder"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 192px"
                  unoptimized
                  priority
                />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 mt-4 tracking-tight">
                Sachin Pandey
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-emerald-600 mt-1">
                Co-Founder
              </p>
            </div>
          </div>
        </section>
        </FadeIn>

        {/* Footer */}
        <footer className="text-center py-5 border-t border-slate-200/80 w-full">
          <p className="text-xs text-slate-400">
            © 2026 Santori Solar Solutions. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
