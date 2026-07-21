import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

function getAttendanceModel() {
  const model = (prisma as any).attendance;
  if (!model) {
    throw new Error('Attendance model is not initialized on Prisma client yet. Please restart Next.js server.');
  }
  return model;
}

async function getSubordinateIds(userId: number): Promise<number[]> {
  const subordinates: number[] = [];
  const queue = [userId];
  const visited = new Set<number>([userId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const directSubordinates = await prisma.user.findMany({
      where: { reportsTo: currentId },
      select: { id: true }
    });
    for (const sub of directSubordinates) {
      if (!visited.has(sub.id)) {
        visited.add(sub.id);
        subordinates.push(sub.id);
        queue.push(sub.id);
      }
    }
  }
  return subordinates;
}

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const targetUserIdStr = searchParams.get('user_id');
    const scope = searchParams.get('scope') || 'team'; // team | personal
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const currentUserDetail = await prisma.user.findUnique({
      where: { id: userPayload.id },
      include: { department: true }
    });
    const isITDept = currentUserDetail?.department?.name?.toLowerCase().trim() === 'it';
    const isAdmin = userPayload.role === 'admin' || userPayload.role?.startsWith('admin:') || isITDept;

    const userPermissions = await getUserPermissions(userPayload.id);
    const subordinateIds = isAdmin ? [] : await getSubordinateIds(userPayload.id);
    const allowedUserIds = isAdmin ? [] : [userPayload.id, ...subordinateIds];

    const hasViewAll = userPermissions.includes('team:view') || 
                       ['admin', 'director', 'sales_head', 'manager', 'tl', 'psa_tl'].includes(userPayload.role) || 
                       isITDept || 
                       subordinateIds.length > 0;

    const where: Prisma.AttendanceWhereInput = {};

    if (scope === 'personal') {
      where.userId = userPayload.id;
    } else if (targetUserIdStr) {
      const targetId = parseInt(targetUserIdStr, 10);
      if (!isNaN(targetId)) {
        if (!isAdmin && !allowedUserIds.includes(targetId)) {
          return NextResponse.json({
            success: false,
            message: 'Forbidden. You can only view attendance for yourself and your subordinates.'
          }, { status: 403 });
        }
        where.userId = targetId;
      }
    } else {
      if (!hasViewAll) {
        where.userId = userPayload.id;
      } else {
        if (!isAdmin) {
          where.userId = { in: allowedUserIds };
        }
      }
    }

    if (dateParam) {
      const d = new Date(`${dateParam}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) {
        where.date = d;
      }
    } else if (monthParam && yearParam) {
      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10);
      if (!isNaN(year) && !isNaN(month)) {
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        where.date = {
          gte: start,
          lt: end
        };
      }
    }

    const attendanceModel = getAttendanceModel();
    const records = await attendanceModel.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { checkIn: 'desc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeId: true,
            photograph: true,
            loginLocation: true,
          },
        },
      },
    });

    let teamRoster: any[] = [];
    if (hasViewAll && scope === 'team') {
      const activeUsersWhere: Prisma.UserWhereInput = { isActive: true };
      if (!isAdmin) {
        activeUsersWhere.id = { in: subordinateIds };
      }
      
      const activeUsers = await prisma.user.findMany({
        where: activeUsersWhere,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeId: true,
          photograph: true,
          loginLocation: true,
        },
        orderBy: { name: 'asc' },
      });

      const attendanceMap = new Map((records as any[]).map(r => [r.userId, r]));
      teamRoster = activeUsers.map(u => {
        const att = attendanceMap.get(u.id);
        return {
          user: u,
          attendance: att || null,
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        records,
        teamRoster,
      },
    });
  } catch (error: any) {
    console.error('Fetch attendance list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
