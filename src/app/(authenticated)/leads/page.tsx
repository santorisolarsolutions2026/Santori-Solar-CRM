'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  X,
  Check,
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
  0: { name: 'Uninitiated', class: 'bg-stone-550/15 text-stone-400 border-stone-500/20 font-bold' },
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
};

const CONNECTION_BADGES: Record<string, string> = {
  residential: 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10',
  commercial: 'bg-blue-500/5 text-blue-400 border-blue-500/10',
  industrial: 'bg-purple-500/5 text-purple-400 border-purple-500/10',
};

// Client-side CSV Parser function
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
      if (row.length > 0 && row.some(cell => cell !== '')) {
        lines.push(row);
      }
      row = [];
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell !== '')) {
      lines.push(row);
    }
  }
  return lines;
}

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

  // Multiple selection and bulk actions states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Keep track of the last active filters to clear selected IDs only when filters change
  const lastFiltersRef = useRef({
    search: '',
    statusFilter: '',
    consultantFilter: '',
    connectionFilter: '',
    sourceFilter: '',
    cityFilter: ''
  });

  useEffect(() => {
    const filtersChanged =
      lastFiltersRef.current.search !== search ||
      lastFiltersRef.current.statusFilter !== statusFilter ||
      lastFiltersRef.current.consultantFilter !== consultantFilter ||
      lastFiltersRef.current.connectionFilter !== connectionFilter ||
      lastFiltersRef.current.sourceFilter !== sourceFilter ||
      lastFiltersRef.current.cityFilter !== cityFilter;

    if (filtersChanged) {
      setSelectedIds([]);
      lastFiltersRef.current = {
        search,
        statusFilter,
        consultantFilter,
        connectionFilter,
        sourceFilter,
        cityFilter
      };
    }
  }, [search, statusFilter, consultantFilter, connectionFilter, sourceFilter, cityFilter]);

  const handleSelectToggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = async () => {
    const visibleIds = leads.map((l) => l.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          ids_only: 'true',
          search,
          status: statusFilter,
          consultant_id: consultantFilter,
          connection_type: connectionFilter,
          lead_source: sourceFilter,
          city: cityFilter,
        });
        const res = await fetch(`/api/v1/leads?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSelectedIds(data.data);
        }
      } catch (err) {
        console.error('Failed to select all leads across pages:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected leads from the database? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/v1/leads?ids=${selectedIds.join(',')}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Leads deleted successfully.');
        setSelectedIds([]);
        fetchLeads();
      } else {
        alert(data.message || 'Failed to delete leads.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while deleting leads.');
    }
  };

  // CSV Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    customerName: '',
    mobile: '',
    mobileAlt: '',
    connectionType: '',
    sanctionedLoadKw: '',
    address: '',
    pinCode: '',
    city: '',
    state: '',
    leadSource: '',
    discomName: '',
    connectionNumber: '',
  });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    skipped: { mobile: string; customerName: string; reason: string }[];
  } | null>(null);

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

  // Handle CSV File Selection and Read
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setCsvFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        const headers = parsed[0];
        setCsvHeaders(headers);
        setCsvRows(parsed.slice(1));

        // Auto-mapping heuristics
        const initialMapping: Record<string, string> = {};
        const headerLower = headers.map(h => h.toLowerCase());

        // Simple match finder helper
        const findBestHeader = (keys: string[]): string => {
          const clean = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '');
          const cleanHeaders = headers.map(clean);
          const cleanKeys = keys.map(clean);

          // 1. Try exact match on clean strings first
          let idx = cleanHeaders.findIndex(ch => cleanKeys.some(ck => ch === ck));
          if (idx !== -1) return headers[idx];

          // 2. Try partial match, guarding 'name' from matching 'discom'
          idx = cleanHeaders.findIndex((ch, i) => {
            return cleanKeys.some(ck => {
              if (ck === 'name') {
                // For customer name field, only match if it really refers to a customer name, client name or name
                return ch === 'name' || ch === 'customername' || ch === 'clientname' || ch === 'fullname';
              }
              return ch.includes(ck);
            });
          });
          return idx !== -1 ? headers[idx] : '';
        };

        initialMapping.customerName = findBestHeader(['customer name', 'client name', 'name', 'buyer']);
        initialMapping.mobile = findBestHeader(['contact number', 'mobile', 'phone', 'contact', 'phone number']);
        initialMapping.mobileAlt = findBestHeader(['alternate', 'alt mobile', 'alt phone']);
        initialMapping.address = findBestHeader(['complete address', 'address', 'location', 'site address']);
        initialMapping.pinCode = findBestHeader(['pin code', 'pincode', 'zip', 'zipcode', 'postal code']);
        initialMapping.city = findBestHeader(['city', 'town', 'district']);
        initialMapping.state = findBestHeader(['state', 'province']);
        initialMapping.sanctionedLoadKw = findBestHeader(['pv capacity', 'capacity', 'load', 'kw', 'system size']);
        initialMapping.connectionType = findBestHeader(['connection type', 'type']);
        initialMapping.leadSource = findBestHeader(['source', 'lead source']);
        initialMapping.discomName = findBestHeader(['discom name', 'discom', 'utility', 'electricity board']);
        initialMapping.connectionNumber = findBestHeader(['connection number', 'consumer number', 'consumer no', 'ca number', 'connection no']);

        setColumnMapping(initialMapping);
      }
    };
    reader.readAsText(file);
  };

  // Execute CSV Import
  const handleExecuteImport = async () => {
    if (csvRows.length === 0) return;
    setImporting(true);
    setImportResult(null);

    try {
      // Build the list of mapped items
      const leadsToImport = csvRows.map((row) => {
        const item: Record<string, any> = {};
        const otherFields: Record<string, any> = {};

        // Helper to get value from mapped header index
        const getRowVal = (fieldName: string) => {
          const headerName = columnMapping[fieldName];
          if (!headerName) return undefined;
          const idx = csvHeaders.indexOf(headerName);
          return idx !== -1 ? row[idx] : undefined;
        };

        // Helper to clean mobile values client-side (e.g. stripping .0 from float representation)
        const cleanPhoneClient = (val: any) => {
          if (!val) return undefined;
          let str = String(val).trim().replace(/[\s-]/g, '');
          if (str.includes('.')) {
            str = str.split('.')[0];
          }
          return str;
        };

        // Core fields mapping
        item.customerName = getRowVal('customerName');
        
        const rawMobile = getRowVal('mobile');
        item.mobile = rawMobile ? cleanPhoneClient(rawMobile) : undefined;
        
        const rawMobileAlt = getRowVal('mobileAlt');
        item.mobileAlt = rawMobileAlt ? cleanPhoneClient(rawMobileAlt) : undefined;
        item.address = getRowVal('address');
        item.pinCode = getRowVal('pinCode');
        item.city = getRowVal('city');
        item.state = getRowVal('state');
        item.leadSource = getRowVal('leadSource');
        item.connectionType = getRowVal('connectionType') || 'residential';
        item.discomName = getRowVal('discomName');
        item.connectionNumber = getRowVal('connectionNumber');

        const rawCapacity = getRowVal('sanctionedLoadKw');
        if (rawCapacity) {
          const parsedCapacity = parseFloat(rawCapacity.replace(/[^0-9.]/g, ''));
          item.sanctionedLoadKw = isNaN(parsedCapacity) ? null : parsedCapacity;
        }

        // Save all OTHER unmapped columns as an object inside otherData
        const mappedHeaders = Object.values(columnMapping).filter(Boolean);
        csvHeaders.forEach((header, index) => {
          if (!mappedHeaders.includes(header)) {
            otherFields[header] = row[index] || '';
          }
        });

        if (Object.keys(otherFields).length > 0) {
          item.otherData = JSON.stringify(otherFields);
        }

        return item;
      });

      const res = await fetch('/api/v1/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsToImport }),
      });

      const data = await res.json();
      if (data.success) {
        setImportResult({
          success: true,
          importedCount: data.data.importedCount,
          skippedCount: data.data.skippedCount,
          skipped: data.data.skipped || [],
        });
        fetchLeads();
      } else {
        alert(data.message || 'Import failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network or server error during import.');
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setImportResult(null);
  };

  const totalPages = Math.ceil(total / limit);

  // Mapped lead details preview (first 5 rows)
  const getPreviewData = () => {
    return csvRows.slice(0, 5).map((row) => {
      const getVal = (field: string) => {
        const header = columnMapping[field];
        if (!header) return '-';
        const idx = csvHeaders.indexOf(header);
        const val = idx !== -1 ? row[idx] || '-' : '-';
        
        if ((field === 'mobile' || field === 'mobileAlt') && val !== '-') {
          let str = String(val).trim().replace(/[\s-]/g, '');
          if (str.includes('.')) {
            str = str.split('.')[0];
          }
          return str;
        }
        return val;
      };
      return {
        customerName: getVal('customerName'),
        mobile: getVal('mobile'),
        address: getVal('address'),
        pinCode: getVal('pinCode'),
        city: getVal('city'),
        state: getVal('state'),
        capacity: getVal('sanctionedLoadKw'),
      };
    });
  };

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>
            <Link
              href="/leads/new"
              className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Lead</span>
            </Link>
          </div>
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

      {/* Bulk Actions Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-semibold text-slate-200">
              <strong>{selectedIds.length}</strong> leads selected {selectedIds.length === total ? "(all matching leads across pages)" : ""}
            </span>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={handleBulkDelete}
              className="py-2 px-4 bg-red-650 hover:bg-red-500 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected Leads</span>
            </button>
          )}
        </div>
      )}

      {/* Leads Table Card */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && leads.map(l => l.id).every((id) => selectedIds.includes(id))}
                    onChange={handleSelectAllToggle}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Lead ID</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Mobile</th>
                <th className="py-4 px-6">City</th>
                <th className="py-4 px-6">Connection</th>
                <th className="py-4 px-6">Pipeline Stage</th>
                <th className="py-4 px-6">Assigned to</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    Fetching active opportunities...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
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
                      } ${selectedIds.includes(lead.id) ? 'bg-amber-500/[0.02]' : ''}`}
                    >
                      <td className="py-3.5 px-6 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => handleSelectToggle(lead.id)}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
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
                        {lead.tl?.name ? (
                          <span>{lead.tl.name} <span className="text-[10px] text-slate-500 font-semibold">(TL)</span></span>
                        ) : lead.consultant?.name ? (
                          <span>{lead.consultant.name}</span>
                        ) : (
                          <span className="text-slate-500 text-xs italic">Unassigned</span>
                        )}
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

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Import Leads from CSV</h3>
              </div>
              <button onClick={handleCloseImportModal} className="text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* File Selector */}
              {!csvFile ? (
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/20 flex flex-col items-center justify-center hover:border-slate-700 transition-all">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">Select a CSV leads dataset to begin</p>
                  <p className="text-[10px] text-slate-500 mt-1 mb-4">
                    Required fields: Customer Name, Contact Number, Address, Zip, City, State
                  </p>
                  <label className="cursor-pointer py-2 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-lg font-bold text-xs shadow-md">
                    Choose CSV File
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCSVFileChange}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* File info banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-4 border border-slate-850 rounded-xl">
                    <div className="text-xs">
                      <p className="text-slate-400 font-semibold">Selected File: <span className="text-white">{csvFile.name}</span></p>
                      <p className="text-slate-500 mt-0.5">Detected: <strong className="text-amber-400">{csvRows.length}</strong> records and <strong className="text-amber-400">{csvHeaders.length}</strong> headers.</p>
                    </div>
                    <button
                      onClick={() => { setCsvFile(null); setCsvHeaders([]); setCsvRows([]); setImportResult(null); }}
                      className="text-xs text-red-400 hover:text-red-300 font-bold"
                    >
                      Clear File
                    </button>
                  </div>

                  {/* Mapping Grid */}
                  {!importResult && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/80 pb-2">
                        Map CSV Columns to Lead Fields
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Select which header from your CSV matches each lead attribute in the CRM database.
                        Any unmapped columns will be stored as <strong className="text-slate-400">JSON metadata</strong> in the lead's "Other Data" field.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { key: 'customerName', label: 'Customer Name *', req: true },
                          { key: 'mobile', label: 'Contact Number (Mobile) *', req: true },
                          { key: 'mobileAlt', label: 'Alternate Mobile', req: false },
                          { key: 'address', label: 'Complete Address *', req: true },
                          { key: 'pinCode', label: 'Pin Code / Zip *', req: true },
                          { key: 'city', label: 'City *', req: true },
                          { key: 'state', label: 'State *', req: true },
                          { key: 'sanctionedLoadKw', label: 'PV Capacity (kW)', req: false },
                          { key: 'connectionType', label: 'Connection Type', req: false },
                          { key: 'leadSource', label: 'Lead Source', req: false },
                          { key: 'discomName', label: 'DisCom Name', req: false },
                          { key: 'connectionNumber', label: 'Connection Number', req: false },
                        ].map((field) => (
                          <div key={field.key} className="space-y-1 bg-slate-950/20 p-3 border border-slate-850 rounded-lg">
                            <label className="block text-[11px] font-bold text-slate-300">
                              {field.label}
                            </label>
                            <select
                              value={columnMapping[field.key] || ''}
                              onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                              className="block w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-slate-300 text-xs focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">-- Ignore / Unmapped --</option>
                              {csvHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5 Row Mapped Preview */}
                  {!importResult && csvRows.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Mapped Field Preview (First 5 Rows)
                      </h4>
                      <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-900/40 text-slate-400 border-b border-slate-800">
                              <th className="py-2.5 px-4 font-bold">Customer Name</th>
                              <th className="py-2.5 px-4 font-bold">Mobile</th>
                              <th className="py-2.5 px-4 font-bold">Address</th>
                              <th className="py-2.5 px-4 font-bold">Pin Code</th>
                              <th className="py-2.5 px-4 font-bold">City / State</th>
                              <th className="py-2.5 px-4 font-bold">Capacity (kW)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-slate-300 bg-slate-950/10">
                            {getPreviewData().map((row, i) => (
                              <tr key={i} className="hover:bg-slate-900/10">
                                <td className="py-2 px-4 font-semibold text-white">{row.customerName}</td>
                                <td className="py-2 px-4 font-mono text-slate-400">{row.mobile}</td>
                                <td className="py-2 px-4 max-w-[200px] truncate">{row.address}</td>
                                <td className="py-2 px-4 font-mono">{row.pinCode}</td>
                                <td className="py-2 px-4">{row.city}, {row.state}</td>
                                <td className="py-2 px-4">{row.capacity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Import Results Card */}
                  {importResult && (
                    <div className="space-y-6">
                      <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Check className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wide">Import Process Completed</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Check the summary report below for detailed records creation status.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs font-semibold">
                          <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-lg text-center min-w-[80px]">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Imported</span>
                            <span className="text-base font-extrabold text-emerald-400">{importResult.importedCount}</span>
                          </div>
                          <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-lg text-center min-w-[80px]">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Skipped</span>
                            <span className="text-base font-extrabold text-amber-500">{importResult.skippedCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Skipped Details Log */}
                      {importResult.skipped.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Skipped Records Logs ({importResult.skipped.length})
                          </h4>
                          <div className="max-h-56 overflow-y-auto border border-slate-800/80 rounded-xl bg-slate-950/20 text-xs divide-y divide-slate-850">
                            {importResult.skipped.map((skipItem, index) => (
                              <div key={index} className="p-3 flex justify-between gap-4 hover:bg-slate-900/10 transition-all">
                                <div>
                                  <span className="font-bold text-white">{skipItem.customerName}</span>
                                  <span className="text-slate-500 ml-2 font-mono">{skipItem.mobile}</span>
                                </div>
                                <div className="text-amber-400 italic text-[11px] font-medium">
                                  {skipItem.reason}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseImportModal}
                className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs hover:text-white"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {csvFile && !importResult && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing}
                  className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {importing ? 'Importing Leads...' : `Execute Import (${csvRows.length} Leads)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
