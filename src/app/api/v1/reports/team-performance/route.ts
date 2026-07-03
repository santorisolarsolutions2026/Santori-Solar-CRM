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

    // Find all consultants in the team system-wide (constant for all users)
    const consultantWhere: any = { role: { in: ['consultant', 'psa'] } };

    const consultants = await prisma.user.findMany({
      where: consultantWhere,
      select: { id: true, name: true, email: true },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const performanceData = [];

    // 2. Fetch stats for each consultant
    for (const consultant of consultants) {
      const [leadsAssigned, meetingsBooked, salesClosed, callsMade] = await Promise.all([
        // Total leads assigned (Fresh or above)
        prisma.lead.count({
          where: { 
            assignedConsultantId: consultant.id,
            status: { gte: 1 }
          },
        }),
        // Meetings booked this month
        prisma.lead.count({
          where: {
            assignedConsultantId: consultant.id,
            status: { in: [8, 9, 13] },
            createdAt: { gte: startOfMonth },
          },
        }),
        // Sales closed this month
        prisma.lead.count({
          where: {
            assignedConsultantId: consultant.id,
            status: 13,
            createdAt: { gte: startOfMonth },
          },
        }),
        // Total activity logs (calls/remarks logged)
        prisma.leadActivityLog.count({
          where: {
            userId: consultant.id,
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

      const conversionRate = leadsAssigned > 0 ? parseFloat(((salesClosed / leadsAssigned) * 100).toFixed(2)) : 0.0;

      performanceData.push({
        id: consultant.id,
        name: consultant.name,
        email: consultant.email,
        leadsAssigned,
        meetingsBooked,
        salesClosed,
        callsMade,
        conversionRate,
      });
    }

    return NextResponse.json({
      success: true,
      data: performanceData,
    });
  } catch (error: any) {
    console.error('Team performance reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
