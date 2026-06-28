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

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasViewAll = userPermissions.includes('team:view') || ['admin', 'director', 'sales_head', 'manager', 'tl', 'psa_tl'].includes(userPayload.role);

    const where: Prisma.AttendanceWhereInput = {};

    if (scope === 'personal' || !hasViewAll) {
      where.userId = userPayload.id;
    } else if (targetUserIdStr) {
      const targetId = parseInt(targetUserIdStr, 10);
      if (!isNaN(targetId)) {
        where.userId = targetId;
      }
    }

    if (dateParam) {
      const d = new Date(`${dateParam}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) {
        where.date = d;
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

    // Also fetch all active users to show who has NOT checked in today if dateParam or today is requested
    let teamRoster: any[] = [];
    if (hasViewAll && scope === 'team') {
      const activeUsers = await prisma.user.findMany({
        where: { isActive: true },
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
