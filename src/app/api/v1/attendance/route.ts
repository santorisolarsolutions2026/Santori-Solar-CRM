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
    const hasAttendancePerm = userPermissions.some(p => [
      'attendance:view',
      'sales:attendance_view',
      'finance:attendance_view',
      'ops:attendance_view'
    ].includes(p));

    const isSelfQuery = scope === 'personal' || (targetUserIdStr && parseInt(targetUserIdStr, 10) === userPayload.id);

    if (!isAdmin && !isSelfQuery && !hasAttendancePerm) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden. You do not have permission to view team attendance records.'
      }, { status: 403 });
    }

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

    // Global Auto-close: Check all unclosed records across the organization
    const now = new Date();
    const istDateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const todayDate = new Date(`${istDateParts}T00:00:00.000Z`);

    const istFormatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).format(now);
    const [hoursStr, minutesStr] = istFormatted.split(':');
    const totalMinutesOfDay = parseInt(hoursStr, 10) * 60 + parseInt(minutesStr, 10);

    // 1. Auto-close unclosed records from past days
    const unclosedPast = await attendanceModel.findMany({
      where: {
        date: { lt: todayDate },
        checkOut: null,
      },
    });

    for (const rec of unclosedPast) {
      const recDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(rec.date));
      const windowStart = new Date(`${recDateStr}T10:00:00+05:30`).getTime();
      const windowEnd = new Date(`${recDateStr}T19:30:00+05:30`).getTime();
      const autoOut = new Date(`${recDateStr}T19:30:00+05:30`);

      const checkInTime = new Date(rec.checkIn).getTime();
      const effectiveStart = Math.max(checkInTime, windowStart);
      const effectiveEnd = Math.min(autoOut.getTime(), windowEnd);
      const durationMin = effectiveEnd > effectiveStart
        ? Math.round((effectiveEnd - effectiveStart) / (1000 * 60))
        : 1;

      const autoNote = 'Auto-closed: Missed check-out on previous day.';
      await attendanceModel.update({
        where: { id: rec.id },
        data: {
          checkOut: autoOut,
          checkOutLocation: rec.checkInLocation || 'Office / Web Portal',
          workDurationMin: durationMin,
          status: 'half_day',
          notes: rec.notes ? `${rec.notes} | ${autoNote}` : autoNote,
        },
      }).catch(() => {});
    }

    // 2. If past 08:30 PM (1230 mins), auto-close all unclosed records for today
    if (totalMinutesOfDay > 1230) {
      const unclosedToday = await attendanceModel.findMany({
        where: {
          date: todayDate,
          checkOut: null,
        },
      });

      const windowStart = new Date(`${istDateParts}T10:00:00+05:30`).getTime();
      const windowEnd = new Date(`${istDateParts}T19:30:00+05:30`).getTime();
      const autoCheckOutTime = new Date(`${istDateParts}T19:30:00+05:30`);

      const istYear = parseInt(istDateParts.split('-')[0], 10);
      const istMonth = parseInt(istDateParts.split('-')[1], 10);
      const startOfMonth = new Date(`${istYear}-${String(istMonth).padStart(2, '0')}-01T00:00:00.000Z`);

      for (const rec of unclosedToday) {
        const checkInTime = new Date(rec.checkIn).getTime();
        const effectiveStart = Math.max(checkInTime, windowStart);
        const effectiveEnd = Math.min(autoCheckOutTime.getTime(), windowEnd);
        const durationMin = effectiveEnd > effectiveStart
          ? Math.round((effectiveEnd - effectiveStart) / (1000 * 60))
          : 1;

        // Arrival > 10:15 AM check
        const checkInIstFormatted = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        }).format(new Date(rec.checkIn));
        const [ciHoursStr, ciMinsStr] = checkInIstFormatted.split(':');
        const checkInMinutesOfDay = parseInt(ciHoursStr, 10) * 60 + parseInt(ciMinsStr, 10);
        const isLateHalfDayArrival = checkInMinutesOfDay > 615 || rec.status === 'half_day';

        const prevMissedCount = await attendanceModel.count({
          where: {
            userId: rec.userId,
            date: { gte: startOfMonth, lt: todayDate },
            notes: { contains: 'Auto-closed' },
          },
        }).catch(() => 0);

        let finalAutoStatus = 'absent';
        let autoNote = '';

        if (prevMissedCount < 3) {
          // Warning 1, 2, or 3
          const warnNum = prevMissedCount + 1;
          if (isLateHalfDayArrival) {
            finalAutoStatus = durationMin >= 270 ? 'half_day' : 'absent';
          } else {
            if (durationMin >= 540) {
              finalAutoStatus = 'completed';
            } else if (durationMin >= 270) {
              finalAutoStatus = 'half_day';
            } else {
              finalAutoStatus = 'absent';
            }
          }
          autoNote = `Auto-closed: Missed 08:30 PM check-out deadline (Warning ${warnNum}/3).`;
        } else {
          // 4th time and above: Half Day penalty
          finalAutoStatus = durationMin >= 270 ? 'half_day' : 'absent';
          autoNote = 'Auto-closed: Missed 08:30 PM check-out deadline (4th+ time: Half Day penalty applied).';
        }

        await attendanceModel.update({
          where: { id: rec.id },
          data: {
            checkOut: autoCheckOutTime,
            checkOutLocation: rec.checkInLocation || 'Office / Web Portal',
            workDurationMin: durationMin,
            status: finalAutoStatus,
            notes: rec.notes ? `${rec.notes} | ${autoNote}` : autoNote,
          },
        }).catch(() => {});
      }
    }

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
            lastSeenAt: true,
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
          lastSeenAt: true,
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
