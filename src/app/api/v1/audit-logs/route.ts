import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: loggedInRole, department: loggedInUserDept, permissions: userPermissions } = await getUserSession(userPayload.id);
    const loggedInBaseRole = loggedInRole.includes(':') ? loggedInRole.split(':')[0] : loggedInRole;
    const isEditingUserAdmin = loggedInBaseRole === 'admin' || loggedInBaseRole === 'director';
    const isEditingUserIT = loggedInUserDept?.name === 'IT';
    const hasAnalyticsPerm = userPermissions.includes('admin:view_analytics') || userPermissions.includes('reports:view') || userPermissions.includes('logs:view');

    if (!isEditingUserAdmin && !isEditingUserIT && !hasAnalyticsPerm) {
      return NextResponse.json({ success: false, message: 'Forbidden. Access restricted to authorized personnel.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const searchUser = url.searchParams.get('searchUser');
    const tableName = url.searchParams.get('tableName');
    const moduleFilter = url.searchParams.get('module');
    const action = url.searchParams.get('action');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const skip = (page - 1) * limit;
    const where: any = {};

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate),
      };
    }
    if (tableName) {
      where.tableName = { equals: tableName, mode: 'insensitive' };
    }
    if (moduleFilter) {
      where.module = { equals: moduleFilter, mode: 'insensitive' };
    }
    if (action) {
      where.OR = [
        { action: { contains: action, mode: 'insensitive' } },
        { fieldName: { contains: action, mode: 'insensitive' } },
      ];
    }
    if (searchUser) {
      where.OR = [
        { employeeName: { contains: searchUser, mode: 'insensitive' } },
        { employeeCode: { contains: searchUser, mode: 'insensitive' } },
        { user: { name: { contains: searchUser, mode: 'insensitive' } } },
        { user: { email: { contains: searchUser, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeId: true,
              role: true,
              department: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (err: any) {
    console.error('Fetch audit logs error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: err.message } },
      { status: 500 }
    );
  }
}

