import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { getSubordinateIds } from '@/lib/hierarchy';

export const dynamic = 'force-dynamic';

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

    // Find target team members to display performance stats for
    let targetUsers = await prisma.user.findMany({
      where: { reportsTo: userPayload.id, isActive: true },
      select: { id: true, name: true, email: true, role: true },
    });

    // If no subordinates (e.g. Consultant), default to showing themselves
    if (targetUsers.length === 0) {
      targetUsers = await prisma.user.findMany({
        where: { id: userPayload.id },
        select: { id: true, name: true, email: true, role: true },
      });
    }

    // If Admin, show everyone directly reporting to Admin OR level 2 Heads
    if (userPayload.role === 'admin' || userPayload.role === 'director') {
      targetUsers = await prisma.user.findMany({
        where: {
          OR: [
            { reportsTo: userPayload.id, isActive: true },
            { designation: { level: 2 }, isActive: true }, // Level 2 Heads
          ]
        },
        select: { id: true, name: true, email: true, role: true },
      });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const performancePromises = targetUsers.map(async (member) => {
      // 1. Get all subordinates in their subtree (including themselves)
      const subIds = await getSubordinateIds(member.id);
      const subTreeIds = [member.id, ...subIds];

      // 2. Count rolled-up metrics for the subtree from the central Activity & Lead tables
      const [leadsAssigned, meetingsBooked, salesClosed, callsMade] = await Promise.all([
        // Total leads assigned to this subtree
        prisma.lead.count({
          where: {
            OR: [
              { assignedConsultantId: { in: subTreeIds } },
              { assignedTlId: { in: subTreeIds } },
              { assignedManagerId: { in: subTreeIds } }
            ],
            status: { gte: 1 },
            isActive: true,
          },
        }),
        // Meetings booked in this subtree this month
        prisma.activity.count({
          where: {
            employeeId: { in: subTreeIds },
            activityType: 'MEETING_BOOKED',
            createdAt: { gte: startOfMonth },
          },
        }),
        // Sales closed in this subtree this month
        prisma.activity.count({
          where: {
            employeeId: { in: subTreeIds },
            activityType: 'SALE_DONE',
            createdAt: { gte: startOfMonth },
          },
        }),
        // Total calls made in this subtree this month
        prisma.activity.count({
          where: {
            employeeId: { in: subTreeIds },
            activityType: 'CALL_MADE',
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

      const conversionRate = leadsAssigned > 0 ? parseFloat(((salesClosed / leadsAssigned) * 100).toFixed(2)) : 0.0;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        leadsAssigned,
        meetingsBooked,
        salesClosed,
        callsMade,
        conversionRate,
      };
    });

    const performanceData = await Promise.all(performancePromises);

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
