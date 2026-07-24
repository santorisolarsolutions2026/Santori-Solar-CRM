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
  UserCheck,
  Users,
  Loader2,
  SlidersHorizontal,
  Calendar,
  MapPin,
  Sparkles,
  Tag,
  Zap,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { LeadTrackingTimeline } from '@/components/LeadTrackingTimeline';
import { getLeadAssignedDisplay } from '@/lib/hierarchy';

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
  isActive: boolean;
  consultant: { id: number; name: string } | null;
  tl: { id: number; name: string } | null;
  manager: { id: number; name: string } | null;
  order?: {
    id: number;
    status: string;
    rejectionReason?: string | null;
    installationImages?: { id: number; status: string }[];
  } | null;
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
  8: { name: 'Meeting Booked', class: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  9: { name: 'Meeting Done', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  10: { name: 'Disconnected', class: 'bg-slate-600/15 text-slate-400 border-slate-600/20' },
  11: { name: 'Switch Off', class: 'bg-slate-700/20 text-slate-400 border-slate-700/30' },
  12: { name: 'Can\'t Fit Solar', class: 'bg-stone-900 text-stone-400 border-stone-800/40' },
  13: { name: 'Sale Done', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold' },
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
  const { user, loading: authLoading, hasPermission } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!hasPermission('leads:view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[#111625] border border-slate-800 rounded-xl shadow-lg mt-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-md">
          You do not have the required permissions to view the Sales Leads Pipeline. Please contact your administrator if you believe this is in error.
        </p>
      </div>
    );
  }
  
  // State for leads list
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter criteria
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('');
  const [tlFilter, setTlFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [unassignedFilter, setUnassignedFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Detailed Filter Modal states
  const [showDetailedFilterModal, setShowDetailedFilterModal] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'stages' | 'connection' | 'sources' | 'location' | 'team' | 'dates'>('stages');

  // Track Lead Modal State
  const [trackingLead, setTrackingLead] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const handleOpenTracker = async (lead: any) => {
    setTrackingLead(lead);
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setTrackingLead(data.data);
      }
    } catch (err) {
      console.error('Error fetching lead tracker details:', err);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Dropdown lists
  const [consultants, setConsultants] = useState<{ id: number; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string; role: string }[]>([]);

  // Multiple selection and bulk actions states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [customSelectVal, setCustomSelectVal] = useState('');

  // Bulk Reassignment States
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkManagerId, setBulkManagerId] = useState<string>('UNCHANGED');
  const [bulkTlId, setBulkTlId] = useState<string>('UNCHANGED');
  const [bulkConsultantId, setBulkConsultantId] = useState<string>('UNCHANGED');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Bulk Stage States
  const [showBulkStageModal, setShowBulkStageModal] = useState(false);
  const [bulkStage, setBulkStage] = useState<string>('UNCHANGED');

  const handleArbitrarySelectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(customSelectVal, 10);
    if (isNaN(count) || count <= 0) {
      alert('Please enter a valid positive number of leads.');
      return;
    }
    setLoading(true);
    try {
      setLimit(count);
      setPage(1);
      const params = new URLSearchParams({
        page: '1',
        limit: count.toString(),
        search,
        status: statusFilter,
        consultant_id: consultantFilter,
        connection_type: connectionFilter,
        lead_source: sourceFilter,
        city: cityFilter,
        unassigned: unassignedFilter ? 'true' : 'false',
      });

      const res = await fetch(`/api/v1/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLeads(data.data.leads);
        setTotal(data.data.pagination.total);
        const fetchedIds = data.data.leads.map((l: any) => l.id);
        setSelectedIds(fetchedIds);
      }
    } catch (err) {
      console.error('Failed to select leads:', err);
    } finally {
      setLoading(false);
    }
  };

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
    
    const proceed = async () => {
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
      }
    };

    if ((window as any).showConfirm) {
      (window as any).showConfirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected leads from the database? This action cannot be undone.`, proceed);
    } else if (window.confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected leads from the database? This action cannot be undone.`)) {
      proceed();
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
  const [importProgress, setImportProgress] = useState<{
    total: number;
    current: number;
    percent: number;
    importedCount: number;
    skippedCount: number;
    statusText: string;
  } | null>(null);
  const [importCancelRequested, setImportCancelRequested] = useState(false);
  const cancelRef = useRef(false);

  // Fetch consultants list for filter
  const fetchConsultants = async () => {
    try {
      const res = await fetch('/api/v1/users?role=consultant,psa');
      const data = await res.json();
      if (data.success) {
        setConsultants(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all team members for bulk reassignments
  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/v1/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data) {
        setTeamMembers(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConsultants();
    fetchTeamMembers();
  }, []);

  const handleBulkAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    if (bulkManagerId === 'UNCHANGED' && bulkTlId === 'UNCHANGED' && bulkConsultantId === 'UNCHANGED') {
      alert('Please select at least one team role to assign or unassign.');
      return;
    }

    try {
      setBulkAssigning(true);
      const payload: any = { leadIds: selectedIds };

      if (bulkManagerId !== 'UNCHANGED') {
        payload.assignedManagerId = bulkManagerId === 'UNASSIGN' ? null : Number(bulkManagerId);
      }
      if (bulkTlId !== 'UNCHANGED') {
        payload.assignedTlId = bulkTlId === 'UNASSIGN' ? null : Number(bulkTlId);
      }
      if (bulkConsultantId !== 'UNCHANGED') {
        payload.assignedConsultantId = bulkConsultantId === 'UNASSIGN' ? null : Number(bulkConsultantId);
      }

      const res = await fetch('/api/v1/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      alert(data.message || 'Leads reassigned successfully.');

      if (data.success) {
        setShowBulkAssignModal(false);
        setSelectedIds([]);
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during bulk assignment.');
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleBulkStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    if (bulkStage === 'UNCHANGED') {
      alert('Please select a pipeline stage to apply.');
      return;
    }

    try {
      setBulkAssigning(true);
      const payload: any = {
        leadIds: selectedIds,
        status: Number(bulkStage)
      };

      const res = await fetch('/api/v1/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      alert(data.message || 'Leads status updated successfully.');

      if (data.success) {
        setShowBulkStageModal(false);
        setSelectedIds([]);
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during bulk status update.');
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleBulkRevertNotInterested = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to revert the ${selectedIds.length} selected lead(s) back to "Fresh Lead" stage?`)) {
      return;
    }

    try {
      setBulkAssigning(true);
      const payload: any = {
        leadIds: selectedIds,
        status: 1 // Stage 1 is Fresh Lead
      };

      const res = await fetch('/api/v1/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      alert(data.message || 'Leads reverted to Fresh Lead successfully.');

      if (data.success) {
        setSelectedIds([]);
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while reverting leads.');
    } finally {
      setBulkAssigning(false);
    }
  };

  // Active Filter Count Calculation
  const getActiveFilterCount = () => {
    let count = 0;
    if (statusFilter) count += statusFilter.split(',').filter(Boolean).length;
    if (connectionFilter) count += connectionFilter.split(',').filter(Boolean).length;
    if (sourceFilter) count += sourceFilter.split(',').filter(Boolean).length;
    if (consultantFilter) count += consultantFilter.split(',').filter(Boolean).length;
    if (tlFilter) count += tlFilter.split(',').filter(Boolean).length;
    if (managerFilter) count += managerFilter.split(',').filter(Boolean).length;
    if (cityFilter) count++;
    if (stateFilter) count++;
    if (dateFromFilter) count++;
    if (dateToFilter) count++;
    if (unassignedFilter) count++;
    return count;
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
        tl_id: tlFilter,
        manager_id: managerFilter,
        connection_type: connectionFilter,
        lead_source: sourceFilter,
        city: cityFilter,
        state: stateFilter,
        date_from: dateFromFilter,
        date_to: dateToFilter,
        unassigned: unassignedFilter ? 'true' : 'false',
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
      fetchTeamMembers();
    }
  }, [user]);

  // Refetch leads when filters change
  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [page, limit, statusFilter, consultantFilter, tlFilter, managerFilter, connectionFilter, sourceFilter, cityFilter, stateFilter, dateFromFilter, dateToFilter, unassignedFilter, user]);

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
    setTlFilter('');
    setManagerFilter('');
    setConnectionFilter('');
    setSourceFilter('');
    setCityFilter('');
    setStateFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setUnassignedFilter(false);
    setPage(1);
  };

  const handleDeleteLead = async (leadId: number) => {
    const proceed = async () => {
      try {
        const res = await fetch(`/api/v1/leads/${leadId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          alert(data.message || 'Lead deleted successfully.');
          fetchLeads();
        } else {
          alert(data.message || 'Failed to delete lead.');
        }
      } catch (err) {
        console.error(err);
      }
    };

    if ((window as any).showConfirm) {
      (window as any).showConfirm('Are you sure you want to delete this lead permanently? This action cannot be undone.', proceed);
    } else if (window.confirm('Are you sure you want to delete this lead permanently? This action cannot be undone.')) {
      proceed();
    }
  };

  const handleActivateLead = async (leadId: number) => {
    const proceed = async () => {
      try {
        const res = await fetch(`/api/v1/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });
        const data = await res.json();
        if (data.success) {
          alert('Lead reactivated successfully.');
          fetchLeads();
        } else {
          alert(data.message || 'Failed to reactivate lead.');
        }
      } catch (err) {
        console.error(err);
      }
    };

    if ((window as any).showConfirm) {
      (window as any).showConfirm('Are you sure you want to reactivate this lead?', proceed);
    } else if (window.confirm('Are you sure you want to reactivate this lead?')) {
      proceed();
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

  // Execute CSV Import (Client-side Chunking)
  const handleExecuteImport = async () => {
    if (csvRows.length === 0) return;

    if (!columnMapping.customerName || !columnMapping.mobile) {
      alert("Please map the required columns: Customer Name and Contact Number (Mobile).");
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportCancelRequested(false);
    cancelRef.current = false;

    setImportProgress({
      total: csvRows.length,
      current: 0,
      percent: 0,
      importedCount: 0,
      skippedCount: 0,
      statusText: 'Preparing leads for import...',
    });

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

      const BATCH_SIZE = 1000;
      let totalImported = 0;
      let totalSkipped = 0;
      const accumulatedSkipped: any[] = [];
      let cancelFlag = false;

      for (let i = 0; i < leadsToImport.length; i += BATCH_SIZE) {
        // Check if user requested cancellation
        if (cancelRef.current) {
          cancelFlag = true;
          break;
        }

        const chunk = leadsToImport.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(leadsToImport.length / BATCH_SIZE);

        setImportProgress({
          total: leadsToImport.length,
          current: i,
          percent: Math.round((i / leadsToImport.length) * 100),
          importedCount: totalImported,
          skippedCount: totalSkipped,
          statusText: `Uploading batch ${batchNum} of ${totalBatches}...`,
        });

        try {
          const res = await fetch('/api/v1/leads/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads: chunk }),
          });

          const data = await res.json();
          if (data.success) {
            totalImported += data.data.importedCount || 0;
            totalSkipped += data.data.skippedCount || 0;
            if (data.data.skipped && Array.isArray(data.data.skipped)) {
              accumulatedSkipped.push(...data.data.skipped);
            }
          } else {
            console.error(`Batch ${batchNum} failed:`, data.message);
            alert(`Import halted because batch ${batchNum} failed: ${data.message || 'Unknown error'}`);
            break;
          }
        } catch (err) {
          console.error(`Network error in batch ${batchNum}:`, err);
          alert(`Network error in batch ${batchNum}. The import has been halted.`);
          break;
        }
      }

      setImportResult({
        success: true,
        importedCount: totalImported,
        skippedCount: totalSkipped + (cancelFlag ? (leadsToImport.length - totalImported - totalSkipped) : 0),
        skipped: [
          ...accumulatedSkipped,
          ...(cancelFlag ? [{
            customerName: 'Cancelled',
            mobile: 'N/A',
            reason: 'Import process was stopped by user.'
          }] : [])
        ],
      });

      fetchLeads();
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred during import.');
    } finally {
      setImporting(false);
      setImportProgress(null);
      cancelRef.current = false;
    }
  };

  const handleCancelImport = () => {
    setImportCancelRequested(true);
    cancelRef.current = true;
    setImportProgress((prev) => prev ? {
      ...prev,
      statusText: 'Cancelling after current batch completes...',
    } : null);
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setImportResult(null);
    setImportProgress(null);
    cancelRef.current = false;
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
        <div className="flex items-center gap-3">
          {hasPermission('leads:import') && (
            <button
              onClick={() => setShowImportModal(true)}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-900 dark:text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>
          )}
          {hasPermission('leads:create') && (
            <Link
              href="/leads/new"
              className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Lead</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Live Search */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Customer Name / Mobile / Lead Code..."
              className="block w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 justify-end">
            {/* Quick Stage Select */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs cursor-pointer min-w-[160px]"
            >
              <option value="">All Pipeline Stages</option>
              {Object.entries(STAGE_BADGES).map(([id, badge]) => (
                <option key={id} value={id}>
                  {badge.name}
                </option>
              ))}
            </select>

            {/* Amazon / Flipkart Detailed Filter Trigger Button */}
            <button
              type="button"
              onClick={() => setShowDetailedFilterModal(true)}
              className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {getActiveFilterCount() > 0 && (
                <span className="bg-slate-950 text-amber-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-amber-400/30">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>

            {/* Clear All Button */}
            {getActiveFilterCount() > 0 || search ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="py-2.5 px-3 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
              >
                Reset All
              </button>
            ) : null}
          </div>
        </form>

        {/* Active Applied Filter Tags Bar */}
        {getActiveFilterCount() > 0 && (
          <div className="pt-3 border-t border-slate-850 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-500" /> Active Filters:
            </span>
            {statusFilter && statusFilter.split(',').map(st => (
              <span key={`st-${st}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold">
                Stage: {STAGE_BADGES[Number(st)]?.name || st}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" 
                  onClick={() => {
                    const remaining = statusFilter.split(',').filter(s => s !== st).join(',');
                    setStatusFilter(remaining);
                  }} 
                />
              </span>
            ))}
            {connectionFilter && connectionFilter.split(',').map(ct => (
              <span key={`ct-${ct}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold capitalize">
                Type: {ct}
                <X className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" onClick={() => setConnectionFilter(connectionFilter.split(',').filter(s => s !== ct).join(','))} />
              </span>
            ))}
            {sourceFilter && sourceFilter.split(',').map(src => (
              <span key={`src-${src}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold capitalize">
                Source: {src}
                <X className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" onClick={() => setSourceFilter(sourceFilter.split(',').filter(s => s !== src).join(','))} />
              </span>
            ))}
            {cityFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                City: {cityFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" onClick={() => setCityFilter('')} />
              </span>
            )}
            {stateFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                State: {stateFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" onClick={() => setStateFilter('')} />
              </span>
            )}
            {consultantFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold">
                Consultant Assigned
                <X className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" onClick={() => setConsultantFilter('')} />
              </span>
            )}
            {tlFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[11px] font-semibold">
                TL Assigned
                <X className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" onClick={() => setTlFilter('')} />
              </span>
            )}
            {managerFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                Manager Assigned
                <X className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" onClick={() => setManagerFilter('')} />
              </span>
            )}
            {(dateFromFilter || dateToFilter) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[11px] font-semibold">
                Date: {dateFromFilter || '...'} to {dateToFilter || '...'}
                <X className="w-3 h-3 cursor-pointer hover:text-white ml-0.5" onClick={() => { setDateFromFilter(''); setDateToFilter(''); }} />
              </span>
            )}
            <button
              onClick={handleClearFilters}
              className="text-[10px] font-bold text-slate-400 hover:text-red-400 underline underline-offset-2 ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
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
          <div className="flex items-center gap-2 flex-wrap">
            {(hasPermission('leads:assign') || user?.role === 'admin' || user?.role === 'director' || user?.role?.startsWith('admin:')) && (
              <>
                <button
                  onClick={() => setShowBulkAssignModal(true)}
                  className="py-2 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Assign Member</span>
                </button>
                <button
                  onClick={() => {
                    setBulkStage('UNCHANGED');
                    setShowBulkStageModal(true);
                  }}
                  className="py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Change Stage</span>
                </button>
                <button
                  onClick={handleBulkRevertNotInterested}
                  className="py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Revert to Fresh</span>
                </button>
              </>
            )}
            {hasPermission('leads:delete') && (
              <button
                onClick={handleBulkDelete}
                className="py-2 px-4 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer font-sans"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Leads</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leads Table Card */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Table Header Control Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleArbitrarySelectSubmit} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Arbitrary Select (Display & Select Leads):</span>
            <div className="flex items-center">
              <input
                type="number"
                min="1"
                placeholder="Enter count (e.g. 100)..."
                value={customSelectVal}
                onChange={(e) => setCustomSelectVal(e.target.value)}
                className="w-40 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-l-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
              />
              <button
                type="submit"
                className="py-1.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-r-lg text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Select & Show All
              </button>
            </div>
          </form>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="py-1.5 px-3 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg text-xs font-medium transition-all cursor-pointer"
            >
              Clear Selection ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && leads.map(l => l.id).every((id) => selectedIds.includes(id))}
                    onChange={handleSelectAllToggle}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4 w-28">Lead ID</th>
                <th className="py-4 px-4 w-48">Customer</th>
                <th className="py-4 px-4 w-32">Mobile</th>
                <th className="py-4 px-4 w-28">City</th>
                <th className="py-4 px-4 w-32">Connection</th>
                <th className="py-4 px-4 w-44">Pipeline Stage</th>
                <th className="py-4 px-4 w-40">Assigned to</th>
                <th className="py-4 px-4 w-32 text-center">Actions</th>
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
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('a') ||
                          target.closest('button') ||
                          target.closest('input')
                        ) {
                          return;
                        }
                        window.location.href = `/leads/${lead.id}`;
                      }}
                      className={`hover:bg-slate-900/30 transition-all cursor-pointer ${
                        lead.isUnreachable ? 'bg-red-500/[0.01] border-l-2 border-l-red-500' : ''
                      } ${
                        !lead.isActive ? 'opacity-70 border-l-2 border-l-slate-650 bg-slate-900/[0.08]' : ''
                      } ${selectedIds.includes(lead.id) ? 'bg-amber-500/[0.02]' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => handleSelectToggle(lead.id)}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-300 w-28">
                        {lead.leadCode}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white w-48">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{lead.customerName}</span>
                          {lead.isUnreachable && (
                            <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.25 font-bold uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Unreachable</span>
                            </span>
                          )}
                          {!lead.isActive && (
                            <span className="text-[9px] bg-slate-500/15 text-slate-400 border border-slate-550/20 rounded-full px-2 py-0.25 font-bold uppercase tracking-wider shrink-0">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-xs w-32">{lead.mobile}</td>
                      <td className="py-3.5 px-4 text-slate-300 w-28">{lead.city}</td>
                      <td className="py-3.5 px-4 w-32">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${connectionClass}`}>
                          {lead.connectionType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 w-44">
                        <div className="flex flex-col gap-1">
                          {lead.status === 13 && lead.order?.status === 'draft' && lead.order?.rejectionReason ? (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider bg-rose-500/10 text-rose-450 border-rose-500/20">
                              Rejected ⚠️
                            </span>
                          ) : (
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${stage.class}`}>
                              {stage.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300 w-40">
                        {(() => {
                          const assigned = getLeadAssignedDisplay(lead, user);
                          return assigned ? (
                            <Link href={`/team?userId=${assigned.id}`} className="hover:text-amber-400 hover:underline">
                              {assigned.name}
                            </Link>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Unassigned</span>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-center w-32">
                        <div className="flex items-center justify-center gap-2">
                          {hasPermission('leads:track') && (
                            <button
                              onClick={() => handleOpenTracker(lead)}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all cursor-pointer"
                              title="Track Lead Journey"
                            >
                              <Truck className="w-4.5 h-4.5" />
                            </button>
                          )}
                          {hasPermission('leads:edit') && (
                            <Link
                              href={`/leads/${lead.id}?edit=true`}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
                              title="Edit Lead Info"
                            >
                              <Edit2 className="w-4.5 h-4.5" />
                            </Link>
                          )}
                          {!lead.isActive && hasPermission('leads:edit') && (
                            <button
                              onClick={() => handleActivateLead(lead.id)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-emerald-950/20 border border-slate-800 hover:border-emerald-900/30 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                              title="Activate Lead"
                            >
                              <Check className="w-4.5 h-4.5" />
                            </button>
                          )}
                          {hasPermission('leads:delete') && (
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/30 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                              title={lead.isActive ? "Deactivate Opportunity" : "Delete Lead permanently"}
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
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
          <div className="p-4 border-t border-slate-800 bg-slate-900/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-center sm:text-left">
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
              <button 
                onClick={handleCloseImportModal} 
                disabled={importing} 
                className="text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
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
                    Required fields: Customer Name, Contact Number
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
                      disabled={importing}
                      className="text-xs text-red-400 hover:text-red-300 font-bold disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Clear File
                    </button>
                  </div>

                  {/* Import Progress Card */}
                  {importProgress && (
                    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">{importProgress.statusText}</span>
                        <span className="text-amber-400 font-extrabold">{importProgress.percent}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-900">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300 ease-out" 
                          style={{ width: `${importProgress.percent}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Processed</span>
                          <span className="text-xs font-bold text-white mt-1 block">
                            {importProgress.current} / {importProgress.total}
                          </span>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Imported</span>
                          <span className="text-xs font-bold text-emerald-400 mt-1 block">{importProgress.importedCount}</span>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Skipped</span>
                          <span className="text-xs font-bold text-amber-500 mt-1 block">{importProgress.skippedCount}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mapping Grid */}
                  {!importResult && !importProgress && (
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
                          { key: 'address', label: 'Complete Address', req: false },
                          { key: 'pinCode', label: 'Pin Code / Zip', req: false },
                          { key: 'city', label: 'City', req: false },
                          { key: 'state', label: 'State', req: false },
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
                              className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none capitalize"
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
                  {!importResult && !importProgress && csvRows.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Mapped Field Preview (First 5 Rows)
                      </h4>
                      <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse min-w-[800px]">
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
              {!importProgress ? (
                <>
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
                      className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md"
                    >
                      Execute Import ({csvRows.length} Leads)
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelImport}
                  disabled={importCancelRequested}
                  className="py-2 px-5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs shadow-md disabled:opacity-50 transition-all duration-200"
                >
                  {importCancelRequested ? 'Stopping Import...' : 'Stop Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reassign Team Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Bulk Reassign Team</h3>
                  <p className="text-[11px] text-slate-400">Reassign Manager, TL, or Consultant for {selectedIds.length} selected lead(s).</p>
                </div>
              </div>
              <button onClick={() => setShowBulkAssignModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAssignSubmit} className="p-6 space-y-4">
              {/* Select Manager */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Assigned Manager
                </label>
                <select
                  value={bulkManagerId}
                  onChange={(e) => setBulkManagerId(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500 focus:outline-none"
                >
                  <option value="UNCHANGED">-- Keep Unchanged --</option>
                  <option value="UNASSIGN">❌ Unassign Manager</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Team Leader */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Assigned Team Leader (TL)
                </label>
                <select
                  value={bulkTlId}
                  onChange={(e) => setBulkTlId(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500 focus:outline-none"
                >
                  <option value="UNCHANGED">-- Keep Unchanged --</option>
                  <option value="UNASSIGN">❌ Unassign Team Leader</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Consultant */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Assigned Consultant / PSA
                </label>
                <select
                  value={bulkConsultantId}
                  onChange={(e) => setBulkConsultantId(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500 focus:outline-none"
                >
                  <option value="UNCHANGED">-- Keep Unchanged --</option>
                  <option value="UNASSIGN">❌ Unassign Consultant</option>
                  {teamMembers.filter((m: any) => {
                    const deptName = (m.department?.name || '').toLowerCase().trim();
                    const roleLower = (m.role || '').toLowerCase().trim();
                    const isSalesDept = deptName.includes('sales') || deptName.includes('psa') || deptName.includes('marketing');
                    const isSalesRole = ['sales_head', 'manager', 'tl', 'psa_tl', 'consultant', 'psa'].includes(roleLower) || roleLower.includes('sales') || roleLower.includes('psa');
                    return isSalesDept || isSalesRole;
                  }).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(false)}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkAssigning}
                  className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {bulkAssigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Assignment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Pipeline Stage Shift Modal */}
      {showBulkStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Bulk Change Pipeline Stage</h3>
                  <p className="text-[11px] text-slate-400">Update stage for {selectedIds.length} selected lead(s).</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowBulkStageModal(false)} className="text-slate-400 hover:text-white cursor-pointer border border-transparent">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkStageSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Select New Pipeline Stage
                </label>
                <select
                  value={bulkStage}
                  onChange={(e) => setBulkStage(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500 focus:outline-none"
                >
                  <option value="UNCHANGED">-- Select Target Stage --</option>
                  {Object.entries(STAGE_BADGES).map(([id, badge]) => (
                    <option key={id} value={id}>
                      {badge.name} (Stage {id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkStageModal(false)}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkAssigning}
                  className="py-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {bulkAssigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Shifting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Shift Stage</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Amazon / Flipkart Style Detailed Filter Modal Drawer */}
      {showDetailedFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6">
          <div className="w-full max-w-4xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Filters</span>
                    {getActiveFilterCount() > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {getActiveFilterCount()} Active
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">Filter sales leads by stage, geography, source, team allocation, and dates.</p>
                </div>
              </div>
              <button onClick={() => setShowDetailedFilterModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* E-Commerce Two-Column Layout */}
            <div className="flex-1 flex overflow-hidden min-h-[400px]">
              {/* Left Navigation Sidebar Category Tabs */}
              <div className="w-1/3 max-w-[240px] bg-slate-950/60 border-r border-slate-800/80 p-3 space-y-1 overflow-y-auto shrink-0 select-none">
                {[
                  { id: 'stages', label: 'Pipeline Stages', icon: Layers, count: statusFilter ? statusFilter.split(',').filter(Boolean).length : 0 },
                  { id: 'connection', label: 'Connection Type', icon: Zap, count: connectionFilter ? connectionFilter.split(',').filter(Boolean).length : 0 },
                  { id: 'sources', label: 'Lead Source', icon: Tag, count: sourceFilter ? sourceFilter.split(',').filter(Boolean).length : 0 },
                  { id: 'location', label: 'City & Location', icon: MapPin, count: (cityFilter ? 1 : 0) + (stateFilter ? 1 : 0) },
                  { id: 'team', label: 'Team Allocation', icon: Users, count: (consultantFilter ? 1 : 0) + (tlFilter ? 1 : 0) + (managerFilter ? 1 : 0) },
                  { id: 'dates', label: 'Created Date', icon: Calendar, count: (dateFromFilter ? 1 : 0) + (dateToFilter ? 1 : 0) },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeFilterTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilterTab(tab.id as any)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-md'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {tab.count > 0 && (
                        <span className="bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.25 rounded-full shrink-0">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Filter Options Panel */}
              <div className="flex-1 p-6 overflow-y-auto bg-[#111625] space-y-6">
                {/* 1. PIPELINE STAGES TAB */}
                {activeFilterTab === 'stages' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Select Pipeline Stages</h4>
                        <p className="text-[11px] text-slate-400">Select multiple stages to filter leads.</p>
                      </div>
                      {statusFilter && (
                        <button onClick={() => setStatusFilter('')} className="text-[11px] text-amber-400 font-semibold hover:underline cursor-pointer">
                          Clear Stages
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.entries(STAGE_BADGES).map(([idStr, badge]) => {
                        const isChecked = statusFilter.split(',').includes(idStr);
                        return (
                          <label
                            key={idStr}
                            onClick={() => {
                              const current = statusFilter ? statusFilter.split(',') : [];
                              const updated = isChecked ? current.filter(s => s !== idStr) : [...current, idStr];
                              setStatusFilter(updated.join(','));
                              setPage(1);
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                              isChecked
                                ? 'bg-amber-500/[0.06] border-amber-500/40 shadow-sm'
                                : 'bg-slate-950/40 border-slate-850 hover:border-slate-800 hover:bg-slate-900/20'
                            }`}
                          >
                            <span className={`text-xs font-bold ${badge.class} border px-2 py-0.5 rounded-full`}>
                              {badge.name}
                            </span>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isChecked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. CONNECTION TYPE TAB */}
                {activeFilterTab === 'connection' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Solar Connection Type</h4>
                        <p className="text-[11px] text-slate-400">Filter by residential, commercial, or industrial setup.</p>
                      </div>
                      {connectionFilter && (
                        <button onClick={() => setConnectionFilter('')} className="text-[11px] text-amber-400 font-semibold hover:underline cursor-pointer">
                          Clear Types
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {['residential', 'commercial', 'industrial'].map((type) => {
                        const isChecked = connectionFilter.split(',').includes(type);
                        return (
                          <div
                            key={type}
                            onClick={() => {
                              const current = connectionFilter ? connectionFilter.split(',') : [];
                              const updated = isChecked ? current.filter(s => s !== type) : [...current, type];
                              setConnectionFilter(updated.join(','));
                              setPage(1);
                            }}
                            className={`p-4 rounded-xl border text-center cursor-pointer select-none transition-all flex flex-col items-center justify-center gap-2 ${
                              isChecked
                                ? 'bg-blue-500/10 border-blue-500/40 shadow-md'
                                : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                            }`}
                          >
                            <Zap className={`w-6 h-6 ${isChecked ? 'text-blue-400' : 'text-slate-500'}`} />
                            <span className="text-xs font-bold text-white capitalize">{type}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. LEAD SOURCE TAB */}
                {activeFilterTab === 'sources' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Lead Acquisition Source</h4>
                        <p className="text-[11px] text-slate-400">Filter leads by where they originated.</p>
                      </div>
                      {sourceFilter && (
                        <button onClick={() => setSourceFilter('')} className="text-[11px] text-amber-400 font-semibold hover:underline cursor-pointer">
                          Clear Sources
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'whatsapp', name: 'WhatsApp' },
                        { id: 'cold_call', name: 'Cold Call' },
                        { id: 'referral', name: 'Referral' },
                        { id: 'walk_in', name: 'Walk-In' },
                        { id: 'google_ad', name: 'Google Ad' },
                        { id: 'other', name: 'Other' },
                      ].map((src) => {
                        const isChecked = sourceFilter.split(',').includes(src.id);
                        return (
                          <div
                            key={src.id}
                            onClick={() => {
                              const current = sourceFilter ? sourceFilter.split(',') : [];
                              const updated = isChecked ? current.filter(s => s !== src.id) : [...current, src.id];
                              setSourceFilter(updated.join(','));
                              setPage(1);
                            }}
                            className={`p-3 rounded-xl border text-center cursor-pointer select-none transition-all flex items-center justify-between ${
                              isChecked
                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 font-bold'
                                : 'bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="text-xs font-semibold">{src.name}</span>
                            {isChecked && <Check className="w-4 h-4 text-purple-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. LOCATION TAB */}
                {activeFilterTab === 'location' && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">City & State Filter</h4>
                      <p className="text-[11px] text-slate-400">Search leads by customer city or state.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">City Name</label>
                        <input
                          type="text"
                          value={cityFilter}
                          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                          placeholder="e.g. Delhi, Jaipur, Mumbai..."
                          className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">State Name</label>
                        <input
                          type="text"
                          value={stateFilter}
                          onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
                          placeholder="e.g. Rajasthan, Haryana..."
                          className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. TEAM ALLOCATION TAB */}
                {activeFilterTab === 'team' && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Assigned Team Members</h4>
                      <p className="text-[11px] text-slate-400">Filter leads by assigned Consultants, TLs, or Managers.</p>
                    </div>

                    <div className="space-y-3.5">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-850 bg-slate-950/40 hover:bg-slate-900/20 cursor-pointer select-none transition-all">
                        <input
                          type="checkbox"
                          checked={unassignedFilter}
                          onChange={(e) => {
                            setUnassignedFilter(e.target.checked);
                            setPage(1);
                            if (e.target.checked) {
                              setConsultantFilter('');
                              setTlFilter('');
                              setManagerFilter('');
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-200">Show only Unassigned Leads (no coordinators assigned)</span>
                      </label>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned Consultant</label>
                        <select
                          value={consultantFilter}
                          onChange={(e) => { setConsultantFilter(e.target.value); setPage(1); }}
                          disabled={unassignedFilter}
                          className={`block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500 ${unassignedFilter ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="">All Consultants</option>
                          <option value="unassigned">Unassigned (None)</option>
                          {consultants.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned Team Leader (TL)</label>
                        <select
                          value={tlFilter}
                          onChange={(e) => { setTlFilter(e.target.value); setPage(1); }}
                          disabled={unassignedFilter}
                          className={`block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500 ${unassignedFilter ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="">All Team Leaders</option>
                          <option value="unassigned">Unassigned (None)</option>
                          {teamMembers.filter(m => ['tl', 'psa_tl'].includes(m.role)).map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned Manager</label>
                        <select
                          value={managerFilter}
                          onChange={(e) => { setManagerFilter(e.target.value); setPage(1); }}
                          disabled={unassignedFilter}
                          className={`block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500 ${unassignedFilter ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="">All Managers</option>
                          <option value="unassigned">Unassigned (None)</option>
                          {teamMembers.filter(m => ['manager', 'sales_head', 'admin', 'director'].includes(m.role)).map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. CREATED DATES TAB */}
                {activeFilterTab === 'dates' && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Lead Registration Date Range</h4>
                      <p className="text-[11px] text-slate-400">Filter leads registered within a specific date timeframe.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">From Date</label>
                        <input
                          type="date"
                          value={dateFromFilter}
                          onChange={(e) => { setDateFromFilter(e.target.value); setPage(1); }}
                          className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">To Date</label>
                        <input
                          type="date"
                          value={dateToFilter}
                          onChange={(e) => { setDateToFilter(e.target.value); setPage(1); }}
                          className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleClearFilters}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowDetailedFilterModal(false)}
                className="py-2.5 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Apply & View Leads ({total})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track Lead Progress Modal (Amazon Delivery Tracking Style) */}
      {trackingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6">
          <div className="w-full max-w-2xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Lead Journey Tracker: {trackingLead.customerName}
                </h3>
              </div>
              <button
                onClick={() => setTrackingLead(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {trackingLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase font-mono">Loading Lead Journey...</p>
                </div>
              ) : (
                <LeadTrackingTimeline lead={trackingLead} />
              )}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex justify-between items-center shrink-0">
              <Link
                href={`/leads/${trackingLead.id}`}
                className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Open Full Lead Workspace</span> &rarr;
              </Link>
              <button
                onClick={() => setTrackingLead(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Tracker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
