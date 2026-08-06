import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);

    const isAdmin = userRole === 'admin' || userRole?.startsWith('admin:') || userRole === 'director';
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden. Downloading attendance details is restricted to Administrators.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    // Compute days in the specified month
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // 1. Fetch holidays in this month range
    const startOfMonthDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonthDate = new Date(year, month, 0, 23, 59, 59, 999);

    const holidaysList = await prisma.gazettedHoliday.findMany({
      where: {
        date: {
          gte: startOfMonthDate,
          lte: endOfMonthDate,
        },
      },
    });
    const holidayDatesSet = new Set(
      holidaysList.map((h) => new Date(h.date).toISOString().split('T')[0])
    );

    // 2. Fetch active employees
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        employeeId: true,
        role: true,
        workingLocation: true,
        designation: {
          select: { name: true },
        },
        department: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 3. Fetch attendance records in this month range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfMonthDate,
          lte: endOfMonthDate,
        },
      },
    });

    // Map attendance by userId_date string (formatted as YYYY-MM-DD)
    const attendanceMap = new Map<string, any>();
    attendanceRecords.forEach((rec) => {
      const recDateStr = new Date(rec.date).toISOString().split('T')[0];
      attendanceMap.set(`${rec.userId}_${recDateStr}`, rec);
    });

    const todayStr = new Date().toISOString().split('T')[0];

    // Build Register rows
    const registerRows = allUsers.map((emp) => {
      const dayStatuses: Record<number, string> = {};
      let totalWorkingDays = 0;
      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let holidayDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Sunday

        const isSunday = dayOfWeek === 0;
        const isHoliday = holidayDatesSet.has(dateStr);
        const rec = attendanceMap.get(`${emp.id}_${dateStr}`);

        if (isSunday) {
          dayStatuses[day] = 'SUN';
          holidayDays++;
        } else if (isHoliday) {
          dayStatuses[day] = 'H';
          holidayDays++;
        } else {
          totalWorkingDays++;
          if (rec) {
            if (rec.status === 'present') {
              dayStatuses[day] = 'P';
              presentDays++;
            } else if (rec.status === 'half_day') {
              dayStatuses[day] = 'HD';
              halfDays++;
            } else if (rec.status === 'leave') {
              dayStatuses[day] = 'L';
              absentDays++;
            } else {
              dayStatuses[day] = 'A';
              absentDays++;
            }
          } else {
            // Past working day with no checkin -> Absent
            if (dateStr <= todayStr) {
              dayStatuses[day] = 'A';
              absentDays++;
            } else {
              dayStatuses[day] = '-';
            }
          }
        }
      }

      const totalEffectivePresent = presentDays + halfDays * 0.5;

      return {
        userId: emp.id,
        employeeId: emp.employeeId || 'N/A',
        name: emp.name,
        designation: emp.designation?.name || emp.role.toUpperCase(),
        department: emp.department?.name || 'General',
        workingLocation: emp.workingLocation || 'Main Office',
        dayStatuses,
        totalWorkingDays,
        presentDays,
        halfDays,
        absentDays,
        holidayDays,
        totalEffectivePresent,
      };
    });

    if (format === 'csv') {
      // Build CSV output formatted like an Attendance Register Matrix
      const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
      let csv = `Santori Solar Solutions - Monthly Attendance Register (${monthName} ${year})\n\n`;

      // Header row
      const headers = ['Employee ID', 'Full Name', 'Designation', 'Working Location'];
      for (let day = 1; day <= daysInMonth; day++) {
        headers.push(`Day ${day}`);
      }
      headers.push('Total Working Days', 'Present Days', 'Half Days', 'Absent / Leaves', 'Effective Present');

      csv += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

      registerRows.forEach((row) => {
        const line = [
          row.employeeId,
          row.name,
          row.designation,
          row.workingLocation,
        ];

        for (let day = 1; day <= daysInMonth; day++) {
          line.push(row.dayStatuses[day] || '-');
        }

        line.push(
          String(row.totalWorkingDays),
          String(row.presentDays),
          String(row.halfDays),
          String(row.absentDays),
          String(row.totalEffectivePresent)
        );

        csv += line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Attendance_Register_${monthName}_${year}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        month,
        year,
        daysInMonth,
        registerRows,
      },
    });
  } catch (error: any) {
    console.error('Monthly attendance report error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
