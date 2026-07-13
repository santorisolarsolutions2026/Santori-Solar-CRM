import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

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
  14: 'Disqualified',
};

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasAccess = userPermissions.includes('reports:view') || userPayload.role === 'admin';
    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view employee audit details.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const userIdStr = url.searchParams.get('userId');
    if (!userIdStr) {
      return NextResponse.json({ success: false, message: 'Missing userId parameter.' }, { status: 400 });
    }
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid userId.' }, { status: 400 });
    }

    const startStr = url.searchParams.get('startDate');
    const endStr = url.searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (startStr && endStr) {
      startDate = new Date(startStr);
      endDate = new Date(endStr);
    } else {
      // Default to Today (00:00:00 to 23:59:59 local time)
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // 1. Fetch Employee Details
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found.' }, { status: 404 });
    }

    // 2. Fetch raw events
    const [attendances, logs, meetings, orders] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          userId,
          date: {
            gte: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
            lte: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()),
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.leadActivityLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          lead: {
            select: {
              leadCode: true,
              customerName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.meetingBooking.findMany({
        where: {
          assignedExecutiveId: userId,
          meetingStartedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          lead: {
            select: {
              leadCode: true,
              customerName: true,
            },
          },
        },
        orderBy: { meetingStartedAt: 'desc' },
      }),
      prisma.order.findMany({
        where: {
          submittedById: userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          lead: {
            select: {
              leadCode: true,
              customerName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 3. Assemble unified chronological timeline
    const events: any[] = [];

    // Add Check-ins & Check-outs
    attendances.forEach((att) => {
      events.push({
        id: `check_in_${att.id}`,
        type: 'check_in',
        timestamp: att.checkIn,
        title: 'Clocked In',
        details: `Location: ${att.checkInLocation || 'Web Portal'}. Notes: ${att.notes || 'None'}.`,
      });

      if (att.checkOut) {
        events.push({
          id: `check_out_${att.id}`,
          type: 'check_out',
          timestamp: att.checkOut,
          title: 'Clocked Out',
          details: `Location: ${att.checkOutLocation || 'Web Portal'}. Worked: ${Math.floor((att.workDurationMin || 0) / 60)}h ${(att.workDurationMin || 0) % 60}m.`,
        });
      }
    });

    // Add Lead Status Updates
    logs.forEach((log) => {
      const fromName = log.fromStatus ? (STAGE_NAMES[log.fromStatus] || `Stage ${log.fromStatus}`) : 'None';
      const toName = STAGE_NAMES[log.toStatus] || `Stage ${log.toStatus}`;
      
      events.push({
        id: `log_${log.id}`,
        type: 'status_change',
        timestamp: log.createdAt,
        title: `Updated Status to ${toName}`,
        leadCode: log.lead.leadCode,
        customerName: log.lead.customerName,
        details: `Stage transition: "${fromName}" ➔ "${toName}". Remark: "${log.remark || 'No remark entered'}".`,
      });
    });

    // Add Meetings Commenced & Completed
    meetings.forEach((meet) => {
      events.push({
        id: `meet_start_${meet.id}`,
        type: 'meeting_started',
        timestamp: meet.meetingStartedAt,
        title: 'Commenced Site Meeting',
        leadCode: meet.lead.leadCode,
        customerName: meet.lead.customerName,
        details: `Location: ${meet.meetingCity || ''} ${meet.meetingLocality || ''} (Pincode: ${meet.meetingPinCode || 'Unknown'}). Notes: "${meet.notes || 'none'}".`,
      });

      if (meet.meetingEndedAt) {
        events.push({
          id: `meet_end_${meet.id}`,
          type: 'meeting_ended',
          timestamp: meet.meetingEndedAt,
          title: 'Completed Site Meeting',
          leadCode: meet.lead.leadCode,
          customerName: meet.lead.customerName,
          details: `Audio Recording: ${meet.audioRecordingPath ? 'Uploaded' : 'None'}. Duration: ${Math.floor((meet.meetingDurationSec || 0) / 60)}m.`,
        });
      }
    });

    // Add Sales Orders Submitted
    orders.forEach((ord) => {
      events.push({
        id: `order_${ord.id}`,
        type: 'order_submitted',
        timestamp: ord.createdAt,
        title: 'Submitted Sales Order',
        leadCode: ord.lead.leadCode,
        customerName: ord.lead.customerName,
        details: `Solar System Size: ${ord.systemSizeKw} kW. Deal Value: ₹${ord.totalValue.toLocaleString('en-IN')}. Payment Method: ${ord.paymentMethod}. Downpayment: ₹${ord.downPayment.toLocaleString('en-IN')}.`,
      });
    });

    // Sort timeline (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate aggregated statistics
    const totalWorkDurationMin = attendances.reduce((sum, a) => sum + (a.workDurationMin || 0), 0);
    const totalStageChanges = logs.length;
    const totalMeetings = meetings.length;
    const totalSales = orders.length;

    return NextResponse.json({
      success: true,
      data: {
        employee,
        stats: {
          totalWorkDurationMin,
          totalStageChanges,
          totalMeetings,
          totalSales,
        },
        timeline: events,
      },
    });
  } catch (error: any) {
    console.error('Employee audit details API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
