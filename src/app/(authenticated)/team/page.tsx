'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Plus,
  X,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Shield,
  Loader2,
  Lock,
  Sun,
  Trash2,
  Upload,
  Calendar,
  User,
  History,
  Eye,
  Search,
  Award,
  DollarSign,
  Hammer,
  Terminal,
  SlidersHorizontal,
} from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address?: string | null;
  employeeId: string | null;
  role: string;
  permissions?: string | null;
  reportsTo: number | null;
  isActive: boolean;
  lastSeenAt: string | null;
  lastLoginAt: string | null;
  loginLocation: string | null;
  lastLogoutAt: string | null;
  logoutLocation: string | null;
  joiningDate: string | null;
  photograph: string | null;
  supervisor?: { id: number; name: string } | null;
  leadsClosed?: number;
  departmentId?: number | null;
  designationId?: number | null;
  teamId?: number | null;
  designation?: { id: number; name: string; level: number } | null;
  department?: { id: number; name: string } | null;
}

const ROLE_LABELS: Record<string, { label: string; class: string }> = {
  admin: { label: 'Admin', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
  director: { label: 'Director', class: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  sales_head: { label: 'Sales Head', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  finance: { label: 'Finance Manager', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  operations: { label: 'Operations Manager', class: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  psa_tl: { label: 'PSA Team Leader', class: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  psa: { label: 'PSA Consultant', class: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  tl: { label: 'Sales Team Leader', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  consultant: { label: 'Sales Consultant', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

export function getRoleLabel(role: string): string {
  if (!role) return '';
  if (role.includes(':')) {
    return role.split(':')[1];
  }
  return ROLE_LABELS[role]?.label || role;
}

export function getRoleClass(role: string): string {
  if (!role) return 'bg-slate-500/15';
  const baseRole = role.includes(':') ? role.split(':')[0] : role;
  return ROLE_LABELS[baseRole]?.class || 'bg-slate-500/15 text-slate-400 border-slate-500/20';
}

const ALL_PERMISSIONS = [
  // PSA Level
  {
    key: 'leads:create',
    label: 'PSA: Create Leads',
    description: 'Allows registering and adding new customer leads into the system.',
    category: 'PSA'
  },
  {
    key: 'leads:edit',
    label: 'PSA: Edit Lead Details',
    description: 'Allows editing contact, discom connection load, and lead details before site visit.',
    category: 'PSA'
  },
  {
    key: 'leads:change_status',
    label: 'PSA: Book & Schedule Meetings',
    description: 'Allows advancing leads up to Meeting Booked status and choosing meeting calendar slots.',
    category: 'PSA'
  },
  {
    key: 'leads:track',
    label: 'PSA: Track logs & Reminders',
    description: 'Allows tracking lead audit logs, reminders, and daily check-ins.',
    category: 'PSA'
  },
  {
    key: 'leads:import',
    label: 'PSA: Bulk CSV Lead Import',
    description: 'Allows importing lists of raw leads from CSV / Excel spreadsheets.',
    category: 'PSA'
  },

  // Sales Level
  {
    key: 'leads:assign',
    label: 'Sales: Assign Leads to Sales Teams',
    description: 'Allows assigning leads to pre-sales agents, consultants, team leaders, or managers.',
    category: 'Sales'
  },
  {
    key: 'meetings:complete',
    label: 'Sales: Meeting Done (Actual Meeting/Recording)',
    description: 'Allows marking a meeting as done and uploading or attaching the audio recording.',
    category: 'Sales'
  },
  {
    key: 'orders:create',
    label: 'Sales: Order Punching Form Filling',
    description: 'Allows punching order details, connection numbers, system size, and downpayment details.',
    category: 'Sales'
  },
  {
    key: 'orders:submit_finance',
    label: 'Sales: Submitting to Finance',
    description: 'Allows submitting the finalized order punch form and client documents to Finance.',
    category: 'Sales'
  },
  {
    key: 'orders:assign_finance',
    label: 'Sales: Finance Team Assignation',
    description: 'Allows assigning a Finance team member or manager to the punched order.',
    category: 'Sales'
  },
  {
    key: 'leads:view_sales_pipeline',
    label: 'Sales: View Leads assigned to team',
    description: 'Allows Sales consultants, TLs, and managers to view their assigned pipeline leads.',
    category: 'Sales'
  },

  // Finance Level
  {
    key: 'orders:finance_access',
    label: 'Finance: Access Ledgers & Payments',
    description: 'Allows full visibility of the Finance tab, payments ledger, outstanding balances, and total order valuations.',
    category: 'Finance'
  },
  {
    key: 'orders:verify',
    label: 'Finance: Verify Orders & Downpayment',
    description: 'Allows approving or rejecting submitted orders based on transaction reference validations.',
    category: 'Finance'
  },
  {
    key: 'orders:assign_ops',
    label: 'Finance: Assign Operations Team',
    description: 'Allows assigning Operations team members/managers to a verified order.',
    category: 'Finance'
  },
  {
    key: 'finance:manage_ledger',
    label: 'Finance: Record Receipt payments',
    description: 'Allows recording additional client payments, uploading transaction slips, and clearing outstanding balances.',
    category: 'Finance'
  },
  {
    key: 'reports:view_financials',
    label: 'Finance: View Financial Reports & Audits',
    description: 'Allows viewing performance statistics, audit histories, and cashflow reports.',
    category: 'Finance'
  },

  // Operations Level
  {
    key: 'orders:operations',
    label: 'Operations: Access Projects & Fulfillment',
    description: 'Allows full visibility of the Operations dashboard to monitor fulfillment stages.',
    category: 'Operations'
  },
  {
    key: 'ops:update_stages',
    label: 'Operations: Update Installation Stages',
    description: 'Allows logging site surveys, structural stability designs, solar panel installation, net metering, and commissioning progress.',
    category: 'Operations'
  },
  {
    key: 'ops:upload_drawings',
    label: 'Operations: Upload engineering layouts',
    description: 'Allows uploading structural drawings and commissioning documents directly into the order vault.',
    category: 'Operations'
  },

  // IT Level
  {
    key: 'team:view',
    label: 'IT: View employee directory',
    description: 'Allows viewing active employee profiles, contact details, and organization charts.',
    category: 'IT'
  },
  {
    key: 'attendance:view',
    label: 'IT: Access attendance logs',
    description: 'Allows inspecting team daily attendance check-ins, check-outs, and location data.',
    category: 'IT'
  },
  {
    key: 'team:manage',
    label: 'IT: Manage Roles & Customize Permissions',
    description: 'Allows creating new employee records, changing reporting hierarchies, and customizing individual access overrides.',
    category: 'IT'
  },
  {
    key: 'logs:view',
    label: 'IT: View System audit activity logs',
    description: 'Allows checking full database audit trails, status shifts, and logins across the system.',
    category: 'IT'
  },
  {
    key: 'leads:view_all',
    label: 'IT: Full pipeline overview visibility',
    description: 'Bypasses standard assignment checks to view all leads, orders, and installations across the company.',
    category: 'IT'
  },
  {
    key: 'leads:delete',
    label: 'IT: Purge & Delete records',
    description: 'Allows deleting leads or orders permanently from the system.',
    category: 'IT'
  }
];

function deriveRoleFromDesignationAndDept(designationIdStr: string, departmentIdStr: string, designationsList: any[], departmentsList: any[]): string {
  if (!designationIdStr) return 'consultant';
  const desId = parseInt(designationIdStr, 10);
  const designation = designationsList.find((d) => d.id === desId);
  if (!designation) return 'consultant';

  let departmentName = '';
  if (departmentIdStr) {
    const deptId = parseInt(departmentIdStr, 10);
    const department = departmentsList.find((d) => d.id === deptId);
    if (department) {
      departmentName = department.name;
    }
  }

  if (designation.name === 'Admin' || designation.level === 0) {
    return 'admin';
  } else if (departmentName === 'Finance') {
    return 'finance';
  } else if (departmentName === 'Operations') {
    return 'operations';
  } else if (departmentName === 'IT') {
    if (designation.level === 1) return 'director';
    if (designation.level === 2 || designation.level === 3) return 'manager';
    if (designation.level === 4) return 'tl';
    return 'consultant';
  } else if (departmentName === 'Sales') {
    if (designation.name.includes('Head') || designation.level === 1) return 'sales_head';
    if (designation.name.includes('PSA Senior Manager') || designation.name.includes('PSA Manager') || designation.level === 2 || designation.level === 3) {
      return 'manager';
    }
    if (designation.name === 'PSA TL' || (designation.level === 4 && designation.name.includes('PSA'))) return 'psa_tl';
    if (designation.name === 'TL' || designation.level === 4) return 'tl';
    if (designation.name === 'PSA Consultant' || designation.level === 6) return 'psa';
    if (designation.name === 'Consultant' || designation.level === 5) return 'consultant';
  }

  // Fallback
  if (designation.level === 1) return 'director';
  if (designation.level === 2 || designation.level === 3) return 'manager';
  if (designation.level === 4) return 'tl';
  return 'consultant';
}

function getLocalDefaultPermissionsForRole(role: string): string[] {
  const baseRole = role.includes(':') ? role.split(':')[0] : role;
  switch (baseRole) {
    case 'admin':
    case 'director':
      return [
        'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:track',
        'orders:create', 'orders:submit_installation', 'leads:view_sales_pipeline',
        'orders:finance_access', 'orders:verify', 'finance:manage_ledger', 'reports:view_financials',
        'orders:operations', 'ops:update_stages', 'ops:upload_drawings',
        'team:view', 'attendance:view', 'team:manage', 'logs:view', 'leads:view_all', 'leads:delete'
      ];
    case 'sales_head':
      return [
        'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:track',
        'orders:create', 'orders:submit_installation', 'leads:view_sales_pipeline', 'reports:view_financials',
        'team:view', 'attendance:view', 'logs:view'
      ];
    case 'manager':
      return [
        'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:track',
        'orders:create', 'orders:submit_installation', 'leads:view_sales_pipeline',
        'team:view', 'attendance:view', 'logs:view'
      ];
    case 'finance':
      return [
        'orders:finance_access', 'orders:verify', 'finance:manage_ledger', 'reports:view_financials'
      ];
    case 'operations':
      return [
        'orders:operations', 'ops:update_stages', 'ops:upload_drawings'
      ];
    case 'tl':
      return [
        'leads:create', 'leads:edit', 'leads:change_status', 'leads:track',
        'orders:create', 'orders:submit_installation', 'leads:view_sales_pipeline', 'reports:view_financials'
      ];
    case 'psa_tl':
      return [
        'leads:create', 'leads:edit', 'leads:change_status', 'leads:track', 'leads:import', 'reports:view_financials'
      ];
    case 'consultant':
      return [
        'leads:create', 'leads:edit', 'leads:change_status', 'leads:track',
        'orders:create', 'orders:submit_installation', 'leads:view_sales_pipeline'
      ];
    case 'psa':
    default:
      return [
        'leads:create', 'leads:edit', 'leads:change_status', 'leads:track'
      ];
  }
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

function calculateYearsInCompany(joiningDateStr: string | null): string {
  if (!joiningDateStr) return '-';
  const joiningDate = new Date(joiningDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - joiningDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = diffDays / 365.25;
  if (years < 0.1) {
    const months = Math.floor(diffDays / 30);
    if (months === 0) {
      return `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
    }
    return `${months} Month${months > 1 ? 's' : ''}`;
  }
  return `${years.toFixed(1)} Year${years.toFixed(1) !== '1.0' ? 's' : ''}`;
}

export default function TeamManagementPage() {
  const { user, refreshUser, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [managersAndTls, setManagersAndTls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Clans (Teams) state variables
  const [activeTab, setActiveTab] = useState<'members' | 'clans'>('members');
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDeptId, setNewTeamDeptId] = useState('');
  const [editingReportingUser, setEditingReportingUser] = useState<any | null>(null);
  const [newTeamAssignmentId, setNewTeamAssignmentId] = useState('');
  const [newSupervisorId, setNewSupervisorId] = useState('');
  const [savingReporting, setSavingReporting] = useState(false);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [empSearchInput, setEmpSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [departmentsList, setDepartmentsList] = useState<{ id: number; name: string }[]>([]);
  const [designationsList, setDesignationsList] = useState<{ id: number; name: string; level: number; departmentId: number | null }[]>([]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/v1/departments');
      const data = await res.json();
      if (data.success && data.data) {
        setDepartmentsList(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await fetch('/api/v1/designations');
      const data = await res.json();
      if (data.success && data.data) {
        setDesignationsList(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch('/api/v1/teams');
      const data = await res.json();
      if (data.success && data.data) {
        setTeamsList(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !newTeamDeptId) return;

    try {
      const res = await fetch('/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName,
          departmentId: newTeamDeptId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTeamName('');
        setNewTeamDeptId('');
        setShowCreateTeamModal(false);
        fetchTeams();
      } else {
        alert(data.message || 'Failed to create team.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating team.');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('Are you sure you want to delete this team? All members and leads will be unassigned from this team.')) return;

    try {
      const res = await fetch(`/api/v1/teams/${teamId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchTeams();
      } else {
        alert(data.message || 'Failed to delete team.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting team.');
    }
  };

  const handleUpdateReportingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReportingUser) return;

    setSavingReporting(true);
    try {
      const targetTeamId = newTeamAssignmentId ? parseInt(newTeamAssignmentId, 10) : null;
      const targetSupId = newSupervisorId ? parseInt(newSupervisorId, 10) : null;

      const res = await fetch(`/api/v1/teams/${targetTeamId || 0}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberAssignments: [
            {
              userId: editingReportingUser.id,
              teamId: targetTeamId,
              reportsTo: targetSupId,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingReportingUser(null);
        fetchTeams();
        fetchTeam();
      } else {
        alert(data.message || 'Failed to save changes.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving changes.');
    } finally {
      setSavingReporting(false);
    }
  };

  const handleAddTeamMember = async (userId: number, teamId: number, supervisorId: number | null) => {
    try {
      const res = await fetch(`/api/v1/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberAssignments: [
            {
              userId,
              teamId,
              reportsTo: supervisorId
            }
          ]
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchTeams();
        fetchTeam();
      } else {
        alert(data.message || 'Failed to add member.');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding member to team.');
    }
  };

  const handleRemoveTeamMember = async (userId: number, teamId: number) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      const res = await fetch(`/api/v1/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberAssignments: [
            {
              userId,
              teamId: null,
              reportsTo: null
            }
          ]
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchTeams();
        fetchTeam();
      } else {
        alert(data.message || 'Failed to remove member.');
      }
    } catch (err) {
      console.error(err);
      alert('Error removing member from team.');
    }
  };

  const checkIsDescendant = (users: any[], targetId: number, ancestorId: number): boolean => {
    const target = users.find(u => u.id === targetId);
    if (!target) return false;
    if (target.reportsTo === ancestorId) return true;
    if (!target.reportsTo) return false;
    return checkIsDescendant(users, target.reportsTo, ancestorId);
  };

  const handleDragStart = (e: React.DragEvent, userId: number, teamId: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ userId, teamId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetSupervisorId: number | null, teamId: number) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { userId, teamId: sourceTeamId } = JSON.parse(dataStr);

      if (sourceTeamId !== teamId) {
        alert("Cannot drag members across different clans. Assign them via Edit Reporting structure first.");
        return;
      }

      if (userId === targetSupervisorId) return; // Dropped on self

      // Cycle Check: Make sure targetSupervisorId is not a child/descendant of userId
      if (targetSupervisorId !== null) {
        const team = teamsList.find(t => t.id === teamId);
        if (team) {
          const isDescendant = checkIsDescendant(team.users, targetSupervisorId, userId);
          if (isDescendant) {
            alert("Invalid hierarchy: A supervisor cannot report to their own direct report.");
            return;
          }
        }
      }

      const res = await fetch(`/api/v1/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberAssignments: [
            {
              userId: userId,
              teamId: teamId,
              reportsTo: targetSupervisorId,
            }
          ]
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchTeams();
        fetchTeam();
      } else {
        alert(data.message || "Failed to update hierarchy.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderHierarchyNodes = (team: any, users: any[], parentId: number | null, level: number = 0): React.ReactNode => {
    const filteredUsers = users.filter((u) => {
      if (parentId === null) {
        return !u.reportsTo || !users.some((p) => p.id === u.reportsTo);
      }
      return u.reportsTo === parentId;
    });

    if (filteredUsers.length === 0) return null;

    return (
      <div className={`space-y-2 ${level > 0 ? 'pl-4 border-l border-slate-800/85 mt-2' : ''}`}>
        {filteredUsers.map((m: any) => {
          const isDragOver = dragOverNodeId === `node-${m.id}-${team.id}`;
          return (
            <div key={m.id} className="space-y-1 animate-fade-in">
              <div
                draggable={isAdminOrDirectorOrSalesHead}
                onDragStart={(e) => handleDragStart(e, m.id, team.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (isAdminOrDirectorOrSalesHead) {
                    setDragOverNodeId(`node-${m.id}-${team.id}`);
                  }
                }}
                onDragLeave={() => setDragOverNodeId(null)}
                onDrop={(e) => {
                  setDragOverNodeId(null);
                  handleDrop(e, m.id, team.id);
                }}
                className={`flex items-center justify-between gap-3 p-2 bg-slate-950/40 hover:bg-slate-950/70 border rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-[1.01]'
                    : 'border-slate-850 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-1 h-6 rounded-full shrink-0 ${
                    level === 0 ? 'bg-amber-500' :
                    level === 1 ? 'bg-cyan-500' :
                    level === 2 ? 'bg-indigo-500' : 'bg-slate-750'
                  }`} />
                  
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs uppercase">
                    {m.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-none mb-1">{m.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-slate-500 font-mono uppercase truncate">{m.designation?.name || m.role}</span>
                      {level > 0 && m.reportsTo && (
                        <>
                          <span className="text-slate-700 text-[8px]">•</span>
                          <span className="text-[8px] text-amber-500/70 font-semibold" title={`Supervisor: ID ${m.reportsTo}`}>
                            Reports to: {users.find((u: any) => u.id === m.reportsTo)?.name || `ID ${m.reportsTo}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {(() => {
                  const isEditorSupervisor = user && m && 
                    user.departmentId === m.departmentId && 
                    user.designation && m.designation && 
                    user.designation.level < m.designation.level;
                  const canEdit = isAdminOrDirectorOrSalesHead || isEditorSupervisor;
                  if (!canEdit) return null;
                  return (
                    <div className="flex gap-1.5 items-center">
                      <button
                        onClick={() => {
                          setEditingReportingUser(m);
                          setNewTeamAssignmentId(String(team.id));
                          setNewSupervisorId(m.reportsTo ? String(m.reportsTo) : '');
                        }}
                        className="py-1 px-2 bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:border-slate-800 text-[9px] text-slate-400 hover:text-white rounded-lg transition-all font-semibold cursor-pointer"
                      >
                        Reporting
                      </button>
                      <button
                        onClick={() => handleRemoveTeamMember(m.id, team.id)}
                        className="py-1 px-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 text-[9px] text-red-400 hover:text-red-300 rounded-lg transition-all font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })()}
              </div>
              
              {renderHierarchyNodes(team, users, m.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderGlobalHierarchyNodes = (usersList: any[], parentId: number | null, level: number = 0): React.ReactNode => {
    const filteredUsers = usersList.filter((u) => {
      if (parentId === null) {
        return !u.reportsTo || !usersList.some((p) => p.id === u.reportsTo);
      }
      return u.reportsTo === parentId;
    });

    if (filteredUsers.length === 0) return null;

    return (
      <div className={`space-y-2.5 ${level > 0 ? 'pl-6 border-l-2 border-dashed border-slate-800 mt-2.5 ml-4' : ''}`}>
        {filteredUsers.map((m: any) => {
          const deptName = departmentsList.find(d => d.id === m.departmentId)?.name || 'Unassigned';
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-850 rounded-xl transition-all duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-1.5 h-8 rounded-full shrink-0 ${
                    level === 0 ? 'bg-red-500' :
                    level === 1 ? 'bg-indigo-500' :
                    level === 2 ? 'bg-purple-500' :
                    level === 3 ? 'bg-amber-500' :
                    level === 4 ? 'bg-cyan-500' : 'bg-emerald-500'
                  }`} />
                  <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-350 font-extrabold text-xs uppercase shadow-inner shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-none mb-1">{m.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold tracking-wide">{m.designation?.name || 'Employee'}</span>
                      <span className="text-slate-700 text-xs">•</span>
                      <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">{deptName}</span>
                    </div>
                  </div>
                </div>
              </div>
              {renderGlobalHierarchyNodes(usersList, m.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const handleCreateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designationName.trim()) {
      alert('Please enter a designation name.');
      return;
    }
    try {
      const res = await fetch('/api/v1/designations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: designationName,
          level: Number(designationLevel),
          departmentId: designationDeptId ? Number(designationDeptId) : null,
        })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setDesignationName('');
        setDesignationLevel(5);
        setDesignationDeptId('');
        fetchDesignations();
      }
    } catch (err) {
      console.error(err);
      alert('Error creating designation.');
    }
  };

  const handleUpdateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesignation) return;
    if (!designationName.trim()) {
      alert('Please enter a designation name.');
      return;
    }
    try {
      const res = await fetch('/api/v1/designations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDesignation.id,
          name: designationName,
          level: Number(designationLevel),
          departmentId: designationDeptId ? Number(designationDeptId) : null,
        })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setEditingDesignation(null);
        setDesignationName('');
        setDesignationLevel(5);
        setDesignationDeptId('');
        fetchDesignations();
      }
    } catch (err) {
      console.error(err);
      alert('Error updating designation.');
    }
  };

  const handleDeleteDesignation = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/designations?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchDesignations();
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting designation.');
    }
  };

  const isCurrentUserAdmin = user?.role === 'admin' || user?.role?.startsWith('admin:');
  const canEditPermissionsAndRole = isCurrentUserAdmin || (
    user && selectedMember && 
    user.departmentId === selectedMember.departmentId && 
    user.designation && selectedMember.designation && 
    user.designation.level < selectedMember.designation.level
  );
  
  // Add User Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    employeeId: '',
    role: 'consultant',
    password: '',
    reportsTo: '',
    joiningDate: '',
    photograph: '',
    departmentId: '',
    designationId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingAddPhoto, setUploadingAddPhoto] = useState(false);
  const [addPhotoPreviewUrl, setAddPhotoPreviewUrl] = useState('');

  // Edit Own Profile state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoPath, setEditPhotoPath] = useState('');
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [editPhotoPreviewUrl, setEditPhotoPreviewUrl] = useState('');

  // Activity Logs Modal States
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsMember, setLogsMember] = useState<TeamMember | null>(null);
  const [logsDate, setLogsDate] = useState('');
  const [logsList, setLogsList] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Hierarchy Modal states
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [modalTab, setModalTab] = useState<'designations' | 'orgTree'>('designations');
  const [editingDesignation, setEditingDesignation] = useState<any | null>(null);
  const [designationName, setDesignationName] = useState('');
  const [designationLevel, setDesignationLevel] = useState(5);
  const [designationDeptId, setDesignationDeptId] = useState('');

  // Edit Other Member states (for admin/director/sales_head)
  const [editMemberForm, setEditMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    employeeId: '',
    role: 'consultant',
    reportsTo: '',
    joiningDate: '',
    photograph: '',
    isActive: true,
    departmentId: '',
    designationId: '',
  });
  const [editMemberPhotoPreviewUrl, setEditMemberPhotoPreviewUrl] = useState('');
  const [editMemberPassword, setEditMemberPassword] = useState('');
  const [uploadingEditMemberPhoto, setUploadingEditMemberPhoto] = useState(false);
  const [updatingMember, setUpdatingMember] = useState(false);
  const [updateMemberError, setUpdateMemberError] = useState('');

  // States for handling custom roles in Add/Edit user forms
  const [addCustomRoleText, setAddCustomRoleText] = useState('');
  const [addBaseRole, setAddBaseRole] = useState('consultant');
  const [editCustomRoleText, setEditCustomRoleText] = useState('');
  const [editBaseRole, setEditBaseRole] = useState('consultant');
  const [editMemberPermissions, setEditMemberPermissions] = useState<string[]>([]);
  const [selectedPermissionCategory, setSelectedPermissionCategory] = useState<string>('PSA');

  // Automatically reset permissions to designation defaults on active dropdown change
  useEffect(() => {
    if (selectedMember && editMemberForm.designationId) {
      const isDesignationChanged = String(selectedMember.designationId || '') !== String(editMemberForm.designationId);
      const isDepartmentChanged = String(selectedMember.departmentId || '') !== String(editMemberForm.departmentId);
      if (isDesignationChanged || isDepartmentChanged) {
        const derivedRole = deriveRoleFromDesignationAndDept(
          editMemberForm.designationId,
          editMemberForm.departmentId,
          designationsList,
          departmentsList
        );
        setEditMemberPermissions(getLocalDefaultPermissionsForRole(derivedRole));
      }
    }
  }, [editMemberForm.designationId, editMemberForm.departmentId, selectedMember, designationsList, departmentsList]);

  const closeAddModal = () => {
    setShowAddModal(false);
    if (addPhotoPreviewUrl) {
      URL.revokeObjectURL(addPhotoPreviewUrl);
      setAddPhotoPreviewUrl('');
    }
    setForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      employeeId: '',
      role: 'consultant',
      password: '',
      reportsTo: '',
      joiningDate: '',
      photograph: '',
      departmentId: '',
      designationId: '',
    });
    setAddCustomRoleText('');
    setAddBaseRole('consultant');
    setFormError('');
  };

  const closeProfileModal = () => {
    setSelectedMember(null);
    if (editPhotoPreviewUrl) {
      URL.revokeObjectURL(editPhotoPreviewUrl);
      setEditPhotoPreviewUrl('');
    }
    if (editMemberPhotoPreviewUrl) {
      URL.revokeObjectURL(editMemberPhotoPreviewUrl);
      setEditMemberPhotoPreviewUrl('');
    }
    setEditCustomRoleText('');
    setEditBaseRole('consultant');
    setEditMemberPermissions([]);
    setEditMemberPassword('');
  };

  // Fetch team members
  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/v1/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data) {
        setMembers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const selectable = displayedMembers.filter(m => m.id !== user?.id).map(m => m.id);
      setSelectedUserIds(selectable);
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (id: number) => {
    if (id === user?.id) return;
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete', confirmUnassign = false) => {
    if (selectedUserIds.length === 0) return;
    const actionLabel = action === 'activate' ? 'activate' : action === 'deactivate' ? 'deactivate' : 'delete';
    
    const executeAction = async (unassign = confirmUnassign) => {
      try {
        setBulkActionLoading(true);
        const res = await fetch('/api/v1/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: selectedUserIds, action, confirmUnassign: unassign }),
        });
        const data = await res.json();

        if (!data.success && data.requiresConfirmation) {
          if ((window as any).showConfirm) {
            (window as any).showConfirm(data.message, () => {
              handleBulkAction(action, true);
            });
          } else if (confirm(data.message)) {
            handleBulkAction(action, true);
          }
        } else {
          alert(data.message);
          if (data.success) {
            setSelectedUserIds([]);
            fetchTeam();
          }
        }
      } catch (err) {
        console.error(err);
        alert('Failed to perform bulk action.');
      } finally {
        setBulkActionLoading(false);
      }
    };

    if (!confirmUnassign) {
      if ((window as any).showConfirm) {
        (window as any).showConfirm(`Are you sure you want to ${actionLabel} ${selectedUserIds.length} selected team member(s)?`, () => executeAction(false));
      } else if (confirm(`Are you sure you want to ${actionLabel} ${selectedUserIds.length} selected team member(s)?`)) {
        executeAction(false);
      }
    } else {
      executeAction(true);
    }
  };

  // Fetch managers & TLs to populate reportsTo dropdown
  const fetchSupervisors = async () => {
    try {
      const res = await fetch('/api/v1/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data) {
        // Supervisors must be admin, director, sales_head, manager, tl, or psa_tl
        const filtered = data.data.filter((u: any) => {
          const baseRole = u.role.includes(':') ? u.role.split(':')[0] : u.role;
          return ['admin', 'director', 'sales_head', 'manager', 'tl', 'psa_tl'].includes(baseRole);
        });
        setManagersAndTls(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeam();
      fetchSupervisors();
      fetchDepartments();
      fetchDesignations();
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    const userIdParam = searchParams.get('userId');
    if (userIdParam && members.length > 0) {
      const targetId = parseInt(userIdParam, 10);
      const member = members.find(m => m.id === targetId);
      if (member) {
        handleOpenProfile(member);
      }
    }
  }, [searchParams, members]);

  // Handle opening profile view
  const handleOpenProfile = (member: TeamMember) => {
    setSelectedMember(member);
    if (member.id === user?.id) {
      setEditName(member.name);
      setEditEmail(member.email);
      setEditEmployeeId(member.employeeId || '');
      setEditPhone(member.phone || '');
      setEditPhotoPath(member.photograph || '');
      setUpdateError('');
    } else if (isAdminOrDirectorOrSalesHead) {
      if (member.role.includes(':')) {
        const [base, custom] = member.role.split(':');
        setEditCustomRoleText(custom);
        setEditBaseRole(base);
      } else {
        setEditCustomRoleText('');
        setEditBaseRole(member.role);
      }
      if (member.permissions && member.permissions.trim()) {
        setEditMemberPermissions(member.permissions.split(',').map((p: string) => p.trim()));
      } else {
        setEditMemberPermissions(getLocalDefaultPermissionsForRole(member.role));
      }
      setEditMemberForm({
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        address: member.address || '',
        employeeId: member.employeeId || '',
        role: member.role,
        reportsTo: member.reportsTo ? String(member.reportsTo) : '',
        joiningDate: member.joiningDate ? member.joiningDate.split('T')[0] : '',
        photograph: member.photograph || '',
        isActive: member.isActive,
        departmentId: (member as any).departmentId ? String((member as any).departmentId) : '',
        designationId: (member as any).designationId ? String((member as any).designationId) : '',
      });
      setEditMemberPhotoPreviewUrl('');
      setUpdateMemberError('');
    }
  };

  const getTodayLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleOpenActivityLogs = (member: TeamMember) => {
    setLogsMember(member);
    setShowLogsModal(true);
    const today = getTodayLocalDateStr();
    setLogsDate(today);
    fetchActivityLogs(member.id, today);
  };

  const fetchActivityLogs = async (userId: number, dateStr: string) => {
    if (!userId) return;
    try {
      setLogsLoading(true);
      const res = await fetch(`/api/v1/users/${userId}/activity?startDate=${dateStr}&endDate=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setLogsList(data.data || []);
      } else {
        alert(data.message || 'Failed to fetch activity logs.');
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleLogsDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setLogsDate(newDate);
    if (logsMember) {
      fetchActivityLogs(logsMember.id, newDate);
    }
  };

  // Handle photo upload inside Add User modal
  const handleAddPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local blob URL for preview
    const objectUrl = URL.createObjectURL(file);
    if (addPhotoPreviewUrl) {
      URL.revokeObjectURL(addPhotoPreviewUrl);
    }
    setAddPhotoPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingAddPhoto(true);
      const res = await fetch('/api/v1/users/upload-photograph', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm(prev => ({ ...prev, photograph: data.filePath }));
      } else {
        alert(data.message || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading photo.');
    } finally {
      setUploadingAddPhoto(false);
    }
  };

  // Handle photo upload inside Edit Own Profile modal
  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local blob URL for preview
    const objectUrl = URL.createObjectURL(file);
    if (editPhotoPreviewUrl) {
      URL.revokeObjectURL(editPhotoPreviewUrl);
    }
    setEditPhotoPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingEditPhoto(true);
      const res = await fetch('/api/v1/users/upload-photograph', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setEditPhotoPath(data.filePath);
      } else {
        alert(data.message || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading photo.');
    } finally {
      setUploadingEditPhoto(false);
    }
  };

  // Handle photo upload inside Edit Other Member modal (admins/directors/sales heads)
  const handleEditMemberPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    if (editMemberPhotoPreviewUrl) {
      URL.revokeObjectURL(editMemberPhotoPreviewUrl);
    }
    setEditMemberPhotoPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingEditMemberPhoto(true);
      const res = await fetch('/api/v1/users/upload-photograph', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setEditMemberForm(prev => ({ ...prev, photograph: data.filePath }));
      } else {
        alert(data.message || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading photo.');
    } finally {
      setUploadingEditMemberPhoto(false);
    }
  };

  // Save changes to another member's profile (admins/directors/sales heads)
  const handleSaveMemberDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setUpdatingMember(true);
    setUpdateMemberError('');

    let finalRole = editMemberForm.role;
    if (editMemberForm.role === 'other') {
      if (!editCustomRoleText.trim()) {
        alert('Please enter a custom designation name.');
        setUpdatingMember(false);
        return;
      }
      finalRole = `${editBaseRole}:${editCustomRoleText.trim()}`;
    }

    if (!editMemberForm.phone.trim() || !editMemberForm.address.trim()) {
      alert('Contact number and full address are essential required inputs.');
      setUpdatingMember(false);
      return;
    }

    try {
      const payload: any = {
        name: editMemberForm.name,
        email: editMemberForm.email,
        phone: editMemberForm.phone,
        address: editMemberForm.address,
        employeeId: editMemberForm.employeeId,
        role: finalRole,
        permissions: (() => {
          const cleanPerms = editMemberPermissions.filter((p) => p !== 'none');
          return cleanPerms.length === 0 ? 'none' : cleanPerms.join(',');
        })(),
        reportsTo: editMemberForm.reportsTo ? parseInt(editMemberForm.reportsTo, 10) : null,
        joiningDate: editMemberForm.joiningDate ? new Date(editMemberForm.joiningDate) : null,
        photograph: editMemberForm.photograph || null,
        isActive: editMemberForm.isActive,
        departmentId: editMemberForm.departmentId ? parseInt(editMemberForm.departmentId, 10) : null,
        designationId: editMemberForm.designationId ? parseInt(editMemberForm.designationId, 10) : null,
      };

      if (editMemberPassword.trim()) {
        if (editMemberPassword.trim().length < 6) {
          alert('Password must be at least 6 characters long.');
          setUpdatingMember(false);
          return;
        }
        payload.password = editMemberPassword.trim();
      }

      const res = await fetch(`/api/v1/users/${selectedMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert('Member profile updated successfully!');
        closeProfileModal();
        fetchTeam();
      } else {
        setUpdateMemberError(data.message || 'Failed to update member profile.');
      }
    } catch (err) {
      console.error(err);
      setUpdateMemberError('An error occurred while saving profile.');
    } finally {
      setUpdatingMember(false);
    }
  };

  // Toggle user activation status (deactivate soft-delete with reassignments)
  const handleToggleActive = async (member: TeamMember) => {
    const actionText = member.isActive ? 'deactivate' : 'reactivate';
    let warning = `Are you sure you want to ${actionText} this user profile?`;
    
    if (member.isActive && member.role === 'consultant') {
      warning = `Warning: Deactivating Consultant "${member.name}" will automatically reassign all their active leads up the hierarchy to their Team Leader (TL). Do you want to proceed?`;
    }

    const proceed = async () => {
      try {
        const res = await fetch(`/api/v1/users/${member.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !member.isActive }),
        });
        
        const data = await res.json();
        if (data.success) {
          alert(data.message || `User status changed successfully.`);
          fetchTeam();
          if (selectedMember && selectedMember.id === member.id) {
            setSelectedMember(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
          }
        } else {
          alert(data.message || 'Failed to update user status.');
        }
      } catch (err) {
        console.error(err);
      }
    };

    if ((window as any).showConfirm) {
      (window as any).showConfirm(warning, proceed);
    } else if (window.confirm(warning)) {
      proceed();
    }
  };

  // Completely delete a user after unassigning leads
  const handleDeleteUser = async (member: TeamMember, confirmUnassign = false) => {
    const proceed = async (unassign = confirmUnassign) => {
      try {
        const url = `/api/v1/users/${member.id}${unassign ? '?confirm_unassign=true' : ''}`;
        const res = await fetch(url, {
          method: 'DELETE',
        });

        const data = await res.json();

        if (!data.success && data.requiresConfirmation) {
          if ((window as any).showConfirm) {
            (window as any).showConfirm(data.message, () => {
              handleDeleteUser(member, true);
            });
          } else if (window.confirm(data.message)) {
            handleDeleteUser(member, true);
          }
        } else {
          alert(data.message || 'Action completed.');
          if (data.success) {
            closeProfileModal();
            fetchTeam();
          }
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred while trying to delete the team member.');
      }
    };

    if (!confirmUnassign) {
      if ((window as any).showConfirm) {
        (window as any).showConfirm(`Are you sure you want to delete team member "${member.name}"?`, () => proceed(false));
      } else if (window.confirm(`Are you sure you want to delete team member "${member.name}"?`)) {
        proceed(false);
      }
    } else {
      proceed(true);
    }
  };

  // Add User submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    if (!form.phone.trim() || !form.address.trim()) {
      alert('Contact number and full address are essential required inputs.');
      setSubmitting(false);
      return;
    }

    let finalRole = form.role;
    if (form.role === 'other') {
      if (!addCustomRoleText.trim()) {
        alert('Please enter a custom designation name.');
        setSubmitting(false);
        return;
      }
      finalRole = `${addBaseRole}:${addCustomRoleText.trim()}`;
    }

    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: finalRole }),
      });

      const data = await res.json();
      if (data.success) {
        closeAddModal();
        fetchTeam();
        alert('Team member registered successfully!');
      } else {
        setFormError(data.message || 'Failed to register team member.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Internal server error.');
    } finally {
      setSubmitting(false);
    }
  };

  // Save changes to own profile
  const handleSaveOwnProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdatingProfile(true);
    setUpdateError('');

    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: isCurrentUserAdmin ? editName : undefined,
          email: isCurrentUserAdmin ? editEmail : undefined,
          employeeId: isCurrentUserAdmin ? editEmployeeId : undefined,
          phone: editPhone,
          photograph: editPhotoPath,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Profile updated successfully!');
        closeProfileModal();
        fetchTeam();
        refreshUser(); // update current user context (e.g. for header)
      } else {
        setUpdateError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setUpdateError('An error occurred while saving profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <Sun className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  const userBaseRole = user?.role ? (user.role.includes(':') ? user.role.split(':')[0] : user.role) : '';
  const isAdminOrDirectorOrSalesHead = hasPermission('team:manage');
  const hasFullTeamAccess = user?.role === 'admin' || user?.role?.startsWith('admin:') || hasPermission('team:view') || hasPermission('team:manage');
  const titleText = 'Santori Team';

  // Extract custom designations currently defined in the database
  const customDesignations = Array.from(
    new Set(
      members
        .map((m) => m.role)
        .filter((role) => role && role.includes(':'))
    )
  );

  const displayedMembers = members.filter((member) => {
    // 1. Search Query filter (matches name, email, or employee ID)
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = member.name.toLowerCase().includes(q);
      const matchEmail = member.email.toLowerCase().includes(q);
      const matchEmpId = member.employeeId && member.employeeId.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchEmpId) return false;
    }

    // 2. Department filter
    if (selectedDepartmentFilter) {
      const deptId = parseInt(selectedDepartmentFilter, 10);
      if (member.departmentId !== deptId) return false;
    }

    // 3. Visibility rule
    if (hasFullTeamAccess) {
      return true;
    } else {
      if (!empSearchInput.trim()) return false;
      return member.employeeId && member.employeeId.trim().toLowerCase() === empSearchInput.trim().toLowerCase();
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">{titleText}</h1>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'members'
              ? (isAdminOrDirectorOrSalesHead
                ? 'Manage user profiles, assign roles, and handle account status.'
                : 'Browse company directory and see colleagues.')
              : 'Create teams (clans), define reporting structures, and track team members.'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {activeTab === 'clans' && isAdminOrDirectorOrSalesHead && (
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-955 rounded-lg font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all w-fit cursor-pointer border border-transparent animate-fade-in"
            >
              <Plus className="w-4 h-4" />
              <span>Create Clan (Team)</span>
            </button>
          )}
          {activeTab === 'members' && user?.role === 'admin' && (
            <button
              onClick={() => {
                setEditingDesignation(null);
                setDesignationName('');
                setDesignationLevel(5);
                setDesignationDeptId('');
                setShowHierarchyModal(true);
              }}
              className="py-2.5 px-4 bg-gradient-to-r from-blue-650 to-indigo-650 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all w-fit cursor-pointer font-sans border border-transparent"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Org Hierarchy</span>
            </button>
          )}
          {activeTab === 'members' && isAdminOrDirectorOrSalesHead && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-955 rounded-lg font-bold text-xs shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all w-fit cursor-pointer border border-transparent"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      {isAdminOrDirectorOrSalesHead && (
        <div className="flex border border-slate-800 bg-slate-950/60 p-1 rounded-xl w-fit gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'members'
                ? 'bg-amber-500 text-slate-955 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            Members Directory
          </button>
          <button
            onClick={() => {
              setActiveTab('clans');
              fetchTeams();
            }}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'clans'
                ? 'bg-amber-500 text-slate-955 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            Clans (Teams) Manager
          </button>
        </div>
      )}

      {activeTab === 'members' && (
        <>

      {/* Directory Search and Department Filter for full-access users */}
      {hasFullTeamAccess && (
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#111625]/60 border border-slate-800 p-4 rounded-xl shadow-xl">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or employee ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
          <div className="w-full sm:w-64">
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:ring-amber-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departmentsList.map((dept) => (
                <option key={dept.id} value={String(dept.id)}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Restricted Directory Search Card for non-admins */}
      {!hasFullTeamAccess && (
        <>
          <div className="bg-[#111625] border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Employee Directory Lookup</h3>
                <p className="text-[11px] text-slate-400">
                  Type an exact Employee ID below to view details of a specific team member.
                </p>
              </div>
            </div>

            <div className="relative max-w-md">
              <input
                type="text"
                value={empSearchInput}
                onChange={(e) => setEmpSearchInput(e.target.value)}
                placeholder="Enter exact Employee ID (e.g. EMP-101)..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-955 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono tracking-wide"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* My Team UI Section for non-admins */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Main Clan Card */}
            <div className="bg-[#111625] border border-slate-805 rounded-2xl shadow-xl p-5 lg:col-span-2 space-y-4">
              {(() => {
                const myTeam = teamsList.find(t => t.id === user?.teamId);
                if (!myTeam) {
                  return (
                    <div className="text-center py-6">
                      <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Clan (Team)</h3>
                      <p className="text-xs text-slate-450 mt-1">You are not currently assigned to any Clan / Team.</p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wide">{myTeam.name}</h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Team ID: #{myTeam.id}</p>
                      </div>
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-2.5 py-1 font-bold uppercase tracking-wider">
                        {myTeam.department?.name || 'Department'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-3 font-sans">Team Structure & Hierarchy</h4>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {renderHierarchyNodes(myTeam, myTeam.users, null)}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Supervisor Management Control Panel */}
            {(() => {
              const myTeam = teamsList.find(t => t.id === user?.teamId);
              if (!myTeam) return null;

              const isSupervisor = user?.designation && user.designation.level < 5;
              if (!isSupervisor) return null;

              // Find candidates: active users in same department, not in this team, lower designation level (larger level number)
              const candidates = members.filter(m => 
                m.isActive && 
                m.departmentId === user.departmentId && 
                m.teamId !== myTeam.id && 
                user.designation && m.designation && 
                user.designation.level < m.designation.level
              );

              return (
                <div className="bg-[#111625] border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Team Member</h3>
                    <p className="text-[10px] text-slate-450 mt-1 font-sans">Assign department subordinates directly into your team.</p>
                  </div>

                  {candidates.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No eligible candidates available in your department.</p>
                  ) : (
                    <MyTeamAddMemberForm 
                      candidates={candidates} 
                      myTeam={myTeam} 
                      onAdd={handleAddTeamMember} 
                    />
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Bulk Actions Control Bar */}
      {isAdminOrDirectorOrSalesHead && selectedUserIds.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">
              {selectedUserIds.length}
            </span>
            <span className="text-xs font-semibold text-slate-200">Team Member(s) Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('activate')}
              disabled={bulkActionLoading}
              className="py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Activate</span>
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              disabled={bulkActionLoading}
              className="py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Deactivate</span>
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading}
              className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Users table card */}
      <div className="bg-[#111625] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {isAdminOrDirectorOrSalesHead && (
                  <th className="py-4 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={displayedMembers.length > 0 && displayedMembers.filter(m => m.id !== user?.id).length > 0 && displayedMembers.filter(m => m.id !== user?.id).every(m => selectedUserIds.includes(m.id))}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-4 px-4 w-20 text-center">Photo</th>
                <th className="py-4 px-4 w-48">Full Name</th>
                <th className="py-4 px-4 w-32">Employee ID</th>
                <th className="py-4 px-4 w-40">Designation</th>
                {isAdminOrDirectorOrSalesHead ? (
                  <>
                    <th className="py-4 px-4 w-40">Direct Supervisor</th>
                    <th className="py-4 px-4 w-36">Years in the Company</th>
                    <th className="py-4 px-4 w-28 text-center">Leads Closed</th>
                    <th className="py-4 px-4 w-28 text-center">Status</th>
                    <th className="py-4 px-4 w-36 text-center">Control</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-4 w-36">Years in the Company</th>
                    <th className="py-4 px-4 w-28 text-center">Leads Closed</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {displayedMembers.length === 0 ? (
                <tr>
                  <td colSpan={isAdminOrDirectorOrSalesHead ? 10 : 6} className="py-12 text-center text-slate-500 text-xs">
                    {!hasFullTeamAccess ? (
                      !empSearchInput.trim() ? (
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-6 h-6 text-slate-600" />
                          <span className="font-semibold text-slate-400">Please enter an exact Employee ID above to view a team member.</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <UserX className="w-6 h-6 text-slate-600" />
                          <span>No team member found matching Employee ID "{empSearchInput.trim()}".</span>
                        </div>
                      )
                    ) : (
                      'No team members found.'
                    )}
                  </td>
                </tr>
              ) : (
                displayedMembers.map((member) => {
                  const roleConfig = { label: getRoleLabel(member.role), class: getRoleClass(member.role) };
                  
                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-900/10 transition-colors ${
                        !member.isActive ? 'opacity-50' : ''
                      } ${selectedUserIds.includes(member.id) ? 'bg-amber-500/5' : ''}`}
                    >
                      {isAdminOrDirectorOrSalesHead && (
                        <td className="py-4 px-3 text-center w-10">
                          {member.id !== user?.id && (
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(member.id)}
                              onChange={() => handleSelectUser(member.id)}
                              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                            />
                          )}
                        </td>
                      )}
                      {/* Photograph Column */}
                      <td className="py-4 px-4 text-center w-20">
                        {member.photograph ? (
                          <img
                            src={`/api/v1/users/${member.id}/photograph?t=${Date.now()}`}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-800 mx-auto"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 mx-auto shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Full Name Column */}
                      <td className="py-4 px-4 font-bold text-white w-48">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenProfile(member)}
                            className="hover:text-amber-400 text-left font-bold text-white transition-colors cursor-pointer"
                          >
                            {member.name}
                          </button>
                          {member.id === user?.id && (
                            <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded px-1.5 font-extrabold uppercase">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Employee ID Column */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-300 w-32">
                        {member.employeeId || <span className="text-slate-600 italic">Not Set</span>}
                      </td>

                      {/* Designation/Role Column */}
                      <td className="py-4 px-4 w-40">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${roleConfig.class}`}>
                          {member.designation?.name || roleConfig.label}
                        </span>
                      </td>

                      {isAdminOrDirectorOrSalesHead ? (
                        <>
                          <td className="py-4 px-4 text-slate-400 w-40">
                            {member.supervisor?.name || <span className="text-slate-600 text-xs italic">None</span>}
                          </td>
                          <td className="py-4 px-4 text-slate-300 w-36">
                            {calculateYearsInCompany(member.joiningDate)}
                          </td>
                          <td className="py-4 px-4 text-center text-emerald-400 font-bold font-mono w-28">
                            {member.leadsClosed || 0}
                          </td>
                          <td className="py-4 px-4 text-center w-28">
                            <span
                              className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${
                                member.isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                            >
                                {member.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center w-36">
                            <div className="flex items-center justify-center gap-2">
                              {hasPermission('logs:view') && (
                                <button
                                  onClick={() => handleOpenActivityLogs(member)}
                                  className="p-1.5 rounded-lg border bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center"
                                  title="View Activity Logs"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                              )}

                              {isAdminOrDirectorOrSalesHead && member.id !== user?.id && (
                                <button
                                  onClick={() => {
                                    setEditingReportingUser(member);
                                    const assignedTeam = teamsList.find(t => t.users.some((u: any) => u.id === member.id));
                                    setNewTeamAssignmentId(assignedTeam ? String(assignedTeam.id) : '');
                                    setNewSupervisorId(member.reportsTo ? String(member.reportsTo) : '');
                                  }}
                                  className="p-1.5 rounded-lg border bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center"
                                  title="Edit Clan & Supervisor"
                                >
                                  <Users className="w-4 h-4 text-amber-500" />
                                </button>
                              )}

                              {member.id !== user?.id && member.role !== 'admin' && !member.role.startsWith('admin:') && (
                                <>
                                  <button
                                    onClick={() => handleToggleActive(member)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      member.isActive
                                        ? 'bg-red-950/20 text-red-400 border-red-900/30 hover:bg-red-950/40'
                                        : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30 hover:bg-emerald-950/40'
                                    }`}
                                    title={member.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                                  >
                                    {member.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                  </button>
                                  
                                  {!member.isActive && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(member)}
                                      className="p-1.5 rounded-lg border bg-rose-950/20 text-rose-455 border-rose-900/30 hover:bg-rose-950/40 transition-all cursor-pointer"
                                      title="Permanently Delete User"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-4 text-slate-300 w-36">
                            {calculateYearsInCompany(member.joiningDate)}
                          </td>
                          <td className="py-4 px-4 text-center text-emerald-400 font-bold font-mono w-28">
                            {member.leadsClosed || 0}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      </>
    )}

    {/* Clans Manager Tab Content */}
    {activeTab === 'clans' && (
      <div className="space-y-6 animate-fade-in">
        {loadingTeams ? (
          <div className="flex items-center justify-center p-12 bg-[#111625]/60 border border-slate-800 rounded-2xl">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : teamsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#111625]/60 border border-slate-800 rounded-2xl text-center space-y-3">
            <Users className="w-12 h-12 text-slate-650" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Clans / Teams Formed</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Clans allow grouping pre-sales agents, consultants, team leaders, and managers to coordinate workflow stages together.
            </p>
            {isAdminOrDirectorOrSalesHead && (
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-955 rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Create Your First Clan
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {teamsList.map((team) => (
              <div key={team.id} className="bg-[#111625] border border-slate-805 rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between">
                {/* Clan Header */}
                <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">{team.name}</h3>
                      <span className="text-[9px] bg-slate-950/80 text-amber-400 border border-slate-800 rounded px-2 py-0.5 font-bold uppercase tracking-wider">
                        {team.department?.name || 'Department'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Team ID: #{team.id}</p>
                  </div>
                  {isAdminOrDirectorOrSalesHead && (
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2 rounded-lg bg-red-955/10 hover:bg-red-950/30 text-red-400 border border-red-900/20 hover:border-red-900/40 transition-all cursor-pointer"
                      title="Delete Clan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Clan Members */}
                <div className="p-4 flex-1">
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-3">Clan Hierarchy & Members</h4>
                  {team.users.length === 0 ? (
                    <p className="text-xs text-slate-650 italic">No members assigned to this clan yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {isAdminOrDirectorOrSalesHead && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverNodeId(`root-${team.id}`);
                          }}
                          onDragLeave={() => setDragOverNodeId(null)}
                          onDrop={(e) => {
                            setDragOverNodeId(null);
                            handleDrop(e, null, team.id);
                          }}
                          className={`border border-dashed p-2.5 rounded-xl text-center text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer font-mono font-bold ${
                            dragOverNodeId === `root-${team.id}`
                              ? 'border-amber-500 bg-amber-500/10 text-amber-400 scale-[1.01]'
                              : 'border-slate-800 text-slate-500 hover:text-slate-400 hover:border-slate-700 hover:bg-slate-900/10'
                          }`}
                        >
                          Drop here to make Top-Level (Supervisor: Head)
                        </div>
                      )}
                      
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {renderHierarchyNodes(team, team.users, null)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Create Team Modal */}
    {showCreateTeamModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="w-full max-w-md bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
          <div className="p-5 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Form New Clan (Team)</h3>
            <button onClick={() => setShowCreateTeamModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreateTeamSubmit}>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-455 uppercase tracking-wider mb-1.5 font-mono">Clan / Team Name *</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. PSA Tigers, Sales Challengers..."
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-455 uppercase tracking-wider mb-1.5 font-mono">Department Assignment *</label>
                <select
                  required
                  value={newTeamDeptId}
                  onChange={(e) => setNewTeamDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">Select a department...</option>
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 bg-slate-900/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-955 rounded-xl font-bold text-xs shadow-md shadow-amber-500/10 cursor-pointer"
              >
                Create Team
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Edit Reporting Connection Modal */}
    {editingReportingUser && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="w-full max-w-md bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
          <div className="p-5 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Edit Reporting Structure</h3>
            <button onClick={() => setEditingReportingUser(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleUpdateReportingSubmit}>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl">
                <p className="text-xs text-white font-bold">{editingReportingUser.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide font-mono">
                  {editingReportingUser.role} (Current Supervisor ID: {editingReportingUser.reportsTo || 'None'})
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-455 uppercase tracking-wider mb-1.5">Assign to Clan (Team)</label>
                <select
                  value={newTeamAssignmentId}
                  onChange={(e) => setNewTeamAssignmentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">No Clan / Unassigned</option>
                  {teamsList.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.department?.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-455 uppercase tracking-wider mb-1.5">Reporting Supervisor</label>
                <select
                  value={newSupervisorId}
                  onChange={(e) => setNewSupervisorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-805 rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">No Supervisor / Reports directly to Head</option>
                  {members
                    .filter((m) => {
                      if (m.id === editingReportingUser.id) return false;
                      const targetLevel = editingReportingUser.designation?.level ?? 99;
                      const supLevel = m.designation?.level ?? 99;
                      
                      // Level 1 Department Head reports to Admin (Level 0)
                      if (targetLevel === 1) {
                        return m.role === 'admin' || supLevel === 0;
                      }
                      
                      // Level > 1 reports to same department and higher in hierarchy
                      return m.departmentId === editingReportingUser.departmentId && supLevel < targetLevel && supLevel > 0;
                    })
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.designation?.name || m.role})</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 bg-slate-900/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingReportingUser(null)}
                className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingReporting}
                className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-955 rounded-xl font-bold text-xs shadow-md shadow-amber-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingReporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Assignment</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* ============================================================== */}
      {/* Add User Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Register New Team Member</h3>
              <button onClick={closeAddModal} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Photo Upload Area */}
              <div className="flex items-center gap-4 p-4 bg-slate-900/20 border border-slate-800/80 rounded-xl">
                <div className="relative w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                  {addPhotoPreviewUrl || form.photograph ? (
                    <img src={addPhotoPreviewUrl || form.photograph} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-500" />
                  )}
                  {uploadingAddPhoto && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Profile Photograph</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      id="add-photo-input"
                      onChange={handleAddPhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="add-photo-input"
                      className="py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit cursor-pointer transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{form.photograph ? 'Change Photo' : 'Upload Photograph'}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ramesh Singh"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Employee ID <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    placeholder="e.g. EMP-1002"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. ramesh@solarcrm.com"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Contact Number <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Contact number"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Full Address <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Complete residential address"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Department
                  </label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                  >
                    <option value="">No Department / Shared</option>
                    {departmentsList.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Designation
                  </label>
                  <select
                    value={form.designationId}
                    onChange={(e) => setForm({ ...form, designationId: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                  >
                    <option value="">Select Designation...</option>
                    {designationsList
                      .filter((des) => !form.departmentId || des.departmentId === null || des.departmentId === parseInt(form.departmentId, 10))
                      .map((des) => (
                        <option key={des.id} value={des.id}>{des.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Initial Password <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Direct Supervisor (Reports To)</label>
                  <select
                    value={form.reportsTo}
                    onChange={(e) => setForm({ ...form, reportsTo: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                  >
                    <option value="">No Supervisor (Reports to Admin)</option>
                    {(() => {
                      const selectedDes = designationsList.find((d) => d.id === parseInt(form.designationId, 10));
                      const selectedLevel = selectedDes ? selectedDes.level : 7;
                      const selectedDeptId = form.departmentId ? parseInt(form.departmentId, 10) : null;
                      
                      const eligibleSupervisors = managersAndTls.filter((sup) => {
                        const supLevel = sup.designation?.level ?? 0;
                        
                        // Level 1 Department Head reports to Admin (Level 0)
                        if (selectedLevel === 1) {
                          return supLevel === 0 || sup.role === 'admin';
                        }
                        
                        // Level > 1 must report to someone in same department who is higher in hierarchy
                        if (selectedLevel > 1) {
                          const isSameDept = sup.departmentId === selectedDeptId;
                          const isHigherHierarchy = supLevel < selectedLevel && supLevel > 0;
                          return isSameDept && isHigherHierarchy;
                        }
                        
                        return false;
                      });

                      return eligibleSupervisors.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name} ({sup.designation?.name || 'Supervisor'})
                        </option>
                      ));
                    })()}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Date of Joining <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.joiningDate}
                    onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-800/80 pt-4 justify-end">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      <span>Register Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* View User Modal Dialog / Edit Own Profile Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {selectedMember.id === user?.id ? 'My profile settings' : 'Team Member Profile'}
              </h3>
              <button onClick={closeProfileModal} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedMember.id === user?.id ? (
              /* OWN PROFILE EDITING VIEW */
              <form onSubmit={handleSaveOwnProfile}>
                <div className="p-6 space-y-6">
                  {updateError && (
                    <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs font-semibold">
                      {updateError}
                    </div>
                  )}

                  {/* Profile Picture Upload Section */}
                  <div className="flex items-center gap-4 p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
                    <div className="relative w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                      {editPhotoPreviewUrl || editPhotoPath ? (
                        <img
                          src={editPhotoPreviewUrl || `/api/v1/users/${user?.id}/photograph?t=${Date.now()}`}
                          alt={selectedMember.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center font-bold text-lg text-amber-500">
                          {selectedMember.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      {uploadingEditPhoto && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Profile Photograph</span>
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-photo-input"
                        onChange={handleEditPhotoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-photo-input"
                        className="py-1.5 px-3 bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>Change photo</span>
                      </label>
                    </div>
                  </div>

                  {/* Own Information Form Fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Full Name</span>
                        {isCurrentUserAdmin ? (
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                          />
                        ) : (
                          <span className="text-white text-xs font-semibold block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70 truncate" title={selectedMember.name}>
                            {selectedMember.name}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Employee ID</span>
                        {isCurrentUserAdmin ? (
                          <input
                            type="text"
                            required
                            value={editEmployeeId}
                            onChange={(e) => setEditEmployeeId(e.target.value)}
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none font-mono"
                          />
                        ) : (
                          <span className="text-white text-xs font-mono block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70 truncate" title={selectedMember.employeeId || 'Not Set'}>
                            {selectedMember.employeeId || 'Not Set'}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Email Address</span>
                        {isCurrentUserAdmin ? (
                          <input
                            type="email"
                            required
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none font-mono"
                          />
                        ) : (
                          <span className="text-slate-300 text-xs font-mono block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70 truncate" title={selectedMember.email}>
                            {selectedMember.email}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">System Role</span>
                        <span className="text-slate-355 text-xs block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg capitalize opacity-70 truncate" title={getRoleLabel(selectedMember.role)}>
                          {getRoleLabel(selectedMember.role)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                        <span className="text-slate-355 text-xs block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70 truncate" title={calculateYearsInCompany(selectedMember.joiningDate)}>
                          {calculateYearsInCompany(selectedMember.joiningDate)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Update mobile number"
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    {updatingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            ) : isAdminOrDirectorOrSalesHead ? (
              /* EDIT OTHER MEMBER'S PROFILE VIEW (Admins, Directors, Sales Heads only) */
              <form onSubmit={handleSaveMemberDetails}>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {updateMemberError && (
                    <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs font-semibold">
                      {updateMemberError}
                    </div>
                  )}

                  {/* Profile Picture Upload Section */}
                  <div className="flex items-center gap-4 p-4 bg-slate-900/20 border border-slate-800/80 rounded-xl">
                    <div className="relative w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                      {editMemberPhotoPreviewUrl || editMemberForm.photograph ? (
                        <img
                          src={editMemberPhotoPreviewUrl || `/api/v1/users/${selectedMember.id}/photograph?t=${Date.now()}`}
                          alt={editMemberForm.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center font-bold text-lg text-amber-500">
                          {editMemberForm.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      {uploadingEditMemberPhoto && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Profile Photograph</span>
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-member-photo-input"
                        onChange={handleEditMemberPhotoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-member-photo-input"
                        className="py-1.5 px-3 bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>Change photo</span>
                      </label>
                    </div>
                  </div>

                  {/* Member Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editMemberForm.name}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Employee ID <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editMemberForm.employeeId}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, employeeId: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={editMemberForm.email}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Contact Number <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editMemberForm.phone}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Full Address <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={editMemberForm.address}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, address: e.target.value })}
                        placeholder="Complete residential address"
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Reset Password</label>
                      <input
                        type="password"
                        placeholder="Leave blank to keep current"
                        value={editMemberPassword}
                        onChange={(e) => setEditMemberPassword(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department</label>
                      <select
                        value={editMemberForm.departmentId}
                        disabled={!canEditPermissionsAndRole || selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, departmentId: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500 focus:outline-none disabled:opacity-50"
                      >
                        <option value="">No Department / Shared</option>
                        {departmentsList.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Designation</label>
                      <select
                        value={editMemberForm.designationId}
                        disabled={!canEditPermissionsAndRole || selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, designationId: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500 focus:outline-none disabled:opacity-50"
                      >
                        <option value="">Select Designation...</option>
                        {designationsList
                          .filter((des) => !editMemberForm.departmentId || des.departmentId === null || des.departmentId === parseInt(editMemberForm.departmentId, 10))
                          .map((des) => (
                            <option key={des.id} value={des.id}>{des.name}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Direct Supervisor</label>
                      <select
                        value={editMemberForm.reportsTo}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, reportsTo: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="">No Supervisor (Reports to Admin)</option>
                        {(() => {
                          const selectedDes = designationsList.find((d) => d.id === parseInt(editMemberForm.designationId, 10));
                          const selectedLevel = selectedDes ? selectedDes.level : 7;
                          const selectedDeptId = editMemberForm.departmentId ? parseInt(editMemberForm.departmentId, 10) : null;
                          
                          const eligibleSupervisors = managersAndTls.filter((sup) => {
                            if (sup.id === selectedMember.id) return false;
                            const supLevel = sup.designation?.level ?? 0;
                            
                            // Level 1 Department Head reports to Admin (Level 0)
                            if (selectedLevel === 1) {
                              return supLevel === 0 || sup.role === 'admin';
                            }
                            
                            // Level > 1 must report to someone in same department who is higher in hierarchy
                            if (selectedLevel > 1) {
                              const isSameDept = sup.departmentId === selectedDeptId;
                              const isHigherHierarchy = supLevel < selectedLevel && supLevel > 0;
                              return isSameDept && isHigherHierarchy;
                            }
                            
                            return false;
                          });

                          return eligibleSupervisors.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.name} ({sup.designation?.name || 'Supervisor'})
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Date of Joining <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={editMemberForm.joiningDate}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, joiningDate: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4 sm:col-span-2">
                      <input
                        type="checkbox"
                        id="edit-member-active"
                        disabled={selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')}
                        checked={editMemberForm.isActive}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, isActive: e.target.checked })}
                        className="w-4 h-4 text-amber-500 bg-slate-950 border-slate-800 rounded focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="edit-member-active" className="text-xs font-bold uppercase text-slate-400 cursor-pointer select-none flex items-center gap-1.5">
                        <span>Account Active Status</span>
                        {(selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')) && (
                          <span className="text-[10px] text-red-500 font-normal lowercase tracking-normal italic">(Admin cannot be deactivated)</span>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Custom Access Permissions Checklist */}
                  <div className="border-t border-slate-800 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Custom Access Permissions</h5>
                      <button
                        type="button"
                        onClick={() => {
                          const base = editMemberForm.role === 'other' ? editBaseRole : editMemberForm.role;
                          setEditMemberPermissions(getLocalDefaultPermissionsForRole(base));
                        }}
                        className="text-[9px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors bg-slate-900 border border-slate-800/80 px-2 py-1 rounded cursor-pointer"
                      >
                        Reset to designation defaults
                      </button>
                    </div>
                    {/* Sleek Category Navigation Tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-950/20 text-xs font-semibold overflow-x-auto whitespace-nowrap scrollbar-none gap-1 p-1 rounded-lg">
                      {[
                        { key: 'PSA', label: 'PSA (Lead Booking)', icon: Sun },
                        { key: 'Sales', label: 'Sales (Order Punch)', icon: Award },
                        { key: 'Finance', label: 'Finance (Ledger & Verify)', icon: DollarSign },
                        { key: 'Operations', label: 'Operations (Installation)', icon: Hammer },
                        { key: 'IT', label: 'IT & System Admin', icon: Terminal },
                      ].map((cat) => {
                        const isActive = selectedPermissionCategory === cat.key;
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSelectedPermissionCategory(cat.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                              isActive
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-extrabold shadow-sm'
                                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Permissions Panel grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[140px] p-1">
                      {ALL_PERMISSIONS.filter(p => p.category === selectedPermissionCategory).map((perm) => {
                        const isChecked = editMemberPermissions.includes(perm.key);
                        const isDangerous = perm.key.includes('all') || perm.key.includes('manage') || perm.key.includes('verify') || perm.key.includes('delete');
                        const isDisabled = !canEditPermissionsAndRole;
                        
                        return (
                          <label 
                            key={perm.key} 
                            className={`flex items-start gap-3 p-3.5 rounded-xl border select-none transition-all duration-300 ${
                              isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-[0.5px]'
                            } ${
                              isChecked 
                                ? 'bg-amber-500/[0.02] border-amber-500/30 shadow-md shadow-amber-500/5'
                                : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/10'
                            }`}
                          >
                            {/* Sleek Custom Toggle Switch */}
                            <div className={`relative shrink-0 mt-1 select-none ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => {
                                  if (isDisabled) return;
                                  if (isChecked) {
                                    setEditMemberPermissions(editMemberPermissions.filter(k => k !== perm.key));
                                  } else {
                                    setEditMemberPermissions([...editMemberPermissions, perm.key]);
                                  }
                                }}
                                className="sr-only"
                              />
                              <div className={`w-8 h-4.5 rounded-full transition-colors duration-200 ease-in-out ${
                                isChecked 
                                  ? 'bg-amber-500 shadow-md shadow-amber-500/20' 
                                  : 'bg-slate-800 border border-slate-700/60'
                              }`} />
                              <div className={`absolute top-0.75 left-0.75 w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                                isChecked ? 'translate-x-3.5' : 'translate-x-0'
                              }`} />
                            </div>
                            
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11px] font-bold tracking-wide transition-colors ${isChecked ? 'text-white' : 'text-slate-350'}`}>
                                  {perm.label}
                                </span>
                                {isDangerous && (
                                  <span className="text-[7px] bg-red-950/30 text-red-400 border border-red-900/40 rounded px-1.5 py-0.25 font-extrabold uppercase tracking-wider">
                                    Critical
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] text-slate-500 font-mono mt-0.5 tracking-wider uppercase">{perm.key}</span>
                              <span className="text-[10px] text-slate-450 mt-1.5 leading-relaxed font-normal">{perm.description}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Access Logs */}
                  <div className="border-t border-slate-800 pt-4 space-y-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Access Logs</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Login Session</span>
                        {selectedMember.lastLoginAt ? (
                          <div className="space-y-1">
                            <span className="block text-white text-xs font-mono">
                              {new Date(selectedMember.lastLoginAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-400 italic font-semibold leading-normal">
                              📍 {selectedMember.loginLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No login recorded</span>
                        )}
                      </div>

                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Logout Session</span>
                        {selectedMember.lastLogoutAt ? (
                          <div className="space-y-1">
                            <span className="block text-white text-xs font-mono">
                              {new Date(selectedMember.lastLogoutAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-400 italic font-semibold leading-normal">
                              📍 {selectedMember.logoutLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No logout recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/10 flex justify-between gap-3">
                  <div>
                    {selectedMember.id !== user?.id && selectedMember.role !== 'admin' && !selectedMember.role.startsWith('admin:') && !selectedMember.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(selectedMember)}
                        className="py-2 px-4 bg-rose-950/20 text-rose-400 border border-rose-900/30 hover:bg-rose-950/40 rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Delete Account
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeProfileModal}
                      className="py-2 px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingMember}
                      className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      {updatingMember ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* VIEW PROFILE VIEW */
              <div className="p-6 space-y-6">
                {/* Profile Card Header */}
                <div className="flex items-center gap-4 p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
                  <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                    {selectedMember.photograph ? (
                      <img
                        src={`/api/v1/users/${selectedMember.id}/photograph?t=${Date.now()}`}
                        alt={selectedMember.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-850 flex items-center justify-center text-amber-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-none">{selectedMember.name}</h4>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider mt-2 ${
                      getRoleClass(selectedMember.role)
                    }`}>
                      {getRoleLabel(selectedMember.role)}
                    </span>
                  </div>
                </div>

                {/* Core Information Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {isAdminOrDirectorOrSalesHead ? (
                    <>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Employee ID</span>
                        <span className="text-white font-mono">{selectedMember.employeeId || <span className="text-slate-650 italic">None</span>}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Email Address</span>
                        <span className="text-white font-mono">{selectedMember.email}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Contact Number</span>
                        <span className="text-white font-mono">{selectedMember.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Full Address</span>
                        <span className="text-white">{selectedMember.address || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Direct Supervisor</span>
                        <span className="text-white">{selectedMember.supervisor?.name || <span className="text-slate-600 italic">None</span>}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Status</span>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${
                          selectedMember.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {selectedMember.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                        <span className="text-white">{calculateYearsInCompany(selectedMember.joiningDate)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Employee ID</span>
                        <span className="text-white font-mono">{selectedMember.employeeId || <span className="text-slate-650 italic">None</span>}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Designation</span>
                        <span className="text-white capitalize">{getRoleLabel(selectedMember.role)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                        <span className="text-white">{calculateYearsInCompany(selectedMember.joiningDate)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Activity Timing & Geolocation Logs (Admin, Director, Sales Head only) */}
                {isAdminOrDirectorOrSalesHead && (
                  <div className="border-t border-slate-800 pt-4 space-y-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Access Logs</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Last Login Info */}
                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Login Session</span>
                        {selectedMember.lastLoginAt ? (
                          <div className="space-y-1">
                            <span className="block text-white text-xs font-mono">
                              {new Date(selectedMember.lastLoginAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-400 italic font-semibold leading-normal">
                              📍 {selectedMember.loginLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No login recorded</span>
                        )}
                      </div>

                      {/* Last Logout Info */}
                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Logout Session</span>
                        {selectedMember.lastLogoutAt ? (
                          <div className="space-y-1">
                            <span className="block text-white text-xs font-mono">
                              {new Date(selectedMember.lastLogoutAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-400 italic font-semibold leading-normal">
                              📍 {selectedMember.logoutLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No logout recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 border-t border-slate-800 bg-slate-900/10 flex justify-end gap-3">
                  {isAdminOrDirectorOrSalesHead && selectedMember.id !== user?.id && selectedMember.role !== 'admin' && !selectedMember.role.startsWith('admin:') && !selectedMember.isActive && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(selectedMember)}
                      className="py-2 px-4 bg-rose-950/20 text-rose-455 border border-rose-900/30 hover:bg-rose-950/40 rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Delete Account
                    </button>
                  )}
                  <button
                    onClick={closeProfileModal}
                    className="py-2 px-5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg font-bold text-xs shadow-md cursor-pointer"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* Activity Logs Modal Dialog */}
      {showLogsModal && logsMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Activity Audit Logs
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Viewing daily transitions for <span className="text-amber-400 font-bold">{logsMember.name}</span> ({getRoleLabel(logsMember.role)})
                </p>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Date Filter Panel */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
                <div>
                  <span className="block text-slate-400 font-semibold text-xs">Select Log Date</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Audit actions for specific days</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={logsDate}
                    max={getTodayLocalDateStr()}
                    onChange={handleLogsDateChange}
                    className="block w-full sm:w-auto px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => {
                      const today = getTodayLocalDateStr();
                      setLogsDate(today);
                      fetchActivityLogs(logsMember.id, today);
                    }}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Logs Timeline Display */}
              {logsLoading ? (
                <div className="py-12 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading activities...</p>
                </div>
              ) : logsList.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-850 rounded-xl">
                  <p className="text-slate-500 text-xs italic">
                    No status transitions or audit logs found for this date.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-800 pl-6 space-y-6 ml-3">
                  {logsList.map((log) => {
                    const timeStr = new Date(log.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const fromStage = log.fromStatus !== null && STAGE_BADGES ? STAGE_BADGES[log.fromStatus] : null;
                    const toStage = STAGE_BADGES ? STAGE_BADGES[log.toStatus] : null;

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline Node Point */}
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-[#111625]" />
                        
                        <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4 space-y-2 hover:border-slate-800 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wider">{timeStr}</span>
                            <div className="text-[11px] text-slate-400">
                              Lead:{' '}
                              <a
                                href={`/leads/${log.lead.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:underline font-bold"
                              >
                                {log.lead.customerName} (#{log.lead.leadCode})
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                            {fromStage ? (
                              <>
                                <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 border rounded uppercase tracking-wider ${fromStage.class}`}>
                                  {fromStage.name}
                                </span>
                                <span className="text-slate-500 text-[10px]">➔</span>
                              </>
                            ) : (
                              <span className="text-slate-500 italic text-[10px]">New Lead Created</span>
                            )}
                            {toStage && (
                              <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 border rounded uppercase tracking-wider ${toStage.class}`}>
                                  {toStage.name}
                              </span>
                            )}
                          </div>

                          {log.remark && (
                            <div className="text-[11px] bg-slate-950/60 border border-slate-900 px-3 py-2 rounded-lg text-slate-400 leading-relaxed font-mono">
                              "{log.remark}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/10 flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="py-2 px-5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg font-bold text-xs shadow-md cursor-pointer"
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Org Hierarchy & Designation management Modal */}
      {showHierarchyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh] animate-fade-in-up">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Organization Hierarchy & Custom Designations</h3>
                    <p className="text-[11px] text-slate-400">Configure hierarchy levels, designate departments, and view the visual reporting structure.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowHierarchyModal(false)} className="text-slate-400 hover:text-white cursor-pointer border border-transparent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-4 border-b border-slate-800/60 pb-1">
                <button
                  type="button"
                  onClick={() => setModalTab('designations')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    modalTab === 'designations' ? 'border-b-2 border-amber-500 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Designations & Levels
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('orgTree')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    modalTab === 'orgTree' ? 'border-b-2 border-amber-500 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Visual Org Tree 🌳
                </button>
              </div>
            </div>

            {modalTab === 'designations' ? (
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Simplified Org Hierarchy Tree */}
                <div className="lg:col-span-3 bg-slate-950/40 p-5 border border-slate-850 rounded-xl space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="border-b border-slate-800/80 pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Designation Tiers & Reporting</h4>
                      <p className="text-[10px] text-slate-500">Designations grouped by reporting authority level (Level 0 to Level 6).</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      { level: 0, label: 'Level 0: Admin 👑', color: 'border-red-500/20 text-red-400 bg-red-500/5' },
                      { level: 1, label: 'Level 1: Department Heads 👔', color: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5' },
                      { level: 2, label: 'Level 2: Senior Managers 📈', color: 'border-purple-500/20 text-purple-400 bg-purple-500/5' },
                      { level: 3, label: 'Level 3: Managers 🏢', color: 'border-amber-500/20 text-amber-400 bg-amber-500/5' },
                      { level: 4, label: 'Level 4: Team Leaders (TL) 👥', color: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5' },
                      { level: 5, label: 'Level 5: Consultants 🛠️', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                      { level: 6, label: 'Level 6: PSA Consultants 📞', color: 'border-pink-500/20 text-pink-400 bg-pink-500/5' },
                    ].map((levelItem) => {
                      const levelDesigs = designationsList.filter(d => d.level === levelItem.level);
                      return (
                        <div key={levelItem.level} className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center border rounded-xl p-3.5 transition-all hover:bg-slate-900/40 ${levelItem.color}`}>
                          <div className="w-full sm:w-44 shrink-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block">{levelItem.label}</span>
                          </div>
                          <div className="flex-1 flex flex-wrap gap-2">
                            {levelDesigs.length === 0 ? (
                              <span className="text-[10px] text-slate-500 italic">No designations at this level</span>
                            ) : (
                              levelDesigs.map(d => {
                                const deptName = departmentsList.find(dept => dept.id === d.departmentId)?.name || 'Shared';
                                return (
                                  <span key={d.id} className="text-[10px] bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 shadow-sm">
                                    <span>{d.name}</span>
                                    <span className="text-[8px] bg-slate-900 text-slate-400 px-1 rounded uppercase font-bold">{deptName}</span>
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Management Form and List */}
                <div className="lg:col-span-2 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Form */}
                  <div className="bg-slate-900/20 p-4 border border-slate-850 rounded-xl">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-4">
                      {editingDesignation ? 'Edit Designation Details' : 'Create Custom Designation'}
                    </h4>

                    <form onSubmit={editingDesignation ? handleUpdateDesignation : handleCreateDesignation} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Designation Name *</label>
                        <input
                          type="text"
                          required
                          value={designationName}
                          onChange={(e) => setDesignationName(e.target.value)}
                          placeholder="e.g. Regional Manager, Senior Advisor"
                          className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Reporting Level *</label>
                        <select
                          value={designationLevel}
                          onChange={(e) => setDesignationLevel(Number(e.target.value))}
                          className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                        >
                          <option value={0}>Level 0: Admin</option>
                          <option value={1}>Level 1: Head</option>
                          <option value={2}>Level 2: Senior Manager</option>
                          <option value={3}>Level 3: Manager</option>
                          <option value={4}>Level 4: Team Leader (TL)</option>
                          <option value={5}>Level 5: Consultant</option>
                          <option value={6}>Level 6: PSA Consultant</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department Affiliation</label>
                        <select
                          value={designationDeptId}
                          onChange={(e) => setDesignationDeptId(e.target.value)}
                          className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="">Shared / No Department</option>
                          {departmentsList.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        {editingDesignation && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDesignation(null);
                              setDesignationName('');
                              setDesignationLevel(5);
                              setDesignationDeptId('');
                            }}
                            className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg font-bold text-xs"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="py-1.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-lg font-bold text-xs shadow-md"
                        >
                          {editingDesignation ? 'Save Designation' : 'Create Designation'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* List Table */}
                  <div className="bg-slate-900/20 p-4 border border-slate-850 rounded-xl">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-3">All Designations</h4>
                    <div className="max-h-[30vh] overflow-y-auto divide-y divide-slate-850">
                      {designationsList.map(d => {
                        const deptName = departmentsList.find(dept => dept.id === d.departmentId)?.name || 'Shared';
                        return (
                          <div key={d.id} className="py-2.5 flex justify-between items-center gap-4 text-xs">
                            <div>
                              <p className="font-bold text-white">{d.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium">Level {d.level} • Department: {deptName}</p>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDesignation(d);
                                  setDesignationName(d.name);
                                  setDesignationLevel(d.level);
                                  setDesignationDeptId(d.departmentId ? String(d.departmentId) : '');
                                }}
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-all border border-transparent cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDesignation(d.id)}
                                className="p-1 rounded bg-slate-900 hover:bg-rose-955/20 text-slate-400 hover:text-rose-500 transition-all border border-transparent cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1 bg-slate-950/20 border-t border-slate-850/80">
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company Organization tree</h4>
                    <p className="text-[10px] text-slate-500">Interactive visual tree showing reporting lines across all departments recursively.</p>
                  </div>
                  <div className="p-4 bg-slate-950/45 border border-slate-850 rounded-xl max-h-[60vh] overflow-y-auto">
                    {renderGlobalHierarchyNodes(members, null)}
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-slate-800 bg-slate-900/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHierarchyModal(false)}
                className="py-2 px-5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg font-bold text-xs shadow-md cursor-pointer"
              >
                Close Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MyTeamAddMemberForm = ({ 
  candidates, 
  myTeam, 
  onAdd 
}: { 
  candidates: any[]; 
  myTeam: any; 
  onAdd: (uId: number, tId: number, supId: number | null) => Promise<void>; 
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedSupId, setSelectedSupId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId) return;
    await onAdd(parseInt(selectedCandidateId, 10), myTeam.id, selectedSupId ? parseInt(selectedSupId, 10) : null);
    setSelectedCandidateId('');
    setSelectedSupId('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5 font-mono">Select Employee *</label>
        <select
          required
          value={selectedCandidateId}
          onChange={(e) => setSelectedCandidateId(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">Choose candidate...</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.designation?.name || c.role})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5 font-mono">Reports To (Supervisor)</label>
        <select
          value={selectedSupId}
          onChange={(e) => setSelectedSupId(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">Reports directly to Head</option>
          {myTeam.users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name} ({u.designation?.name || u.role})</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-955 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1 border border-transparent"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add to Clan</span>
      </button>
    </form>
  );
};
