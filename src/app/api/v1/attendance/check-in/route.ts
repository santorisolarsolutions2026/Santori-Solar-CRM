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

    // 1. Before 09:30 AM (570 mins) Lock
    if (totalMinutesOfDay < 570) {
      return NextResponse.json(
        { success: false, message: 'Check-in window opens at 09:30 AM. Early check-in is not allowed.' },
        { status: 400 }
      );
    }

    // 2. After 02:00 PM (840 mins) Cut-off
    if (totalMinutesOfDay >= 840) {
      return NextResponse.json(
        { success: false, message: 'Check-in window closed at 02:00 PM. Please contact Admin for attendance regularization.' },
        { status: 400 }
      );
    }

    // 3. Status classification
    let initialStatus = 'checked_in';
    let autoNote: string | undefined = undefined;

    if (totalMinutesOfDay <= 615) {
      // 09:30 AM - 10:15 AM: On-Time
      initialStatus = 'checked_in';
    } else if (totalMinutesOfDay <= 645) {
      // 10:16 AM - 10:45 AM: Late Mark
      initialStatus = 'late';
      autoNote = 'Late check-in (between 10:16 AM - 10:45 AM). Late Mark recorded.';
    } else {
      // 10:46 AM - 02:00 PM: Half Day
      initialStatus = 'half_day';
      autoNote = 'Late check-in (after 10:45 AM). Automatically marked as Half Day.';
    }

    const attendance = await attendanceModel.create({
      data: {
        userId: userPayload.id,
        date: todayDate,
        checkIn: now,
        checkInLocation: resolvedLocation,
        status: initialStatus,
        notes: notes ? (autoNote ? `${autoNote} | ${notes}` : notes) : autoNote,
      },
    });

    return NextResponse.json({
      success: true,
      data: attendance,
      message: 'Checked in successfully! Have a productive workday.',
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
