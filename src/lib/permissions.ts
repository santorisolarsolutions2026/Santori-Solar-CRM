export interface PermissionItem {
  key: string;
  label: string;
  group: string;
  description: string;
}

export const DEPARTMENT_PERMISSIONS: {
  sales: PermissionItem[];
  finance: PermissionItem[];
  ops: PermissionItem[];
} = {
  sales: [
    { key: 'sales:lead_add', label: 'Add New Lead', group: 'Sales Chronological Workflow', description: '1. Create and register new customer leads manually into Uninitiated status.' },
    { key: 'sales:lead_import', label: 'Import Bulk Leads', group: 'Sales Chronological Workflow', description: '2. Upload CSV/Excel spreadsheets to import bulk leads.' },
    { key: 'sales:lead_assign', label: 'Assign Leads', group: 'Sales Chronological Workflow', description: '3. Assign or reassign leads to team members below hierarchy.' },
    { key: 'sales:lead_view_all', label: 'View All Leads', group: 'Sales Chronological Workflow', description: '4. View all system leads bypassing assignee restrictions.' },
    { key: 'sales:lead_edit', label: 'Edit Lead Details', group: 'Sales Chronological Workflow', description: '5. Modify customer name, contact details, load capacity & address.' },
    { key: 'sales:stage_change', label: 'Change Pipeline Stages', group: 'Sales Chronological Workflow', description: '6. Change lead calling stages and book customer meetings.' },
    { key: 'sales:meeting_done', label: 'Record Meetings', group: 'Sales Chronological Workflow', description: '7. Record meeting audio, GPS location, and outcome (Sale Done, Follow Up, Not Interested).' },
    { key: 'sales:order_punch', label: 'Fill Order Punching Form & Submit', group: 'Sales Chronological Workflow', description: '8. Fill complete order punching form upon Sale Done and submit to Finance.' },
    { key: 'sales:lead_track', label: 'View Track Journey', group: 'Sales Chronological Workflow', description: '9. Inspect full timestamped audit timeline for lead progression.' },
  ],
  finance: [
    // Verification & Assignment
    { key: 'finance:order_verify_reject', label: 'Verify & Reject Submitted Orders', group: 'Order Verification & Handoff', description: 'Approve or reject down-payments and submitted orders.' },
    { key: 'finance:order_assign', label: 'Assign Orders in Finance', group: 'Order Verification & Handoff', description: 'Assign finance orders to department executives.' },
    { key: 'finance:ops_assign', label: 'Assign Operations Member', group: 'Order Verification & Handoff', description: 'Hand over verified orders to Operations for installation.' },

    // Ledger & Payments
    { key: 'finance:ledger_record', label: 'Record Ledger Payments & Slips', group: 'Ledger & Payments', description: 'Add payment receipts, transaction reference numbers.' },
    { key: 'finance:ledger_delete', label: 'Delete Ledger Payment Entries', group: 'Ledger & Payments', description: 'Remove or discard invalid payment ledger records.' },

    // Supervision & Analytics
    { key: 'finance:designation_change', label: 'Change Subordinate Designations', group: 'Supervision & Analytics', description: 'Modify designations of finance team members.' },
    { key: 'finance:attendance_view', label: 'View Subordinate Attendance', group: 'Supervision & Analytics', description: 'Inspect attendance logs for finance staff.' },
    { key: 'finance:analytics_view', label: 'View Financial Reports & Audits', group: 'Supervision & Analytics', description: 'Access cash flow, audit logs, and financial stats.' },
  ],
  ops: [
    // Fulfillment & Execution
    { key: 'ops:delivery_manage', label: 'Manage Material Dispatch & Delivery', group: 'Fulfillment & Installation', description: 'Log equipment dispatch dates and delivery status.' },
    { key: 'ops:delivered_orders', label: 'Show Delivered Orders', group: 'Fulfillment & Installation', description: 'Access and view delivered orders in operations pipeline.' },
    { key: 'ops:installation_manage', label: 'Manage Installation & Site Photos', group: 'Fulfillment & Installation', description: 'Log installation progress and upload site pictures.' },
    { key: 'ops:meter_manage', label: 'Manage Net Metering & DISCOM', group: 'Fulfillment & Installation', description: 'Track bi-directional meter installation & DISCOM paperwork.' },
    { key: 'ops:commission_manage', label: 'Manage Plant Commissioning', group: 'Fulfillment & Installation', description: 'Mark solar plant commissioning and grid synchronization.' },
    { key: 'ops:subsidy_manage', label: 'Manage Subsidy Applications', group: 'Fulfillment & Installation', description: 'Process government solar subsidy documentation.' },

    // Supervision & Analytics
    { key: 'ops:designation_change', label: 'Change Subordinate Designations', group: 'Supervision & Analytics', description: 'Modify designations of operations team members.' },
    { key: 'ops:attendance_view', label: 'View Subordinate Attendance', group: 'Supervision & Analytics', description: 'Inspect attendance logs for field & ops staff.' },
    { key: 'ops:analytics_view', label: 'View Operations Analytics', group: 'Supervision & Analytics', description: 'Access project completion metrics and timelines.' },
  ]
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

/**
 * Returns the single assignee to display for a lead based on the viewer's position in the hierarchy.
 * - Manager sees the TL they assigned to (or Manager if unassigned down).
 * - TL sees the Consultant they assigned to (or TL if unassigned down).
 * - Consultant sees the Consultant.
 * - Admin/Director (who allotted to Manager) sees the Manager.
 */
export function getLeadAssignedDisplay(
  lead: LeadAssignmentTarget | null | undefined,
  currentUser: CurrentUserTarget | null | undefined
): LeadAssigneeUser | null {
  if (!lead) return null;

  const currentUserId = currentUser?.id;
  const roleLower = (currentUser?.role || '').toLowerCase().trim();

  // 1. Direct ID matches
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

  // 2. Role-based fallback
  if (['consultant', 'psa'].includes(roleLower)) {
    return lead.consultant || lead.tl || lead.manager || null;
  }
  if (['tl', 'psa_tl'].includes(roleLower)) {
    return lead.consultant || lead.tl || lead.manager || null;
  }
  if (['manager', 'sales_head'].includes(roleLower)) {
    return lead.tl || lead.consultant || lead.manager || null;
  }

  // 3. Top-level / Admin / Director / IT / Default fallback:
  return lead.manager || lead.tl || lead.consultant || null;
}

export function getDefaultPermissionsForRole(role: string): string[] {
  const baseRole = role.includes(':') ? role.split(':')[0] : role;
  switch (baseRole) {
    case 'admin':
    case 'director':
    case 'it':
      return [
        'sales:lead_add', 'sales:lead_import', 'sales:lead_assign', 'sales:lead_view_all', 'sales:stage_change', 'sales:designation_change', 'sales:attendance_view', 'sales:lead_track', 'sales:analytics_view', 'sales:order_punch', 'sales:meeting_book', 'sales:meeting_done', 'sales:finance_assign',
        'finance:order_verify_reject', 'finance:order_assign', 'finance:ledger_record', 'finance:ledger_delete', 'finance:designation_change', 'finance:attendance_view', 'finance:analytics_view', 'finance:ops_assign',
        'ops:delivery_manage', 'ops:delivered_orders', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:designation_change', 'ops:attendance_view', 'ops:analytics_view', 'ops:subsidy_manage',
        'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:track',
        'orders:create', 'orders:submit_installation', 'leads:view_sales_pipeline',
        'orders:finance_access', 'orders:verify', 'finance:manage_ledger', 'reports:view_financials',
        'orders:operations', 'ops:update_stages', 'ops:upload_drawings',
        'team:view', 'attendance:view', 'team:manage', 'logs:view', 'leads:view_all', 'leads:delete', 'permissions:manage'
      ];
    case 'sales_head':
    case 'manager':
    case 'tl':
    case 'psa_tl':
    case 'consultant':
    case 'psa':
      return [
        'sales:lead_add', 'sales:lead_assign', 'sales:designation_change', 'sales:attendance_view', 'sales:analytics_view', 'sales:order_punch', 'sales:meeting_book', 'sales:meeting_done', 'sales:finance_assign',
        'leads:create', 'leads:edit', 'orders:create', 'leads:view_sales_pipeline', 'team:view', 'attendance:view'
      ];
    case 'finance':
      return [
        'finance:order_verify_reject', 'finance:order_assign', 'finance:ledger_record', 'finance:ledger_delete', 'finance:designation_change', 'finance:attendance_view', 'finance:analytics_view', 'finance:ops_assign',
        'orders:finance_access', 'orders:verify', 'finance:manage_ledger', 'reports:view_financials', 'team:view', 'attendance:view'
      ];
    case 'operations':
      return [
        'ops:delivery_manage', 'ops:delivered_orders', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:designation_change', 'ops:attendance_view', 'ops:analytics_view', 'ops:subsidy_manage',
        'orders:operations', 'ops:update_stages', 'ops:upload_drawings', 'team:view', 'attendance:view'
      ];
    default:
      return [
        'sales:lead_add', 'leads:create'
      ];
  }
}



