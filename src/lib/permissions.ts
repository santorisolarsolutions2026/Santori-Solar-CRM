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
    // Lead Capture & Pipeline
    { key: 'sales:lead_add', label: 'Add New Lead', group: 'Lead Capture & Pipeline', description: 'Create and register new customer leads manually.' },
    { key: 'sales:lead_edit', label: 'Edit Customer Lead Info', group: 'Lead Capture & Pipeline', description: 'Modify customer name, contact details, load capacity & address.' },
    { key: 'sales:lead_import', label: 'Import Bulk Leads', group: 'Lead Capture & Pipeline', description: 'Upload CSV/Excel spreadsheets to import leads.' },
    { key: 'sales:lead_assign', label: 'Assign the leads', group: 'Lead Capture & Pipeline', description: 'Assign or reassign leads to department members.' },
    { key: 'sales:lead_delete', label: 'Delete Customer Leads', group: 'Lead Capture & Pipeline', description: 'Permanently remove or delete customer leads from the system.' },
    { key: 'sales:lead_view_all', label: 'View All System Leads', group: 'Lead Capture & Pipeline', description: 'Access all company leads bypassing hierarchy restriction.' },

    // Calling & Meetings
    { key: 'sales:stage_change', label: 'Change Calling & Lead Stages', group: 'Calling & Customer Meetings', description: 'Update lead calling stages and follow-up status.' },
    { key: 'sales:meeting_book', label: 'Book Customer Meeting', group: 'Calling & Customer Meetings', description: 'Schedule site visits and executive meetings.' },
    { key: 'sales:meeting_done', label: 'Mark Meeting Done & Audio', group: 'Calling & Customer Meetings', description: 'Complete meetings, log audio recordings & locations.' },
    { key: 'sales:lead_track', label: 'Track Lead Audit Journey', group: 'Calling & Customer Meetings', description: 'Inspect detailed lead history and status change logs.' },

    // Orders & Handoff
    { key: 'sales:order_punch', label: 'Fill Order Punching Form', group: 'Order Punching & Handoff', description: 'Punch system size, valuation, and payment terms.' },
    { key: 'sales:finance_assign', label: 'Assign Finance Member', group: 'Order Punching & Handoff', description: 'Hand over punched orders to Finance team members.' },

    // Supervision & Analytics
    { key: 'sales:designation_change', label: 'Change Subordinate Designations', group: 'Supervision & Analytics', description: 'Modify designations of team members below in hierarchy.' },
    { key: 'sales:attendance_view', label: 'View Subordinate Attendance', group: 'Supervision & Analytics', description: 'Inspect check-in/out logs for sales team members.' },
    { key: 'sales:analytics_view', label: 'View Sales Team Analytics', group: 'Supervision & Analytics', description: 'Access sales performance charts and reporting.' },
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


