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

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { location, notes } = body;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    const attendanceModel = getAttendanceModel();

    const existing = await attendanceModel.findFirst({
      where: {
        userId: userPayload.id,
        date: todayDate,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'No check-in record found for today. Please check in first.' },
        { status: 400 }
      );
    }

    if (existing.checkOut) {
      return NextResponse.json(
        { success: false, message: 'You have already checked out for today.' },
        { status: 400 }
      );
    }

    // IST Timezone calculations
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

    // Strict 07:30 PM (1170 mins) Lock
    if (totalMinutesOfDay > 1170) {
      return NextResponse.json(
        { success: false, message: 'Check-out deadline was 07:30 PM. Manual check-out is now closed. Please contact Admin.' },
        { status: 400 }
      );
    }

    // Calculate checkIn IST minutes of the day to determine if check-in occurred in Half Day window (after 10:45 AM)
    const checkInIstFormatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).format(new Date(existing.checkIn));
    const [ciHoursStr, ciMinsStr] = checkInIstFormatted.split(':');
    const checkInMinutesOfDay = parseInt(ciHoursStr, 10) * 60 + parseInt(ciMinsStr, 10);
    const isLateHalfDayArrival = checkInMinutesOfDay > 645 || existing.status === 'half_day';

    // Effective work duration capped strictly between 10:00 AM and 07:30 PM IST
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const windowStart = new Date(`${dateStr}T10:00:00+05:30`).getTime();
    const windowEnd = new Date(`${dateStr}T19:30:00+05:30`).getTime();

    const actualStart = new Date(existing.checkIn).getTime();
    const actualEnd = now.getTime();

    const effectiveStart = Math.max(actualStart, windowStart);
    const effectiveEnd = Math.min(actualEnd, windowEnd);
    const workDurationMin = effectiveEnd > effectiveStart
      ? Math.round((effectiveEnd - effectiveStart) / (1000 * 60))
      : 1;

    let finalStatus = 'completed';
    let autoNotes = '';

    if (isLateHalfDayArrival) {
      // Arrived after 10:45 AM: Capped at Half Day regardless of hours worked
      if (workDurationMin >= 270) {
        finalStatus = 'half_day';
        autoNotes = 'Late check-in (after 10:45 AM). Maintained as Half Day.';
      } else {
        finalStatus = 'absent';
        autoNotes = 'Worked less than 4h 30m. Marked as Absent.';
      }
    } else {
      // Arrived on time (09:30-10:15) or with late mark (10:16-10:45)
      if (workDurationMin >= 510) {
        // 8 Hours 30 Mins or more
        finalStatus = 'completed';
        autoNotes = 'Completed full workday (≥ 8h 30m)';
      } else if (workDurationMin >= 270) {
        // 4 Hours 30 Mins to 8 Hours 29 Mins
        finalStatus = 'half_day';
        autoNotes = 'Worked between 4h 30m and 8h 29m. Marked as Half Day.';
      } else {
        // Less than 4 Hours 30 Mins
        finalStatus = 'absent';
        autoNotes = 'Worked less than 4h 30m. Marked as Absent.';
      }
    }

    const newNotes = notes
      ? (existing.notes ? `${existing.notes} | ${notes}` : notes)
      : (existing.notes ? (autoNotes ? `${existing.notes} | ${autoNotes}` : existing.notes) : (autoNotes || undefined));

    const updated = await attendanceModel.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        checkOutLocation: location || 'Office / Web Portal',
        workDurationMin,
        status: finalStatus,
        notes: newNotes,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Checked out successfully! Total work time: ${Math.floor(workDurationMin / 60)}h ${workDurationMin % 60}m.`,
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
