import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

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
        title: 'Checked In',
        description: `Checked in at ${new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Location: ${att.checkInLocation || 'Unknown'}. Status: ${att.status.toUpperCase()}`,
        meta: { notes: att.notes }
      });

      // Check-Out event
      if (att.checkOut) {
        events.push({
          id: `check_out_${att.id}`,
          type: 'check_out',
          timestamp: new Date(att.checkOut),
          title: 'Checked Out',
          description: `Checked out at ${new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Location: ${att.checkOutLocation || 'Unknown'}. Duration: ${att.workDurationMin || 0} minutes.`,
        });
      }
    });

    // Map Lead logs
    logs.forEach(l => {
      const fromSt = l.fromStatus;
      const toSt = l.toStatus;
      const stageChange = fromSt !== toSt ? ` (Stage Shift: ${fromSt} → ${toSt})` : '';
      events.push({
        id: `log_${l.id}`,
        type: 'log',
        timestamp: new Date(l.createdAt),
        title: `Updated Lead #${l.lead?.leadCode || 'Unknown'}`,
        description: `Modified opportunity info for client ${l.lead?.customerName || 'Unknown'}${stageChange}.`,
        meta: { remark: l.remark }
      });
    });

    // Map meetings
    meetings.forEach(m => {
      events.push({
        id: `meeting_${m.id}`,
        type: 'meeting',
        timestamp: new Date(m.createdAt),
        title: `Handled Meeting Booking`,
        description: `Conducted meeting with client ${m.lead?.customerName || 'Unknown'} (Lead #${m.lead?.leadCode}) scheduled at ${m.meetingDate} ${m.meetingTime}.`,
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
        title: isSub ? `Punched Order` : `Processed Order (Finance)`,
        description: `Managed Solar Order for client ${o.lead?.customerName || 'Unknown'} (Lead #${o.lead?.leadCode}). Deal Value: ₹${(o.totalValue || 0).toLocaleString('en-IN')}. Status: ${o.status.toUpperCase()}`,
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
