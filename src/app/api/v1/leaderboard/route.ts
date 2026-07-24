import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSubordinateIds } from '@/lib/hierarchy';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || 'month'; // week | month | all
    const department = searchParams.get('department') || 'all'; // all | sales | finance | operations
    const designationFilter = searchParams.get('designation') || 'all'; // designation name or id
    const metricFilter = searchParams.get('metric') || 'auto'; // salesClosed | meetingsConducted | ordersVerified | opsMilestones | auto
    const startStr = searchParams.get('startDate');
    const endStr = searchParams.get('endDate');

    // Determine date filter
    let dateFilter: any = undefined;
    if (startStr && endStr) {
      dateFilter = { gte: new Date(`${startStr}T00:00:00`), lte: new Date(`${endStr}T23:59:59.999`) };
    } else if (timeframe === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);
      dateFilter = { gte: oneWeekAgo };
    } else if (timeframe === 'month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfMonth };
    }

    // Role mapping for department filtering
    const salesRoles = ['admin', 'sales_head', 'manager', 'tl', 'psa_tl', 'consultant', 'psa'];
    const financeRoles = ['finance'];
    const operationsRoles = ['operations'];

    let rolesToFetch: string[] = [];
    if (department === 'sales') {
      rolesToFetch = salesRoles;
    } else if (department === 'finance') {
      rolesToFetch = financeRoles;
    } else if (department === 'operations') {
      rolesToFetch = operationsRoles;
    } else {
      rolesToFetch = [...salesRoles, ...financeRoles, ...operationsRoles];
    }

    // Build user query filter
    const userWhere: any = {
      isActive: true,
      role: { in: rolesToFetch },
    };

    if (designationFilter !== 'all') {
      if (!isNaN(parseInt(designationFilter, 10))) {
        userWhere.designationId = parseInt(designationFilter, 10);
      } else {
        userWhere.designation = {
          name: { contains: designationFilter, mode: 'insensitive' },
        };
      }
    }

    // Fetch active users with designation & department
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photograph: true,
        designation: {
          select: { id: true, name: true }
        },
        department: {
          select: { id: true, name: true }
        }
      },
    });

    const leaderboardPromises = users.map(async (user) => {
      const subordinates = await getSubordinateIds(user.id);
      const teamUserIds = [user.id, ...subordinates];

      // 1. Leads Worked / Updated by user/team
      const leadsWorkedCount = await prisma.leadActivityLog.count({
        where: {
          userId: { in: teamUserIds },
          fromStatus: { not: null },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 2. Meetings Booked
      const meetingsBookedCount = await prisma.meetingBooking.count({
        where: {
          assignedExecutiveId: { in: teamUserIds },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 3. Meetings Conducted / Recorded
      const meetingsConductedCount = await prisma.meetingBooking.count({
        where: {
          assignedExecutiveId: { in: teamUserIds },
          OR: [
            { meetingStartedAt: { not: null } },
            { meetingEndedAt: { not: null } },
            { audioRecordingPath: { not: null } }
          ],
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 4. Sales Closed / Done (Stage 13)
      const salesClosedCount = await prisma.leadActivityLog.count({
        where: {
          userId: { in: teamUserIds },
          toStatus: 13,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 5. Orders Punched
      const ordersPunchedCount = await prisma.order.count({
        where: {
          submittedById: { in: teamUserIds },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 6. Finance Orders Verified
      const financeVerifiedCount = await prisma.order.count({
        where: {
          financeProcessedById: { in: teamUserIds },
          status: { in: ['finance_verified', 'ops_assigned', 'completed'] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 7. Ledger Activities
      const ledgerActivitiesCount = await prisma.leadActivityLog.count({
        where: {
          userId: { in: teamUserIds },
          lead: { order: { financeProcessedById: { in: teamUserIds } } },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 8. Operations Milestones (Deliveries, Installations, Commissioning)
      const deliveriesCount = await prisma.order.count({
        where: {
          assignedOpsId: { in: teamUserIds },
          isDelivered: true,
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        },
      });

      const installationsCount = await prisma.order.count({
        where: {
          assignedOpsId: { in: teamUserIds },
          isInstalled: true,
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        },
      });

      const opsMilestonesCount = await prisma.order.count({
        where: {
          AND: [
            {
              OR: [
                { assignedOpsId: { in: teamUserIds } },
                { lead: { OR: [{ assignedConsultantId: { in: teamUserIds } }, { assignedTlId: { in: teamUserIds } }, { assignedManagerId: { in: teamUserIds } }] } }
              ],
            },
            {
              OR: [{ isDelivered: true }, { isInstalled: true }, { isCommissioned: true }],
            },
          ],
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        },
      });

      // Determine primary metric value for ranking based on department or selection
      let primaryWorkValue = 0;
      let primaryMetricLabel = 'Sales Closed';

      if (metricFilter === 'salesClosed' || (metricFilter === 'auto' && (department === 'sales' || department === 'all'))) {
        primaryWorkValue = salesClosedCount;
        primaryMetricLabel = 'Sales Closed';
      } else if (metricFilter === 'meetingsConducted') {
        primaryWorkValue = meetingsConductedCount;
        primaryMetricLabel = 'Meetings Recorded';
      } else if (metricFilter === 'ordersVerified' || (metricFilter === 'auto' && department === 'finance')) {
        primaryWorkValue = financeVerifiedCount;
        primaryMetricLabel = 'Orders Verified';
      } else if (metricFilter === 'opsMilestones' || (metricFilter === 'auto' && department === 'operations')) {
        primaryWorkValue = opsMilestonesCount;
        primaryMetricLabel = 'Ops Milestones';
      } else if (metricFilter === 'leadsWorked') {
        primaryWorkValue = leadsWorkedCount;
        primaryMetricLabel = 'Leads Worked';
      } else {
        primaryWorkValue = salesClosedCount;
        primaryMetricLabel = 'Sales Closed';
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        photograph: user.photograph,
        designation: user.designation?.name || user.role.toUpperCase(),
        department: user.department?.name || 'Sales',
        teamSize: teamUserIds.length,
        primaryWorkValue,
        primaryMetricLabel,
        breakdown: {
          salesClosed: salesClosedCount,
          meetingsConducted: meetingsConductedCount,
          meetingsBooked: meetingsBookedCount,
          leadsWorked: leadsWorkedCount,
          ordersPunched: ordersPunchedCount,
          financeVerified: financeVerifiedCount,
          ledgerActivities: ledgerActivitiesCount,
          deliveriesCompleted: deliveriesCount,
          installationsCompleted: installationsCount,
          opsMilestones: opsMilestonesCount,
        },
      };
    });

    const leaderboardData = await Promise.all(leaderboardPromises);

    // Sort by primary work value descending, secondary by meetingsConducted/leadsWorked, then name
    leaderboardData.sort((a, b) => {
      if (b.primaryWorkValue !== a.primaryWorkValue) {
        return b.primaryWorkValue - a.primaryWorkValue;
      }
      if (b.breakdown.meetingsConducted !== a.breakdown.meetingsConducted) {
        return b.breakdown.meetingsConducted - a.breakdown.meetingsConducted;
      }
      return a.name.localeCompare(b.name);
    });

    // Also fetch available designations list for filter dropdown
    const availableDesignations = await prisma.designation.findMany({
      select: { id: true, name: true, departmentId: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: leaderboardData,
      designations: availableDesignations,
    });
  } catch (error: any) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
