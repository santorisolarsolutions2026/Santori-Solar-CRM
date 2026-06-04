import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const leadWhere: any = {};
    if (userPayload.role === 'manager') {
      leadWhere.assignedManagerId = userPayload.id;
    } else if (userPayload.role === 'tl') {
      leadWhere.assignedTlId = userPayload.id;
    } else if (userPayload.role === 'consultant' || userPayload.role === 'psa') {
      leadWhere.assignedConsultantId = userPayload.id;
    }

    // Get trend data for the last 15 days
    const trendData = [];
    for (let i = 14; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [createdCount, closedCount] = await Promise.all([
        prisma.lead.count({
          where: {
            ...leadWhere,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
        prisma.lead.count({
          where: {
            ...leadWhere,
            status: 13,
            updatedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
      ]);

      const dateString = startOfDay.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });

      trendData.push({
        date: dateString,
        created: createdCount,
        closed: closedCount,
      });
    }

    return NextResponse.json({
      success: true,
      data: trendData,
    });
  } catch (error: any) {
    console.error('Reports trend error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
