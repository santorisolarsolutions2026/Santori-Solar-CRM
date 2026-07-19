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

    const leadWhere: any = {};
    if (userPayload.role !== 'admin' && userPayload.role !== 'director') {
      const { getSubordinateIds, getAncestorIds } = await import('@/lib/hierarchy');
      const subIds = await getSubordinateIds(userPayload.id);
      const ancestorIds = await getAncestorIds(userPayload.id);
      const allowedIds = [userPayload.id, ...subIds, ...ancestorIds];
      leadWhere.OR = [
        { assignedConsultantId: { in: allowedIds } },
        { assignedTlId: { in: allowedIds } },
        { assignedManagerId: { in: allowedIds } },
        { createdById: userPayload.id },
      ];
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (userDeptName === 'Finance' || baseRole === 'finance') {
      // Finance metrics query
      const financeStatuses = ['submitted', 'finance_verified', 'ops_assigned', 'completed'];
      const ordersWhere: any = {
        status: { in: financeStatuses }
      };

      if (userPayload.role !== 'admin' && userPayload.role !== 'director' && baseRole !== 'finance_head') {
        ordersWhere.lead = leadWhere;
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
            createdAt: { gte: startOfMonth }
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
        ordersWhere.lead = leadWhere;
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
            status: 9,
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

      const conversionRate = totalFreshLeads > 0 ? parseFloat(((salesDoneThisMonth / totalFreshLeads) * 100).toFixed(2)) : 0.0;

      return NextResponse.json({
        success: true,
        data: {
          totalLeads: totalFreshLeads,
          activeLeads,
          meetingsBookedThisMonth,
          meetingsDoneThisMonth,
          salesDoneThisMonth,
          todayFollowUps,
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
