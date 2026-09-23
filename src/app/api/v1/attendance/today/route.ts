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

    // 3. If checked in today but missed 07:30 PM deadline, auto-close it
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

      if (totalMinutesOfDay > 1170) {
        // Past 07:30 PM: Auto-close capped between 10:00 AM and 07:30 PM
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

        const autoNote = 'Auto-closed: Missed 07:30 PM check-out deadline.';
        const newNotes = record.notes ? `${record.notes} | ${autoNote}` : autoNote;

        const finalAutoStatus = workDurationMin >= 270 ? 'half_day' : 'absent';

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
