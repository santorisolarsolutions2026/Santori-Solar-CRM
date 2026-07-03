import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userId = userPayload.id;

    // Get today's range in system/local timezone
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayDateString = todayStart.toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Query today's followups (Leads where status is 3 or 5, assigned to this user, with followupAt today)
    const followups = await prisma.lead.findMany({
      where: {
        assignedConsultantId: userId,
        isActive: true,
        status: { in: [3, 5] },
        followupAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: {
        id: true,
        customerName: true,
        leadCode: true,
        followupAt: true,
        statusSub: true,
      },
    });

    // 2. Query today's meetings (Meetings where assignedExecutiveId is this user and meetingDate is today)
    const meetings = await prisma.meetingBooking.findMany({
      where: {
        assignedExecutiveId: userId,
        meetingDate: todayDateString,
      },
      include: {
        lead: {
          select: {
            customerName: true,
            leadCode: true,
          },
        },
      },
    });

    // 3. Query today's material deliveries (Orders where deliveryDate is today and isDelivered is false, associated with this user)
    const deliveryWhere: any = {
      deliveryDate: todayDateString,
      isDelivered: false,
    };
    if (!['admin', 'director', 'operations'].includes(userPayload.role)) {
      deliveryWhere.lead = {
        assignedConsultantId: userId,
      };
    }
    const deliveries = await prisma.order.findMany({
      where: deliveryWhere,
      include: {
        lead: {
          select: {
            customerName: true,
            leadCode: true,
          },
        },
      },
    });

    // 4. Query today's solar structure installations (Orders where installationDate is today and isInstalled is false, associated with this user)
    const installationWhere: any = {
      installationDate: todayDateString,
      isInstalled: false,
    };
    if (!['admin', 'director', 'operations'].includes(userPayload.role)) {
      installationWhere.lead = {
        assignedConsultantId: userId,
      };
    }
    const installations = await prisma.order.findMany({
      where: installationWhere,
      include: {
        lead: {
          select: {
            customerName: true,
            leadCode: true,
          },
        },
      },
    });

    // Format all tasks into a unified alert list
    const alerts: any[] = [];

    followups.forEach((f) => {
      alerts.push({
        id: `followup-${f.id}`,
        type: 'followup',
        title: 'Pending Followup Call 📞',
        detail: `Customer: ${f.customerName} (${f.leadCode})`,
        time: f.followupAt ? new Date(f.followupAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Today',
        leadId: f.id,
      });
    });

    meetings.forEach((m) => {
      alerts.push({
        id: `meeting-${m.id}`,
        type: 'meeting',
        title: 'Scheduled Customer Meeting 📅',
        detail: `Customer: ${m.lead.customerName} (${m.lead.leadCode}). Location: ${m.address}`,
        time: m.meetingTime || 'Today',
        leadId: m.leadId,
      });
    });

    deliveries.forEach((d) => {
      alerts.push({
        id: `delivery-${d.id}`,
        type: 'delivery',
        title: 'Material Delivery Scheduled 🚚',
        detail: `Customer: ${d.lead.customerName} (${d.lead.leadCode}). Connection #: ${d.connectionNumber}`,
        time: d.deliveryTime || 'Today',
        leadId: d.leadId,
      });
    });

    installations.forEach((i) => {
      alerts.push({
        id: `installation-${i.id}`,
        type: 'installation',
        title: 'Solar Installation Scheduled 🛠️',
        detail: `Customer: ${i.lead.customerName} (${i.lead.leadCode}). Size: ${i.systemSizeKw}kW`,
        time: i.installationTime || 'Today',
        leadId: i.leadId,
      });
    });

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error: any) {
    console.error('My today alerts API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
