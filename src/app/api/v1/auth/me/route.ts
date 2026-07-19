import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getDefaultPermissionsForRole } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        role: true,
        permissions: true,
        reportsTo: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        joiningDate: true,
        photograph: true,
        departmentId: true,
        teamId: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true, level: true } }
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'User not found or deactivated.' },
        { status: 401 }
      );
    }

    const baseRole = user.role.includes(':') ? user.role.split(':')[0] : user.role;
    const permissionsList = baseRole === 'admin' || baseRole === 'director' || user.department?.name === 'IT'
      ? getDefaultPermissionsForRole('admin')
      : user.permissions && user.permissions.trim()
        ? user.permissions.split(',').map((p: string) => p.trim())
        : getDefaultPermissionsForRole(user.role);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          permissions: permissionsList
        }
      },
    });
  } catch (error: any) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
