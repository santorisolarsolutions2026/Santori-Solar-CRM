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
    const designationFilter = url.searchParams.get('designation') || 'all';

    let dateRangeFilter: any = null;
    if (startStr && endStr) {
      const sDate = new Date(`${startStr}T${startTimeStr}:00`);
      const eDate = new Date(`${endStr}T${endTimeStr}:59.999`);
      dateRangeFilter = { gte: sDate, lte: eDate };
    }

    // Check if requesting user is Top Admin / Director / IT
    const reqUser = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: { role: true, department: { select: { name: true } } }
    });
    const isTopAdmin = userPayload.role === 'admin' ||
                       userPayload.role?.startsWith('admin:') ||
                       userPayload.role === 'director' ||
                       reqUser?.department?.name?.toLowerCase().trim() === 'it';

    // Resolve hierarchy for requesting user
    const requestingUserSubs = await getSubordinateIds(userPayload.id);
    const allowedHierarchyIds = isTopAdmin ? null : new Set([userPayload.id, ...requestingUserSubs]);

    // Fetch active employees within hierarchy scope
    const employees = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(allowedHierarchyIds ? { id: { in: Array.from(allowedHierarchyIds) } } : {})
      },
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true, level: true } }
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
          lead: {
            select: {
              assignedConsultantId: true,
              assignedTlId: true,
              assignedManagerId: true,
            }
          }
        }
      }),
      prisma.payment.findMany({
        where: paymentDateFilter,
        select: {
          id: true,
          amount: true,
          recordedById: true,
          isDiscarded: true,
          createdAt: true,
        }
      })
    ]);

    // Process metric calculation per employee + team hierarchy
    const processedEmployees = employees.map((emp) => {
      const teamUserIdsArr = userHierarchyMap.get(emp.id) || [emp.id];
      const teamUserIds = new Set(teamUserIdsArr);
      const isSupervisor = teamUserIdsArr.length > 1;

      // --- SALES METRICS ---
      // 1. Number of Leads Worked Upon
      const teamLogs = allLogs.filter((log) => teamUserIds.has(log.userId) && log.fromStatus !== null);
      const uniqueLeadsWorked = new Set(teamLogs.map((l) => l.leadId));
      const leadsWorked = uniqueLeadsWorked.size;

      // 2. Number of Meetings Booked
      const teamMeetingsBooked = allMeetings.filter((m) => m.assignedExecutiveId && teamUserIds.has(m.assignedExecutiveId));
      const meetingsBooked = teamMeetingsBooked.length;

      // 3. Number of Meetings Recorded
      const teamMeetingsRecorded = allMeetings.filter(
        (m) => m.assignedExecutiveId && teamUserIds.has(m.assignedExecutiveId) && (m.meetingStartedAt || m.meetingEndedAt || m.audioRecordingPath)
      );
      const meetingsRecorded = teamMeetingsRecorded.length;

      // 4. Number of Sales Done (Stage 13)
      const teamSalesLogs = teamLogs.filter((l) => l.toStatus === 13);
      const uniqueSalesLeads = new Set(teamSalesLogs.map((l) => l.leadId));
      const salesDone = uniqueSalesLeads.size;

      // 5. Number of Orders Punched
      const teamPunchedOrders = allOrders.filter((o) => teamUserIds.has(o.submittedById));
      const ordersPunched = teamPunchedOrders.length;
      const ordersPunchedValue = teamPunchedOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);

      // 6. Sale Conversion Rate (%)
      const saleConversionRate = meetingsRecorded > 0 ? Math.round((salesDone / meetingsRecorded) * 100) : (salesDone > 0 ? 100 : 0);

      // --- FINANCE METRICS ---
      // 1. Number of Orders Verified
      const teamVerifiedOrders = allOrders.filter(
        (o) => o.financeProcessedById && teamUserIds.has(o.financeProcessedById) && ['finance_verified', 'ops_assigned', 'completed'].includes(o.status)
      );
      const ordersVerified = teamVerifiedOrders.length;
      const ordersVerifiedValue = teamVerifiedOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);

      // 2. Number of Ledger Activities
      const ledgerActivities = teamLogs.filter((l) => {
        const ord = allOrders.find((o) => o.leadId === l.leadId);
        return ord && ord.financeProcessedById && teamUserIds.has(ord.financeProcessedById);
      }).length;

      // 3. Total Payments Amount Handled
      const teamPayments = allPayments.filter((p) => teamUserIds.has(p.recordedById) && !p.isDiscarded);
      const paymentsAmount = teamPayments.reduce((sum, p) => sum + p.amount, 0);

      // 4. Discarded Payments Count
      const discardedPaymentsCount = allPayments.filter((p) => teamUserIds.has(p.recordedById) && p.isDiscarded).length;

      // --- OPERATIONS METRICS ---
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
        department: emp.department?.name || 'Sales',
        designation: emp.designation?.name || emp.role.toUpperCase(),
        role: emp.role,
        isSupervisor,
        teamSize: teamUserIds.size,
        metrics: {
          leadsWorked,
          meetingsBooked,
          meetingsRecorded,
          salesDone,
          ordersPunched,
          ordersPunchedValue,
          saleConversionRate,
          ordersVerified,
          ordersVerifiedValue,
          ledgerActivities,
          paymentsAmount,
          discardedPaymentsCount,
          deliveriesCompleted,
          installationsCompleted,
          commissionedCompleted,
          subsidiesApplied,
        },
      };
    });

    // Optional designation filter
    let filteredEmployees = processedEmployees;
    if (designationFilter !== 'all') {
      filteredEmployees = processedEmployees.filter(
        (emp) => emp.designation.toLowerCase() === designationFilter.toLowerCase()
      );
    }

    // Group employees by true Department (Sales, Finance, Operations, Other)
    const departments: Record<string, typeof processedEmployees> = {
      Sales: [],
      Finance: [],
      Operations: [],
      Other: [],
    };

    filteredEmployees.forEach((emp) => {
      const deptLower = (emp.department || '').toLowerCase();
      const roleLower = (emp.role || '').toLowerCase();

      if (deptLower.includes('finance') || roleLower.includes('finance')) {
        departments['Finance'].push(emp);
      } else if (deptLower.includes('operations') || roleLower.includes('ops')) {
        departments['Operations'].push(emp);
      } else if (deptLower.includes('sales') || roleLower.includes('sales') || roleLower.includes('consultant') || roleLower.includes('psa') || roleLower.includes('manager') || roleLower.includes('tl') || roleLower.includes('head') || roleLower.includes('admin')) {
        departments['Sales'].push(emp);
      } else {
        departments['Other'].push(emp);
      }
    });

    // Extract unique designation names for UI filter dropdown
    const availableDesignations = Array.from(
      new Set(processedEmployees.map((e) => e.designation))
    ).sort();

    return NextResponse.json({
      success: true,
      data: {
        departments,
        designations: availableDesignations,
        totalEmployees: filteredEmployees.length,
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
