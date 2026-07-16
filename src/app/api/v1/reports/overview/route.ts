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

    // Fetch user designation level
    const userDetail = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: { designation: { select: { level: true } } },
    });
    const designationLevel = userDetail?.designation?.level ?? 6;

    // System-wide overview metrics (constant for admin/director, hierarchical for others)
    const leadWhere: any = {};
    if (userPayload.role !== 'admin' && userPayload.role !== 'director') {
      if (designationLevel <= 5) {
        const { getSubordinateIds } = await import('@/lib/hierarchy');
        const subIds = await getSubordinateIds(userPayload.id);
        const subTreeIds = [userPayload.id, ...subIds];
        leadWhere.OR = [
          { assignedConsultantId: { in: subTreeIds } },
          { assignedTlId: { in: subTreeIds } },
          { assignedManagerId: { in: subTreeIds } },
          { createdById: userPayload.id },
        ];
      } else {
        leadWhere.assignedConsultantId = userPayload.id;
      }
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Concurrent Queries using Promise.all
    const [
      totalFreshLeads,
      activeLeads,
      meetingsBookedThisMonth,
      salesDoneThisMonth,
      todayFollowUps
    ] = await Promise.all([
      prisma.lead.count({
        where: {
          ...leadWhere,
          status: { gte: 1 },
        },
      }),
      prisma.lead.count({
        where: {
          ...leadWhere,
          status: { notIn: [0, 6, 12, 13] },
          isActive: true,
        },
      }),
      prisma.lead.count({
        where: {
          ...leadWhere,
          status: { in: [8, 9, 13] },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.lead.count({
        where: {
          ...leadWhere,
          status: 13,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.lead.count({
        where: {
          ...leadWhere,
          status: { in: [3, 5] },
          followupAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
    ]);

    // 6. Conversion Rate (Sales / Total Fresh Leads * 100)
    const conversionRate = totalFreshLeads > 0 ? parseFloat(((salesDoneThisMonth / totalFreshLeads) * 100).toFixed(2)) : 0.0;

    return NextResponse.json({
      success: true,
      data: {
        totalLeads: totalFreshLeads,
        activeLeads,
        meetingsBookedThisMonth,
        salesDoneThisMonth,
        todayFollowUps,
        conversionRate,
      },
    });
  } catch (error: any) {
    console.error('Reports overview error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
