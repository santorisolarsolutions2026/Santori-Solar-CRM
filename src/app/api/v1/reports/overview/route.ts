import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions, getUserSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: userRole, department, permissions: userPermissions } = await getUserSession(userPayload.id);
    const userDeptName = department?.name || '';
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;

    const hasAccess = userPermissions.includes('reports:view') ||
                      userPermissions.includes('leads:view') ||
                      userPermissions.includes('leads:create') ||
                      userPermissions.includes('leads:edit') ||
                      userPermissions.includes('orders:view') ||
                      userPermissions.includes('orders:create');

    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view reports.' }, { status: 403 });
    }

    const { getLeadVisibilityCondition } = await import('@/lib/hierarchy');
    const leadWhere: any = await getLeadVisibilityCondition(userPayload.id, userRole, userPermissions);

    const url = new URL(req.url);
    const stateFilter = url.searchParams.get('state');
    const cityFilter = url.searchParams.get('city');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (stateFilter) {
      leadWhere.state = { equals: stateFilter, mode: 'insensitive' };
    }
    if (cityFilter) {
      leadWhere.city = { equals: cityFilter, mode: 'insensitive' };
    }

    let dateRangeFilter: any = null;
    if (startDate && endDate) {
      const sDate = new Date(`${startDate}T00:00:00`);
      const eDate = new Date(`${endDate}T23:59:59.999`);
      dateRangeFilter = { gte: sDate, lte: eDate };
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayDateStr = new Date().toLocaleDateString('en-CA');

    if (userDeptName === 'Finance' || baseRole === 'finance') {
      // Finance metrics query
      const financeStatuses = ['submitted', 'finance_verified', 'ops_assigned', 'completed'];
      const ordersWhere: any = {
        status: { in: financeStatuses }
      };

      if (userPayload.role !== 'admin' && userPayload.role !== 'director' && baseRole !== 'finance_head') {
        const { getSubordinateIds } = await import('@/lib/hierarchy');
        const subIds = await getSubordinateIds(userPayload.id);
        const allowedFinanceIds = [userPayload.id, ...subIds];
        ordersWhere.assignedFinanceId = { in: allowedFinanceIds };
      }

      if (stateFilter || cityFilter) {
        ordersWhere.lead = {
          state: stateFilter ? { equals: stateFilter, mode: 'insensitive' } : undefined,
          city: cityFilter ? { equals: cityFilter, mode: 'insensitive' } : undefined,
        };
      }
      if (dateRangeFilter) {
        ordersWhere.createdAt = dateRangeFilter;
      }

      const [totalOrdersPending, ordersVerified, ordersList, payments] = await Promise.all([
        prisma.order.count({
          where: {
            ...ordersWhere,
            status: 'submitted',
          }
        }),
        prisma.order.count({
          where: {
            ...ordersWhere,
            status: 'finance_verified',
          }
        }),
        prisma.order.findMany({
          where: ordersWhere,
          select: {
            id: true,
            totalValue: true,
          }
        }),
        prisma.payment.findMany({
          where: {
            order: ordersWhere
          },
          select: {
            amount: true
          }
        })
      ]);

      const totalLedgerValue = ordersList.reduce((sum, o) => sum + (o.totalValue || 0), 0);
      const totalPaymentsCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const outstandingBalance = Math.max(0, totalLedgerValue - totalPaymentsCollected);

      return NextResponse.json({
        success: true,
        data: {
          totalOrdersPending,
          ordersVerified,
          totalLedgerValue,
          totalPaymentsCollected,
          outstandingBalance,
        }
      });
    } else if (userDeptName === 'Operations' || baseRole === 'operations') {
      // Operations metrics query
      const opsStatuses = ['finance_verified', 'ops_assigned', 'completed'];
      const ordersWhere: any = {
        status: { in: opsStatuses }
      };

      if (userPayload.role !== 'admin' && userPayload.role !== 'director' && baseRole !== 'operations_head') {
        const { getSubordinateIds } = await import('@/lib/hierarchy');
        const subIds = await getSubordinateIds(userPayload.id);
        const allowedOpsIds = [userPayload.id, ...subIds];
        ordersWhere.assignedOpsId = { in: allowedOpsIds };
      }

      if (stateFilter || cityFilter) {
        ordersWhere.lead = {
          state: stateFilter ? { equals: stateFilter, mode: 'insensitive' } : undefined,
          city: cityFilter ? { equals: cityFilter, mode: 'insensitive' } : undefined,
        };
      }
      if (dateRangeFilter) {
        ordersWhere.createdAt = dateRangeFilter;
      }

      const [totalJobsAssigned, deliveredJobs, installedJobs, commissionedJobs, subsidyJobs] = await Promise.all([
        prisma.order.count({ where: ordersWhere }),
        prisma.order.count({ where: { ...ordersWhere, isDelivered: true } }),
        prisma.order.count({ where: { ...ordersWhere, isInstalled: true } }),
        prisma.order.count({ where: { ...ordersWhere, isCommissioned: true } }),
        prisma.order.count({ where: { ...ordersWhere, isSubsidyApplied: true } }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          totalJobsAssigned,
          deliveredJobs,
          installedJobs,
          commissionedJobs,
          subsidyJobs,
        }
      });
    } else {
      // Sales/IT/Admin/PSA metrics query (standard)
      const [
        totalFreshLeads,
        activeLeads,
        meetingsBookedThisMonth,
        meetingsDoneThisMonth,
        salesDoneThisMonth,
        todayFollowUps,
        todayMeetings
      ] = await Promise.all([
        prisma.lead.count({
          where: {
            ...leadWhere,
            status: { gte: 1 },
            ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
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
            ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
          },
        }),
        prisma.meetingBooking.count({
          where: {
            lead: leadWhere,
            audioRecordingPath: { not: null },
            ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
          },
        }),
        prisma.lead.count({
          where: {
            ...leadWhere,
            status: 13,
            ...(dateRangeFilter ? { updatedAt: dateRangeFilter } : {}),
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
        prisma.meetingBooking.count({
          where: {
            meetingDate: todayDateStr,
            lead: {
              ...leadWhere,
              isActive: true,
              status: { lt: 13 },
            },
          },
        }),
      ]);

      const conversionRate = totalFreshLeads > 0 ? parseFloat(((salesDoneThisMonth / totalFreshLeads) * 100).toFixed(2)) : 0.0;
      const todayScheduledActions = todayFollowUps + todayMeetings;

      return NextResponse.json({
        success: true,
        data: {
          totalLeads: totalFreshLeads,
          activeLeads,
          meetingsBookedThisMonth,
          meetingsDoneThisMonth,
          salesDoneThisMonth,
          todayFollowUps: todayScheduledActions,
          conversionRate,
        },
      });
    }
  } catch (error: any) {
    console.error('Reports overview error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
