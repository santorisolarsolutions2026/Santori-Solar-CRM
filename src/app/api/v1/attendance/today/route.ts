import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

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

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    const attendanceModel = getAttendanceModel();

    // 1. Auto-close any unclosed past days' attendance for this user
    await attendanceModel.updateMany({
      where: {
        userId: userPayload.id,
        date: { lt: todayDate },
        checkOut: null,
      },
      data: {
        status: 'half_day',
        notes: 'Auto-closed: Missed check-out on previous day.',
      },
    }).catch(() => {});

    // 2. Fetch today's record
    let record = await attendanceModel.findFirst({
      where: {
        userId: userPayload.id,
        date: todayDate,
      },
    });

    // 3. If checked in today but missed 08:30 PM deadline, auto-close it
    if (record && !record.checkOut) {
      const istFormatted = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).format(now);
      const [hoursStr, minutesStr] = istFormatted.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      const totalMinutesOfDay = hours * 60 + minutes;

      if (totalMinutesOfDay > 1230) {
        // Past 08:30 PM (1230 mins): Auto-close capped between 10:00 AM and 07:30 PM
        const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
        const windowStart = new Date(`${dateStr}T10:00:00+05:30`).getTime();
        const windowEnd = new Date(`${dateStr}T19:30:00+05:30`).getTime();

        const checkInTime = new Date(record.checkIn).getTime();
        const autoCheckOutTime = new Date(`${dateStr}T19:30:00+05:30`);

        const effectiveStart = Math.max(checkInTime, windowStart);
        const effectiveEnd = Math.min(autoCheckOutTime.getTime(), windowEnd);
        const workDurationMin = effectiveEnd > effectiveStart
          ? Math.round((effectiveEnd - effectiveStart) / (1000 * 60))
          : 1;

        // Arrival > 10:15 AM check
        const checkInIstFormatted = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        }).format(new Date(record.checkIn));
        const [ciHoursStr, ciMinsStr] = checkInIstFormatted.split(':');
        const checkInMinutesOfDay = parseInt(ciHoursStr, 10) * 60 + parseInt(ciMinsStr, 10);
        const isLateHalfDayArrival = checkInMinutesOfDay > 615 || record.status === 'half_day';

        // Count missed check-outs for current month to determine warning vs penalty
        const istYear = parseInt(dateStr.split('-')[0], 10);
        const istMonth = parseInt(dateStr.split('-')[1], 10);
        const startOfMonth = new Date(`${istYear}-${String(istMonth).padStart(2, '0')}-01T00:00:00.000Z`);

        const prevMissedCount = await attendanceModel.count({
          where: {
            userId: userPayload.id,
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
            finalAutoStatus = workDurationMin >= 270 ? 'half_day' : 'absent';
          } else {
            if (workDurationMin >= 540) {
              finalAutoStatus = 'completed';
            } else if (workDurationMin >= 270) {
              finalAutoStatus = 'half_day';
            } else {
              finalAutoStatus = 'absent';
            }
          }
          autoNote = `Auto-closed: Missed 08:30 PM check-out deadline (Warning ${warnNum}/3).`;
        } else {
          // 4th time and above: Half Day penalty
          finalAutoStatus = workDurationMin >= 270 ? 'half_day' : 'absent';
          autoNote = 'Auto-closed: Missed 08:30 PM check-out deadline (4th+ time: Half Day penalty applied).';
        }

        const newNotes = record.notes ? `${record.notes} | ${autoNote}` : autoNote;

        record = await attendanceModel.update({
          where: { id: record.id },
          data: {
            checkOut: autoCheckOutTime,
            checkOutLocation: record.checkInLocation || 'Office / Web Portal',
            workDurationMin,
            status: finalAutoStatus,
            notes: newNotes,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: record || null,
    });
  } catch (error: any) {
    console.error('Fetch today attendance error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
