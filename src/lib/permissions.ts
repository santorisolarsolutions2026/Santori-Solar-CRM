export interface PermissionItem {
  key: string;
  label: string;
  group: string;
  description: string;
}

export const ALL_PERMISSIONS: {
  sales: PermissionItem[];
  finance: PermissionItem[];
  operations: PermissionItem[];
  admin: PermissionItem[];
} = {
  sales: [
    { key: 'sales:add_lead', label: '1. Add New Lead', group: 'Sales Pipeline', description: 'Create and register new customer leads manually.' },
    { key: 'sales:import_bulk_leads', label: '2. Import Bulk Leads', group: 'Sales Pipeline', description: 'Upload CSV/Excel spreadsheets to import bulk leads.' },
    { key: 'sales:assign_leads', label: '3. Assign Leads', group: 'Sales Pipeline', description: 'Assign or reassign leads to subordinate team members.' },
    { key: 'sales:view_all_leads', label: '4. View All Leads', group: 'Sales Pipeline', description: 'Access all company leads bypassing hierarchy restriction.' },
    { key: 'sales:edit_lead', label: '5. Edit Lead Details', group: 'Sales Pipeline', description: 'Modify customer contact details, load capacity & address.' },
    { key: 'sales:change_pipeline_stage', label: '6. Change Pipeline Stages', group: 'Calling & Meetings', description: 'Update lead calling stage and schedule meetings.' },
    { key: 'sales:record_meeting', label: '7. Record Meetings', group: 'Calling & Meetings', description: 'Log meeting outcome, GPS location, and audio recording.' },
    { key: 'sales:fill_order_form', label: '8. Fill Order Punching Form & Submit', group: 'Order Handoff', description: 'Punch system size, valuation, payment terms and handoff to Finance.' },
    { key: 'sales:view_track_journey', label: '9. View Track Journey', group: 'Audit & Tracking', description: 'View complete timestamped journey timeline of a lead.' },
  ],
  finance: [
    { key: 'finance:view_all_orders', label: '1. View All Orders', group: 'Finance Handoff', description: 'Access and view all pending submitted orders in Finance.' },
    { key: 'finance:assign_orders', label: '2. Assign Orders', group: 'Finance Handoff', description: 'Assign order verifications to subordinate finance employees.' },
    { key: 'finance:verify_orders', label: '3. Verify Orders', group: 'Finance Verification', description: 'Verify or reject down-payments and submitted orders.' },
    { key: 'finance:maintain_ledgers', label: '4. Maintain Ledgers', group: 'Ledger & Payments', description: 'Add, edit, delete payment ledger transactions and history.' },
  ],
  operations: [
    { key: 'operations:view_all_orders', label: '1. View All Orders', group: 'Operations Pipeline', description: 'Access and view all verified orders in Operations.' },
    { key: 'operations:assign_orders', label: '2. Assign Orders', group: 'Operations Pipeline', description: 'Assign operations execution to subordinate team members.' },
    { key: 'operations:manage_stages', label: '3. Manage Operations Stages', group: 'Operations Execution', description: 'Progress configurable operations stages (Site Visit, Installation, etc.).' },
  ],
  admin: [
    { key: 'admin:view_attendance', label: '1. View Attendance', group: 'Administration', description: 'Inspect check-in/out logs for subordinate employees.' },
    { key: 'admin:change_subordinate_designation', label: '2. Change Subordinate Designation', group: 'Administration', description: 'Modify titles and designations of subordinate team members.' },
    { key: 'admin:view_analytics', label: '3. View Team Analytics', group: 'Administration', description: 'Access audit logs, employee performance, and company reports.' },
    { key: 'admin:manage_permissions', label: '4. Manage Permissions', group: 'Administration', description: 'Grant or revoke custom permissions for any employee.' },
  ]
};

// Legacy compatibility alias
export const DEPARTMENT_PERMISSIONS = {
  sales: ALL_PERMISSIONS.sales,
  finance: ALL_PERMISSIONS.finance,
  ops: ALL_PERMISSIONS.operations
};

export interface LeadAssigneeUser {
  id: number;
  name: string;
  role?: string | null;
}

export interface LeadAssignmentTarget {
  assignedManagerId?: number | null;
  assignedTlId?: number | null;
  assignedConsultantId?: number | null;
  manager?: LeadAssigneeUser | null;
  tl?: LeadAssigneeUser | null;
  consultant?: LeadAssigneeUser | null;
}

export interface CurrentUserTarget {
  id: number;
  role?: string | null;
}

export function getLeadAssignedDisplay(
  lead: LeadAssignmentTarget | null | undefined,
  currentUser: CurrentUserTarget | null | undefined
): LeadAssigneeUser | null {
  if (!lead) return null;

  const currentUserId = currentUser?.id;
  const roleLower = (currentUser?.role || '').toLowerCase().trim();

  if (currentUserId) {
    if (lead.assignedConsultantId && currentUserId === lead.assignedConsultantId) {
      return lead.consultant || lead.tl || lead.manager || null;
    }
    if (lead.assignedTlId && currentUserId === lead.assignedTlId) {
      return lead.consultant || lead.tl || lead.manager || null;
    }
    if (lead.assignedManagerId && currentUserId === lead.assignedManagerId) {
      return lead.tl || lead.consultant || lead.manager || null;
    }
  }

  if (['consultant', 'psa'].includes(roleLower)) {
    return lead.consultant || lead.tl || lead.manager || null;
  }
  if (['tl', 'psa_tl'].includes(roleLower)) {
    return lead.consultant || lead.tl || lead.manager || null;
  }
  if (['manager', 'sales_head'].includes(roleLower)) {
    return lead.tl || lead.consultant || lead.manager || null;
  }

  return lead.manager || lead.tl || lead.consultant || null;
}

export function getDefaultPermissionsForRole(role: string): string[] {
  const baseRole = role.includes(':') ? role.split(':')[0] : role;
  switch (baseRole) {
    case 'admin':
    case 'director':
    case 'it':
      return [
        'sales:add_lead', 'sales:import_bulk_leads', 'sales:assign_leads', 'sales:view_all_leads',
        'sales:edit_lead', 'sales:change_pipeline_stage', 'sales:record_meeting', 'sales:fill_order_form', 'sales:view_track_journey',
        'finance:view_all_orders', 'finance:assign_orders', 'finance:verify_orders', 'finance:maintain_ledgers',
        'operations:view_all_orders', 'operations:assign_orders', 'operations:manage_stages',
        'admin:view_attendance', 'admin:change_subordinate_designation', 'admin:view_analytics', 'admin:manage_permissions'
      ];
    default:
      return [
        'sales:add_lead', 'sales:view_track_journey'
      ];
  }
}




