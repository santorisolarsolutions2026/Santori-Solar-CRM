import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || 'month'; // week | month | all
    const department = searchParams.get('department') || 'all'; // all | sales | finance | operations

    // Determine date filter based on timeframe
    let dateFilter: any = undefined;
    const now = new Date();
    if (timeframe === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);
      dateFilter = { gte: oneWeekAgo };
    } else if (timeframe === 'month') {
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
    const wSalesTl = parseInt(searchParams.get('wSalesTl') || '15', 10);
    const wSalesManager = parseInt(searchParams.get('wSalesManager') || '10', 10);
    const wFinanceVerified = parseInt(searchParams.get('wFinanceVerified') || '30', 10);
    const wPaymentsRecorded = parseInt(searchParams.get('wPaymentsRecorded') || '20', 10);
    const wDocsUploaded = parseInt(searchParams.get('wDocsUploaded') || '10', 10);
    const wOpsMilestones = parseInt(searchParams.get('wOpsMilestones') || '25', 10);

    const leaderboardPromises = users.map(async (user) => {
      // 1. Leads Created
      const leadsCreatedCount = await prisma.lead.count({
        where: {
          createdById: user.id,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 2. Nurturing Updates / Remark Logged (Follow-ups, general logs, excluding key stage conversions to avoid double-counting)
      const logsCount = await prisma.leadActivityLog.count({
        where: {
          userId: user.id,
          toStatus: { notIn: [8, 9, 13] }, // exclude meeting booking/completion & order submission
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 3. Meetings Booked (status changed to 8)
      const meetingsBookedCount = await prisma.leadActivityLog.count({
        where: {
          userId: user.id,
          toStatus: 8,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 4. Meetings Conducted (assignedExecutiveId and meetingEndedAt is not null)
      const meetingsConductedCount = await prisma.meetingBooking.count({
        where: {
          assignedExecutiveId: user.id,
          meetingEndedAt: { not: null },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 5. Sales Closings & Overrides
      // A sale done is Lead status = 13 (Sale Done)
      const salesAsConsultant = await prisma.lead.count({
        where: {
          assignedConsultantId: user.id,
          status: 13,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      const salesAsTl = await prisma.lead.count({
        where: {
          assignedTlId: user.id,
          assignedConsultantId: { not: user.id }, // prevent double counting if they are the consultant
          status: 13,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      const salesAsManager = await prisma.lead.count({
        where: {
          assignedManagerId: user.id,
          assignedTlId: { not: user.id },
          assignedConsultantId: { not: user.id },
          status: 13,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 6. Finance Order Verified (Order processed by finance)
      const financeVerifiedCount = await prisma.order.count({
        where: {
          financeProcessedById: user.id,
          status: { in: ['finance_verified', 'ops_assigned', 'completed'] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 7. Payments Recorded
      const paymentsRecordedCount = await prisma.payment.count({
        where: {
          recordedById: user.id,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 8. Documents Uploaded
      const docsUploadedCount = await prisma.orderDocument.count({
        where: {
          uploadedById: user.id,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // 9. Operations Milestone Progressed
      // Count self-transitions at Stage 13 (Installation progress, commissioning, etc.)
      const opsStageUpdatesCount = await prisma.leadActivityLog.count({
        where: {
          userId: user.id,
          fromStatus: 13,
          toStatus: 13,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      });

      // Calculate total points based on Point Allocation Matrix
      const points = 
        (leadsCreatedCount * wLeadsCreated) +
        (logsCount * wLogs) +
        (meetingsBookedCount * wMeetingsBooked) +
        (meetingsConductedCount * wMeetingsConducted) +
        (salesAsConsultant * wSalesClosed) +
        (salesAsTl * wSalesTl) +
        (salesAsManager * wSalesManager) +
        (financeVerifiedCount * wFinanceVerified) +
        (paymentsRecordedCount * wPaymentsRecorded) +
        (docsUploadedCount * wDocsUploaded) +
        (opsStageUpdatesCount * wOpsMilestones);

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
          salesClosed: salesAsConsultant,
          salesSupervisedTl: salesAsTl,
          salesSupervisedManager: salesAsManager,
          financeVerified: financeVerifiedCount,
          paymentsRecorded: paymentsRecordedCount,
          documentsUploaded: docsUploadedCount,
          opsMilestones: opsStageUpdatesCount,
        }
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
