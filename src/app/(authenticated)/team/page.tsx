'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
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
  // Group 1: Leads Pipeline & Management
  {
    key: 'leads:create',
    label: 'Add new lead',
    description: 'Allows registering and adding new customer leads into the system.',
    category: 'Leads Pipeline & Management'
  },
  {
    key: 'leads:import',
    label: 'Import new leads',
    description: 'Allows bulk uploading and importing leads via CSV/Excel sheets.',
    category: 'Leads Pipeline & Management'
  },
  {
    key: 'leads:edit',
    label: 'Edit leads info',
    description: 'Allows modifying customer contact, connection load, and address details.',
    category: 'Leads Pipeline & Management'
  },
  {
    key: 'leads:change_status',
    label: 'Change lead pipeline stage',
    description: 'Allows advancing leads through stages (Follow up, Meeting Booked, Sale Done).',
    category: 'Leads Pipeline & Management'
  },
  {
    key: 'leads:view_all',
    label: 'View all leads',
    description: 'Allows accessing and viewing all leads in the sales pipeline.',
    category: 'Leads Pipeline & Management'
  },
  {
    key: 'leads:assign',
    label: 'Assign Team members to leads',
    description: 'Allows assigning or reassigning consultants, team leaders, and managers to leads.',
    category: 'Leads Pipeline & Management'
  },

  // Group 2: Orders & Fulfillment Queue
  {
    key: 'orders:create',
    label: 'Convert lead into order',
    description: 'Allows converting Sale Done leads into formal sales orders and punching payment details.',
    category: 'Orders & Fulfillment Queue'
  },
  {
    key: 'orders:verify',
    label: 'Verify the orders',
    description: 'Allows finance verification of down payments, payment methods, and bank records.',
    category: 'Orders & Fulfillment Queue'
  },
  {
    key: 'orders:operations',
    label: 'Operations tasks',
    description: 'Allows managing delivery, solar installation, net metering, and commissioning stages.',
    category: 'Orders & Fulfillment Queue'
  },

  // Group 3: Team Directory & Access Control
  {
    key: 'team:view',
    label: 'View Team Directory',
    description: 'Allows searching and viewing the company employee directory.',
    category: 'Team Directory & Access Control'
  },
  {
    key: 'attendance:view',
    label: 'View Attendance',
    description: 'Allows viewing daily check-in/out logs, work hours, and location rosters.',
    category: 'Team Directory & Access Control'
  },
  {
    key: 'team:manage',
    label: 'Manage Team and Access',
    description: 'Allows creating team profiles, role assignments, and customizing permissions.',
    category: 'Team Directory & Access Control'
  },
  {
    key: 'logs:view',
    label: 'View team activity log',
    description: 'Allows inspecting audit logs, status transitions, and system activities.',
    category: 'Team Directory & Access Control'
  },
  {
    key: 'leads:track',
    label: 'View lead track progress',
    description: 'Allows checking the step-by-step progress history of a lead or order.',
    category: 'Leads Pipeline & Management'
  },

  // Group 4: Analytics & Insights
  {
    key: 'reports:view',
    label: 'View reports',
    description: 'Allows viewing performance analytics, conversion rates, and revenue trends.',
    category: 'Analytics & Insights'
  },
];

function getLocalDefaultPermissionsForRole(role: string): string[] {
  const baseRole = role.includes(':') ? role.split(':')[0] : role;
  switch (baseRole) {
    case 'admin':
    case 'director':
      return [
        'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:view_all', 'leads:assign',
        'orders:create', 'orders:verify', 'orders:operations',
        'team:view', 'attendance:view', 'team:manage', 'logs:view', 'leads:track', 'reports:view'
      ];
    case 'sales_head':
      return [
        'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:view_all',
        'orders:create', 'team:view', 'attendance:view', 'logs:view', 'leads:track', 'reports:view'
      ];
    case 'manager':
      return [
        'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:view_all',
        'orders:create', 'orders:verify', 'orders:operations',
        'team:view', 'attendance:view', 'logs:view', 'leads:track', 'reports:view'
      ];
    case 'finance':
      return [
        'leads:view_all', 'orders:verify', 'reports:view'
      ];
    case 'operations':
      return [
        'leads:view_all', 'orders:verify', 'orders:operations'
      ];
    case 'tl':
    case 'psa_tl':
      return [
        'leads:create', 'leads:edit', 'leads:change_status', 'orders:create', 'leads:track', 'reports:view'
      ];
    case 'consultant':
    case 'psa':
    default:
      return [
        'leads:create', 'leads:edit', 'leads:change_status', 'orders:create', 'leads:track'
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

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [managersAndTls, setManagersAndTls] = useState<{ id: number; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [empSearchInput, setEmpSearchInput] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const isTargetAdminOrDirector = selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:') || selectedMember?.role === 'director' || selectedMember?.role?.startsWith('director:');
  const isCurrentUserAdmin = user?.role === 'admin' || user?.role?.startsWith('admin:');
  const canEditPermissionsAndRole = !isTargetAdminOrDirector || isCurrentUserAdmin;
  
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
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingAddPhoto, setUploadingAddPhoto] = useState(false);
  const [addPhotoPreviewUrl, setAddPhotoPreviewUrl] = useState('');

  // Edit Own Profile state
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
  const [selectedPermissionCategory, setSelectedPermissionCategory] = useState<string>('Leads Pipeline & Management');

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
    if (!confirmUnassign && !confirm(`Are you sure you want to ${actionLabel} ${selectedUserIds.length} selected team member(s)?`)) return;

    try {
      setBulkActionLoading(true);
      const res = await fetch('/api/v1/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds, action, confirmUnassign }),
      });
      const data = await res.json();

      if (!data.success && data.requiresConfirmation) {
        if (confirm(data.message)) {
          handleBulkAction(action, true);
          return;
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
      const userBaseRole = user.role.includes(':') ? user.role.split(':')[0] : user.role;
      if (['admin', 'director', 'sales_head'].includes(userBaseRole)) {
        fetchSupervisors();
      }
    }
  }, [user]);

  // Handle opening profile view
  const handleOpenProfile = (member: TeamMember) => {
    setSelectedMember(member);
    if (member.id === user?.id) {
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

    if (!window.confirm(warning)) return;

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

  // Completely delete a user after unassigning leads
  const handleDeleteUser = async (member: TeamMember, confirmUnassign = false) => {
    if (!confirmUnassign && !window.confirm(`Are you sure you want to delete team member "${member.name}"?`)) return;

    try {
      const url = `/api/v1/users/${member.id}${confirmUnassign ? '?confirm_unassign=true' : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!data.success && data.requiresConfirmation) {
        if (window.confirm(data.message)) {
          handleDeleteUser(member, true);
          return;
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
            {isAdminOrDirectorOrSalesHead
              ? 'Manage user profiles, assign roles, and handle account status.'
              : 'Browse company directory and see colleagues.'}
          </p>
        </div>
        {isAdminOrDirectorOrSalesHead && (
          <button
            onClick={() => setShowAddModal(true)}
            className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg font-bold text-xs shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Restricted Directory Search Card for non-admins */}
      {!hasFullTeamAccess && (
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
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono tracking-wide"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>
        </div>
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
                          {roleConfig.label}
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
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">System Designation / Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="director">Director</option>
                    <option value="sales_head">Sales Head</option>
                    <option value="finance">Finance Manager</option>
                    <option value="operations">Operations Manager</option>
                    <option value="psa_tl">PSA Team Leader</option>
                    <option value="psa">PSA Consultant</option>
                    <option value="tl">Sales Team Leader</option>
                    <option value="consultant">Sales Consultant</option>
                    {customDesignations.map((cd) => (
                      <option key={cd} value={cd}>
                        {getRoleLabel(cd)} ({getRoleLabel(cd.split(':')[0]).toUpperCase()} access)
                      </option>
                    ))}
                    <option value="other">Other / Custom Designation...</option>
                  </select>
                </div>

                {form.role === 'other' && (
                  <div className="col-span-1 sm:col-span-2 p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Custom Designation Name *</label>
                      <input
                        type="text"
                        required
                        value={addCustomRoleText}
                        onChange={(e) => setAddCustomRoleText(e.target.value)}
                        placeholder="e.g. Senior Consultant"
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Base Permissions Access Level</label>
                      <select
                        value={addBaseRole}
                        onChange={(e) => setAddBaseRole(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-slate-300 text-xs focus:ring-amber-500"
                      >
                        <option value="consultant">Sales Consultant</option>
                        <option value="tl">Sales Team Leader</option>
                        <option value="psa">PSA Consultant</option>
                        <option value="psa_tl">PSA Team Leader</option>
                        <option value="manager">Operations Manager</option>
                        <option value="finance">Finance Manager</option>
                        <option value="sales_head">Sales Head</option>
                        <option value="director">Director</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                )}

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
                    {managersAndTls.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({getRoleLabel(sup.role).toUpperCase()})
                      </option>
                    ))}
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
                        <span className="text-white text-xs font-semibold block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70">
                          {selectedMember.name}
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Email Address</span>
                        <span className="text-slate-300 text-xs font-mono block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70">
                          {selectedMember.email}
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">System Role</span>
                        <span className="text-slate-355 text-xs block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg capitalize opacity-70">
                          {getRoleLabel(selectedMember.role)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                        <span className="text-slate-355 text-xs block bg-slate-950/30 border border-slate-900 px-3 py-2 rounded-lg opacity-70">
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
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">System Role</label>
                      <select
                        value={editMemberForm.role}
                        disabled={!canEditPermissionsAndRole || selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, role: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:ring-amber-500 focus:outline-none disabled:opacity-50"
                      >
                        {(selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')) && (
                          <option value="admin">Admin</option>
                        )}
                        <option value="director">Director</option>
                        <option value="sales_head">Sales Head</option>
                        <option value="finance">Finance Manager</option>
                        <option value="operations">Operations Manager</option>
                        <option value="psa_tl">PSA Team Leader</option>
                        <option value="psa">PSA Consultant</option>
                        <option value="tl">Sales Team Leader</option>
                        <option value="consultant">Sales Consultant</option>
                        {customDesignations.map((cd) => (
                          <option key={cd} value={cd}>
                            {getRoleLabel(cd)} ({getRoleLabel(cd.split(':')[0]).toUpperCase()} access)
                          </option>
                        ))}
                        <option value="other">Other / Custom Designation...</option>
                      </select>
                    </div>
                    {editMemberForm.role === 'other' && (
                      <div className="col-span-1 sm:col-span-2 p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Custom Designation Name *</label>
                          <input
                            type="text"
                            required
                            value={editCustomRoleText}
                            onChange={(e) => setEditCustomRoleText(e.target.value)}
                            placeholder="e.g. Senior Consultant"
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-905 rounded-lg text-white text-xs focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Base Permissions Access Level</label>
                          <select
                            value={editBaseRole}
                            disabled={!canEditPermissionsAndRole || selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')}
                            onChange={(e) => setEditBaseRole(e.target.value)}
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-slate-300 text-xs focus:ring-amber-500 disabled:opacity-50"
                          >
                            <option value="consultant">Sales Consultant</option>
                            <option value="tl">Sales Team Leader</option>
                            <option value="psa">PSA Consultant</option>
                            <option value="psa_tl">PSA Team Leader</option>
                            <option value="manager">Operations Manager</option>
                            <option value="finance">Finance Manager</option>
                            <option value="sales_head">Sales Head</option>
                            <option value="director">Director</option>
                            {(selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')) && (
                              <option value="admin">Admin</option>
                            )}
                          </select>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Direct Supervisor</label>
                      <select
                        value={editMemberForm.reportsTo}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, reportsTo: e.target.value })}
                        className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-355 text-xs focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="">No Supervisor (Reports to Admin)</option>
                        {managersAndTls
                          .filter((sup) => sup.id !== selectedMember.id)
                          .map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.name} ({getRoleLabel(sup.role).toUpperCase()})
                            </option>
                          ))}
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
                        { key: 'Leads Pipeline & Management', label: 'Leads & Sales', icon: Sun },
                        { key: 'Orders & Fulfillment Queue', label: 'Orders & Ops', icon: Lock },
                        { key: 'Team Directory & Access Control', label: 'Team & Access', icon: Users },
                        { key: 'Analytics & Insights', label: 'Reports & Analytics', icon: History },
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
    </div>
  );
}
