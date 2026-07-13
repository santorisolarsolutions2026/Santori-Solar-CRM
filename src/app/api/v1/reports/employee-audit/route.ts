import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasAccess = userPermissions.includes('reports:view') || userPayload.role === 'admin';
    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view employee audit logs.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const timeframe = url.searchParams.get('timeframe') || 'daily';

    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'weekly') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'monthly') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      return NextResponse.json({ success: false, message: 'Invalid timeframe parameter.' }, { status: 400 });
    }

    // 1. Fetch active employees (excluding admins)
    const employees = await prisma.user.findMany({
      where: {
        role: { not: 'admin' },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastSeenAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch all raw data for the timeframe concurrently
    const [attendances, logs, meetings, orders] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          date: { gte: startDate },
        },
      }),
      prisma.leadActivityLog.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        include: {
          lead: {
            select: {
              leadCode: true,
              customerName: true,
              pinCode: true,
            },
          },
        },
      }),
      prisma.meetingBooking.findMany({
        where: {
          meetingStartedAt: { gte: startDate },
        },
        include: {
          lead: {
            select: {
              leadCode: true,
              customerName: true,
              pinCode: true,
              city: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
        },
      }),
    ]);

    const globalAlerts: any[] = [];

    // 3. Process records for each employee
    const auditData = employees.map((emp) => {
      const empAttendances = attendances.filter((a) => a.userId === emp.id);
      const empLogs = logs.filter((l) => l.userId === emp.id);
      const empMeetings = meetings.filter((m) => m.assignedExecutiveId === emp.id);
      const empOrders = orders.filter((o) => o.submittedById === emp.id);

      // Work hours calculations
      const totalWorkDurationMin = empAttendances.reduce((sum, a) => sum + (a.workDurationMin || 0), 0);
      
      const empAlerts: string[] = [];

      // Late Check-in Check (check-in after 10:30 AM local time)
      empAttendances.forEach((att) => {
        const checkInTime = new Date(att.checkIn);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        if (hours > 10 || (hours === 10 && minutes > 30)) {
          const timeStr = checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = new Date(att.date).toLocaleDateString([], { day: '2-digit', month: 'short' });
          const alertMsg = `Late check-in on ${dateStr} at ${timeStr}`;
          empAlerts.push(alertMsg);
          globalAlerts.push({
            employeeId: emp.id,
            employeeName: emp.name,
            role: emp.role,
            type: 'late_check_in',
            severity: 'low',
            message: `${emp.name} clocked in late at ${timeStr} on ${dateStr}.`,
            timestamp: att.checkIn,
          });
        }
      });

      // Short / Meaningless Remarks Check (e.g. remark length < 5)
      empLogs.forEach((log) => {
        const cleanRemark = (log.remark || '').trim();
        if (cleanRemark.length < 5) {
          const dateStr = new Date(log.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' });
          const alertMsg = `Low detail remark logged on ${dateStr} for lead #${log.lead.leadCode}`;
          empAlerts.push(alertMsg);
          globalAlerts.push({
            employeeId: emp.id,
            employeeName: emp.name,
            role: emp.role,
            type: 'short_remark',
            severity: 'medium',
            message: `${emp.name} logged an empty/short remark ("${cleanRemark || 'none'}") changing status to Stage ${log.toStatus} for Lead #${log.lead.leadCode}.`,
            timestamp: log.createdAt,
          });
        }
      });

      // Location Mismatches Check
      empMeetings.forEach((meet) => {
        if (meet.meetingPinCode && meet.lead.pinCode && meet.meetingPinCode !== meet.lead.pinCode) {
          const dateStr = new Date(meet.meetingStartedAt!).toLocaleDateString([], { day: '2-digit', month: 'short' });
          const alertMsg = `Location mismatch on ${dateStr} for lead #${meet.lead.leadCode}`;
          empAlerts.push(alertMsg);
          globalAlerts.push({
            employeeId: emp.id,
            employeeName: emp.name,
            role: emp.role,
            type: 'location_mismatch',
            severity: 'high',
            message: `${emp.name} conducted a site visit for Lead #${meet.lead.leadCode} at pincode ${meet.meetingPinCode}, which does not match client pincode ${meet.lead.pinCode}.`,
            timestamp: meet.meetingStartedAt,
          });
        }
      });

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        lastSeenAt: emp.lastSeenAt,
        totalWorkDurationMin,
        stageChangesLogged: empLogs.length,
        meetingsCompleted: empMeetings.length,
        salesClosed: empOrders.length,
        alerts: empAlerts,
        isCurrentlyCheckedIn: empAttendances.some((a) => a.status === 'checked_in' && !a.checkOut),
      };
    });

    // Sort global alerts by timestamp (latest first)
    globalAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: {
        employees: auditData,
        alerts: globalAlerts,
      },
    });
  } catch (error: any) {
    console.error('Employee audit report error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
