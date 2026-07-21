import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: loggedInRole, department: loggedInUserDept } = await getUserSession(userPayload.id);
    const loggedInBaseRole = loggedInRole.includes(':') ? loggedInRole.split(':')[0] : loggedInRole;
    const isEditingUserAdmin = loggedInBaseRole === 'admin';
    const isEditingUserIT = loggedInUserDept?.name === 'IT';

    if (!isEditingUserAdmin && !isEditingUserIT) {
      return NextResponse.json({ success: false, message: 'Forbidden. Access restricted to IT and Admins.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const searchUser = url.searchParams.get('searchUser');
    const tableName = url.searchParams.get('tableName');
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
      where.tableName = {
        equals: tableName,
        mode: 'insensitive',
      };
    }
    if (action) {
      where.fieldName = {
        equals: action,
        mode: 'insensitive',
      };
    }
    if (searchUser) {
      where.user = {
        OR: [
          { name: { contains: searchUser, mode: 'insensitive' } },
          { email: { contains: searchUser, mode: 'insensitive' } },
        ]
      };
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
              role: true,
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
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
