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

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
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

    // Handle Admin News Broadcast to all employees
    if (action === 'broadcast') {
      const isAdmin = userPayload.role === 'admin' || userPayload.role?.startsWith('admin:') || userPayload.role === 'director';
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

    if (notificationId) {
      // Mark specific notification as read
      await prisma.notification.update({
        where: { id: parseInt(notificationId, 10) },
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
