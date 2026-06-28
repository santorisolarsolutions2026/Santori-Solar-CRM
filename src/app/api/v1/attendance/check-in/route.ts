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

    const attendance = await attendanceModel.create({
      data: {
        userId: userPayload.id,
        date: todayDate,
        checkIn: now,
        checkInLocation: resolvedLocation,
        status: 'checked_in',
        notes: notes || undefined,
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
