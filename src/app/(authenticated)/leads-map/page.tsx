'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin,
  Globe2,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Compass,
  Layers,
  Sparkles,
  Building2,
  Navigation,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from 'lucide-react';

interface DivisionSummary {
  name: string;
  total: number;
  assigned: number;
  unassigned: number;
}

interface CitySummary {
  name: string;
  state: string;
  total: number;
  assigned: number;
  unassigned: number;
  divisions: DivisionSummary[];
}

interface StateSummary {
  name: string;
  total: number;
  assigned: number;
  unassigned: number;
  cities: CitySummary[];
}

interface GeoDataResponse {
  success: boolean;
  summary: {
    totalLeads: number;
    totalAssigned: number;
    totalUnassigned: number;
    assignedPercentage: number;
    unassignedPercentage: number;
    totalStates: number;
    totalCities: number;
  };
  states: StateSummary[];
  cities: CitySummary[];
}

// Coordinate lookup for regional visual placement on canvas
const KNOWN_COORDINATES: Record<string, { x: number; y: number }> = {
  // Uttar Pradesh
  lucknow: { x: 48, y: 42 },
  kanpur: { x: 44, y: 46 },
  prayagraj: { x: 55, y: 55 },
  allahabad: { x: 55, y: 55 },
  varanasi: { x: 64, y: 56 },
  gorakhpur: { x: 62, y: 38 },
  mirzapur: { x: 62, y: 62 },
  jaunpur: { x: 59, y: 50 },
  chandauli: { x: 67, y: 58 },
  bhadohi: { x: 58, y: 57 },
  ayodhya: { x: 53, y: 41 },
  faizabad: { x: 53, y: 41 },
  bareilly: { x: 38, y: 34 },
  agra: { x: 32, y: 45 },
  aligarh: { x: 30, y: 40 },
  noida: { x: 26, y: 36 },
  ghaziabad: { x: 27, y: 35 },
  meerut: { x: 28, y: 32 },
  jhansi: { x: 38, y: 58 },
  // Delhi NCR
  delhi: { x: 25, y: 35 },
  gurugram: { x: 24, y: 37 },
  gurgaon: { x: 24, y: 37 },
  faridabad: { x: 26, y: 38 },
  // Bihar
  patna: { x: 75, y: 52 },
  gaya: { x: 74, y: 60 },
  muzaffarpur: { x: 76, y: 45 },
  bhagalpur: { x: 82, y: 54 },
  // Madhya Pradesh
  bhopal: { x: 34, y: 65 },
  indore: { x: 28, y: 69 },
  jabalpur: { x: 46, y: 68 },
  gwalior: { x: 34, y: 49 },
  // Rajasthan
  jaipur: { x: 20, y: 46 },
  kota: { x: 22, y: 58 },
  jodhpur: { x: 12, y: 49 },
};

function getCityCoordinates(cityName: string, index: number, total: number) {
  const key = cityName.toLowerCase().trim();
  if (KNOWN_COORDINATES[key]) {
    return KNOWN_COORDINATES[key];
  }
  // Fallback programmatic circular dispersion for any newly added cities
  const angle = (index / Math.max(1, total)) * 2 * Math.PI;
  const radius = 25;
  const cx = 50 + radius * Math.cos(angle);
  const cy = 50 + radius * Math.sin(angle);
  return { x: Math.max(10, Math.min(90, cx)), y: Math.max(15, Math.min(85, cy)) };
}

export default function LeadsMapPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();

  const [data, setData] = useState<GeoDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<CitySummary | null>(null);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});
  const [zoomLevel, setZoomLevel] = useState(1);

  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'director' ||
    user?.department?.name === 'IT' ||
    hasPermission('admin:access') ||
    hasPermission('admin:analytics_view') ||
    hasPermission('reports:view');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/leads/geo-summary');
      const json = await res.json();
      if (json.success) {
        setData(json);
        // Expand first state by default
        if (json.states && json.states.length > 0) {
          setExpandedStates({ [json.states[0].name]: true });
          if (json.states[0].cities.length > 0) {
            setSelectedCity(json.states[0].cities[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load geo summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const toggleState = (stateName: string) => {
    setExpandedStates((prev) => ({ ...prev, [stateName]: !prev[stateName] }));
  };

  const toggleCity = (cityName: string) => {
    setExpandedCities((prev) => ({ ...prev, [cityName]: !prev[cityName] }));
  };

  // Filtered tree based on search
  const filteredStates = useMemo(() => {
    if (!data?.states) return [];
    if (!search.trim()) return data.states;

    const q = search.toLowerCase().trim();

    return data.states
      .map((st) => {
        const stateMatches = st.name.toLowerCase().includes(q);
        const matchingCities = st.cities
          .map((ct) => {
            const cityMatches = ct.name.toLowerCase().includes(q);
            const matchingDivisions = ct.divisions.filter((dv) =>
              dv.name.toLowerCase().includes(q)
            );
            if (cityMatches || matchingDivisions.length > 0 || stateMatches) {
              return {
                ...ct,
                divisions: matchingDivisions.length > 0 ? matchingDivisions : ct.divisions,
              };
            }
            return null;
          })
          .filter(Boolean) as CitySummary[];

        if (stateMatches || matchingCities.length > 0) {
          return {
            ...st,
            cities: matchingCities.length > 0 ? matchingCities : st.cities,
          };
        }
        return null;
      })
      .filter(Boolean) as StateSummary[];
  }, [data, search]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  // Strict Admin Gate
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-lg mt-6 max-w-xl mx-auto">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Admin Access Only</h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          The Geographic Reference Map is an executive overview tool restricted to System Administrators and Directors.
        </p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalLeads: 0,
    totalAssigned: 0,
    totalUnassigned: 0,
    assignedPercentage: 0,
    unassignedPercentage: 0,
    totalStates: 0,
    totalCities: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                Territory & Lead Distribution Map
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                  Admin Reference
                </span>
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Spatial overview of active leads across States, Districts, and Sub-Divisions (Read-Only Reference)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--bg-card)] hover:bg-slate-800 border border-[var(--border-color)] text-xs text-[var(--text-primary)] rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Active Leads
            </span>
            <Globe2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {summary.totalLeads.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
            Across {summary.totalCities} cities in {summary.totalStates} states
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Assigned Leads
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {summary.totalAssigned.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-1">
            {summary.assignedPercentage}% of overall pipeline
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Unassigned Leads
            </span>
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {summary.totalUnassigned.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-1">
            {summary.unassignedPercentage}% awaiting distribution
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Coverage Density
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {summary.totalCities} <span className="text-sm font-normal text-[var(--text-secondary)]">Districts</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Regional operational footprint
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Map Canvas (Left) + Hierarchy Tree Explorer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (7 Columns): Interactive Spatial Territory Canvas */}
        <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xl flex flex-col min-h-[560px]">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Spatial Cluster View
              </h3>
            </div>

            {/* Canvas Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)]">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.15))}
                className="p-1 hover:bg-slate-700 text-[var(--text-secondary)] hover:text-white rounded-lg transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-[var(--text-secondary)]">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
                className="p-1 hover:bg-slate-700 text-[var(--text-secondary)] hover:text-white rounded-lg transition-all"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="text-[10px] px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-semibold"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Interactive Visual Map Surface */}
          <div className="flex-1 relative bg-[#0d1117] rounded-xl border border-slate-800/80 overflow-hidden min-h-[440px] flex items-center justify-center select-none">
            {/* Subtle Grid Background */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            ></div>

            {/* Compass Watermark */}
            <div className="absolute top-4 right-4 text-slate-800/40 pointer-events-none flex items-center gap-1 font-mono text-[10px]">
              <Navigation className="w-4 h-4 rotate-45" /> NORTH
            </div>

            {/* Loading Overlay */}
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Aggregating territory coordinates...</span>
              </div>
            ) : (
              <div
                className="w-full h-full relative transition-transform duration-300 ease-out"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* Render District Nodes */}
                {(data?.cities || []).map((city, idx) => {
                  const coords = getCityCoordinates(city.name, idx, data?.cities.length || 1);
                  const isSelected = selectedCity?.name.toLowerCase() === city.name.toLowerCase();
                  const unassignedRatio = city.total > 0 ? city.unassigned / city.total : 0;
                  const isHighUnassigned = unassignedRatio > 0.35 && city.unassigned >= 5;

                  return (
                    <div
                      key={city.name}
                      onClick={() => setSelectedCity(city)}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 transition-all"
                      style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    >
                      {/* Pulse ring for high lead density or selected */}
                      {isSelected && (
                        <div className="absolute -inset-2 rounded-full bg-emerald-500/20 animate-ping pointer-events-none"></div>
                      )}

                      {/* City Marker Node */}
                      <div
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all duration-200 shadow-lg ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/40 scale-110'
                            : isHighUnassigned
                            ? 'bg-[#1e1c18] text-amber-200 border-amber-500/40 hover:border-amber-400 hover:scale-105'
                            : 'bg-[#161b22] text-slate-200 border-slate-700/80 hover:border-emerald-500/50 hover:scale-105'
                        }`}
                      >
                        <MapPin
                          className={`w-3.5 h-3.5 ${
                            isSelected
                              ? 'text-white'
                              : isHighUnassigned
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        />
                        <span className="tracking-wide font-medium">{city.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${
                            isSelected
                              ? 'bg-black/20 text-white'
                              : isHighUnassigned
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {city.total}
                        </span>
                      </div>

                      {/* Floating Micro Breakdown on Hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                        <div className="bg-[#1c2128] border border-slate-700 text-slate-200 rounded-xl p-2.5 shadow-2xl text-[11px] whitespace-nowrap min-w-[140px]">
                          <div className="font-bold text-white border-b border-slate-700 pb-1 mb-1">
                            {city.name} ({city.state})
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Assigned:</span>
                            <span className="font-mono font-bold">{city.assigned}</span>
                          </div>
                          <div className="flex justify-between text-amber-400">
                            <span>Unassigned:</span>
                            <span className="font-mono font-bold">{city.unassigned}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1">
                            {city.divisions.length} Divisions / Sub-Areas
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected District Inspector Strip */}
          {selectedCity && (
            <div className="mt-4 p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[var(--border-color)] pb-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {selectedCity.name} District Breakdown
                    <span className="text-xs text-[var(--text-secondary)] font-normal">
                      ({selectedCity.state})
                    </span>
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                    Assigned: {selectedCity.assigned}
                  </span>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                    Unassigned: {selectedCity.unassigned}
                  </span>
                </div>
              </div>

              {/* Sub-divisions list */}
              <div>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                  Mapped Divisions & Areas ({selectedCity.divisions.length})
                </span>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                  {selectedCity.divisions.map((div) => (
                    <div
                      key={div.name}
                      className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs flex items-center gap-2 text-slate-300"
                    >
                      <span className="font-medium text-white">{div.name}</span>
                      <span className="font-mono text-[10px] text-emerald-400 font-bold">
                        {div.total}
                      </span>
                      {div.unassigned > 0 && (
                        <span className="font-mono text-[9px] text-amber-400 font-semibold" title="Unassigned">
                          ({div.unassigned} free)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right (5 Columns): Collapsible Hierarchy Tree Explorer */}
        <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xl flex flex-col min-h-[560px]">
          <div className="space-y-3 border-b border-[var(--border-color)] pb-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Territory Hierarchy Tree
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                {summary.totalStates} States • {summary.totalCities} Cities
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search state, city, area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Tree Explorer Container */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px]">
            {filteredStates.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                No territories match "{search}"
              </div>
            ) : (
              filteredStates.map((st) => {
                const isStateOpen = expandedStates[st.name] ?? false;

                return (
                  <div
                    key={st.name}
                    className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-main)] transition-all"
                  >
                    {/* State Header Node */}
                    <div
                      onClick={() => toggleState(st.name)}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        {isStateOpen ? (
                          <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span>{st.name}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-normal">
                          ({st.cities.length} cities)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md">
                          {st.total}
                        </span>
                      </div>
                    </div>

                    {/* Cities list under state */}
                    {isStateOpen && (
                      <div className="border-t border-[var(--border-color)] p-2 space-y-1.5 bg-[var(--bg-card)]">
                        {st.cities.map((ct) => {
                          const isCityOpen = expandedCities[ct.name] ?? false;
                          const isCurrentSelected =
                            selectedCity?.name.toLowerCase() === ct.name.toLowerCase();

                          return (
                            <div
                              key={ct.name}
                              className={`rounded-lg border transition-all ${
                                isCurrentSelected
                                  ? 'border-emerald-500/50 bg-emerald-500/5'
                                  : 'border-[var(--border-color)]/60 bg-[var(--bg-main)]'
                              }`}
                            >
                              {/* City Node */}
                              <div
                                onClick={() => {
                                  setSelectedCity(ct);
                                  toggleCity(ct.name);
                                }}
                                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                              >
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                                  {isCityOpen ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  )}
                                  <span className={isCurrentSelected ? 'text-emerald-400 font-bold' : ''}>
                                    {ct.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                  <span className="text-emerald-400 font-bold" title="Assigned">
                                    {ct.assigned}
                                  </span>
                                  <span className="text-slate-600">/</span>
                                  <span className="text-amber-400 font-bold" title="Unassigned">
                                    {ct.unassigned}
                                  </span>
                                </div>
                              </div>

                              {/* Divisions under city */}
                              {isCityOpen && ct.divisions.length > 0 && (
                                <div className="p-2 pt-0 border-t border-[var(--border-color)]/40 space-y-1">
                                  {ct.divisions.map((div) => (
                                    <div
                                      key={div.name}
                                      className="flex items-center justify-between text-[11px] p-1.5 rounded-md hover:bg-slate-800/50 text-slate-300"
                                    >
                                      <span className="truncate pr-2">• {div.name}</span>
                                      <div className="flex items-center gap-2 font-mono shrink-0">
                                        <span className="text-white font-semibold">{div.total}</span>
                                        {div.unassigned > 0 && (
                                          <span className="text-[10px] text-amber-400">
                                            ({div.unassigned} free)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
