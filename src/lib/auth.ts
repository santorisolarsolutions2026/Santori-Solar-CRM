import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { DEPARTMENT_PERMISSIONS } from './permissions';

export { DEPARTMENT_PERMISSIONS };

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



export function getDefaultPermissionsForRole(role: string): string[] {
  const baseRole = role.includes(':') ? role.split(':')[0] : role;
  switch (baseRole) {
    case 'admin':
    case 'director':
    case 'it':
      return [
        'sales:lead_add', 'sales:lead_import', 'sales:lead_assign', 'sales:lead_view_all', 'sales:stage_change', 'sales:designation_change', 'sales:attendance_view', 'sales:lead_track', 'sales:analytics_view', 'sales:order_punch', 'sales:meeting_book', 'sales:meeting_done', 'sales:finance_assign',
        'finance:order_verify_reject', 'finance:order_assign', 'finance:ledger_record', 'finance:ledger_delete', 'finance:designation_change', 'finance:attendance_view', 'finance:analytics_view', 'finance:ops_assign',
        'ops:delivery_manage', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:designation_change', 'ops:attendance_view', 'ops:analytics_view', 'ops:subsidy_manage',
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
        'sales:lead_add', 'sales:lead_import', 'sales:lead_assign', 'sales:stage_change', 'sales:designation_change', 'sales:attendance_view', 'sales:lead_track', 'sales:analytics_view', 'sales:order_punch', 'sales:meeting_book', 'sales:meeting_done', 'sales:finance_assign',
        'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:track', 'orders:create', 'leads:view_sales_pipeline', 'team:view', 'attendance:view'
      ];
    case 'finance':
      return [
        'finance:order_verify_reject', 'finance:order_assign', 'finance:ledger_record', 'finance:ledger_delete', 'finance:designation_change', 'finance:attendance_view', 'finance:analytics_view', 'finance:ops_assign',
        'orders:finance_access', 'orders:verify', 'finance:manage_ledger', 'reports:view_financials', 'team:view', 'attendance:view'
      ];
    case 'operations':
      return [
        'ops:delivery_manage', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:designation_change', 'ops:attendance_view', 'ops:analytics_view', 'ops:subsidy_manage',
        'orders:operations', 'ops:update_stages', 'ops:upload_drawings', 'team:view', 'attendance:view'
      ];
    default:
      return [
        'sales:lead_add', 'sales:stage_change', 'sales:lead_track', 'leads:create', 'leads:change_status'
      ];
  }
}

export async function getUserPermissions(userId: number): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissions: true,
      department: { select: { name: true } }
    }
  });
  if (!user) return [];

  const baseRole = user.role.includes(':') ? user.role.split(':')[0] : user.role;
  let basePermissions: string[] = [];

  if (baseRole === 'admin' || baseRole === 'director' || user.department?.name === 'IT') {
    basePermissions = getDefaultPermissionsForRole('admin');
  } else if (user.permissions && user.permissions.startsWith('CUSTOM:')) {
    const permContent = user.permissions.replace('CUSTOM:', '').trim();
    basePermissions = permContent ? permContent.split(',').map(p => p.trim()) : [];
  } else if (user.permissions && user.permissions.trim()) {
    basePermissions = user.permissions.split(',').map(p => p.trim());
  } else {
    basePermissions = getDefaultPermissionsForRole(user.role);
  }

  const finalPermissions = [...basePermissions];

  // Auto-map new custom keys to legacy permissions for seamless backward compatibility
  const mapping: Record<string, string[]> = {
    'sales:lead_add': ['leads:create'],
    'sales:lead_import': ['leads:import'],
    'sales:lead_assign': ['leads:assign'],
    'sales:lead_view_all': ['leads:view_all'],
    'sales:stage_change': ['leads:change_status', 'leads:manage_calling_stages'],
    'sales:designation_change': ['team:change_designation', 'team:manage'],
    'sales:attendance_view': ['attendance:view'],
    'sales:lead_track': ['leads:track'],
    'sales:analytics_view': ['reports:view', 'reports:view_financials'],
    'sales:order_punch': ['orders:create', 'orders:submit_installation'],
    'sales:meeting_book': ['leads:book_meeting', 'leads:change_status'],
    'sales:meeting_done': ['leads:meeting_done', 'leads:change_status'],
    'sales:finance_assign': ['orders:assign_finance'],
    'finance:order_verify_reject': ['orders:verify', 'orders:finance_access'],
    'finance:order_assign': ['orders:assign_finance', 'orders:finance_access'],
    'finance:ledger_record': ['finance:manage_ledger', 'orders:finance_access'],
    'finance:ledger_delete': ['finance:manage_ledger', 'finance:delete_ledger'],
    'finance:designation_change': ['team:change_designation', 'team:manage'],
    'finance:attendance_view': ['attendance:view'],
    'finance:analytics_view': ['reports:view', 'reports:view_financials'],
    'finance:ops_assign': ['orders:assign_ops', 'orders:finance_access'],
    'ops:delivery_manage': ['orders:operations', 'ops:update_stages'],
    'ops:installation_manage': ['orders:operations', 'ops:update_stages'],
    'ops:meter_manage': ['orders:operations', 'ops:update_stages'],
    'ops:commission_manage': ['orders:operations', 'ops:update_stages'],
    'ops:designation_change': ['team:change_designation', 'team:manage'],
    'ops:attendance_view': ['attendance:view'],
    'ops:analytics_view': ['reports:view'],
    'ops:subsidy_manage': ['orders:operations', 'ops:update_stages'],
  };

  for (const [newKey, legacyKeys] of Object.entries(mapping)) {
    if (finalPermissions.includes(newKey)) {
      for (const legacyKey of legacyKeys) {
        if (!finalPermissions.includes(legacyKey)) {
          finalPermissions.push(legacyKey);
        }
      }
    }
  }

  // Implicit page permissions mapping to ensure existing checks ('leads:view', 'orders:view') do not break
  const hasAnyLeadPermission = [
    'sales:lead_add', 'sales:lead_import', 'sales:stage_change', 'sales:lead_view_all', 'sales:lead_track', 'sales:lead_assign',
    'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:view_all', 'leads:track', 'leads:assign'
  ].some(p => finalPermissions.includes(p));

  if (hasAnyLeadPermission && !finalPermissions.includes('leads:view')) {
    finalPermissions.push('leads:view');
  }

  const hasAnyOrderPermission = [
    'sales:order_punch', 'finance:order_verify_reject', 'finance:order_assign', 'finance:ledger_record', 'finance:ops_assign',
    'ops:delivery_manage', 'ops:installation_manage', 'ops:meter_manage', 'ops:commission_manage', 'ops:subsidy_manage',
    'orders:create', 'orders:verify', 'orders:operations', 'orders:finance_access', 'orders:view_all'
  ].some(p => finalPermissions.includes(p));

  if (hasAnyOrderPermission && !finalPermissions.includes('orders:view')) {
    finalPermissions.push('orders:view');
  }

  return finalPermissions;
}

export async function getUserSession(userId: number): Promise<{ role: string; permissions: string[]; department?: { name: string } | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissions: true,
      department: { select: { name: true } }
    }
  });
  if (!user) return { role: '', permissions: [] };

  const baseRole = user.role.includes(':') ? user.role.split(':')[0] : user.role;
  let basePermissions: string[] = [];

  if (baseRole === 'admin' || baseRole === 'director' || user.department?.name === 'IT') {
    basePermissions = getDefaultPermissionsForRole('admin');
  } else {
    basePermissions = user.permissions && user.permissions.trim()
      ? user.permissions.split(',').map(p => p.trim())
      : getDefaultPermissionsForRole(user.role);
  }

  const finalPermissions = [...basePermissions];

  const hasAnyLeadPermission = [
    'leads:create', 'leads:import', 'leads:edit', 'leads:change_status', 'leads:view_all', 'leads:track', 'leads:assign', 'leads:delete', 'leads:view_sales_pipeline'
  ].some(p => finalPermissions.includes(p));

  if (hasAnyLeadPermission && !finalPermissions.includes('leads:view')) {
    finalPermissions.push('leads:view');
  }

  const hasAnyOrderPermission = [
    'orders:create', 'orders:verify', 'orders:operations', 'orders:finance_access', 'orders:view_all', 'orders:submit_installation', 'finance:manage_ledger', 'ops:update_stages', 'ops:upload_drawings',
    'orders:submit_finance', 'orders:assign_finance', 'orders:assign_ops'
  ].some(p => finalPermissions.includes(p));

  if (hasAnyOrderPermission && !finalPermissions.includes('orders:view')) {
    finalPermissions.push('orders:view');
  }

  if (
    (finalPermissions.includes('orders:operations') || 
     finalPermissions.includes('orders:submit_finance') || 
     finalPermissions.includes('orders:assign_finance')) && 
    !finalPermissions.includes('orders:submit_installation')
  ) {
    finalPermissions.push('orders:submit_installation');
  }

  return {
    role: user.role,
    permissions: finalPermissions,
    department: user.department
  };
}
