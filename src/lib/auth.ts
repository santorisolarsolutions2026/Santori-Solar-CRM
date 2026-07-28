import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { DEPARTMENT_PERMISSIONS, getDefaultPermissionsForRole } from './permissions';

export { DEPARTMENT_PERMISSIONS, getDefaultPermissionsForRole };

const JWT_SECRET = process.env.JWT_SECRET || 'solarcrm-super-secret-key-2026';

export interface UserJWTPayload {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function signToken(payload: UserJWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): UserJWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserJWTPayload;
  } catch (error) {
    return null;
  }
}

export function getAuthenticatedUser(req: Request): UserJWTPayload | null {
  try {
    // 1. Check Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload) {
        if (payload.role && payload.role.includes(':')) {
          payload.role = payload.role.split(':')[0];
        }
        return payload;
      }
    }

    // 2. Check Cookie header (token cookie)
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, current) => {
        const [name, value] = current.trim().split('=');
        if (name && value) {
          acc[name] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      if (cookies['token']) {
        const payload = verifyToken(cookies['token']);
        if (payload) {
          if (payload.role && payload.role.includes(':')) {
            payload.role = payload.role.split(':')[0];
          }
          return payload;
        }
      }
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
  return null;
}

// Check permission helper
export function hasPermission(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

export interface UserPermissionsInput {
  role: string;
  permissions?: string | string[] | null;
  department?: { name: string } | null;
  designation?: { permissions?: string | null } | null;
}

export function resolveUserPermissions(user: UserPermissionsInput): string[] {
  if (!user) return [];

  const baseRole = user.role.includes(':') ? user.role.split(':')[0] : user.role;
  let basePermissions: string[] = [];

  if (baseRole === 'admin' || baseRole === 'director' || user.department?.name === 'IT') {
    basePermissions = getDefaultPermissionsForRole('admin');
  } else if (typeof user.permissions === 'string' && user.permissions.trim()) {
    const permString = user.permissions.replace(/^CUSTOM:/, '').trim();
    basePermissions = permString ? permString.split(',').map(p => p.trim()).filter(p => p !== '' && p !== 'none') : [];
  } else if (Array.isArray(user.permissions)) {
    basePermissions = user.permissions.map(p => String(p).replace(/^CUSTOM:/, '').trim()).filter(p => p !== '' && p !== 'none');
  } else {
    basePermissions = getDefaultPermissionsForRole(user.role);
  }

  const finalPermissions = new Set<string>(basePermissions);

  // Bi-directional mapping between new canonical codes and legacy functional keys
  const mapping: Record<string, string[]> = {
    // Sales Access Levels
    'sales:add_lead': ['sales:lead_add', 'leads:create'],
    'sales:lead_add': ['sales:add_lead', 'leads:create'],
    'leads:create': ['sales:add_lead', 'sales:lead_add'],

    'sales:import_bulk_leads': ['sales:lead_import', 'leads:import'],
    'sales:lead_import': ['sales:import_bulk_leads', 'leads:import'],

    'sales:assign_leads': ['sales:lead_assign', 'leads:assign'],
    'sales:lead_assign': ['sales:assign_leads', 'leads:assign'],

    'sales:view_all_leads': ['sales:lead_view_all', 'leads:view_all'],
    'sales:lead_view_all': ['sales:view_all_leads', 'leads:view_all'],

    'sales:edit_lead': ['sales:lead_edit', 'leads:edit'],
    'sales:lead_edit': ['sales:edit_lead', 'leads:edit'],

    'sales:change_pipeline_stage': ['sales:stage_change', 'sales:meeting_book', 'leads:change_status', 'leads:manage_calling_stages'],
    'sales:stage_change': ['sales:change_pipeline_stage', 'leads:change_status'],

    'sales:record_meeting': ['sales:meeting_done', 'leads:meeting_done', 'meetings:complete'],
    'sales:meeting_done': ['sales:record_meeting', 'meetings:complete'],

    'sales:fill_order_form': ['sales:order_punch', 'orders:create', 'orders:submit_installation'],
    'sales:order_punch': ['sales:fill_order_form', 'orders:create'],

    'sales:view_track_journey': ['sales:lead_track', 'sales:lead_details_view', 'leads:track', 'leads:view_details'],
    'sales:lead_track': ['sales:view_track_journey', 'leads:track'],

    // Finance Access Levels
    'finance:view_all_orders': ['orders:finance_access', 'orders:view_all'],
    'finance:assign_orders': ['finance:order_assign', 'orders:assign_finance'],
    'finance:order_assign': ['finance:assign_orders', 'orders:assign_finance'],

    'finance:verify_orders': ['finance:order_verify_reject', 'orders:verify'],
    'finance:order_verify_reject': ['finance:verify_orders', 'orders:verify'],

    'finance:maintain_ledgers': ['finance:ledger_record', 'finance:ledger_delete', 'finance:manage_ledger'],
    'finance:ledger_record': ['finance:maintain_ledgers', 'finance:manage_ledger'],

    // Operations Access Levels
    'operations:view_all_orders': ['ops:delivered_orders', 'orders:operations', 'orders:view_all'],
    'operations:assign_orders': ['finance:ops_assign', 'orders:assign_ops'],
    'operations:manage_stages': ['ops:delivery_manage', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:subsidy_manage', 'ops:update_stages'],
    'ops:update_stages': ['operations:manage_stages'],

    // Administration Access Levels
    'admin:view_attendance': ['sales:attendance_view', 'finance:attendance_view', 'ops:attendance_view', 'attendance:view'],
    'admin:change_subordinate_designation': ['sales:designation_change', 'finance:designation_change', 'ops:designation_change', 'team:change_designation', 'team:manage'],
    'admin:view_analytics': ['sales:analytics_view', 'finance:analytics_view', 'ops:analytics_view', 'reports:view', 'reports:view_financials', 'logs:view'],
    'admin:manage_permissions': ['permissions:manage']
  };

  for (const perm of Array.from(finalPermissions)) {
    const mapped = mapping[perm];
    if (mapped) {
      for (const m of mapped) {
        finalPermissions.add(m);
      }
    }
  }

  // Implicit page level permissions
  const leadPerms = [
    'sales:add_lead', 'sales:import_bulk_leads', 'sales:assign_leads', 'sales:view_all_leads', 'sales:edit_lead', 'sales:change_pipeline_stage', 'sales:record_meeting', 'sales:view_track_journey',
    'sales:lead_add', 'sales:lead_import', 'sales:stage_change', 'sales:lead_view_all', 'sales:lead_track', 'sales:lead_assign',
    'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:view_all', 'leads:track', 'leads:assign', 'leads:view_sales_pipeline'
  ];
  if (leadPerms.some(p => finalPermissions.has(p))) {
    finalPermissions.add('leads:view');
  }

  const orderPerms = [
    'sales:fill_order_form', 'finance:view_all_orders', 'finance:assign_orders', 'finance:verify_orders', 'finance:maintain_ledgers', 'operations:view_all_orders', 'operations:assign_orders', 'operations:manage_stages',
    'sales:order_punch', 'finance:order_verify_reject', 'finance:order_assign', 'finance:ledger_record', 'finance:ops_assign',
    'ops:delivery_manage', 'ops:delivered_orders', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:subsidy_manage'
  ];
  if (orderPerms.some(p => finalPermissions.has(p))) {
    finalPermissions.add('orders:view');
  }

  const reportPerms = [
    'admin:view_analytics', 'sales:analytics_view', 'finance:analytics_view', 'ops:analytics_view', 'reports:view', 'reports:view_financials'
  ];
  if (reportPerms.some(p => finalPermissions.has(p))) {
    finalPermissions.add('reports:view');
  }

  return Array.from(finalPermissions);
}


export async function getUserPermissions(userId: number): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissions: true,
      department: { select: { name: true } },
      designation: { select: { permissions: true } }
    }
  });
  if (!user) return [];
  return resolveUserPermissions(user);
}

export async function getUserSession(userId: number): Promise<{ role: string; permissions: string[]; department?: { name: string } | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissions: true,
      department: { select: { name: true } },
      designation: { select: { permissions: true } }
    }
  });
  if (!user) return { role: '', permissions: [] };

  const finalPermissions = resolveUserPermissions(user);

  return {
    role: user.role,
    permissions: finalPermissions,
    department: user.department
  };
}

