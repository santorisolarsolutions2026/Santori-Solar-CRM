import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

// 24-Hour Throttled In-Memory Purge
// Runs deleteMany at most ONCE in 24 hours to keep the Notification table clean
// while converting 99.99% of polling requests into zero-write read-only queries.
let lastPurgeTimestamp = 0;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function triggerDailyNotificationPurgeIfNeeded() {
  const now = Date.now();
  if (now - lastPurgeTimestamp > TWENTY_FOUR_HOURS_MS) {
    lastPurgeTimestamp = now;
    try {
      const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
      await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: twentyFourHoursAgo,
          },
        },
      });
    } catch (e) {
      console.error('Daily notification purge error:', e);
    }
  }
}

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Trigger daily throttled cleanup asynchronously in the background
    triggerDailyNotificationPurgeIfNeeded().catch(() => {});

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userPayload.id,
        createdAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: userPayload.id,
        isRead: false,
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    const isAdmin = userPayload.role === 'admin' || userPayload.role?.startsWith('admin:') || userPayload.role === 'director';
    let recentBroadcasts: any[] = [];

    if (isAdmin) {
      const announcements = await prisma.notification.findMany({
        where: {
          type: 'announcement',
          createdAt: { gte: twentyFourHoursAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const map = new Map<string, any>();
      announcements.forEach((a) => {
        const key = `${a.title}___${a.body}`;
        if (!map.has(key)) {
          map.set(key, {
            id: a.id,
            title: a.title,
            body: a.body,
            createdAt: a.createdAt,
          });
        }
      });
      recentBroadcasts = Array.from(map.values());
    }

    // Fetch Upcoming Tasks & Meeting Reminders
    const todayStr = new Date().toISOString().split('T')[0];
    const meetingWhere: any = {
      meetingDate: { gte: todayStr },
    };
    if (!isAdmin) {
      meetingWhere.assignedExecutiveId = userPayload.id;
    }
    const upcomingMeetings = await prisma.meetingBooking.findMany({
      where: meetingWhere,
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            leadCode: true,
            mobile: true,
            city: true,
            state: true,
            address: true,
          },
        },
        executive: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [{ meetingDate: 'asc' }, { meetingTime: 'asc' }],
      take: 20,
    });

    const now = new Date();
    const leadWhere: any = {
      isActive: true,
      followupAt: { gte: new Date(now.getTime() - 24 * 3600 * 1000) },
    };
    if (!isAdmin) {
      leadWhere.OR = [
        { assignedConsultantId: userPayload.id },
        { assignedTlId: userPayload.id },
        { assignedManagerId: userPayload.id },
      ];
    }
    const upcomingFollowups = await prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        customerName: true,
        leadCode: true,
        mobile: true,
        status: true,
        statusSub: true,
        city: true,
        followupAt: true,
        sanctionedLoadKw: true,
        connectionType: true,
      },
      orderBy: { followupAt: 'asc' },
      take: 20,
    });

    const cutOffTime = Date.now() - 2 * 60 * 60 * 1000;

    const formattedMeetings = upcomingMeetings
      .map((m) => {
        const timePart = m.meetingTime || '12:00';
        const dt = new Date(`${m.meetingDate}T${timePart}:00`);
        const timestamp = !isNaN(dt.getTime()) ? dt.getTime() : Infinity;
        return {
          id: `meeting-${m.id}`,
          type: 'meeting' as const,
          title: `Site Visit: ${m.lead?.customerName || 'Customer'}`,
          leadCode: m.lead?.leadCode || '',
          leadId: m.leadId,
          customerName: m.lead?.customerName || 'Customer',
          mobile: m.mobile || m.lead?.mobile,
          location: `${m.address || m.lead?.address || ''}, ${m.lead?.city || ''}`.replace(/^,\s*|,\s*$/g, ''),
          dueDateTime: !isNaN(dt.getTime()) ? dt.toISOString() : `${m.meetingDate} ${m.meetingTime}`,
          formattedDue: `${m.meetingDate === todayStr ? 'Today' : m.meetingDate} at ${m.meetingTime}`,
          notes: m.notes || `Avg bill ₹${m.avgMonthlyBill || 0}`,
          assignedTo: m.executive?.name,
          isUrgent: m.meetingDate === todayStr,
          timestamp,
        };
      })
      .filter((m) => m.timestamp >= cutOffTime);

    const formattedFollowups = upcomingFollowups
      .map((f) => {
        const fDate = f.followupAt ? new Date(f.followupAt) : new Date();
        const timestamp = !isNaN(fDate.getTime()) ? fDate.getTime() : Infinity;
        const isToday = fDate.toISOString().split('T')[0] === todayStr;
        return {
          id: `followup-${f.id}`,
          type: 'follow_up' as const,
          title: `Follow Up Call: ${f.customerName}`,
          leadCode: f.leadCode,
          leadId: f.id,
          customerName: f.customerName,
          mobile: f.mobile,
          location: f.city || '',
          dueDateTime: f.followupAt ? new Date(f.followupAt).toISOString() : '',
          formattedDue: isToday
            ? `Today at ${fDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : fDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          notes: f.statusSub ? `Priority: ${f.statusSub.toUpperCase()}` : 'Customer quotation discussion',
          isUrgent: isToday,
          timestamp,
        };
      })
      .filter((f) => f.timestamp >= cutOffTime);

    // Combine and sort chronologically ascending (earliest first, exact same order as Web CRM)
    const upcomingTasks = [...formattedMeetings, ...formattedFollowups].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        recentBroadcasts,
        upcomingTasks,
      },
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Trigger daily throttled cleanup in the background
    triggerDailyNotificationPurgeIfNeeded().catch(() => {});
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const body = await req.json();
    const { action, title, message, notificationId } = body;

    const isAdmin = userPayload.role === 'admin' || userPayload.role?.startsWith('admin:') || userPayload.role === 'director';

    // Handle Admin News Broadcast to all employees
    if (action === 'broadcast') {
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Forbidden. Only admins can broadcast news.' }, { status: 403 });
      }

      if (!title || !message) {
        return NextResponse.json({ success: false, message: 'News title and message are required.' }, { status: 400 });
      }

      const activeUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });

      await prisma.notification.createMany({
        data: activeUsers.map(u => ({
          userId: u.id,
          title: `📢 ${title.trim()}`,
          body: message.trim(),
          type: 'announcement',
          isRead: false,
        }))
      });

      return NextResponse.json({
        success: true,
        message: `Broadcast news sent to ${activeUsers.length} employees successfully.`,
      });
    }

    // Handle Admin Deleting a Broadcast Announcement for all employees
    if (action === 'delete_broadcast') {
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Forbidden. Only admins can delete broadcast messages.' }, { status: 403 });
      }

      let deletedCount = 0;

      if (notificationId) {
        const targetNotif = await prisma.notification.findUnique({
          where: { id: parseInt(String(notificationId), 10) },
        });

        if (targetNotif) {
          const res = await prisma.notification.deleteMany({
            where: {
              type: 'announcement',
              title: targetNotif.title,
              body: targetNotif.body,
            },
          });
          deletedCount = res.count;
        }
      } else if (title && message) {
        const targetTitle = title.startsWith('📢') ? title : `📢 ${title.trim()}`;
        const res = await prisma.notification.deleteMany({
          where: {
            type: 'announcement',
            title: targetTitle,
            body: message.trim(),
          },
        });
        deletedCount = res.count;
      } else {
        return NextResponse.json({ success: false, message: 'Notification ID or title and message are required.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Broadcast message deleted for all ${deletedCount} employee(s).`,
      });
    }

    if (notificationId) {
      // Mark specific notification as read
      await prisma.notification.update({
        where: { id: parseInt(String(notificationId), 10) },
        data: { isRead: true },
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          userId: userPayload.id,
          isRead: false,
          createdAt: { gte: twentyFourHoursAgo },
        },
        data: { isRead: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications updated successfully.',
    });
  } catch (error: any) {
    console.error('Update notifications error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const isAdmin = userPayload.role === 'admin' || userPayload.role?.startsWith('admin:') || userPayload.role === 'director';
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only admins can delete broadcast messages.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ success: false, message: 'Notification ID parameter is required.' }, { status: 400 });
    }

    const targetNotif = await prisma.notification.findUnique({
      where: { id: parseInt(idParam, 10) },
    });

    if (!targetNotif) {
      return NextResponse.json({ success: false, message: 'Notification not found.' }, { status: 404 });
    }

    const deletedResult = await prisma.notification.deleteMany({
      where: {
        type: 'announcement',
        title: targetNotif.title,
        body: targetNotif.body,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast message deleted across all ${deletedResult.count} recipient(s).`,
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
