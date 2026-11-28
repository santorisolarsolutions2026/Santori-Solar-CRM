import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { autoCloseAttendanceRecord } from '@/lib/attendanceAutoClose';

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
    const unclosedPast = await attendanceModel.findMany({
      where: {
        userId: userPayload.id,
        date: { lt: todayDate },
        checkOut: null,
      },
      orderBy: { date: 'asc' },
    });

    for (const pastRec of unclosedPast) {
      const recDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(pastRec.date));
      await autoCloseAttendanceRecord(attendanceModel, pastRec, recDateStr, true).catch(() => {});
    }

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
        const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
        record = await autoCloseAttendanceRecord(attendanceModel, record, dateStr, false);
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
