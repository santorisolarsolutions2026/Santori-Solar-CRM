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

    // Fetch active users in these roles
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: rolesToFetch },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photograph: true,
      },
    });

    // Read weights from query parameters or default
    const wLeadsCreated = parseInt(searchParams.get('wLeadsCreated') || '5', 10);
    const wLogs = parseInt(searchParams.get('wLogs') || '2', 10);
    const wMeetingsBooked = parseInt(searchParams.get('wMeetingsBooked') || '10', 10);
    const wMeetingsConducted = parseInt(searchParams.get('wMeetingsConducted') || '20', 10);
    const wSalesClosed = parseInt(searchParams.get('wSalesClosed') || '50', 10);
    const wFinanceVerified = parseInt(searchParams.get('wFinanceVerified') || '30', 10);
    const wPaymentsRecorded = parseInt(searchParams.get('wPaymentsRecorded') || '20', 10);
    const wOpsMilestones = parseInt(searchParams.get('wOpsMilestones') || '25', 10);

    const leaderboardPromises = users.map(async (user) => {
      const subordinates = await getSubordinateIds(user.id);
      const teamUserIds = [user.id, ...subordinates];

      // 1. Leads Created by user/team
      const leadsCreatedCount = await prisma.lead.count({
        where: {
          createdById: { in: teamUserIds },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 2. Nurturing Updates / Stage Logs
      const logsCount = await prisma.leadActivityLog.count({
        where: {
          userId: { in: teamUserIds },
          fromStatus: { not: null },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 3. Meetings Booked
      const meetingsBookedCount = await prisma.meetingBooking.count({
        where: {
          assignedExecutiveId: { in: teamUserIds },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 4. Meetings Conducted / Recorded
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

      // 5. Sales Done (Lead status = 13 OR log transition to 13 by team)
      const salesClosedCount = await prisma.leadActivityLog.count({
        where: {
          userId: { in: teamUserIds },
          toStatus: 13,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 6. Finance Order Verified
      const financeVerifiedCount = await prisma.order.count({
        where: {
          financeProcessedById: { in: teamUserIds },
          status: { in: ['finance_verified', 'ops_assigned', 'completed'] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 7. Payments Recorded
      const paymentsRecordedCount = await prisma.payment.count({
        where: {
          recordedById: { in: teamUserIds },
          isDiscarded: false,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 8. Operations Milestones (Deliveries, Installations, Commissioning)
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

      // Calculate total points
      const points =
        leadsCreatedCount * wLeadsCreated +
        logsCount * wLogs +
        meetingsBookedCount * wMeetingsBooked +
        meetingsConductedCount * wMeetingsConducted +
        salesClosedCount * wSalesClosed +
        financeVerifiedCount * wFinanceVerified +
        paymentsRecordedCount * wPaymentsRecorded +
        opsMilestonesCount * wOpsMilestones;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        photograph: user.photograph,
        points,
        breakdown: {
          leadsCreated: leadsCreatedCount,
          followUps: logsCount,
          meetingsBooked: meetingsBookedCount,
          meetingsConducted: meetingsConductedCount,
          salesClosed: salesClosedCount,
          financeVerified: financeVerifiedCount,
          paymentsRecorded: paymentsRecordedCount,
          opsMilestones: opsMilestonesCount,
        },
      };
    });

    const leaderboardData = await Promise.all(leaderboardPromises);

    // Sort by points descending, then by name alphabetically
    leaderboardData.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      data: leaderboardData,
    });
  } catch (error: any) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
