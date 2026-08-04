'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomSelect from '@/components/CustomSelect';
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
  LineChart,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import AccessControlManager from '@/components/AccessControlManager';


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
  workingLocation?: string | null;
  supervisor?: { id: number; name: string } | null;
  leadsClosed?: number;
  departmentId?: number | null;
  designationId?: number | null;
  teamId?: number | null;
  designation?: { id: number; name: string; level: number } | null;
  department?: { id: number; name: string } | null;
}

const ROLE_LABELS: Record<string, { label: string; class: string }> = {
  admin: { label: 'Admin', class: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  director: { label: 'Director', class: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  sales_head: { label: 'Sales Head', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  finance: { label: 'Finance Manager', class: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  operations: { label: 'Operations Manager', class: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  psa_tl: { label: 'PSA Team Leader', class: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  psa: { label: 'PSA Consultant', class: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
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
  return ROLE_LABELS[baseRole]?.class || 'bg-slate-500/15 text-[var(--text-secondary)] border-slate-500/20';
}

const ALL_PERMISSIONS = [
  // PSA Level (Pre-Sales)
  {
    key: 'leads:create',
    label: 'PSA: Add New Lead',
    description: 'Allows registering and adding new customer leads into the system.',
    category: 'PSA'
  },
  {
    key: 'leads:import',
    label: 'PSA: Import New Leads',
    description: 'Allows importing lists of raw leads from CSV / Excel spreadsheets.',
    category: 'PSA'
  },
  {
    key: 'leads:manage_calling_stages',
    label: 'PSA: Manage Calling Stages',
    description: 'Allows updating logs and progressing pre-sales call statuses.',
    category: 'PSA'
  },
  {
    key: 'leads:book_meeting',
    label: 'PSA: Meeting Booking',
    description: 'Allows scheduling customer meetings and choosing calendar slots.',
    category: 'PSA'
  },
  {
    key: 'leads:track',
    label: 'PSA: Track logs & Reminders',
    description: 'Allows tracking lead audit logs, reminders, and daily check-ins.',
    category: 'PSA'
  },
  {
    key: 'leads:edit',
    label: 'PSA: Edit Lead Details',
    description: 'Allows editing contact, discom connection load, and other details.',
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
    description: 'Allows submitting the punched order form and client documents to Finance.',
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
  {
    key: 'ops:delivered_orders',
    label: 'Operations: View Completed Orders',
    description: 'Allows viewing completed orders in the sidebar navigation and accessing the Completed Orders portal.',
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
        'orders:operations', 'ops:update_stages', 'ops:upload_drawings', 'ops:delivered_orders',
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
        'orders:operations', 'ops:update_stages', 'ops:upload_drawings', 'ops:delivered_orders'
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
  1: { name: 'Fresh Lead', class: 'bg-blue-500/10 text-emerald-400 border-blue-500/20' },
  2: { name: 'DNP', class: 'bg-slate-500/10 text-[var(--text-secondary)] border-slate-500/20' },
  3: { name: 'Follow Up', class: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  4: { name: 'Not Interested', class: 'bg-red-800/10 text-red-400 border-red-800/20' },
  5: { name: 'Call Later', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  6: { name: 'Already Installed', class: 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)]/30' },
  7: { name: 'Decision Pending', class: 'bg-blue-500/10 text-blue-600 dark:text-emerald-400 border-blue-500/20' },
  8: { name: 'Meeting Booked', class: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  9: { name: 'Meeting Done', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  10: { name: 'Disconnected', class: 'bg-slate-600/15 text-[var(--text-secondary)] border-slate-600/20' },
  11: { name: 'Switch Off', class: 'bg-slate-700/20 text-[var(--text-secondary)] border-[var(--border-color)]' },
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

interface TreeNode {
  id: number;
  name: string;
  role: string;
  designationName: string;
  departmentName: string;
  member: TeamMember;
  children: TreeNode[];
}

const getLevelColor = (level: number) => {
  return 'bg-emerald-500 shadow-emerald-500/10 border-emerald-500/20';
};

const getLevelBorderColor = (level: number) => {
  return 'border-emerald-500/70 shadow-emerald-500/10';
};


const HierarchyTreeNodeComponent = ({
  node,
  onSelectNode,
  onOpenDetails,
  onSupervisorChange,
  canModifySupervisorFn,
  eligibleSupervisorsFn,
}: {
  node: TreeNode;
  onSelectNode: (nodeId: number) => void;
  onOpenDetails: (member: TeamMember) => void;
  onSupervisorChange: (memberId: number, newSupervisorId: string) => Promise<void>;
  canModifySupervisorFn: (member: TeamMember) => boolean;
  eligibleSupervisorsFn: (member: TeamMember) => TeamMember[];
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const canEdit = canModifySupervisorFn(node.member);
  const eligibleSupervisors = canEdit ? eligibleSupervisorsFn(node.member) : [];

  return (
    <div className="flex flex-col items-center select-none animate-fade-in">
      {/* Node Card */}
      <div 
        onClick={() => onSelectNode(node.id)}
        className="group relative flex flex-col gap-2.5 p-3.5 bg-[var(--bg-card)]/80 hover:bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500/40 rounded-xl transition-all duration-300 cursor-pointer shadow-lg w-64 transform hover:-translate-y-0.5 hover:shadow-emerald-500/[0.04]"
      >
        <div className="flex items-center gap-3">
          {/* Avatar with hierarchy level border color indicator */}
          <div className={`w-9.5 h-9.5 rounded-xl bg-[var(--bg-main)] border-2 flex items-center justify-center text-slate-350 font-extrabold text-xs uppercase shadow-inner shrink-0 overflow-hidden ${
            getLevelBorderColor(node.member.designation?.level ?? 6)
          }`}>
            {node.member.photograph ? (
              <img src={node.member.photograph} alt={node.name} className="w-full h-full object-cover animate-fade-in" />
            ) : (
              <span className="text-[var(--text-secondary)] font-bold">{node.name.charAt(0)}</span>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // Prevent focusing tree
                onOpenDetails(node.member);
              }}
              className="text-xs font-bold text-white hover:text-emerald-600 dark:hover:text-emerald-400 leading-none mb-1 text-left truncate w-full cursor-pointer hover:underline block"
              title="Click to view details"
            >
              {node.name}
            </button>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-[var(--text-secondary)] font-medium truncate max-w-[100px]">{node.designationName}</span>
              <span className="text-slate-700 text-[10px]">•</span>
              <span className="text-[8px] bg-[var(--bg-main)] border border-[var(--border-color)]/80 text-[var(--text-secondary)] px-1 py-0.5 rounded font-bold uppercase tracking-wider truncate max-w-[80px]">
                {node.departmentName}
              </span>
            </div>
          </div>
        </div>

        {/* Inline Supervisor Select Dropdown */}
        {canEdit && eligibleSupervisors.length > 0 && (
          <div 
            className="w-full pt-1.5 border-t border-[var(--border-color)]"
            onClick={(e) => e.stopPropagation()} // Prevent card focus click from firing
          >
            <label className="block text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 font-mono">
              Assign Supervisor
            </label>
            <select
              value={node.member.reportsTo || ''}
              onChange={(e) => onSupervisorChange(node.id, e.target.value)}
              className="w-full text-[10px] py-1 px-2 bg-slate-955 border border-[var(--border-color)] rounded-lg text-slate-350 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer font-sans"
            >
              <option value="">No Supervisor (Admin)</option>
              {eligibleSupervisors.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} ({sup.designation?.name || 'Supervisor'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Focus badge helper */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[7px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Focus
          </span>
        </div>
      </div>

      {/* Connection line down to children container (3px slate-700) */}
      {hasChildren && (
        <div className="w-[3px] h-6 bg-slate-700" />
      )}

      {/* Children container with connecting lines */}
      {hasChildren && (
        <div className="relative flex pt-0 justify-center">
          {node.children.map((child, index) => {
            const isFirst = index === 0;
            const isLast = index === node.children.length - 1;
            const hasMultiple = node.children.length > 1;

            return (
              <div key={child.id} className="relative flex flex-col items-center px-4 pt-6">
                {/* Horizontal connection line segments */}
                {hasMultiple && (
                  <>
                    {isFirst && (
                      <div className="absolute top-0 left-1/2 right-0 h-[3px] bg-slate-700" />
                    )}
                    {isLast && (
                      <div className="absolute top-0 left-0 right-1/2 h-[3px] bg-slate-700" />
                    )}
                    {!isFirst && !isLast && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-700" />
                    )}
                  </>
                )}

                {/* Vertical line going down from the horizontal bar to the child card */}
                <div className="absolute top-0 left-1/2 w-[3px] h-6 bg-slate-700 -translate-x-1/2" />
                
                <HierarchyTreeNodeComponent
                  node={child}
                  onSelectNode={onSelectNode}
                  onOpenDetails={onOpenDetails}
                  onSupervisorChange={onSupervisorChange}
                  canModifySupervisorFn={canModifySupervisorFn}
                  eligibleSupervisorsFn={eligibleSupervisorsFn}
                />
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
};


const buildHierarchyTree = (usersList: TeamMember[], departments: { id: number; name: string }[]): TreeNode[] => {
  const map = new Map<number, TreeNode>();
  usersList.forEach(m => {
    map.set(m.id, {
      id: m.id,
      name: m.name,
      role: m.role,
      designationName: m.designation?.name || 'Employee',
      departmentName: departments.find(d => d.id === m.departmentId)?.name || 'Unassigned',
      member: m,
      children: []
    });
  });

  const roots: TreeNode[] = [];
  const visited = new Set<number>();

  // Identify who has no supervisor or whose supervisor is not in the list
  usersList.forEach(m => {
    const node = map.get(m.id)!;
    if (!m.reportsTo || !map.has(m.reportsTo)) {
      roots.push(node);
      visited.add(m.id);
    }
  });

  // Recursively add children to ensure no cycles are traversed
  const addChildren = (parentNode: TreeNode) => {
    usersList.forEach(m => {
      if (m.reportsTo === parentNode.id && !visited.has(m.id)) {
        const childNode = map.get(m.id)!;
        parentNode.children.push(childNode);
        visited.add(m.id);
        addChildren(childNode);
      }
    });
  };

  roots.forEach(r => addChildren(r));

  // Handle any nodes not visited (due to cycles or floating references) by adding them as roots
  usersList.forEach(m => {
    if (!visited.has(m.id)) {
      const node = map.get(m.id)!;
      roots.push(node);
      visited.add(m.id);
      addChildren(node);
    }
  });

  return roots;
};

const getVisibleMembers = (currentUser: any, allMembers: TeamMember[]): TeamMember[] => {
  if (!currentUser) return [];
  const isAdmin = currentUser.role === 'admin' || currentUser.role?.startsWith('admin:');
  if (isAdmin) return allMembers;

  const descendants = new Set<number>();
  const queue: number[] = [currentUser.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    allMembers.forEach(m => {
      if (m.reportsTo === currentId && !descendants.has(m.id)) {
        descendants.add(m.id);
        queue.push(m.id);
      }
    });
  }

  // Return currentUser + descendants
  return allMembers.filter(m => m.id === currentUser.id || descendants.has(m.id));
};

interface DesignationTreeNode {
  id: number;
  name: string;
  level: number;
  departmentId: number | null;
  departmentName: string;
  defaultPermissionsCount: number;
  children: DesignationTreeNode[];
}

const buildDesignationHierarchyTree = (
  designations: any[],
  departments: any[]
): DesignationTreeNode[] => {
  // Map designations to tree nodes
  const nodes: DesignationTreeNode[] = designations.map((d) => {
    const dept = departments.find((dept) => dept.id === d.departmentId);
    let defaultPermsCount = 0;
    try {
      const perms = d.permissions ? (typeof d.permissions === 'string' ? d.permissions.split(',').filter(Boolean) : d.permissions) : [];
      defaultPermsCount = Array.isArray(perms) ? perms.length : 0;
    } catch {
      defaultPermsCount = 0;
    }
    return {
      id: d.id,
      name: d.name,
      level: d.level,
      departmentId: d.departmentId,
      departmentName: dept ? dept.name : 'Shared',
      defaultPermissionsCount: defaultPermsCount,
      children: [],
    };
  });

  const roots: DesignationTreeNode[] = [];

  // For each node, find its parent and link it
  nodes.forEach((node) => {
    if (node.level === 0) {
      roots.push(node);
      return;
    }

    // Find parent: same department first, then Shared, with level < node.level and maximized level
    let parentNode: DesignationTreeNode | null = null;

    // 1. Same department candidates
    if (node.departmentId !== null) {
      const sameDeptCandidates = nodes.filter(
        (n) => n.departmentId === node.departmentId && n.level < node.level
      );
      if (sameDeptCandidates.length > 0) {
        sameDeptCandidates.sort((a, b) => b.level - a.level); // sort descending to get the highest level
        parentNode = sameDeptCandidates[0];
      }
    }

    // 2. Shared candidates fallback
    if (!parentNode) {
      const sharedCandidates = nodes.filter(
        (n) => n.departmentId === null && n.level < node.level
      );
      if (sharedCandidates.length > 0) {
        sharedCandidates.sort((a, b) => b.level - a.level);
        parentNode = sharedCandidates[0];
      }
    }

    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const DesignationTreeNodeComponent = ({
  node,
  onEdit,
}: {
  node: DesignationTreeNode;
  onEdit?: (designation: any) => void;
}) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center select-none animate-fade-in">
      {/* Node Card */}
      <div 
        onClick={() => onEdit?.(node)}
        className="group relative flex flex-col gap-2.5 p-3.5 bg-[var(--bg-card)]/80 hover:bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500/40 rounded-xl transition-all duration-300 cursor-pointer shadow-lg w-64 transform hover:-translate-y-0.5 hover:shadow-emerald-500/[0.04]"
      >
        <div className="flex items-center gap-3">
          {/* Level indicators as color badge */}
          <div className={`w-9.5 h-9.5 rounded-xl bg-[var(--bg-main)] border-2 flex flex-col items-center justify-center text-slate-350 font-extrabold text-[10px] uppercase shadow-inner shrink-0 ${
            getLevelBorderColor(node.level)
          }`}>
            <span className="text-[7px] text-[var(--text-muted)] font-bold block leading-none">LVL</span>
            <span className="text-xs font-extrabold text-[var(--text-primary)] block mt-0.5 leading-none">{node.level}</span>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-extrabold text-[var(--text-primary)] leading-none mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
              {node.name}
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[8px] bg-[var(--bg-main)] border border-[var(--border-color)]/80 text-[var(--text-secondary)] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                {node.departmentName}
              </span>
              <span className="text-slate-700 text-[10px]">•</span>
              <span className="text-[8px] bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold font-mono">
                {node.defaultPermissionsCount} Defaults
              </span>
            </div>
          </div>
        </div>

        {/* Edit details hover tip */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[7px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Edit
          </span>
        </div>
      </div>

      {/* Connection line down to children container (3px slate-700) */}
      {hasChildren && (
        <div className="w-[3px] h-6 bg-slate-700" />
      )}

      {/* Children container with connecting lines */}
      {hasChildren && (
        <div className="relative flex pt-0 justify-center">
          {node.children.map((child, index) => {
            const isFirst = index === 0;
            const isLast = index === node.children.length - 1;
            const hasMultiple = node.children.length > 1;

            return (
              <div key={child.id} className="relative flex flex-col items-center px-4 pt-6">
                {/* Horizontal connection line segments */}
                {hasMultiple && (
                  <>
                    {isFirst && (
                      <div className="absolute top-0 left-1/2 right-0 h-[3px] bg-slate-700" />
                    )}
                    {isLast && (
                      <div className="absolute top-0 left-0 right-1/2 h-[3px] bg-slate-700" />
                    )}
                    {!isFirst && !isLast && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-700" />
                    )}
                  </>
                )}

                {/* Vertical line going down from the horizontal bar to the child card */}
                <div className="absolute top-0 left-1/2 w-[3px] h-6 bg-slate-700 -translate-x-1/2" />
                
                <DesignationTreeNodeComponent
                  node={child}
                  onEdit={onEdit}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function TeamManagementPage() {



  const { user, refreshUser, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // List of active employees for allocation selectors
  const [departmentsList, setDepartmentsList] = useState<{ id: number; name: string }[]>([]);
  const [designationsList, setDesignationsList] = useState<{ id: number; name: string; level: number; departmentId: number | null; permissions?: string }[]>([]);

  const isCurrentUserAdmin = user?.role === 'admin' || user?.role?.startsWith('admin:');
  const loggedInUserDeptName = departmentsList.find(d => d.id === user?.departmentId)?.name || '';
  const isITUser = loggedInUserDeptName === 'IT';
  const hasTeamManage = hasPermission('team:manage');
  const canEditPermissionsAndRole = isCurrentUserAdmin || isITUser || hasTeamManage;
  const canChangeAccess = canEditPermissionsAndRole;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [managersAndTls, setManagersAndTls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab and Hierarchy state variables
  const [activeTab, setActiveTab] = useState<'members' | 'hierarchy' | 'permissions'>('members');
  const [focusedNodeId, setFocusedNodeId] = useState<number | null>(null);
  const [treeScale, setTreeScale] = useState<number>(1);
  const [treeSearchQuery, setTreeSearchQuery] = useState<string>('');
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTreeFullScreen, setIsTreeFullScreen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);



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

  // Moved departmentsList and designationsList to the top of the component

  const canModifySupervisor = (targetMember: TeamMember): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role?.startsWith('admin:')) return true;

    // Non-admin can only modify/view subordinates within their own department
    if (user.departmentId !== targetMember.departmentId) return false;

    let currentId = targetMember.reportsTo;
    const visited = new Set<number>();
    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId);
      if (currentId === user.id) return true;
      const parent = members.find(u => u.id === currentId);
      currentId = parent ? parent.reportsTo : null;
    }
    return false;
  };

  const isCategoryEditable = (category: string): boolean => {
    if (!user) return false;
    const isCurrentUserAdmin = user.role === 'admin' || user.role?.startsWith('admin:');
    if (isCurrentUserAdmin) return true;

    const userDeptName = departmentsList.find(d => d.id === user.departmentId)?.name || '';
    const deptLower = userDeptName.toLowerCase().trim();

    if (deptLower === 'sales') {
      return category === 'PSA' || category === 'Sales';
    }
    if (deptLower === 'finance') {
      return category === 'Finance';
    }
    if (deptLower === 'operations') {
      return category === 'Operations';
    }
    if (deptLower === 'it') {
      return category === 'IT';
    }

    return false;
  };

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
      <div className={`space-y-2 ${level > 0 ? 'pl-4 border-l border-[var(--border-color)]/85 mt-2' : ''}`}>
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
                className={`flex items-center justify-between gap-3 p-2 bg-[var(--bg-main)]/40 hover:bg-slate-955/70 border rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 scale-[1.01]'
                    : 'border-[var(--border-color)] hover:border-[var(--border-color)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-1 h-6 rounded-full shrink-0 ${
                    level === 0 ? 'bg-emerald-600' :
                    level === 1 ? 'bg-cyan-500' :
                    level === 2 ? 'bg-indigo-500' : 'bg-slate-750'
                  }`} />
                  
                  <div className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 font-bold text-xs uppercase">
                    {m.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate leading-none mb-1">{m.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase truncate">{m.designation?.name || m.role}</span>
                      {level > 0 && m.reportsTo && (
                        <>
                          <span className="text-slate-700 text-[8px]">•</span>
                          <span className="text-[8px] text-emerald-600/70 dark:text-emerald-400/70 font-semibold" title={`Supervisor: ID ${m.reportsTo}`}>
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
                        className="py-1 px-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card)] hover:border-[var(--border-color)] text-[9px] text-[var(--text-secondary)] hover:text-white rounded-lg transition-all font-semibold cursor-pointer"
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
      <div className={`space-y-2.5 ${level > 0 ? 'pl-6 border-l-2 border-dashed border-[var(--border-color)] mt-2.5 ml-4' : ''}`}>
        {filteredUsers.map((m: any) => {
          const deptName = departmentsList.find(d => d.id === m.departmentId)?.name || 'Unassigned';
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 p-3 bg-[var(--bg-card)]/50 hover:bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-1.5 h-8 rounded-full shrink-0 ${
                    level === 0 ? 'bg-red-500' :
                    level === 1 ? 'bg-indigo-500' :
                    level === 2 ? 'bg-purple-500' :
                    level === 3 ? 'bg-emerald-600' :
                    level === 4 ? 'bg-cyan-500' : 'bg-emerald-500'
                  }`} />
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-slate-350 font-extrabold text-xs uppercase shadow-inner shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)] leading-none mb-1">{m.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[var(--text-secondary)] font-bold tracking-wide">{m.designation?.name || 'Employee'}</span>
                      <span className="text-slate-700 text-xs">•</span>
                      <span className="text-[9px] bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded font-bold uppercase">{deptName}</span>
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
          permissions: designationPermissions.join(','),
        })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setDesignationName('');
        setDesignationLevel(5);
        setDesignationDeptId('');
        setDesignationPermissions([]);
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
          permissions: designationPermissions.join(','),
        })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setEditingDesignation(null);
        setDesignationName('');
        setDesignationLevel(5);
        setDesignationDeptId('');
        setDesignationPermissions([]);
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

  // canEditPermissionsAndRole is now defined globally at the top of the component
  
  // Add User Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    employeeId: '',
    workingLocation: '',
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
  
  // Custom Toggles for Designation Simplification and Org Tree Navigation
  const [designationsViewMode, setDesignationsViewMode] = useState<'level' | 'department'>('level');
  const [desigTreeScale, setDesigTreeScale] = useState<number>(1);
  const [desigPan, setDesigPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDesigDraggingCanvas, setIsDesigDraggingCanvas] = useState<boolean>(false);
  const [desigDragStart, setDesigDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDesigTreeFullScreen, setIsDesigTreeFullScreen] = useState<boolean>(false);

  // Edit Other Member states (for admin/director/sales_head)
  const [editMemberForm, setEditMemberForm] = useState({
    workingLocation: '',
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
  const [designationPermissions, setDesignationPermissions] = useState<string[]>([]);
  const [selectedDesignationPermissionCategory, setSelectedDesignationPermissionCategory] = useState<string>('PSA');


  const canvasRef = React.useRef<HTMLDivElement>(null);
  const desigCanvasRef = React.useRef<HTMLDivElement>(null);

  // Trackpad pinch-to-zoom and panning wheel event listener for main tree
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey) {
        // Pinch-to-zoom
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setTreeScale((prevScale) => {
          const spaceX = (mouseX - pan.x) / prevScale;
          const spaceY = (mouseY - pan.y) / prevScale;

          const zoomFactor = 0.05;
          let newScale = prevScale;
          if (e.deltaY < 0) {
            newScale = Math.min(2.0, prevScale + zoomFactor);
          } else {
            newScale = Math.max(0.3, prevScale - zoomFactor);
          }

          setPan({
            x: mouseX - spaceX * newScale,
            y: mouseY - spaceY * newScale
          });

          return newScale;
        });
      } else {
        // Trackpad panning (deltaX and deltaY scroll)
        setPan((prevPan) => ({
          x: prevPan.x - e.deltaX,
          y: prevPan.y - e.deltaY
        }));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [activeTab, isTreeFullScreen, pan, treeScale]);

  // Trackpad pinch-to-zoom and panning wheel event listener for designations tree
  useEffect(() => {
    const canvas = desigCanvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey) {
        // Pinch-to-zoom
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setDesigTreeScale((prevScale) => {
          const spaceX = (mouseX - desigPan.x) / prevScale;
          const spaceY = (mouseY - desigPan.y) / prevScale;

          const zoomFactor = 0.05;
          let newScale = prevScale;
          if (e.deltaY < 0) {
            newScale = Math.min(2.0, prevScale + zoomFactor);
          } else {
            newScale = Math.max(0.3, prevScale - zoomFactor);
          }

          setDesigPan({
            x: mouseX - spaceX * newScale,
            y: mouseY - spaceY * newScale
          });

          return newScale;
        });
      } else {
        // Trackpad panning
        setDesigPan((prevPan) => ({
          x: prevPan.x - e.deltaX,
          y: prevPan.y - e.deltaY
        }));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [showHierarchyModal, isDesigTreeFullScreen, desigPan, desigTreeScale]);

  const requestRef = React.useRef<number | null>(null);

  // Canvas drag-to-scroll (panning) mouse and touch event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Prevent dragging when clicking on interactive elements or cards (with class .group)
    if (
      target.closest('button') || 
      target.closest('select') || 
      target.closest('input') || 
      target.closest('.group')
    ) {
      return;
    }

    setIsDraggingCanvas(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('select') || 
      target.closest('input') || 
      target.closest('.group')
    ) {
      return;
    }
    if (e.touches.length === 1) {
      setIsDraggingCanvas(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  useEffect(() => {
    if (!isDraggingCanvas) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      requestRef.current = requestAnimationFrame(() => {
        setPan({ x: newX, y: newY });
      });
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const newX = e.touches[0].clientX - dragStart.x;
        const newY = e.touches[0].clientY - dragStart.y;

        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
        }

        requestRef.current = requestAnimationFrame(() => {
          setPan({ x: newX, y: newY });
        });
      }
    };

    const handleWindowMouseUp = () => {
      setIsDraggingCanvas(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('mouseup', handleWindowMouseUp, { passive: true });
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowMouseUp, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowMouseUp);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isDraggingCanvas, dragStart, pan]);

  const desigRequestRef = React.useRef<number | null>(null);

  // Designation Canvas drag-to-scroll (panning) mouse and touch event handlers
  const handleDesigMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('select') || 
      target.closest('input') || 
      target.closest('.group')
    ) {
      return;
    }

    setIsDesigDraggingCanvas(true);
    setDesigDragStart({
      x: e.clientX - desigPan.x,
      y: e.clientY - desigPan.y
    });
  };

  const handleDesigTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('select') || 
      target.closest('input') || 
      target.closest('.group')
    ) {
      return;
    }
    if (e.touches.length === 1) {
      setIsDesigDraggingCanvas(true);
      setDesigDragStart({
        x: e.touches[0].clientX - desigPan.x,
        y: e.touches[0].clientY - desigPan.y
      });
    }
  };

  useEffect(() => {
    if (!isDesigDraggingCanvas) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - desigDragStart.x;
      const newY = e.clientY - desigDragStart.y;

      if (desigRequestRef.current) {
        cancelAnimationFrame(desigRequestRef.current);
      }

      desigRequestRef.current = requestAnimationFrame(() => {
        setDesigPan({ x: newX, y: newY });
      });
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const newX = e.touches[0].clientX - desigDragStart.x;
        const newY = e.touches[0].clientY - desigDragStart.y;

        if (desigRequestRef.current) {
          cancelAnimationFrame(desigRequestRef.current);
        }

        desigRequestRef.current = requestAnimationFrame(() => {
          setDesigPan({ x: newX, y: newY });
        });
      }
    };

    const handleWindowMouseUp = () => {
      setIsDesigDraggingCanvas(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('mouseup', handleWindowMouseUp, { passive: true });
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowMouseUp, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowMouseUp);
      if (desigRequestRef.current) {
        cancelAnimationFrame(desigRequestRef.current);
        desigRequestRef.current = null;
      }
    };
  }, [isDesigDraggingCanvas, desigDragStart, desigPan]);



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
      workingLocation: '',
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

  // Helper to determine if a candidate is eligible to be a supervisor (Same department, Sales<->PSA cross-assignment, or Admin)
  const isEligibleSupervisor = (sup: TeamMember, targetDeptId?: string | number | null, targetUserId?: number | null) => {
    if (targetUserId && sup.id === targetUserId) return false;
    
    // Admin is always eligible
    if (sup.role === 'admin' || sup.department?.name === 'Admin') return true;
    
    if (!targetDeptId) return false;
    
    const targetDeptObj = departmentsList.find(d => String(d.id) === String(targetDeptId));
    const targetDeptName = targetDeptObj?.name || '';
    const supDeptName = sup.department?.name || '';
    
    // Exact department match
    if (String(sup.departmentId) === String(targetDeptId)) return true;
    
    // Combined Sales & PSA domain match: PSA <-> Sales
    const isSalesOrPSA = (name: string) => name === 'Sales' || name === 'PSA';
    if (isSalesOrPSA(targetDeptName) && isSalesOrPSA(supDeptName)) {
      return true;
    }
    
    return false;
  };

  // Fetch managers & TLs to populate reportsTo dropdown
  const fetchSupervisors = async () => {
    try {
      const res = await fetch('/api/v1/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data) {
        // Supervisors can be any active user (department filtering & hierarchy levels are handled in dropdown renderer)
        const filtered = data.data.filter((u: any) => u.isActive);
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
    } else if (isAdminOrDirectorOrSalesHead || canModifySupervisor(member)) {
      const userDeptName = departmentsList.find(d => d.id === user?.departmentId)?.name || '';
      const deptLower = userDeptName.toLowerCase().trim();
      const isAdmin = user?.role === 'admin' || user?.role?.startsWith('admin:');

      if (isAdmin || deptLower === 'it' || !user?.departmentId) {
        setSelectedPermissionCategory('PSA');
      } else if (deptLower === 'sales') {
        setSelectedPermissionCategory('PSA');
      } else if (deptLower === 'finance') {
        setSelectedPermissionCategory('Finance');
      } else if (deptLower === 'operations') {
        setSelectedPermissionCategory('Operations');
      }
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
        workingLocation: member.workingLocation || '',
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
        designationText: (member as any).designation?.name || '',
      } as any);
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
        workingLocation: editMemberForm.workingLocation,
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
        designationText: (editMemberForm as any).designationText !== undefined ? (editMemberForm as any).designationText : undefined,
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
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  const userBaseRole = user?.role ? (user.role.includes(':') ? user.role.split(':')[0] : user.role) : '';
  const isAdminOrDirectorOrSalesHead = hasPermission('team:manage');
  const hasFullTeamAccess = true;
  const titleText = 'Santori Team';

  // Extract custom designations currently defined in the database
  const customDesignations = Array.from(
    new Set(
      members
        .map((m) => m.role)
        .filter((role) => role && role.includes(':'))
    )
  );

  const myVisibleMembers = getVisibleMembers(user, members);

  const displayedMembers = (() => {
    const exactSearch = empSearchInput.trim().toLowerCase();
    if (exactSearch) {
      // Search from ALL members in the system
      return members.filter((member) => member.employeeId && member.employeeId.trim().toLowerCase() === exactSearch);
    }

    return myVisibleMembers.filter((member) => {
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

      return true;
    });
  })();


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-wide">{titleText}</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {activeTab === 'members'

              ? (isAdminOrDirectorOrSalesHead
                ? 'Manage user profiles, assign roles, and handle account status.'
                : 'Browse company directory and see colleagues.')
              : 'Interactive visual tree of company reporting relationships.'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {activeTab === 'members' && isAdminOrDirectorOrSalesHead && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-lg shadow-emerald-500/10 flex items-center gap-1.5 transition-all w-fit cursor-pointer border border-transparent"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border border-[var(--border-color)] bg-[var(--bg-main)]/60 p-1 rounded-xl w-fit gap-1 shadow-inner">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'members'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
              : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]/30'
          }`}
        >
          Members Directory
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'hierarchy'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
              : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]/30'
          }`}
        >
          Hierarchy Tree
        </button>
        {(user?.role === 'admin' || user?.role === 'director' || user?.department?.name === 'IT') && (
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'permissions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]/30'
            }`}
          >
            Custom Access Levels
          </button>
        )}
      </div>

      {activeTab === 'permissions' && (
        <AccessControlManager
          currentUser={user || { id: 0, role: '' }}
          users={members.map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
            permissions: m.permissions || '',
            department: m.department,
            designation: m.designation,
          }))}
          onPermissionsUpdated={async () => {
            await fetchTeam();
            if (refreshUser) await refreshUser();
          }}
        />
      )}


      {activeTab === 'members' && (
        <>
          {/* Directory Search and Department Filter */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[var(--bg-card)]/60 border border-slate-805 p-4 rounded-xl shadow-xl">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            disabled={!!empSearchInput.trim()}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={empSearchInput.trim() ? "Clear Employee ID lookup to search by name..." : "Search by name, email, or employee ID..."}
            className="w-full pl-9 pr-4 py-2 bg-slate-955/80 border border-slate-805 rounded-xl text-[var(--text-primary)] placeholder-slate-550 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-40"
          />
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
        </div>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={empSearchInput}
            onChange={(e) => setEmpSearchInput(e.target.value)}
            placeholder="Exact Employee ID Lookup (EMP-101)..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-955/80 border border-slate-805 rounded-xl text-[var(--text-primary)] placeholder-slate-550 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono tracking-wide"
          />
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
        </div>
        {(user?.role === 'admin' || user?.role?.startsWith('admin:') || (departmentsList.find(d => d.id === user?.departmentId)?.name?.toLowerCase().trim() === 'it')) && (
          <div className="w-full md:w-60">
            <CustomSelect
              options={[
                { value: '', label: 'All Departments' },
                ...departmentsList.map((dept) => ({
                  value: String(dept.id),
                  label: dept.name,
                })),
              ]}
              value={selectedDepartmentFilter}
              onChange={(val) => setSelectedDepartmentFilter(val)}
              placeholder="All Departments"
              disabled={!!empSearchInput.trim()}
            />
          </div>
        )}
      </div>

      {/* Bulk Actions Control Bar */}
      {isAdminOrDirectorOrSalesHead && selectedUserIds.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-mono">
              {selectedUserIds.length}
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">Team Member(s) Selected</span>
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
              className="py-1.5 px-3 bg-[var(--bg-card)] hover:bg-slate-750 border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
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
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xl">
        {/* Lookup Card View - only shown when Employee ID lookup search is active */}
        {empSearchInput.trim() ? (
          <>
            {displayedMembers.length > 0 ? (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-color)]">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Lookup Results for &ldquo;<span className="text-emerald-400 font-mono">{empSearchInput.trim()}</span>&rdquo;
                  </span>
                  <span className="ml-auto text-[10px] text-slate-600 font-mono">{displayedMembers.length} found</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayedMembers.map((member) => {
                    const roleConfig = { label: getRoleLabel(member.role), class: getRoleClass(member.role) };
                    const desName = member.designation?.name?.trim();
                    const deptName = member.department?.name?.trim();
                    let designationLabel = '';
                    if (desName) {
                      designationLabel = (deptName && !desName.toLowerCase().startsWith(deptName.toLowerCase()))
                        ? `${deptName} ${desName}`
                        : desName;
                    } else if (deptName && member.role) {
                      const rl = getRoleLabel(member.role);
                      designationLabel = rl.toLowerCase().startsWith(deptName.toLowerCase()) ? rl : `${deptName} ${rl}`;
                    } else {
                      designationLabel = roleConfig.label;
                    }
                    return (
                      <div key={member.id} onClick={() => handleOpenProfile(member)} className="bg-[var(--bg-card)]/80 border border-[var(--border-color)] hover:border-emerald-600/40 hover:shadow-emerald-500/5 hover:shadow-xl rounded-2xl p-5 flex flex-col items-center gap-3.5 shadow-lg transition-all cursor-pointer">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-[var(--border-color)] overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                          {member.photograph ? (
                            <img src={"/api/v1/users/" + member.id + "/photograph"} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-extrabold text-[var(--text-muted)] uppercase select-none">
                              {member.name.substring(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-[var(--text-primary)] font-bold text-sm leading-tight">{member.name}</p>
                          <p className="text-[var(--text-muted)] font-mono text-[10px] mt-1">{member.employeeId || '—'}</p>
                        </div>
                        <span className={`inline-block text-[9px] font-bold px-3 py-1 border rounded-full uppercase tracking-wider ${roleConfig.class}`}>
                          {designationLabel}
                        </span>
                        <div className="w-full bg-[var(--bg-main)]/80 border border-[var(--border-color)]/80 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs text-[var(--text-primary)] truncate leading-tight">
                            {member.workingLocation ? member.workingLocation : <span className="text-slate-600 italic text-[10px]">Location not set</span>}
                          </span>
                        </div>
                        <span className={`inline-block text-[9px] font-bold px-3 py-1 border rounded-full uppercase tracking-wider ${member.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {member.isActive ? 'â— Active' : 'â—‹ Deactivated'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center gap-3 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-1">
                  <UserX className="w-7 h-7 text-slate-600" />
                </div>
                <p className="text-[var(--text-secondary)] text-sm font-semibold">No employee found</p>
                <p className="text-slate-600 text-xs max-w-xs">No team member with Employee ID <span className="font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded">{empSearchInput.trim()}</span> exists in the system.</p>
              </div>
            )}
          </>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-card)]/10 text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider">
                {isAdminOrDirectorOrSalesHead && (
                  <th className="py-4 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={displayedMembers.length > 0 && displayedMembers.filter(m => m.id !== user?.id).length > 0 && displayedMembers.filter(m => m.id !== user?.id).every(m => selectedUserIds.includes(m.id))}
                      className="rounded border-[var(--border-color)] bg-[var(--bg-card)] text-emerald-600 focus:ring-emerald-500/40 cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-4 px-4 w-20 text-center">Photo</th>
                <th className="py-4 px-4 w-48">Full Name</th>
                <th className="py-4 px-4 w-32">Employee ID</th>
                <th className="py-4 px-4 w-40">Designation</th>
                {!empSearchInput.trim() && <th className="py-4 px-4 w-40">Direct Supervisor</th>}
                {!empSearchInput.trim() && <th className="py-4 px-4 w-36">Years in the Company</th>}
                {!empSearchInput.trim() && <th className="py-4 px-4 w-36">Working Location</th>}
                <th className="py-4 px-4 w-28 text-center">Status</th>
                {!empSearchInput.trim() && <th className="py-4 px-4 w-36 text-center">Control</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {displayedMembers.length === 0 ? (
                <tr>
                  <td colSpan={isAdminOrDirectorOrSalesHead ? 10 : 9} className="py-12 text-center text-[var(--text-muted)] text-xs">
                    {empSearchInput.trim() ? (
                      <div className="flex flex-col items-center gap-2">
                        <UserX className="w-6 h-6 text-slate-600" />
                        <span>No team member found matching Employee ID "{empSearchInput.trim()}".</span>
                      </div>
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
                      className={`hover:bg-[var(--bg-card)]/10 transition-colors ${
                        !member.isActive ? 'opacity-50' : ''
                      } ${selectedUserIds.includes(member.id) ? 'bg-emerald-500/5' : ''}`}
                    >
                      {isAdminOrDirectorOrSalesHead && (
                        <td className="py-4 px-3 text-center w-10">
                          {member.id !== user?.id && (
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(member.id)}
                              onChange={() => handleSelectUser(member.id)}
                              className="rounded border-[var(--border-color)] bg-[var(--bg-card)] text-emerald-600 focus:ring-emerald-500/40 cursor-pointer"
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
                            className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)] mx-auto"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-emerald-600 mx-auto shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Full Name Column */}
                      <td className="py-4 px-4 font-bold text-[var(--text-primary)] w-48">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenProfile(member)}
                            className="hover:text-emerald-600 dark:hover:text-emerald-400 text-left font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            {member.name}
                          </button>
                          {member.id === user?.id && (
                            <span className="text-[8px] bg-emerald-600/20 text-emerald-600 border border-emerald-600/20 rounded px-1.5 font-extrabold uppercase">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Employee ID Column */}
                      <td className="py-4 px-4 font-mono text-xs text-[var(--text-primary)] w-32">
                        {member.employeeId || <span className="text-slate-600 italic">Not Set</span>}
                      </td>

                      {/* Designation/Role Column */}
                      <td className="py-4 px-4 w-40">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${roleConfig.class}`}>
                          {(() => {
                            const desName = member.designation?.name?.trim();
                            const deptName = member.department?.name?.trim();

                            if (desName) {
                              if (deptName && !desName.toLowerCase().startsWith(deptName.toLowerCase())) {
                                return `${deptName} ${desName}`;
                              }
                              return desName;
                            }

                            if (deptName && member.role) {
                              const rawRoleLabel = getRoleLabel(member.role);
                              if (!rawRoleLabel.toLowerCase().startsWith(deptName.toLowerCase())) {
                                return `${deptName} ${rawRoleLabel}`;
                              }
                              return rawRoleLabel;
                            }

                            return member.designation?.name || roleConfig.label;
                          })()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-[var(--text-secondary)] w-36">
                        {member.supervisor?.name || <span className="text-slate-600 italic">Unassigned</span>}
                      </td>
                      <td className="py-4 px-4 text-xs text-[var(--text-primary)] w-28">
                        {calculateYearsInCompany(member.joiningDate)}
                      </td>
                      <td className="py-4 px-4 text-xs text-[var(--text-primary)] w-36">
                        {member.workingLocation || <span className="text-slate-600 italic">Not Set</span>}
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
                              className="p-1.5 rounded-lg border bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-slate-805 hover:border-[var(--border-color)] transition-all cursor-pointer flex items-center justify-center"
                              title="View Activity Logs"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}

                          {canEditPermissionsAndRole && member.id !== user?.id && (isCurrentUserAdmin || canModifySupervisor(member)) && (
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        )}
        </div>
      </>
    )}

    {/* Hierarchy Tree Tab Content */}
    {activeTab === 'hierarchy' && (() => {
      // Filter members based on visible members hierarchy (self + subordinates)
      const filteredMembers = myVisibleMembers;


      const allRoots = buildHierarchyTree(filteredMembers, departmentsList);
      
      // Helper function to find a node by ID in the tree forest
      const findNodeInTree = (nodes: TreeNode[], targetId: number): TreeNode | null => {
        for (const n of nodes) {
          if (n.id === targetId) return n;
          const found = findNodeInTree(n.children, targetId);
          if (found) return found;
        }
        return null;
      };

      const visibleRoots = focusedNodeId 
        ? (() => {
            const found = findNodeInTree(allRoots, focusedNodeId);
            return found ? [found] : [];
          })()
        : allRoots;

      // Get breadcrumbs path using filtered members
      const getBreadcrumbs = (targetId: number): TeamMember[] => {
        const path: TeamMember[] = [];
        let currentId: number | null = targetId;
        const visited = new Set<number>();
        while (currentId !== null && !visited.has(currentId)) {
          visited.add(currentId);
          const m = filteredMembers.find(u => u.id === currentId);
          if (!m) break;
          path.push(m);
          currentId = m.reportsTo;
        }
        return path.reverse();
      };

      const breadcrumbs = focusedNodeId ? getBreadcrumbs(focusedNodeId) : [];

      // Filter members for search suggestions from filteredMembers
      const suggestions = treeSearchQuery.trim()
        ? filteredMembers.filter(m => 
            m.name.toLowerCase().includes(treeSearchQuery.toLowerCase()) || 
            (m.employeeId && m.employeeId.toLowerCase().includes(treeSearchQuery.toLowerCase()))
          ).slice(0, 5)
        : [];

      // Inline Supervisor assignment security validation checks:
      // Allow only Admin or ancestors above target member in target member's reporting line
      const canModifySupervisorFn = (targetMember: TeamMember): boolean => {
        if (!user) return false;
        if (user.role === 'admin' || user.role?.startsWith('admin:')) return true;

        let currentId = targetMember.reportsTo;
        const visited = new Set<number>();
        while (currentId !== null && !visited.has(currentId)) {
          visited.add(currentId);
          if (currentId === user.id) return true;
          const parent = members.find(u => u.id === currentId);
          currentId = parent ? parent.reportsTo : null;
        }
        return false;
      };

      // Inline list of eligible supervisors: admins or higher hierarchy designation across any department
      const eligibleSupervisorsFn = (targetMember: TeamMember): TeamMember[] => {
        const targetLevel = targetMember.designation?.level ?? 99;

        return members.filter((sup) => {
          if (sup.id === targetMember.id) return false;
          const supLevel = sup.designation?.level ?? 0;
          const isSupAdmin = sup.role === 'admin' || sup.role?.startsWith('admin:');
          
          if (isSupAdmin || supLevel === 0) return true;

          if (targetLevel > 1) {
            return supLevel < targetLevel && supLevel > 0;
          }
          
          return false;
        });
      };

      // Handler for live updates of supervisor assignment
      const onSupervisorChange = async (memberId: number, newSupervisorIdStr: string): Promise<void> => {
        const newSupId = newSupervisorIdStr ? parseInt(newSupervisorIdStr, 10) : null;
        try {
          const res = await fetch(`/api/v1/users/${memberId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportsTo: newSupId })
          });

          const data = await res.json();
          if (data.success) {
            // Live refresh state by refetching users
            await fetchTeam();
          } else {
            alert(data.error || 'Failed to update supervisor.');
          }
        } catch (err) {
          console.error(err);
          alert('Network error updating supervisor.');
        }
      };


      const treeContent = (

        <div className={isTreeFullScreen ? "fixed inset-0 z-[9999] bg-[var(--bg-main)] p-6 flex flex-col space-y-6 overflow-hidden animate-fade-in" : "space-y-6 animate-fade-in"}>
          {/* Controls Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)]/60 border border-[var(--border-color)] p-4 rounded-xl shadow-xl">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={treeSearchQuery}
                  onChange={(e) => setTreeSearchQuery(e.target.value)}
                  placeholder="Search and focus on employee..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-955 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                {treeSearchQuery && (
                  <button 
                    type="button"
                    onClick={() => setTreeSearchQuery('')}
                    className="absolute right-3 top-2.5 text-[var(--text-secondary)] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 z-30 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800/60">
                  {suggestions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setFocusedNodeId(m.id);
                        setTreeSearchQuery('');
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[var(--bg-card)] flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-[var(--text-primary)] leading-none mb-1">{m.name}</p>
                        <p className="text-[10px] text-slate-450">{m.designation?.name || 'Employee'}</p>
                      </div>
                      <span className="text-[9px] bg-[var(--bg-main)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] font-mono font-bold">
                        {m.employeeId || `#${m.id}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Zoom & Fullscreen Controls */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mr-1">Zoom: {Math.round(treeScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setTreeScale(prev => Math.max(0.5, parseFloat((prev - 0.1).toFixed(1))))}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer transition-all hover:bg-[var(--bg-card)]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTreeScale(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer transition-all hover:bg-[var(--bg-card)]"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTreeScale(prev => Math.min(1.5, parseFloat((prev + 0.1).toFixed(1))))}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer transition-all hover:bg-[var(--bg-card)]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-6 bg-[var(--bg-card)] mx-1" />
              <button
                type="button"
                onClick={() => setIsTreeFullScreen(!isTreeFullScreen)}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer transition-all hover:bg-[var(--bg-card)]"
                title={isTreeFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isTreeFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Breadcrumbs focus path */}
          {focusedNodeId && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)]/40 border border-[var(--border-color)]/80 rounded-xl text-xs text-[var(--text-primary)] animate-fade-in">
              <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-[9px] font-mono">Active Focus:</span>
              <button 
                type="button"
                onClick={() => setFocusedNodeId(null)}
                className="hover:text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-bold text-[var(--text-primary)] font-sans"
              >
                All Employees
              </button>
              {breadcrumbs.map((ancestor, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={ancestor.id}>
                    <span className="text-slate-650 font-bold font-mono">&gt;</span>
                    <button 
                      type="button"
                      onClick={() => setFocusedNodeId(ancestor.id)}
                      disabled={isLast}
                      className={`font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer transition-all ${
                        isLast ? 'text-emerald-600 dark:text-emerald-400 font-bold hover:no-underline pointer-events-none' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {ancestor.name}
                    </button>
                  </React.Fragment>
                );
              })}
              <button
                type="button"
                onClick={() => setFocusedNodeId(null)}
                className="ml-auto text-[9px] bg-slate-955 border border-[var(--border-color)] hover:border-slate-750 text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded font-bold uppercase tracking-wide cursor-pointer transition-all"
              >
                Reset Focus
              </button>
            </div>
          )}

          {/* Canvas Wrapper */}
          <div 
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`relative overflow-hidden p-8 border border-[var(--border-color)]/60 rounded-2xl bg-[var(--bg-main)]/20 backdrop-blur-md shadow-2xl ${
              isTreeFullScreen ? 'flex-1 h-full max-h-none' : 'max-h-[65vh]'
            } ${
              isDraggingCanvas ? 'cursor-grabbing select-none' : 'cursor-grab'
            }`}
          >

            {visibleRoots.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <Users className="w-12 h-12 text-slate-655" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Nodes Found</h3>
                <p className="text-xs text-slate-450 max-w-sm">
                  Ensure you have created active team members and designated their reporting hierarchy structure.
                </p>
              </div>
            ) : (
              <div 
                key={focusedNodeId || 'root'}
                className="animate-fade-in-up w-max mx-auto"
              >
                <div 
                  className={`origin-top ${isDraggingCanvas ? '' : 'transition-transform duration-300 ease-out'}`}
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${treeScale})`, transformOrigin: 'top center' }}
                >
                  <div className="flex gap-12 justify-center min-w-max mx-auto">
                    {visibleRoots.map((rootNode) => (

                      <div key={rootNode.id} className="flex flex-col items-center">
                        <HierarchyTreeNodeComponent
                          node={rootNode}
                          onSelectNode={(nodeId) => setFocusedNodeId(nodeId)}
                          onOpenDetails={(member) => handleOpenProfile(member)}
                          onSupervisorChange={onSupervisorChange}
                          canModifySupervisorFn={canModifySupervisorFn}
                          eligibleSupervisorsFn={eligibleSupervisorsFn}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );

      if (isTreeFullScreen && isMounted) {
        return createPortal(treeContent, document.body);
      }
      return treeContent;
    })()}



    {/* Create Team Modal */}
    {showCreateTeamModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
          <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/20 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Form New Clan (Team)</h3>
            <button onClick={() => setShowCreateTeamModal(false)} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
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
                  className="w-full px-3 py-2 bg-slate-955 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-455 uppercase tracking-wider mb-1.5 font-mono">Department Assignment *</label>
                <select
                  required
                  value={newTeamDeptId}
                  onChange={(e) => setNewTeamDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-[var(--border-color)] rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Select a department...</option>
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-card)]/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 cursor-pointer"
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
        <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
          <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/20 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Edit Reporting Structure</h3>
            <button onClick={() => setEditingReportingUser(null)} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleUpdateReportingSubmit}>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-[var(--bg-card)]/30 border border-[var(--border-color)] rounded-xl">
                <p className="text-xs text-[var(--text-primary)] font-bold">{editingReportingUser.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wide font-mono">
                  {editingReportingUser.role} (Current Supervisor ID: {editingReportingUser.reportsTo || 'None'})
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-455 uppercase tracking-wider mb-1.5">Assign to Clan (Team)</label>
                <select
                  value={newTeamAssignmentId}
                  onChange={(e) => setNewTeamAssignmentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-[var(--border-color)] rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-805 rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">No Supervisor / Reports directly to Head</option>
                  {members
                    .filter((m) => isEligibleSupervisor(m, editingReportingUser.departmentId, editingReportingUser.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name} {m.department?.name ? `(${m.department.name})` : ''}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-card)]/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingReportingUser(null)}
                className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingReporting}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)]/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Register New Team Member</h3>
              <button onClick={closeAddModal} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="max-h-[80vh] overflow-y-auto">

              

                            {/* â”€â”€â”€ Photo + Identity Section â”€â”€â”€ */}

                            <div className="p-6 space-y-5">

              

                              {/* Photo Upload */}

                              <div className="flex items-center gap-5 p-4 bg-emerald-600/5 border border-emerald-600/10 rounded-2xl">

                                <div className="relative flex-shrink-0">

                                  <div className="w-20 h-20 rounded-2xl bg-[var(--bg-main)] border-2 border-[var(--border-color)] flex items-center justify-center overflow-hidden shadow-lg">

                                    {addPhotoPreviewUrl || form.photograph ? (

                                      <img src={addPhotoPreviewUrl || form.photograph} alt="Preview" className="w-full h-full object-cover" />

                                    ) : (

                                      <span className="text-2xl font-extrabold text-slate-600 uppercase select-none">

                                        {form.name ? form.name.substring(0, 2) : <User className="w-8 h-8 text-slate-600" />}

                                      </span>

                                    )}

                                    {uploadingAddPhoto && (

                                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">

                                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />

                                      </div>

                                    )}

                                  </div>

                                </div>

                                <div className="flex-1 space-y-2">

                                  <p className="text-xs font-bold text-[var(--text-primary)]">Profile Photograph</p>

                                  <p className="text-[10px] text-[var(--text-muted)]">Upload a clear photo. Recommended: square, min 200Ã—200px.</p>

                                  <input type="file" accept="image/*" id="add-photo-input" onChange={handleAddPhotoUpload} className="hidden" />

                                  <label htmlFor="add-photo-input" className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-600/50 hover:bg-emerald-600/5 text-[var(--text-primary)] hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all">

                                    <Upload className="w-3.5 h-3.5" />

                                    <span>{form.photograph ? "Change Photo" : "Upload Photo"}</span>

                                  </label>

                                </div>

                              </div>

              

                              {/* Section Label */}

                              <div className="flex items-center gap-2">

                                <div className="h-px flex-1 bg-[var(--bg-card)]" />

                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Basic Information</span>

                                <div className="h-px flex-1 bg-[var(--bg-card)]" />

                              </div>

              

                              {/* Row 1: Name + Employee ID */}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">

                                    Full Name <span className="text-red-500">*</span>

                                  </label>

                                  <input

                                    type="text"

                                    required

                                    value={form.name}

                                    onChange={(e) => setForm({ ...form, name: e.target.value })}

                                    placeholder="e.g. Ramesh Singh"

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  />

                                </div>

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">

                                    Employee ID <span className="text-red-500">*</span>

                                  </label>

                                  <input

                                    type="text"

                                    required

                                    value={form.employeeId}

                                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}

                                    placeholder="e.g. SSS-1002"

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  />

                                </div>

                              </div>

              

                              {/* Row 2: Email + Phone */}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">

                                    Email Address <span className="text-red-500">*</span>

                                  </label>

                                  <input

                                    type="email"

                                    required

                                    value={form.email}

                                    onChange={(e) => setForm({ ...form, email: e.target.value })}

                                    placeholder="e.g. ramesh@solarcrm.com"

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  />

                                </div>

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">

                                    Contact Number <span className="text-red-500">*</span>

                                  </label>

                                  <input

                                    type="text"

                                    required

                                    value={form.phone}

                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}

                                    placeholder="10-digit mobile number"

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  />

                                </div>

                              </div>

              

                              {/* Row 3: Working Location (highlighted) */}

                              <div className="space-y-1.5">

                                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">

                                  <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />

                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />

                                  </svg>

                                  Working Location

                                </label>

                                <input

                                  type="text"

                                  value={form.workingLocation}

                                  onChange={(e) => setForm({ ...form, workingLocation: e.target.value })}

                                  placeholder="e.g. Varanasi HQ, Remote – Delhi, Lucknow Field"

                                  className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-emerald-900/30 focus:border-emerald-600/60 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                />

                                <p className="text-[10px] text-slate-600">This will be shown in the Employee ID lookup search results.</p>

                              </div>

              

                              {/* Row 4: Address */}

                              <div className="space-y-1.5">

                                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">

                                  Full Residential Address <span className="text-red-500">*</span>

                                </label>

                                <textarea

                                  required

                                  rows={2}

                                  value={form.address}

                                  onChange={(e) => setForm({ ...form, address: e.target.value })}

                                  placeholder="Complete residential address"

                                  className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all resize-none"

                                />

                              </div>

              

                              {/* Section Label */}

                              <div className="flex items-center gap-2">

                                <div className="h-px flex-1 bg-[var(--bg-card)]" />

                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Role & Access</span>

                                <div className="h-px flex-1 bg-[var(--bg-card)]" />

                              </div>

              

                              {/* Row 5: Department + Designation */}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Department</label>

                                  <select

                                    value={form.departmentId}

                                    onChange={(e) => setForm({ ...form, departmentId: e.target.value, reportsTo: "" })}

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  >

                                    <option value="">No Department / Shared</option>

                                    {departmentsList.map((dept) => (

                                      <option key={dept.id} value={dept.id}>{dept.name}</option>

                                    ))}

                                  </select>

                                </div>

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Designation</label>

                                  <input

                                    type="text"

                                    value={(form as any).designationText || ""}

                                    onChange={(e) => setForm({ ...form, designationText: e.target.value } as any)}

                                    placeholder="e.g. Sales Executive, Field Officer"

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  />

                                </div>

                              </div>

              

                              {/* Row 6: Password + Supervisor */}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">

                                    Initial Password <span className="text-red-500">*</span>

                                  </label>

                                  <input

                                    type="password"

                                    required

                                    value={form.password}

                                    onChange={(e) => setForm({ ...form, password: e.target.value })}

                                    placeholder="••••••••"

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  />

                                </div>

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Direct Supervisor</label>

                                  <select

                                    value={form.reportsTo}

                                    onChange={(e) => setForm({ ...form, reportsTo: e.target.value })}

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  >

                                    <option value="">No Supervisor (Reports to Admin)</option>

                                    {members

                                      .filter((sup) => isEligibleSupervisor(sup, form.departmentId))

                                      .map((sup) => (

                                        <option key={sup.id} value={sup.id}>

                                          {sup.name} {sup.department?.name ? `(${sup.department.name})` : ""}

                                        </option>

                                      ))}

                                  </select>

                                </div>

                              </div>

              

                              {/* Row 7: Joining Date */}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <div className="space-y-1.5">

                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">

                                    Date of Joining <span className="text-red-500">*</span>

                                  </label>

                                  <input

                                    type="date"

                                    required

                                    value={form.joiningDate}

                                    onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}

                                    className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"

                                  />

                                </div>

                              </div>

                            </div>

              

                            {/* Footer Actions */}

                            <div className="flex gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]/40 justify-end sticky bottom-0">

                              <button

                                type="button"

                                onClick={closeAddModal}

                                className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white rounded-xl font-bold text-xs cursor-pointer transition-all"

                              >

                                Cancel

                              </button>

                              <button

                                type="submit"

                                disabled={submitting}

                                className="py-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"

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
          <div className="w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)]/20 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                {selectedMember.id === user?.id ? 'My profile settings' : 'Team Member Profile'}
              </h3>
              <button onClick={closeProfileModal} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
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
                  <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-xl">
                    <div className="relative w-16 h-16 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                      {editPhotoPreviewUrl || editPhotoPath ? (
                        <img
                          src={editPhotoPreviewUrl || `/api/v1/users/${user?.id}/photograph?t=${Date.now()}`}
                          alt={selectedMember.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--bg-card)] flex items-center justify-center font-bold text-lg text-emerald-600 dark:text-emerald-400">
                          {selectedMember.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      {uploadingEditPhoto && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px]">Profile Photograph</span>
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-photo-input"
                        onChange={handleEditPhotoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-photo-input"
                        className="py-1.5 px-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span>Change photo</span>
                      </label>
                    </div>
                  </div>

                  {/* Own Information Form Fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Full Name</span>
                        {isCurrentUserAdmin ? (
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:ring-emerald-500 focus:outline-none"
                          />
                        ) : (
                          <span className="text-white text-xs font-semibold block bg-[var(--bg-main)]/30 border border-[var(--border-color)] px-3 py-2 rounded-lg opacity-70 truncate" title={selectedMember.name}>
                            {selectedMember.name}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Employee ID</span>
                        {isCurrentUserAdmin ? (
                          <input
                            type="text"
                            required
                            value={editEmployeeId}
                            onChange={(e) => setEditEmployeeId(e.target.value)}
                            className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:ring-emerald-500 focus:outline-none font-mono"
                          />
                        ) : (
                          <span className="text-white text-xs font-mono block bg-[var(--bg-main)]/30 border border-[var(--border-color)] px-3 py-2 rounded-lg opacity-70 truncate" title={selectedMember.employeeId || 'Not Set'}>
                            {selectedMember.employeeId || 'Not Set'}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Email Address</span>
                        {isCurrentUserAdmin ? (
                          <input
                            type="email"
                            required
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:ring-emerald-500 focus:outline-none font-mono"
                          />
                        ) : (
                          <span className="text-[var(--text-primary)] text-xs font-mono block bg-[var(--bg-main)]/30 border border-[var(--border-color)] px-3 py-2 rounded-lg opacity-70 truncate" title={selectedMember.email}>
                            {selectedMember.email}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">System Role</span>
                        <span className="text-slate-355 text-xs block bg-[var(--bg-main)]/30 border border-[var(--border-color)] px-3 py-2 rounded-lg capitalize opacity-70 truncate" title={getRoleLabel(selectedMember.role)}>
                          {getRoleLabel(selectedMember.role)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                        <span className="text-slate-355 text-xs block bg-[var(--bg-main)]/30 border border-[var(--border-color)] px-3 py-2 rounded-lg opacity-70 truncate" title={calculateYearsInCompany(selectedMember.joiningDate)}>
                          {calculateYearsInCompany(selectedMember.joiningDate)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1">Contact Phone</label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Update mobile number"
                        className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-card)]/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
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
            ) : (isAdminOrDirectorOrSalesHead || canModifySupervisor(selectedMember)) ? (
              /* EDIT OTHER MEMBER'S PROFILE VIEW (Admins, Directors, Sales Heads only) */
              <form onSubmit={handleSaveMemberDetails}>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {updateMemberError && (
                    <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs font-semibold">
                      {updateMemberError}
                    </div>
                  )}

                  {/* Profile Picture Upload Section */}
                  <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)]/80 rounded-xl">
                    <div className="relative w-16 h-16 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                      {editMemberPhotoPreviewUrl || editMemberForm.photograph ? (
                        <img
                          src={editMemberPhotoPreviewUrl || `/api/v1/users/${selectedMember.id}/photograph?t=${Date.now()}`}
                          alt={editMemberForm.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--bg-card)] flex items-center justify-center font-bold text-lg text-emerald-600 dark:text-emerald-400">
                          {editMemberForm.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      {uploadingEditMemberPhoto && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px]">Profile Photograph</span>
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-member-photo-input"
                        onChange={handleEditMemberPhotoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-member-photo-input"
                        className="py-1.5 px-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span>Change photo</span>
                      </label>
                    </div>
                  </div>

                  {/* Member Form Fields */}
                  <div className="space-y-4">
                    {/* Section: Basic Info */}
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-[var(--bg-card)]" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Basic Information</span>
                      <div className="h-px flex-1 bg-[var(--bg-card)]" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editMemberForm.name}
                          onChange={(e) => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                          className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Employee ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editMemberForm.employeeId}
                          onChange={(e) => setEditMemberForm({ ...editMemberForm, employeeId: e.target.value })}
                          className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={editMemberForm.email}
                          onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                          className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Contact Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editMemberForm.phone}
                          onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                          className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                        />
                      </div>
                    </div>

                    {/* Working Location - highlighted */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Working Location
                      </label>
                      <input
                        type="text"
                        value={editMemberForm.workingLocation}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, workingLocation: e.target.value })}
                        placeholder="e.g. Varanasi HQ, Remote – Delhi, Lucknow Field"
                        className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-emerald-900/30 focus:border-emerald-600/60 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                      />
                      <p className="text-[10px] text-slate-600">Shown in Employee ID lookup search results.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Full Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={editMemberForm.address}
                        onChange={(e) => setEditMemberForm({ ...editMemberForm, address: e.target.value })}
                        placeholder="Complete residential address"
                        className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all resize-none"
                      />
                    </div>

                    {/* Section: Role & Access */}
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-[var(--bg-card)]" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Role & Access</span>
                      <div className="h-px flex-1 bg-[var(--bg-card)]" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Reset Password</label>
                        <input
                          type="password"
                          placeholder="Leave blank to keep current"
                          value={editMemberPassword}
                          onChange={(e) => setEditMemberPassword(e.target.value)}
                          className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                        />
                      </div>
                      {canEditPermissionsAndRole && (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Department</label>
                          <select
                            value={editMemberForm.departmentId}
                            disabled={selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')}
                            onChange={(e) => setEditMemberForm({ ...editMemberForm, departmentId: e.target.value })}
                            className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all disabled:opacity-50"
                          >
                            <option value="">No Department / Shared</option>
                            {departmentsList.map((dept) => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {canEditPermissionsAndRole && (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Designation</label>
                          <input
                            type="text"
                            value={(editMemberForm as any).designationText !== undefined ? (editMemberForm as any).designationText : (selectedMember.designation?.name || '')}
                            onChange={(e) => setEditMemberForm({ ...editMemberForm, designationText: e.target.value } as any)}
                            placeholder="e.g. Sales Executive, Operations Lead"
                            className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Direct Supervisor</label>
                        <select
                          value={editMemberForm.reportsTo}
                          onChange={(e) => setEditMemberForm({ ...editMemberForm, reportsTo: e.target.value })}
                          className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                        >
                          <option value="">No Supervisor (Reports to Admin)</option>
                          {members
                            .filter((sup) => isEligibleSupervisor(sup, editMemberForm.departmentId, selectedMember.id))
                            .map((sup) => (
                              <option key={sup.id} value={sup.id}>
                                {sup.name} {sup.department?.name ? `(${sup.department.name})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Date of Joining <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={editMemberForm.joiningDate}
                          onChange={(e) => setEditMemberForm({ ...editMemberForm, joiningDate: e.target.value })}
                          className="block w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-emerald-600/50 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600/30 transition-all"
                        />
                      </div>
                    </div>

                    {canEditPermissionsAndRole && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="edit-member-active"
                          disabled={selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')}
                          checked={editMemberForm.isActive}
                          onChange={(e) => setEditMemberForm({ ...editMemberForm, isActive: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 dark:text-emerald-400 bg-[var(--bg-main)] border-[var(--border-color)] rounded focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <label htmlFor="edit-member-active" className="text-xs font-bold uppercase text-[var(--text-secondary)] cursor-pointer select-none flex items-center gap-1.5">
                          <span>Account Active Status</span>
                          {(selectedMember?.role === 'admin' || selectedMember?.role?.startsWith('admin:')) && (
                            <span className="text-[10px] text-red-500 font-normal lowercase tracking-normal italic">(Admin cannot be deactivated)</span>
                          )}
                        </label>
                      </div>
                    )}

                  </div>

                  {/* Access Logs */}
                  <div className="border-t border-[var(--border-color)] pt-4 space-y-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Access Logs</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-[var(--bg-main)]/40 border border-[var(--border-color)] rounded-lg">
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Login Session</span>
                        {selectedMember.lastLoginAt ? (
                          <div className="space-y-1">
                            <span className="block text-[var(--text-primary)] text-xs font-mono">
                              {new Date(selectedMember.lastLoginAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-[var(--text-secondary)] italic font-semibold leading-normal">
                              ðŸ“ {selectedMember.loginLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No login recorded</span>
                        )}
                      </div>

                      <div className="p-3 bg-[var(--bg-main)]/40 border border-[var(--border-color)] rounded-lg">
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Logout Session</span>
                        {selectedMember.lastLogoutAt ? (
                          <div className="space-y-1">
                            <span className="block text-[var(--text-primary)] text-xs font-mono">
                              {new Date(selectedMember.lastLogoutAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-[var(--text-secondary)] italic font-semibold leading-normal">
                              ðŸ“ {selectedMember.logoutLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No logout recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-card)]/10 flex justify-between gap-3">
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
                      className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingMember}
                      className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
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
                <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-xl">
                  <div className="w-16 h-16 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                    {selectedMember.photograph ? (
                      <img
                        src={`/api/v1/users/${selectedMember.id}/photograph?t=${Date.now()}`}
                        alt={selectedMember.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--bg-card)] flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] leading-none">{selectedMember.name}</h4>
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
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Employee ID</span>
                        <span className="text-[var(--text-primary)] font-mono">{selectedMember.employeeId || <span className="text-slate-650 italic">None</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Email Address</span>
                        <span className="text-[var(--text-primary)] font-mono">{selectedMember.email}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Contact Number</span>
                        <span className="text-[var(--text-primary)] font-mono">{selectedMember.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Full Address</span>
                        <span className="text-[var(--text-primary)]">{selectedMember.address || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Working Location
                        </span>
                        <span className="text-[var(--text-primary)]">{selectedMember.workingLocation || <span className="text-slate-600 italic text-[10px]">Not set</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Direct Supervisor</span>
                        <span className="text-[var(--text-primary)]">{selectedMember.supervisor?.name || <span className="text-slate-600 italic">None</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Status</span>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${
                          selectedMember.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {selectedMember.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                        <span className="text-[var(--text-primary)]">{calculateYearsInCompany(selectedMember.joiningDate)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Employee ID</span>
                        <span className="text-[var(--text-primary)] font-mono">{selectedMember.employeeId || <span className="text-slate-650 italic">None</span>}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Designation</span>
                        <span className="text-[var(--text-primary)] capitalize">{getRoleLabel(selectedMember.role)}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Working Location
                        </span>
                        <span className="text-[var(--text-primary)]">{selectedMember.workingLocation || <span className="text-slate-600 italic text-[10px]">Not set</span>}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1">Years in Company</span>
                        <span className="text-[var(--text-primary)]">{calculateYearsInCompany(selectedMember.joiningDate)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Activity Timing & Geolocation Logs (Admin, Director, Sales Head only) */}
                {isAdminOrDirectorOrSalesHead && (
                  <div className="border-t border-[var(--border-color)] pt-4 space-y-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Access Logs</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Last Login Info */}
                      <div className="p-3 bg-[var(--bg-main)]/40 border border-[var(--border-color)] rounded-lg">
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Login Session</span>
                        {selectedMember.lastLoginAt ? (
                          <div className="space-y-1">
                            <span className="block text-[var(--text-primary)] text-xs font-mono">
                              {new Date(selectedMember.lastLoginAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-[var(--text-secondary)] italic font-semibold leading-normal">
                              ðŸ“ {selectedMember.loginLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No login recorded</span>
                        )}
                      </div>

                      {/* Last Logout Info */}
                      <div className="p-3 bg-[var(--bg-main)]/40 border border-[var(--border-color)] rounded-lg">
                        <span className="block text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Logout Session</span>
                        {selectedMember.lastLogoutAt ? (
                          <div className="space-y-1">
                            <span className="block text-[var(--text-primary)] text-xs font-mono">
                              {new Date(selectedMember.lastLogoutAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-[var(--text-secondary)] italic font-semibold leading-normal">
                              ðŸ“ {selectedMember.logoutLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No logout recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-card)]/10 flex justify-end gap-3">
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
                    className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] rounded-lg font-bold text-xs shadow-md cursor-pointer"
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
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)]/20 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Activity Audit Logs
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Viewing daily transitions for <span className="text-emerald-600 dark:text-emerald-400 font-bold">{logsMember.name}</span> ({getRoleLabel(logsMember.role)})
                </p>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Date Filter Panel */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[var(--bg-card)]/20 border border-[var(--border-color)] rounded-xl">
                <div>
                  <span className="block text-[var(--text-secondary)] font-semibold text-xs">Select Log Date</span>
                  <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">Audit actions for specific days</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={logsDate}
                    max={getTodayLocalDateStr()}
                    onChange={handleLogsDateChange}
                    className="block w-full sm:w-auto px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => {
                      const today = getTodayLocalDateStr();
                      setLogsDate(today);
                      fetchActivityLogs(logsMember.id, today);
                    }}
                    className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Logs Timeline Display */}
              {logsLoading ? (
                <div className="py-12 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
                  <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Loading activities...</p>
                </div>
              ) : logsList.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-[var(--border-color)] rounded-xl">
                  <p className="text-[var(--text-muted)] text-xs italic">
                    No status transitions or audit logs found for this date.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-[var(--border-color)] pl-6 space-y-6 ml-3">
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
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-[#111625]" />
                        
                        <div className="bg-[var(--bg-main)]/30 border border-[var(--border-color)] rounded-xl p-4 space-y-2 hover:border-[var(--border-color)] transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[10px] text-[var(--text-muted)] font-mono font-bold tracking-wider">{timeStr}</span>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              Lead:{' '}
                              <a
                                href={`/leads/${log.lead.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                              >
                                {log.lead.customerName} (#{log.lead.leadCode})
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-primary)]">
                            {fromStage ? (
                              <>
                                <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 border rounded uppercase tracking-wider ${fromStage.class}`}>
                                  {fromStage.name}
                                </span>
                                <span className="text-[var(--text-muted)] text-[10px]">âž”</span>
                              </>
                            ) : (
                              <span className="text-[var(--text-muted)] italic text-[10px]">New Lead Created</span>
                            )}
                            {toStage && (
                              <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 border rounded uppercase tracking-wider ${toStage.class}`}>
                                  {toStage.name}
                              </span>
                            )}
                          </div>

                          {log.remark && (
                            <div className="text-[11px] bg-[var(--bg-main)]/60 border border-[var(--border-color)] px-3 py-2 rounded-lg text-[var(--text-secondary)] leading-relaxed font-mono">
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

            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-card)]/10 flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] rounded-lg font-bold text-xs shadow-md cursor-pointer"
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
          <div className="w-full max-w-5xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh] animate-fade-in-up">
            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)]/20 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Organization Hierarchy & Custom Designations</h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">Configure hierarchy levels, designate departments, and view the visual reporting structure.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowHierarchyModal(false)} className="text-[var(--text-secondary)] hover:text-white cursor-pointer border border-transparent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-4 border-b border-[var(--border-color)]/60 pb-1">
                <button
                  type="button"
                  onClick={() => setModalTab('designations')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    modalTab === 'designations' ? 'border-b-2 border-emerald-500 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Designations & Levels
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('orgTree')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    modalTab === 'orgTree' ? 'border-b-2 border-emerald-500 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Visual Org Tree ðŸŒ³
                </button>
              </div>
            </div>

            {modalTab === 'designations' ? (
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Simplified Org Hierarchy Tree */}
                <div className="lg:col-span-3 bg-[var(--bg-main)]/40 p-5 border border-[var(--border-color)] rounded-xl space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="border-b border-[var(--border-color)]/80 pb-3 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Designation Tiers & Reporting</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {designationsViewMode === 'level' 
                          ? 'Designations grouped by reporting authority level (Level 0 to Level 6).' 
                          : 'Designations grouped by department and sorted by hierarchy.'}
                      </p>
                    </div>
                    {/* View Switcher Toggle */}
                    <div className="flex bg-[var(--bg-main)]/60 border border-[var(--border-color)] p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setDesignationsViewMode('level')}
                        className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                          designationsViewMode === 'level' ? 'bg-emerald-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        Group By Level
                      </button>
                      <button
                        type="button"
                        onClick={() => setDesignationsViewMode('department')}
                        className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                          designationsViewMode === 'department' ? 'bg-emerald-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        Group By Dept
                      </button>
                    </div>
                  </div>

                  {designationsViewMode === 'level' ? (
                    <div className="space-y-3.5">
                      {[
                        { level: 0, label: 'Level 0: Admin ðŸ‘‘', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                        { level: 1, label: 'Level 1: Department Heads ðŸ‘”', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                        { level: 2, label: 'Level 2: Senior Managers ðŸ“ˆ', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                        { level: 3, label: 'Level 3: Managers ðŸ¢', color: 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' },
                        { level: 4, label: 'Level 4: Team Leaders (TL) ðŸ‘¥', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                        { level: 5, label: 'Level 5: Consultants ðŸ› ï¸', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                        { level: 6, label: 'Level 6: PSA Consultants ðŸ“ž', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                      ].map((levelItem) => {
                        const levelDesigs = designationsList.filter(d => d.level === levelItem.level);
                        return (
                          <div key={levelItem.level} className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center border rounded-xl p-3.5 transition-all hover:bg-[var(--bg-card)]/40 ${levelItem.color}`}>
                            <div className="w-full sm:w-44 shrink-0">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider block">{levelItem.label}</span>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-2">
                              {levelDesigs.length === 0 ? (
                                <span className="text-[10px] text-[var(--text-muted)] italic">No designations at this level</span>
                              ) : (
                                levelDesigs.map(d => {
                                  const deptName = departmentsList.find(dept => dept.id === d.departmentId)?.name || 'Shared';
                                  return (
                                    <span key={d.id} className="text-[10px] bg-[var(--bg-main)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] font-semibold flex items-center gap-1.5 shadow-sm">
                                      <span>{d.name}</span>
                                      <span className="text-[8px] bg-[var(--bg-card)] text-[var(--text-secondary)] px-1 rounded uppercase font-bold">{deptName}</span>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {[
                        { id: null, name: 'Shared / General Admin ðŸŒ', color: 'border-red-500/20 text-red-400 bg-red-500/5' },
                        ...departmentsList.map(dept => {
                          const deptColors: { [key: string]: string } = {
                            'sales': 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
                            'finance': 'border-purple-500/20 text-purple-400 bg-purple-500/5',
                            'operations': 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
                            'it': 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5',
                          };
                          return {
                            id: dept.id,
                            name: `${dept.name} Department ðŸ¢`,
                            color: deptColors[dept.name.toLowerCase().trim()] || 'border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-card)]/10'
                          };
                        })
                      ].map((deptItem) => {
                        const deptDesigs = designationsList.filter(d => d.departmentId === deptItem.id)
                          .sort((a, b) => a.level - b.level);

                        return (
                          <div key={deptItem.id ?? 'shared'} className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center border rounded-xl p-3.5 transition-all hover:bg-[var(--bg-card)]/40 ${deptItem.color}`}>
                            <div className="w-full sm:w-44 shrink-0">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider block">{deptItem.name}</span>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-2">
                              {deptDesigs.length === 0 ? (
                                <span className="text-[10px] text-[var(--text-muted)] italic">No designations in this department</span>
                              ) : (
                                deptDesigs.map(d => {
                                  return (
                                    <span key={d.id} className="text-[10px] bg-[var(--bg-main)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] font-semibold flex items-center gap-1.5 shadow-sm">
                                      <span>{d.name}</span>
                                      <span className="text-[8px] bg-[var(--bg-card)] text-emerald-600 dark:text-emerald-400 px-1 rounded font-extrabold uppercase tracking-wider">Level {d.level}</span>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Management Form and List */}
                <div className="lg:col-span-2 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Form */}
                  <div className="bg-[var(--bg-card)]/20 p-4 border border-[var(--border-color)] rounded-xl">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-color)] pb-2 mb-4">
                      {editingDesignation ? 'Edit Designation Details' : 'Create Custom Designation'}
                    </h4>

                    <form onSubmit={editingDesignation ? handleUpdateDesignation : handleCreateDesignation} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Designation Name *</label>
                        <input
                          type="text"
                          required
                          value={designationName}
                          onChange={(e) => setDesignationName(e.target.value)}
                          placeholder="e.g. Regional Manager, Senior Advisor"
                          className="block w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Reporting Level *</label>
                        <select
                          value={designationLevel}
                          onChange={(e) => setDesignationLevel(Number(e.target.value))}
                          className="block w-full px-3 py-2 bg-slate-955 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:ring-emerald-500 focus:outline-none"
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
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Department Affiliation</label>
                        <select
                          value={designationDeptId}
                          onChange={(e) => setDesignationDeptId(e.target.value)}
                          className="block w-full px-3 py-2 bg-slate-955 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="">Shared / No Department</option>
                          {departmentsList.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Designation default permissions panel */}
                      <div className="border-t border-[var(--border-color)]/80 pt-3 space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                            Default Custom Access Toggles
                          </label>
                          <p className="text-[9px] text-[var(--text-muted)]">
                            Configure the default permissions granted to anyone holding this designation.
                          </p>
                        </div>

                        {/* Categories header bar */}
                        <div className="flex flex-wrap gap-1 border-b border-[var(--border-color)] pb-1">
                          {[
                            { key: 'PSA', label: 'Pre-Sales', icon: Phone },
                            { key: 'Sales', label: 'Sales', icon: LineChart },
                            { key: 'Finance', label: 'Finance', icon: DollarSign },
                            { key: 'Operations', label: 'Operations', icon: Hammer },
                            { key: 'IT', label: 'IT & System Admin', icon: Terminal },
                          ].map((cat) => {
                            const isActive = selectedDesignationPermissionCategory === cat.key;
                            const Icon = cat.icon;
                            return (
                              <button
                                key={cat.key}
                                type="button"
                                onClick={() => setSelectedDesignationPermissionCategory(cat.key)}
                                className={`flex items-center gap-1 px-2 py-1 border rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-extrabold'
                                    : 'bg-transparent border-transparent text-slate-450 hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Icon className="w-3 h-3" />
                                <span>{cat.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* List of checkboxes/switches inside selected category */}
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {ALL_PERMISSIONS.filter(p => p.category === selectedDesignationPermissionCategory).map((perm) => {
                            const isChecked = perm.category === 'IT'
                              ? ALL_PERMISSIONS.filter(p => p.category === 'IT').every(p => designationPermissions.includes(p.key))
                              : designationPermissions.includes(perm.key);
                            
                            return (
                              <label 
                                key={perm.key} 
                                className={`flex items-start gap-2.5 p-2 rounded-lg border select-none cursor-pointer transition-all duration-200 ${
                                  isChecked 
                                    ? 'bg-emerald-600/[0.01] border-emerald-500/25 shadow-sm shadow-emerald-500/[0.04]'
                                    : 'bg-[var(--bg-main)]/20 border-[var(--border-color)] hover:border-[var(--border-color)] hover:bg-[var(--bg-card)]/10'
                                }`}
                              >
                                {/* Switch toggle */}
                                <div className="relative shrink-0 mt-0.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (perm.category === 'IT') {
                                        const itKeys = ALL_PERMISSIONS.filter(p => p.category === 'IT').map(p => p.key);
                                        if (isChecked) {
                                          setDesignationPermissions(designationPermissions.filter(k => !itKeys.includes(k)));
                                        } else {
                                          const otherKeys = designationPermissions.filter(k => !itKeys.includes(k));
                                          setDesignationPermissions([...otherKeys, ...itKeys]);
                                        }
                                      } else {
                                        if (isChecked) {
                                          setDesignationPermissions(designationPermissions.filter(k => k !== perm.key));
                                        } else {
                                          setDesignationPermissions([...designationPermissions, perm.key]);
                                        }
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-7 h-4 rounded-full transition-colors duration-200 ease-in-out ${
                                    isChecked 
                                      ? 'bg-emerald-600' 
                                      : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                                  }`} />
                                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                                    isChecked ? 'translate-x-3' : 'translate-x-0'
                                  }`} />
                                </div>

                                <div className="flex flex-col min-w-0">
                                  <span className={`text-[10px] font-bold tracking-wide transition-colors ${isChecked ? 'text-white' : 'text-slate-350'}`}>
                                    {perm.label}
                                  </span>
                                  <span className="text-[8px] text-[var(--text-muted)] leading-snug">
                                    {perm.description}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
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
                              setDesignationPermissions([]);

                            }}
                            className="py-1.5 px-3 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg font-bold text-xs"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          {editingDesignation ? 'Save Designation' : 'Create Designation'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* List Table */}
                  <div className="bg-[var(--bg-card)]/20 p-4 border border-[var(--border-color)] rounded-xl">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-color)] pb-2 mb-3">All Designations</h4>
                    <div className="max-h-[30vh] overflow-y-auto divide-y divide-slate-850">
                      {designationsList.map(d => {
                        const deptName = departmentsList.find(dept => dept.id === d.departmentId)?.name || 'Shared';
                        return (
                          <div key={d.id} className="py-2.5 flex justify-between items-center gap-4 text-xs">
                            <div>
                              <p className="font-bold text-[var(--text-primary)]">{d.name}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-medium">Level {d.level} • Department: {deptName}</p>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDesignation(d);
                                  setDesignationName(d.name);
                                  setDesignationLevel(d.level);
                                  setDesignationDeptId(d.departmentId ? String(d.departmentId) : '');
                                  setDesignationPermissions(d.permissions ? d.permissions.split(',').map((p: any) => p.trim()) : []);

                                }}
                                className="p-1 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-emerald-600 dark:text-emerald-400 transition-all border border-transparent cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDesignation(d.id)}
                                className="p-1 rounded bg-[var(--bg-card)] hover:bg-rose-955/20 text-[var(--text-secondary)] hover:text-rose-500 transition-all border border-transparent cursor-pointer"
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
            ) : (() => {
              const desigRoots = buildDesignationHierarchyTree(designationsList, departmentsList);

              const handleNodeEdit = (nodeItem: DesignationTreeNode) => {
                const fullDesig = designationsList.find(d => d.id === nodeItem.id);
                if (fullDesig) {
                  setEditingDesignation(fullDesig);
                  setDesignationName(fullDesig.name);
                  setDesignationLevel(fullDesig.level);
                  setDesignationDeptId(fullDesig.departmentId ? String(fullDesig.departmentId) : '');
                  setDesignationPermissions(fullDesig.permissions ? (typeof fullDesig.permissions === 'string' ? fullDesig.permissions.split(',').map((p: any) => p.trim()) : fullDesig.permissions) : []);
                  setModalTab('designations');
                }
              };

              const desigTreeContent = (
                <div className={isDesigTreeFullScreen ? "fixed inset-0 z-[9999] bg-[var(--bg-main)] p-6 flex flex-col space-y-6 overflow-hidden animate-fade-in" : "p-6 flex-1 flex flex-col space-y-4 min-h-[60vh] overflow-hidden bg-[var(--bg-main)]/20 border-t border-[var(--border-color)]"}>
                  {/* Controls Panel */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)]/60 border border-[var(--border-color)] p-4 rounded-xl shadow-xl">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Visual Designation Hierarchy Tree</h4>
                      <p className="text-[10px] text-[var(--text-secondary)]">Interactive visual tree representing the company designations and reporting flow. Click a node to edit.</p>
                    </div>

                    {/* Zoom & Fullscreen Controls */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mr-1">Zoom: {Math.round(desigTreeScale * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => setDesigTreeScale(prev => Math.max(0.5, parseFloat((prev - 0.1).toFixed(1))))}
                        className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer transition-all hover:bg-[var(--bg-card)]"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDesigTreeScale(1);
                          setDesigPan({ x: 0, y: 0 });
                        }}
                        className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer transition-all hover:bg-[var(--bg-card)]"
                        title="Reset View"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDesigTreeScale(prev => Math.min(1.5, parseFloat((prev + 0.1).toFixed(1))))}
                        className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer transition-all hover:bg-[var(--bg-card)]"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-6 bg-[var(--bg-card)] mx-1" />
                      <button
                        type="button"
                        onClick={() => setIsDesigTreeFullScreen(!isDesigTreeFullScreen)}
                        className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] cursor-pointer transition-all hover:bg-[var(--bg-card)]"
                        title={isDesigTreeFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                      >
                        {isDesigTreeFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Panning Canvas Area */}
                  <div 
                    ref={desigCanvasRef}
                    onMouseDown={handleDesigMouseDown}
                    onTouchStart={handleDesigTouchStart}
                    className={`relative overflow-hidden p-8 border border-[var(--border-color)]/60 rounded-2xl bg-[var(--bg-main)]/20 backdrop-blur-md shadow-2xl flex-1 ${
                      isDesigTreeFullScreen ? 'h-full max-h-none' : 'max-h-[60vh] min-h-[45vh]'
                    } ${
                      isDesigDraggingCanvas ? 'cursor-grabbing select-none' : 'cursor-grab'
                    }`}
                  >
                    {desigRoots.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                        <SlidersHorizontal className="w-12 h-12 text-slate-650" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Designations Created</h3>
                        <p className="text-xs text-slate-450 max-w-sm">
                          Ensure you have defined designations with appropriate levels.
                        </p>
                      </div>
                    ) : (
                      <div className="animate-fade-in-up w-max mx-auto h-full flex items-center justify-center">
                        <div 
                          className={`origin-top ${isDesigDraggingCanvas ? '' : 'transition-transform duration-300 ease-out'}`}
                          style={{ transform: `translate(${desigPan.x}px, ${desigPan.y}px) scale(${desigTreeScale})`, transformOrigin: 'top center' }}
                        >
                          <div className="flex gap-12 justify-center min-w-max mx-auto">
                            {desigRoots.map((rootNode) => (
                              <div key={rootNode.id} className="flex flex-col items-center">
                                <DesignationTreeNodeComponent
                                  node={rootNode}
                                  onEdit={handleNodeEdit}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );

              if (isDesigTreeFullScreen && isMounted) {
                return createPortal(desigTreeContent, document.body);
              }
              return desigTreeContent;
            })()}

            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-card)]/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHierarchyModal(false)}
                className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-color)] text-[var(--text-primary)] rounded-lg font-bold text-xs shadow-md cursor-pointer"
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
          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
          className="w-full px-3 py-2 bg-[var(--bg-main)] border border-slate-805 rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="">Reports directly to Head</option>
          {myTeam.users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name} ({u.designation?.name || u.role})</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1 border border-transparent"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add to Clan</span>
      </button>
    </form>
  );
};
