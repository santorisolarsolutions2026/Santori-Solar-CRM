import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { isWithinAttendanceHours, calculateEffectiveWorkDurationMin } from '@/lib/attendance';

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

    const windowCheck = isWithinAttendanceHours();
    if (!windowCheck.allowed) {
      return NextResponse.json(
        { success: false, message: windowCheck.message },
        { status: 400 }
      );
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

    // Effective work duration strictly within 10:00 AM to 7:00 PM IST window
    const workDurationMin = calculateEffectiveWorkDurationMin(existing.checkIn, now);

    const istDateString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istDateString);
    const hours = istDate.getHours();
    const isEarlyCheckOut = hours < 19;

    let finalStatus = 'completed';
    let autoNotes = '';

    if (existing.status === 'absent') {
      finalStatus = 'absent';
    } else if (existing.status === 'half_day') {
      finalStatus = 'half_day';
    } else if (isEarlyCheckOut) {
      finalStatus = 'half_day';
      autoNotes = 'Early check-out (before 7:00 PM). Marked as Half Day.';
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

    let successMsg = `Checked out successfully! Total work time: ${Math.floor(workDurationMin / 60)}h ${workDurationMin % 60}m.`;
    if (finalStatus === 'half_day') {
      if (isEarlyCheckOut) {
        successMsg = `Checked out before 7:00 PM (Marked as Half Day ⚠️). Total work time: ${Math.floor(workDurationMin / 60)}h ${workDurationMin % 60}m.`;
      } else {
        successMsg = `Checked out successfully (Marked as Half Day ⚠️ due to late login). Total work time: ${Math.floor(workDurationMin / 60)}h ${workDurationMin % 60}m.`;
      }
    } else if (finalStatus === 'absent') {
      successMsg = `Checked out (Marked as Absent ❌ due to login after 2:00 PM).`;
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: successMsg,
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
