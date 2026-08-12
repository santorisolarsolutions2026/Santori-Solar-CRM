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

    const checkInTime = new Date(existing.checkIn).getTime();
    const checkOutTime = now.getTime();
    const workDurationMin = Math.max(1, Math.round((checkOutTime - checkInTime) / (1000 * 60)));

    const hours = now.getHours();
    const isEarlyCheckOut = hours < 19;
    const finalStatus = (existing.status === 'half_day' || isEarlyCheckOut) ? 'half_day' : 'completed';
    const autoNotes = isEarlyCheckOut ? 'Early check-out (before 7:00 PM). Automatically marked as Half Day.' : '';
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
