import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { getSubordinateIds } from '@/lib/hierarchy';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasAccess = userPermissions.includes('reports:view') || userPayload.role === 'admin' || userPayload.role === 'director';
    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view employee audit logs.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const startStr = url.searchParams.get('startDate');
    const endStr = url.searchParams.get('endDate');
    const startTimeStr = url.searchParams.get('startTime') || '00:00';
    const endTimeStr = url.searchParams.get('endTime') || '23:59';

    let dateRangeFilter: any = null;
    if (startStr && endStr) {
      const sDate = new Date(`${startStr}T${startTimeStr}:00`);
      const eDate = new Date(`${endStr}T${endTimeStr}:59.999`);
      dateRangeFilter = { gte: sDate, lte: eDate };
    }

    // Fetch active employees with department and designation
    const employees = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true, level: true } }
      },
      orderBy: { name: 'asc' },
    });

    // Build sub-ordinate mapping for all users
    const userHierarchyMap = new Map<number, number[]>();
    await Promise.all(
      employees.map(async (emp) => {
        const subs = await getSubordinateIds(emp.id);
        userHierarchyMap.set(emp.id, [emp.id, ...subs]);
      })
    );

    // Build date filters for queries
    const logDateFilter = dateRangeFilter ? { createdAt: dateRangeFilter } : {};
    const meetingDateFilter = dateRangeFilter ? { createdAt: dateRangeFilter } : {};
    const orderDateFilter = dateRangeFilter ? { createdAt: dateRangeFilter } : {};
    const paymentDateFilter = dateRangeFilter ? { createdAt: dateRangeFilter } : {};

    // Fetch master dataset for calculation
    const [allLogs, allMeetings, allOrders, allPayments] = await Promise.all([
      prisma.leadActivityLog.findMany({
        where: logDateFilter,
        select: {
          id: true,
          leadId: true,
          userId: true,
          fromStatus: true,
          toStatus: true,
          createdAt: true,
        }
      }),
      prisma.meetingBooking.findMany({
        where: meetingDateFilter,
        select: {
          id: true,
          leadId: true,
          assignedExecutiveId: true,
          meetingStartedAt: true,
          meetingEndedAt: true,
          audioRecordingPath: true,
          createdAt: true,
        }
      }),
      prisma.order.findMany({
        where: orderDateFilter,
        select: {
          id: true,
          leadId: true,
          status: true,
          totalValue: true,
          submittedById: true,
          financeProcessedById: true,
          assignedFinanceId: true,
          assignedOpsId: true,
          isDelivered: true,
          actualDeliveryAt: true,
          isInstalled: true,
          actualInstallationAt: true,
          isCommissioned: true,
          actualCommissionedAt: true,
          isSubsidyApplied: true,
          actualSubsidyAppliedAt: true,
          createdAt: true,
          lead: {
            select: {
              assignedConsultantId: true,
              assignedTlId: true,
              assignedManagerId: true,
              status: true,
            }
          }
        }
      }),
      prisma.payment.findMany({
        where: paymentDateFilter,
        select: {
          id: true,
          recordedById: true,
          amount: true,
          isDiscarded: true,
          createdAt: true,
        }
      })
    ]);

    // Compute metrics for each employee (including subordinate aggregation)
    const processedEmployees = employees.map((emp) => {
      const teamUserIds = new Set(userHierarchyMap.get(emp.id) || [emp.id]);
      const isSupervisor = teamUserIds.size > 1;

      // 1. Sales: Number of Leads Worked Upon (distinct leads where a stage change was executed by employee or subordinates)
      const teamStageLogs = allLogs.filter((l) => teamUserIds.has(l.userId) && l.fromStatus !== l.toStatus);
      const workedLeadIds = new Set(teamStageLogs.map((l) => l.leadId));
      const leadsWorked = workedLeadIds.size;

      // 2. Sales: Number of Meetings Booked
      const teamMeetingsBooked = allMeetings.filter((m) => teamUserIds.has(m.assignedExecutiveId));
      const meetingsBooked = teamMeetingsBooked.length;

      // 3. Sales: Number of Meetings Recorded (meeting with startedAt, endedAt, or audio recording)
      const teamMeetingsRecorded = teamMeetingsBooked.filter(
        (m) => m.meetingStartedAt !== null || m.meetingEndedAt !== null || !!m.audioRecordingPath
      );
      const meetingsRecorded = teamMeetingsRecorded.length;

      // 4. Sales: Number of Sales Done (Lead status = 13 OR log transition to status 13 by team)
      const teamSaleLogs = allLogs.filter((l) => teamUserIds.has(l.userId) && l.toStatus === 13);
      const saleLeadIdsFromLogs = new Set(teamSaleLogs.map((l) => l.leadId));
      const teamSaleOrders = allOrders.filter(
        (o) =>
          (o.lead?.assignedConsultantId && teamUserIds.has(o.lead.assignedConsultantId)) ||
          (o.lead?.assignedTlId && teamUserIds.has(o.lead.assignedTlId)) ||
          (o.lead?.assignedManagerId && teamUserIds.has(o.lead.assignedManagerId)) ||
          teamUserIds.has(o.submittedById) ||
          saleLeadIdsFromLogs.has(o.leadId)
      );
      const salesDoneLeads = new Set([
        ...Array.from(saleLeadIdsFromLogs),
        ...teamSaleOrders.filter((o) => o.lead?.status === 13).map((o) => o.leadId),
      ]);
      const salesDone = salesDoneLeads.size;

      // 5. Sales: Number of Orders Punched
      const teamOrdersPunched = allOrders.filter((o) => teamUserIds.has(o.submittedById));
      const ordersPunched = teamOrdersPunched.length;
      const ordersPunchedValue = teamOrdersPunched.reduce((sum, o) => sum + (o.totalValue || 0), 0);

      // 6. Sales: Sale Conversion Rate (Sales Done / Meetings Recorded)
      const saleConversionRate =
        meetingsRecorded > 0
          ? Math.round((salesDone / meetingsRecorded) * 100)
          : salesDone > 0
          ? 100
          : 0;

      // --- Finance Metrics ---
      // 1. Number of Orders Verified
      const teamOrdersVerified = allOrders.filter(
        (o) =>
          (o.financeProcessedById && teamUserIds.has(o.financeProcessedById)) ||
          (o.assignedFinanceId && teamUserIds.has(o.assignedFinanceId) && !['draft', 'submitted'].includes(o.status))
      );
      const ordersVerified = teamOrdersVerified.length;
      const ordersVerifiedValue = teamOrdersVerified.reduce((sum, o) => sum + (o.totalValue || 0), 0);

      // 2. Number of Ledger Activities & Payments
      const teamPayments = allPayments.filter((p) => teamUserIds.has(p.recordedById));
      const ledgerActivities = teamPayments.length;
      const validPayments = teamPayments.filter((p) => !p.isDiscarded);
      const paymentsAmount = validPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const discardedPaymentsCount = teamPayments.filter((p) => p.isDiscarded).length;

      // --- Operations Metrics ---
      // 1. Number of Deliveries
      const teamDeliveries = allOrders.filter(
        (o) => o.isDelivered && ((o.assignedOpsId && teamUserIds.has(o.assignedOpsId)) || (o.lead?.assignedConsultantId && teamUserIds.has(o.lead.assignedConsultantId)))
      );
      const deliveriesCompleted = teamDeliveries.length;

      // 2. Number of Installations
      const teamInstallations = allOrders.filter(
        (o) => o.isInstalled && ((o.assignedOpsId && teamUserIds.has(o.assignedOpsId)) || (o.lead?.assignedConsultantId && teamUserIds.has(o.lead.assignedConsultantId)))
      );
      const installationsCompleted = teamInstallations.length;

      // 3. Number of Plants Commissioned
      const teamCommissioned = allOrders.filter(
        (o) => o.isCommissioned && ((o.assignedOpsId && teamUserIds.has(o.assignedOpsId)) || (o.lead?.assignedConsultantId && teamUserIds.has(o.lead.assignedConsultantId)))
      );
      const commissionedCompleted = teamCommissioned.length;

      // 4. Number of Subsidies Applied
      const teamSubsidies = allOrders.filter(
        (o) => o.isSubsidyApplied && ((o.assignedOpsId && teamUserIds.has(o.assignedOpsId)) || (o.lead?.assignedConsultantId && teamUserIds.has(o.lead.assignedConsultantId)))
      );
      const subsidiesApplied = teamSubsidies.length;

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department?.name || 'Unassigned',
        designation: emp.designation?.name || emp.role.toUpperCase(),
        role: emp.role,
        isSupervisor,
        teamSize: teamUserIds.size,
        metrics: {
          // Sales metrics
          leadsWorked,
          meetingsBooked,
          meetingsRecorded,
          salesDone,
          ordersPunched,
          ordersPunchedValue,
          saleConversionRate,
          // Finance metrics
          ordersVerified,
          ordersVerifiedValue,
          ledgerActivities,
          paymentsAmount,
          discardedPaymentsCount,
          // Operations metrics
          deliveriesCompleted,
          installationsCompleted,
          commissionedCompleted,
          subsidiesApplied,
        },
      };
    });

    // Group employees by Department
    const departments: Record<string, typeof processedEmployees> = {
      Sales: [],
      Finance: [],
      Operations: [],
      Management: [],
      Other: [],
    };

    processedEmployees.forEach((emp) => {
      const roleLower = emp.role.toLowerCase();
      const deptLower = emp.department.toLowerCase();

      if (
        roleLower === 'admin' ||
        roleLower === 'director' ||
        roleLower === 'sales_head' ||
        roleLower === 'manager' ||
        roleLower === 'tl'
      ) {
        departments['Management'].push(emp);
      } else if (deptLower.includes('sales') || roleLower.includes('sales') || roleLower.includes('consultant') || roleLower.includes('psa')) {
        departments['Sales'].push(emp);
      } else if (deptLower.includes('finance') || roleLower.includes('finance')) {
        departments['Finance'].push(emp);
      } else if (deptLower.includes('operations') || roleLower.includes('ops')) {
        departments['Operations'].push(emp);
      } else {
        departments['Other'].push(emp);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        departments,
        totalEmployees: processedEmployees.length,
      },
    });
  } catch (error: any) {
    console.error('Employee audit API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
