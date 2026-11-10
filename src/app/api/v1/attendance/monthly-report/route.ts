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
      let sandwichDays = 0;
      let lateDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); // 1 = Monday (Santori Weekly Off)

        const isMonday = dayOfWeek === 1;
        const isHoliday = holidayDatesSet.has(dateStr);
        const rec = attendanceMap.get(`${emp.id}_${dateStr}`);

        if (isMonday) {
          dayStatuses[day] = 'MON';
          holidayDays++;
        } else if (isHoliday) {
          dayStatuses[day] = 'H';
          holidayDays++;
        } else {
          totalWorkingDays++;
          if (rec) {
            const isLateMark = rec.status === 'late' || (rec.notes && rec.notes.includes('between 10:06 AM - 10:15 AM'));
            if (isLateMark) {
              lateDays++;
            }

            if (rec.status === 'present' || rec.status === 'completed') {
              dayStatuses[day] = isLateMark ? 'P(L)' : 'P';
              presentDays++;
            } else if (rec.status === 'half_day') {
              dayStatuses[day] = 'HD';
              halfDays++;
            } else if (rec.status === 'leave') {
              dayStatuses[day] = 'L';
              absentDays++;
            } else if (rec.status === 'late' || rec.status === 'checked_in') {
              dayStatuses[day] = isLateMark ? 'P(L)' : 'P';
              presentDays++;
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

      // Apply HR Sandwich Policy:
      // If a Monday or Holiday block has Absent/Leave on the preceding working day AND succeeding working day,
      // the enclosed holiday/Monday days convert into Sandwich Absent (penalty).
      let d = 1;
      while (d <= daysInMonth) {
        if (dayStatuses[d] === 'MON' || dayStatuses[d] === 'H') {
          const spanStart = d;
          while (d <= daysInMonth && (dayStatuses[d] === 'MON' || dayStatuses[d] === 'H')) {
            d++;
          }
          const spanEnd = d - 1;

          // Check working day before and after the holiday span
          const prevStatus = spanStart > 1 ? dayStatuses[spanStart - 1] : null;
          const nextStatus = spanEnd < daysInMonth ? dayStatuses[spanEnd + 1] : null;

          const isPrevAbsent = prevStatus === 'A' || prevStatus === 'L' || prevStatus === 'A(S)';
          const isNextAbsent = nextStatus === 'A' || nextStatus === 'L';

          if (isPrevAbsent && isNextAbsent) {
            for (let s = spanStart; s <= spanEnd; s++) {
              dayStatuses[s] = 'A(S)';
              absentDays++;
              holidayDays--;
              sandwichDays++;
            }
          }
        } else {
          d++;
        }
      }

      // Apply 3 Late Marks = 1 Half Day (-0.5) deduction
      const lateDeduction = Math.floor(lateDays / 3) * 0.5;
      const totalEffectivePresent = Math.max(0, parseFloat((presentDays + halfDays * 0.5 - lateDeduction).toFixed(2)));

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
        lateDays,
        lateDeduction,
        absentDays,
        holidayDays,
        sandwichDays,
        totalEffectivePresent,
      };
    });

    if (format === 'csv') {
      const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
      let csv = `Santori Solar Solutions - Monthly Attendance Register (${monthName} ${year})\n\n`;

      // --- SECTION 1: VERTICAL ATTENDANCE COUNTING (EMPLOYEE-WISE) ---
      csv += `"=== SECTION 1: EMPLOYEE-WISE ATTENDANCE COUNTING (SUMMARY) ==="\n`;
      const summaryHeader = ['Metric / Field', ...registerRows.map((r) => `${r.name} (${r.employeeId})`)];
      csv += summaryHeader.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

      const empIdRow = ['Employee ID', ...registerRows.map((r) => r.employeeId)];
      const desigRow = ['Designation', ...registerRows.map((r) => r.designation)];
      const locRow = ['Working Location', ...registerRows.map((r) => r.workingLocation)];
      const totalWorkRow = ['Total Working Days', ...registerRows.map((r) => String(r.totalWorkingDays))];
      const presentRow = ['Present Days (Full Days)', ...registerRows.map((r) => String(r.presentDays))];
      const halfDaysRow = ['Half Days', ...registerRows.map((r) => String(r.halfDays))];
      const lateMarksRow = ['Late Marks (10:06-10:15)', ...registerRows.map((r) => String(r.lateDays || 0))];
      const lateDeductRow = ['Late Penalty Deduction', ...registerRows.map((r) => `-${r.lateDeduction || 0} days`)];
      const absentRow = ['Absent / Leaves', ...registerRows.map((r) => String(r.absentDays))];
      const sandwichRow = ['Sandwich Leaves (Monday Penalty)', ...registerRows.map((r) => String(r.sandwichDays || 0))];
      const effectiveRow = ['FINAL EFFECTIVE ATTENDANCE', ...registerRows.map((r) => String(r.totalEffectivePresent))];

      [empIdRow, desigRow, locRow, totalWorkRow, presentRow, halfDaysRow, lateMarksRow, lateDeductRow, absentRow, sandwichRow, effectiveRow].forEach((rowArr) => {
        csv += rowArr.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      // --- SECTION 2: VERTICAL DAILY ATTENDANCE (DAY 1 TO DAY N) ---
      csv += `\n"=== SECTION 2: DAILY ATTENDANCE REGISTER (DAY 1 TO DAY ${daysInMonth}) ==="\n`;
      const dailyHeaders = ['Date', 'Day of Week', ...registerRows.map((r) => `${r.name} (${r.employeeId})`)];
      csv += dailyHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dayRow = [`Day ${day} (${dateStr})`, weekdayStr];

        registerRows.forEach((r) => {
          dayRow.push(r.dayStatuses[day] || '-');
        });

        csv += dayRow.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
      }

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
