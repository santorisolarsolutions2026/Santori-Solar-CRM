import jwt from 'jsonwebtoken';
import { prisma } from './db';

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
  } else {
    basePermissions = user.permissions && user.permissions.trim()
      ? user.permissions.split(',').map(p => p.trim())
      : getDefaultPermissionsForRole(user.role);
  }

  const finalPermissions = [...basePermissions];

  // Implicit page permissions mapping to ensure existing checks ('leads:view', 'orders:view') do not break
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

  // Map 'orders:operations', 'orders:submit_finance', 'orders:assign_finance' to legacy 'orders:submit_installation' check for backwards compatibility
  if (
    (finalPermissions.includes('orders:operations') || 
     finalPermissions.includes('orders:submit_finance') || 
     finalPermissions.includes('orders:assign_finance')) && 
    !finalPermissions.includes('orders:submit_installation')
  ) {
    finalPermissions.push('orders:submit_installation');
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
