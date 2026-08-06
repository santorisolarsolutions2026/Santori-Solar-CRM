import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Automatically purge notifications older than 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: fortyEightHoursAgo,
        },
      },
    });

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userPayload.id,
        createdAt: { gte: fortyEightHoursAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: userPayload.id,
        isRead: false,
        createdAt: { gte: fortyEightHoursAgo },
      },
    });

    const isAdmin = userPayload.role === 'admin' || userPayload.role?.startsWith('admin:') || userPayload.role === 'director';
    let recentBroadcasts: any[] = [];

    if (isAdmin) {
      const announcements = await prisma.notification.findMany({
        where: {
          type: 'announcement',
          createdAt: { gte: fortyEightHoursAgo },
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

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        recentBroadcasts,
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

    // Automatically purge notifications older than 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: fortyEightHoursAgo,
        },
      },
    });

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
          createdAt: { gte: fortyEightHoursAgo },
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
