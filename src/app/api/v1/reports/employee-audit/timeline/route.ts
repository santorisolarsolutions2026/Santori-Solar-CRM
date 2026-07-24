import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSubordinateIds } from '@/lib/hierarchy';

const STAGE_NAMES: Record<number, string> = {
  1: 'Fresh Lead',
  2: 'DNP (No Answer)',
  3: 'Follow Up',
  4: 'Not Interested',
  5: 'Call Later',
  6: 'Already Installed',
  7: 'Decision Pending',
  8: 'Meeting Booked',
  9: 'Meeting Done',
  10: 'Disconnected',
  11: 'Switch Off',
  12: "Can't Fit Solar",
  13: 'Sale Done',
};

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get('userId');
    const startStr = searchParams.get('startDate');
    const endStr = searchParams.get('endDate');
    const startTimeStr = searchParams.get('startTime') || '00:00';
    const endTimeStr = searchParams.get('endTime') || '23:59';

    if (!userIdStr) {
      return NextResponse.json({ success: false, message: 'userId is required.' }, { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid userId.' }, { status: 400 });
    }

    // Hierarchy permission check
    const reqUser = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: { role: true, department: { select: { name: true } } }
    });
    const isTopAdmin = userPayload.role === 'admin' ||
                       userPayload.role?.startsWith('admin:') ||
                       userPayload.role === 'director' ||
                       reqUser?.department?.name?.toLowerCase().trim() === 'it';

    if (!isTopAdmin) {
      const mySubIds = await getSubordinateIds(userPayload.id);
      const allowedIds = new Set([userPayload.id, ...mySubIds]);
      if (!allowedIds.has(userId)) {
        return NextResponse.json({ success: false, message: 'Forbidden. You can only view timelines for yourself and your team hierarchy.' }, { status: 403 });
      }
    }

    // Set date range filter
    let dateFilter: any = {};
    const hasDates = !!(startStr && endStr);
    if (hasDates) {
      const sDate = new Date(`${startStr}T${startTimeStr}:00`);
      const eDate = new Date(`${endStr}T${endTimeStr}:59.999`);
      dateFilter = { gte: sDate, lte: eDate };
    }

    const attendanceWhere = hasDates ? { userId, date: dateFilter } : { userId };
    const logsWhere = hasDates ? { userId, createdAt: dateFilter } : { userId };
    const meetingsWhere = hasDates ? { assignedExecutiveId: userId, createdAt: dateFilter } : { assignedExecutiveId: userId };
    const ordersWhere = hasDates ? {
      OR: [
        { submittedById: userId },
        { financeProcessedById: userId }
      ],
      createdAt: dateFilter
    } : {
      OR: [
        { submittedById: userId },
        { financeProcessedById: userId }
      ]
    };

    const [attendance, logs, meetings, orders] = await Promise.all([
      prisma.attendance.findMany({
        where: attendanceWhere,
        orderBy: { date: 'desc' }
      }),
      prisma.leadActivityLog.findMany({
        where: logsWhere,
        include: {
          lead: { select: { leadCode: true, customerName: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.meetingBooking.findMany({
        where: meetingsWhere,
        include: {
          lead: { select: { leadCode: true, customerName: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.findMany({
        where: ordersWhere,
        include: {
          lead: { select: { leadCode: true, customerName: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    interface TimelineEvent {
      id: string;
      type: 'check_in' | 'check_out' | 'log' | 'meeting' | 'order';
      timestamp: Date;
      title: string;
      description: string;
      meta?: any;
    }

    const events: TimelineEvent[] = [];

    // Map Attendance
    attendance.forEach(att => {
      // Check-In event
      events.push({
        id: `check_in_${att.id}`,
        type: 'check_in',
        timestamp: new Date(att.checkIn),
        title: 'Work Shift Started (Checked In)',
        description: `Checked in for work at ${new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Location: ${att.checkInLocation || 'Office GPS'}. Shift Status: ${att.status.toUpperCase()}`,
        meta: { notes: att.notes }
      });

      // Check-Out event
      if (att.checkOut) {
        events.push({
          id: `check_out_${att.id}`,
          type: 'check_out',
          timestamp: new Date(att.checkOut),
          title: 'Work Shift Ended (Checked Out)',
          description: `Checked out at ${new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Total shift duration: ${Math.round((att.workDurationMin || 0) / 60 * 10) / 10} hours.`,
        });
      }
    });

    // Map Lead logs into executive English
    logs.forEach(l => {
      const fromSt = l.fromStatus ? (STAGE_NAMES[l.fromStatus] || `Stage ${l.fromStatus}`) : 'New';
      const toSt = STAGE_NAMES[l.toStatus] || `Stage ${l.toStatus}`;
      const stageText = l.fromStatus !== l.toStatus ? ` (Shifted status from "${fromSt}" to "${toSt}")` : ` (${toSt})`;
      events.push({
        id: `log_${l.id}`,
        type: 'log',
        timestamp: new Date(l.createdAt),
        title: `Updated Lead #${l.lead?.leadCode || 'Code'} (${l.lead?.customerName || 'Customer'})`,
        description: `Logged activity on lead for client ${l.lead?.customerName || 'Customer'}${stageText}.`,
        meta: { remark: l.remark }
      });
    });

    // Map meetings
    meetings.forEach(m => {
      const recorded = m.audioRecordingPath || m.meetingStartedAt || m.meetingEndedAt ? 'Recorded' : 'Scheduled';
      events.push({
        id: `meeting_${m.id}`,
        type: 'meeting',
        timestamp: new Date(m.createdAt),
        title: `Client Meeting (${recorded})`,
        description: `Conducted client meeting with ${m.lead?.customerName || 'Customer'} (Lead #${m.lead?.leadCode}) scheduled at ${m.meetingDate || ''} ${m.meetingTime || ''}.`,
        meta: { startedAt: m.meetingStartedAt, endedAt: m.meetingEndedAt }
      });
    });

    // Map orders
    orders.forEach(o => {
      const isSub = o.submittedById === userId;
      events.push({
        id: `order_${o.id}`,
        type: 'order',
        timestamp: new Date(o.createdAt),
        title: isSub ? `Punched Solar Order` : `Verified Finance Order`,
        description: `${isSub ? 'Punched new' : 'Verified'} Solar Order for customer ${o.lead?.customerName || 'Client'} (Lead #${o.lead?.leadCode}). Deal Value: ₹${(o.totalValue || 0).toLocaleString('en-IN')}. Current Stage: ${o.status.replace(/_/g, ' ').toUpperCase()}.`,
      });
    });

    // Sort chronologically (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      success: true,
      data: events
    });
  } catch (error: any) {
    console.error('Fetch timeline events error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    }, { status: 500 });
  }
}
