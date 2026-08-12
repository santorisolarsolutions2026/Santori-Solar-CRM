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
    const record = await attendanceModel.findFirst({
      where: {
        userId: userPayload.id,
        date: todayDate,
      },
    });

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
