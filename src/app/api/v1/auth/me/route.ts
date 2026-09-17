import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, resolveUserPermissions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      const res = NextResponse.json(
        { success: false, message: 'Unauthorized.' },
        { status: 401 }
      );
      res.headers.append(
        'Set-Cookie',
        'token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      );
      return res;
    }

    if (userPayload.sessionToken) {
      const activeSession = await prisma.userSession.findUnique({
        where: { sessionToken: userPayload.sessionToken },
        select: { id: true },
      });

      if (!activeSession) {
        const res = NextResponse.json(
          { success: false, message: 'Session terminated or expired.' },
          { status: 401 }
        );
        res.headers.append(
          'Set-Cookie',
          'token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        );
        return res;
      }
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
        designation: { select: { id: true, name: true, level: true, permissions: true } }
      },
    });

    if (!user || !user.isActive) {
      const res = NextResponse.json(
        { success: false, message: 'User not found or deactivated.' },
        { status: 401 }
      );
      res.headers.append(
        'Set-Cookie',
        'token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      );
      return res;
    }

    const permissionsList = resolveUserPermissions(user);

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
