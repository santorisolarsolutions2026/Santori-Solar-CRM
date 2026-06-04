'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Layers,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  Plus,
  Moon,
  Sun,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

interface Lead {
  id: number;
  leadCode: string;
  customerName: string;
  mobile: string;
  mobileAlt: string | null;
  connectionType: string;
  city: string;
  state: string;
  status: number;
  statusSub: string | null;
  leadSource: string | null;
  createdAt: string;
  updatedAt: string;
  isUnreachable: boolean;
  consultant: { id: number; name: string } | null;
  tl: { id: number; name: string } | null;
  manager: { id: number; name: string } | null;
}

const STAGE_BADGES: Record<number, { name: string; class: string }> = {
  1: { name: 'Fresh Lead', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  2: { name: 'DNP', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  3: { name: 'Follow Up', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  4: { name: 'Not Interested', class: 'bg-red-800/10 text-red-400 border-red-800/20' },
  5: { name: 'Call Later', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  6: { name: 'Already Installed', class: 'bg-slate-800/20 text-slate-500 border-slate-800/30' },
  7: { name: 'Decision Pending', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  8: { name: 'Meeting Booked 📅', class: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  9: { name: 'Meeting Done', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  10: { name: 'Disconnected', class: 'bg-slate-600/15 text-slate-400 border-slate-600/20' },
  11: { name: 'Switch Off', class: 'bg-slate-700/20 text-slate-400 border-slate-700/30' },
  12: { name: 'Can\'t Fit Solar', class: 'bg-stone-900 text-stone-400 border-stone-800/40' },
  13: { name: '✅ SALE DONE', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold' },
  14: { name: 'Meeting Ended', class: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
};

const CONNECTION_BADGES: Record<string, string> = {
  residential: 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10',
  commercial: 'bg-blue-500/5 text-blue-400 border-blue-500/10',
  industrial: 'bg-purple-500/5 text-purple-400 border-purple-500/10',
};

export default function LeadsPage() {
  const { user } = useAuth();
  
  // State for leads list
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter criteria
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Dropdown lists
  const [consultants, setConsultants] = useState<{ id: number; name: string }[]>([]);

  // Fetch consultants list for filter
  const fetchConsultants = async () => {
    try {
      const res = await fetch('/api/v1/users?role=consultant');
      const data = await res.json();
      if (data.success) {
        setConsultants(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch leads based on filters
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status: statusFilter,
        consultant_id: consultantFilter,
        connection_type: connectionFilter,
        lead_source: sourceFilter,
        city: cityFilter,
      });

      const res = await fetch(`/api/v1/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLeads(data.data.leads);
        setTotal(data.data.pagination.total);
      }
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConsultants();
    }
  }, [user]);

  // Refetch leads when filters change
  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [page, limit, statusFilter, consultantFilter, connectionFilter, sourceFilter, cityFilter, user]);

  // Handle Search Input (with manual or debounce enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setConsultantFilter('');
    setConnectionFilter('');
    setSourceFilter('');
    setCityFilter('');
    setPage(1);
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!window.confirm('Are you sure you want to deactivate (soft-delete) this lead?')) return;
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Lead deactivated successfully.');
        fetchLeads();
      } else {
        alert(data.message || 'Failed to delete lead.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Sales Leads Pipeline</h1>
          <p className="text-xs text-slate-400 mt-1">
            Nurture, track, and close solar customer deals.
          </p>
        </div>
        {['admin', 'sales_head', 'manager', 'tl'].includes(user?.role || '') && (
          <Link
            href="/leads/new"
            className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Live Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name / Mobile / Code..."
              className="block w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs transition-all"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs"
            >
              <option value="">All Pipeline Stages</option>
              {Object.entries(STAGE_BADGES).map(([id, badge]) => (
                <option key={id} value={id}>
                  {badge.name}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Type Filter */}
          <div>
            <select
              value={connectionFilter}
              onChange={(e) => { setConnectionFilter(e.target.value); setPage(1); }}
              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs"
            >
              <option value="">All Connection Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>

          {/* Lead Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs"
            >
              <option value="">All Lead Sources</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="cold_call">Cold Call</option>
              <option value="referral">Referral</option>
              <option value="walk_in">Walk-In</option>
              <option value="google_ad">Google Ad</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* City search */}
          <div>
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
              placeholder="Filter by City..."
              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="py-2 px-3 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg text-xs transition-all"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Leads Table Card */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Lead ID</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Mobile</th>
                <th className="py-4 px-6">City</th>
                <th className="py-4 px-6">Connection</th>
                <th className="py-4 px-6">Pipeline Stage</th>
                <th className="py-4 px-6">Assigned Consultant</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    Fetching active opportunities...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No leads found matching current criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const stage = STAGE_BADGES[lead.status] || { name: `Stage ${lead.status}`, class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
                  const connectionClass = CONNECTION_BADGES[lead.connectionType] || 'bg-slate-500/10 text-slate-400';
                  
                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-900/20 transition-all ${
                        lead.isUnreachable ? 'bg-red-500/[0.01] border-l-2 border-l-red-500' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6 font-mono font-bold text-xs text-slate-300">
                        {lead.leadCode}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-white flex items-center gap-2">
                        <span>{lead.customerName}</span>
                        {lead.isUnreachable && (
                          <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.25 font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Unreachable</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-300 font-mono text-xs">{lead.mobile}</td>
                      <td className="py-3.5 px-6 text-slate-300">{lead.city}</td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${connectionClass}`}>
                          {lead.connectionType}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${stage.class}`}>
                          {stage.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-slate-300">
                        {lead.consultant?.name || <span className="text-slate-500 text-xs italic">Unassigned</span>}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                            title="View Lead Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {['admin', 'sales_head', 'manager', 'tl'].includes(user?.role || '') && (
                            <>
                              <Link
                                href={`/leads/${lead.id}?edit=true`}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                                title="Edit Lead Info"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/20 text-slate-400 hover:text-red-400 transition-all"
                                  title="Deactivate Opportunity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (<strong>{total}</strong> leads total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1 transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
