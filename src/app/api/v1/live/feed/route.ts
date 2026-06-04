import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Access control: only Admin and Sales Head (Section 6.2)
    const allowedRoles = ['admin', 'sales_head'];
    if (!allowedRoles.includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin/Sales Head only.' }, { status: 403 });
    }

    // 1. Fetch latest 30 status changes
    const logs = await prisma.leadActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        lead: {
          select: {
            customerName: true,
            leadCode: true,
          },
        },
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    // 2. Fetch user presence (last 30 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        lastSeenAt: true,
      },
    });

    const presence = users.map((user) => {
      let status = 'offline';
      if (user.lastSeenAt) {
        const lastSeen = new Date(user.lastSeenAt);
        if (lastSeen >= fiveMinutesAgo) {
          status = 'online';
        } else if (lastSeen >= thirtyMinutesAgo) {
          status = 'idle';
        }
      }
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        status,
        lastSeenAt: user.lastSeenAt,
      };
    });

    // 3. Today's KPIs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [salesToday, meetingsToday, newLeadsToday] = await Promise.all([
      // Sales Done Today
      prisma.lead.count({
        where: {
          status: 13,
          updatedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Meetings Booked Today
      prisma.meetingBooking.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      // New Leads Created Today
      prisma.lead.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    const activeConsultantsOnline = presence.filter(
      (u) => u.status === 'online' && ['consultant', 'psa'].includes(u.role)
    ).length;

    // 4. Return results
    return NextResponse.json({
      success: true,
      data: {
        logs,
        presence,
        kpis: {
          salesToday,
          meetingsToday,
          newLeadsToday,
          activeConsultantsOnline,
        },
      },
    });
  } catch (error: any) {
    console.error('Live feed error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
