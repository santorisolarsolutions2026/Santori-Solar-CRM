import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { isWithinAttendanceHours } from '@/lib/attendance';

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

    // Check if record already exists for today
    const existing = await attendanceModel.findFirst({
      where: {
        userId: userPayload.id,
        date: todayDate,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'You have already checked in for today.' },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: { loginLocation: true },
    });

    const resolvedLocation = (location && !location.includes('Web Portal'))
      ? location
      : (dbUser?.loginLocation || location || 'Unknown Location');

    const istDateString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istDateString);
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // 10:15 AM = 615 min, 2:00 PM (14:00) = 840 min
    let initialStatus = 'checked_in';
    let autoNote = '';

    if (totalMinutes > 840) {
      // After 2:00 PM -> Absent
      initialStatus = 'absent';
      autoNote = 'Late check-in after 2:00 PM (Marked as Absent)';
    } else if (totalMinutes > 615) {
      // Between 10:15 AM and 2:00 PM -> Half Day
      initialStatus = 'half_day';
      autoNote = 'Late check-in between 10:15 AM and 2:00 PM (Marked as Half Day)';
    }

    const attendance = await attendanceModel.create({
      data: {
        userId: userPayload.id,
        date: todayDate,
        checkIn: now,
        checkInLocation: resolvedLocation,
        status: initialStatus,
        notes: notes || (autoNote || undefined),
      },
    });

    let successMessage = 'Checked in successfully! Have a productive workday.';
    if (initialStatus === 'absent') {
      successMessage = 'Checked in after 2:00 PM. Marked as Absent for today.';
    } else if (initialStatus === 'half_day') {
      successMessage = 'Checked in after 10:15 AM. Marked as Half Day for today.';
    }

    return NextResponse.json({
      success: true,
      data: attendance,
      message: successMessage,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
