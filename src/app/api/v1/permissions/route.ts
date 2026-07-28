import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentPermissions = await getUserPermissions(authUser.id);
    const hasAdminPerm = currentPermissions.includes('admin:manage_permissions') || currentPermissions.includes('permissions:manage') || ['admin', 'director'].includes(authUser.role);

    if (!hasAdminPerm) {
      return NextResponse.json({ success: false, error: 'Access denied: Requires Permission Management access' }, { status: 403 });
    }

    const dbPermissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }]
    });

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        permissions: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true, level: true } }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        allPermissions: ALL_PERMISSIONS,
        dbPermissions,
        users
      }
    });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentPermissions = await getUserPermissions(authUser.id);
    const hasAdminPerm = currentPermissions.includes('admin:manage_permissions') || currentPermissions.includes('permissions:manage') || ['admin', 'director'].includes(authUser.role);

    if (!hasAdminPerm) {
      return NextResponse.json({ success: false, error: 'Access denied: Cannot assign permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, permissions } = body;

    if (!targetUserId || !Array.isArray(permissions)) {
      return NextResponse.json({ success: false, error: 'targetUserId and permissions array are required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(targetUserId) },
      select: { id: true, name: true, employeeId: true, permissions: true }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 });
    }

    const oldPermissions = targetUser.permissions || '';
    const newPermissionsStr = permissions.join(',');

    const updatedUser = await prisma.user.update({
      where: { id: Number(targetUserId) },
      data: { permissions: newPermissionsStr },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true
      }
    });

    // Record Immutable Audit Log
    await recordAuditLog({
      userId: authUser.id,
      tableName: 'User',
      recordId: targetUser.id,
      fieldName: 'permissions',
      oldValue: oldPermissions,
      newValue: newPermissionsStr,
      module: 'admin',
      action: `Updated Access Levels for employee ${targetUser.name} (${targetUser.employeeId || targetUser.id})`,
      req
    });

    return NextResponse.json({
      success: true,
      message: `Permissions updated successfully for ${targetUser.name}`,
      data: { user: updatedUser }
    });
  } catch (error: any) {
    console.error('Error updating permissions:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
