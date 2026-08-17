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
    const hasAccess = userPermissions.includes('reports:view') ||
                      userPermissions.includes('leads:view') ||
                      userPermissions.includes('leads:create') ||
                      userPermissions.includes('leads:edit') ||
                      userPermissions.includes('orders:view') ||
                      userPermissions.includes('orders:create');

    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view reports.' }, { status: 403 });
    }

    const { getUserSession } = await import('@/lib/auth');
    const { role: userRole, department } = await getUserSession(userPayload.id);
    const userDeptName = department?.name || '';
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;

    if (userDeptName === 'Operations' || baseRole === 'operations') {
      const allowedOpsIds = [userPayload.id];
      if (userPayload.role !== 'admin' && userPayload.role !== 'director' && baseRole !== 'operations_head') {
        const { getSubordinateIds } = await import('@/lib/hierarchy');
        const subIds = await getSubordinateIds(userPayload.id);
        allowedOpsIds.push(...subIds);
      }

      // Fetch orders with scheduled deliveries, installations, or pending commissioning
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            {
              assignedOpsId: { in: allowedOpsIds },
              isDelivered: false,
              deliveryDate: { not: null },
            },
            {
              assignedOpsId: { in: allowedOpsIds },
              isInstalled: false,
              installationDate: { not: null },
            },
            {
              assignedOpsId: { in: allowedOpsIds },
              isMeterInstalled: true,
              isCommissioned: false,
            }
          ]
        },
        include: {
          lead: {
            select: {
              customerName: true,
              leadCode: true,
            }
          }
        }
      });

      const formattedReminders: any[] = [];
      const nowMs = Date.now();
      const cutOffTime = nowMs - 2 * 60 * 60 * 1000;

      for (const ord of orders) {
        // 1. Delivery Reminder
        if (ord.deliveryDate && !ord.isDelivered) {
          const timePart = ord.deliveryTime || '12:00';
          const datetime = new Date(`${ord.deliveryDate}T${timePart}:00`);
          if (!isNaN(datetime.getTime()) && datetime.getTime() >= cutOffTime) {
            formattedReminders.push({
              id: `delivery-${ord.id}`,
              type: 'delivery',
              title: 'Delivery Scheduled',
              datetime,
              leadId: ord.leadId,
              customerName: ord.lead.customerName,
              leadCode: ord.lead.leadCode,
              subtitle: `Deliver materials to site. Order ID: ${ord.id}`,
              priority: 'high',
            });
          }
        }

        // 2. Installation Reminder
        if (ord.installationDate && !ord.isInstalled) {
          const timePart = ord.installationTime || '12:00';
          const datetime = new Date(`${ord.installationDate}T${timePart}:00`);
          if (!isNaN(datetime.getTime()) && datetime.getTime() >= cutOffTime) {
            formattedReminders.push({
              id: `install-${ord.id}`,
              type: 'installation',
              title: 'Installation Scheduled',
              datetime,
              leadId: ord.leadId,
              customerName: ord.lead.customerName,
              leadCode: ord.lead.leadCode,
              subtitle: `Solar plant installation. Order ID: ${ord.id}`,
              priority: 'high',
            });
          }
        }

        // 3. Commissioning Reminder
        if (ord.isMeterInstalled && !ord.isCommissioned) {
          const datetime = ord.actualMeterInstalledAt || ord.actualInstallationAt || ord.createdAt;
          if (datetime && datetime.getTime() >= cutOffTime) {
            formattedReminders.push({
              id: `commission-${ord.id}`,
              type: 'commissioning',
              title: 'Plant Commissioning Pending',
              datetime,
              leadId: ord.leadId,
              customerName: ord.lead.customerName,
              leadCode: ord.lead.leadCode,
              subtitle: `Verify net metering and commission plant. Order ID: ${ord.id}`,
              priority: 'high',
            });
          }
        }
      }

      // Sort by datetime ascending
      formattedReminders.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

      return NextResponse.json({
        success: true,
        data: formattedReminders,
      });
    }

    // Concurrent database fetches using Promise.all
    const [meetings, followups] = await Promise.all([
      prisma.meetingBooking.findMany({
        where: {
          lead: {
            isActive: true,
          },
          ...(userPayload.role !== 'admin' && userPayload.role !== 'director'
            ? { assignedExecutiveId: userPayload.id }
            : {}),
        },
        include: {
          lead: {
            select: {
              customerName: true,
              leadCode: true,
            },
          },
          executive: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.lead.findMany({
        where: {
          isActive: true,
          followupAt: {
            not: null,
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Today onwards / last 24h
          },
          ...(userPayload.role !== 'admin' && userPayload.role !== 'director'
            ? {
                OR: [
                  { assignedConsultantId: userPayload.id },
                  { assignedTlId: userPayload.id },
                  { assignedManagerId: userPayload.id },
                  { createdById: userPayload.id },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          customerName: true,
          leadCode: true,
          followupAt: true,
          statusSub: true,
        },
      }),
    ]);

    const formattedMeetings: any[] = [];
    for (const m of meetings) {
      try {
        const datetime = new Date(`${m.meetingDate}T${m.meetingTime}:00`);
        if (!isNaN(datetime.getTime())) {
          formattedMeetings.push({
            id: `meeting-${m.id}`,
            type: 'meeting',
            title: 'Meeting Scheduled',
            datetime,
            leadId: m.leadId,
            customerName: m.lead.customerName,
            leadCode: m.lead.leadCode,
            subtitle: `Executive: ${m.executive.name}. Notes: ${m.notes || 'None'}`,
            priority: 'high',
          });
        }
      } catch (err) {
        console.error('Error parsing meeting datetime:', err);
      }
    }

    const formattedFollowups = followups.map((f) => ({
      id: `followup-${f.id}`,
      type: 'followup',
      title: 'Follow Up Scheduled',
      datetime: new Date(f.followupAt!),
      leadId: f.id,
      customerName: f.customerName,
      leadCode: f.leadCode,
      subtitle: f.statusSub ? `Priority: ${f.statusSub.toUpperCase()}` : 'Priority: WARM',
      priority: f.statusSub === 'hot' ? 'high' : 'medium',
    })).filter((f) => !isNaN(f.datetime.getTime()));

    // Combine and sort ascending chronologically (earliest/closest first)
    const allReminders = [...formattedMeetings, ...formattedFollowups];
    
    // Filter out reminders that are more than 2 hours in the past
    const cutOffTime = Date.now() - 2 * 60 * 60 * 1000;
    const activeReminders = allReminders.filter((r) => r.datetime.getTime() >= cutOffTime);

    // Sort by datetime ascending (earliest/closest first)
    activeReminders.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    return NextResponse.json({
      success: true,
      data: activeReminders,
    });
  } catch (error: any) {
    console.error('Fetch reminders error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
