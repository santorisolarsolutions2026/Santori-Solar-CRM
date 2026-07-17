import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can override attendance.' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, dateStr, status } = body;

    if (!userId || !dateStr || !status) {
      return NextResponse.json({ success: false, message: 'userId, dateStr, and status are required.' }, { status: 400 });
    }

    const uId = parseInt(userId, 10);
    if (isNaN(uId)) {
      return NextResponse.json({ success: false, message: 'Invalid userId.' }, { status: 400 });
    }

    // Set date to midnight UTC
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    if (status === 'clear') {
      await prisma.attendance.deleteMany({
        where: {
          userId: uId,
          date: dateObj,
        }
      });
      return NextResponse.json({
        success: true,
        message: 'Attendance record cleared successfully.'
      });
    }

    if (!['present', 'absent', 'half_day'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status. Must be present, absent, half_day, or clear.' }, { status: 400 });
    }

    // present can map to completed
    const mappedStatus = status === 'present' ? 'completed' : status;

    const existing = await prisma.attendance.findFirst({
      where: {
        userId: uId,
        date: dateObj,
      }
    });

    const checkInTime = new Date(`${dateStr}T09:00:00.000Z`);
    const checkOutTime = new Date(`${dateStr}T18:00:00.000Z`);

    let result;
    if (existing) {
      result = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: mappedStatus,
          checkOut: mappedStatus === 'absent' ? null : (existing.checkOut || checkOutTime),
          workDurationMin: mappedStatus === 'absent' ? null : (existing.workDurationMin || 540),
          notes: `Status overridden to ${status} by Admin (${userPayload.name}).`,
        }
      });
    } else {
      result = await prisma.attendance.create({
        data: {
          userId: uId,
          date: dateObj,
          checkIn: checkInTime,
          checkOut: mappedStatus === 'absent' ? null : checkOutTime,
          workDurationMin: mappedStatus === 'absent' ? null : 540,
          checkInLocation: 'Admin Override',
          checkOutLocation: mappedStatus === 'absent' ? null : 'Admin Override',
          status: mappedStatus,
          notes: `Status set to ${status} by Admin (${userPayload.name}).`,
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Attendance overridden to ${status} successfully.`
    });
  } catch (error: any) {
    console.error('Admin attendance override error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    }, { status: 500 });
  }
}
