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
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view employee audit details.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const userIdStr = url.searchParams.get('userId');
    const type = url.searchParams.get('type') || 'leads_worked';
    const startStr = url.searchParams.get('startDate');
    const endStr = url.searchParams.get('endDate');
    const startTimeStr = url.searchParams.get('startTime') || '00:00';
    const endTimeStr = url.searchParams.get('endTime') || '23:59';

    if (!userIdStr) {
      return NextResponse.json({ success: false, message: 'Missing userId parameter.' }, { status: 400 });
    }
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid userId.' }, { status: 400 });
    }

    // Fetch target employee details
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: { select: { name: true } },
        designation: { select: { name: true } }
      }
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found.' }, { status: 404 });
    }

    // Resolve hierarchy user IDs (Employee + all Subordinates)
    const subordinateIds = await getSubordinateIds(userId);
    const teamUserIds = [userId, ...subordinateIds];

    let dateRangeFilter: any = null;
    if (startStr && endStr) {
      const sDate = new Date(`${startStr}T${startTimeStr}:00`);
      const eDate = new Date(`${endStr}T${endTimeStr}:59.999`);
      dateRangeFilter = { gte: sDate, lte: eDate };
    }

    let results: any[] = [];

    // 1. LEADS WORKED
    if (type === 'leads_worked') {
      const logs = await prisma.leadActivityLog.findMany({
        where: {
          userId: { in: teamUserIds },
          fromStatus: { not: null },
          ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {})
        },
        include: {
          user: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true, status: true, city: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      results = logs.map((log) => ({
        id: log.id,
        leadId: log.lead?.id,
        leadCode: log.lead?.leadCode,
        customerName: log.lead?.customerName,
        executedBy: {
          id: log.user.id,
          name: log.user.name,
          role: log.user.role.toUpperCase(),
          designation: log.user.designation?.name || log.user.role.toUpperCase()
        },
        detail1: `Stage transition: Stage ${log.fromStatus || 'New'} → Stage ${log.toStatus}`,
        detail2: log.remark || `Stage updated for ${log.lead?.customerName || 'Lead'}`,
        timestamp: log.createdAt,
        date: new Date(log.createdAt).toLocaleString('en-IN')
      }));
    }

    // 2. MEETINGS BOOKED
    else if (type === 'meetings_booked') {
      const meetings = await prisma.meetingBooking.findMany({
        where: {
          assignedExecutiveId: { in: teamUserIds },
          ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {})
        },
        include: {
          executive: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      results = meetings.map((m) => ({
        id: m.id,
        leadId: m.lead?.id,
        leadCode: m.lead?.leadCode,
        customerName: m.lead?.customerName,
        executedBy: {
          id: m.executive.id,
          name: m.executive.name,
          role: m.executive.role.toUpperCase(),
          designation: m.executive.designation?.name || m.executive.role.toUpperCase()
        },
        detail1: `Meeting scheduled for ${m.meetingDate} at ${m.meetingTime}`,
        detail2: m.meetingCity ? `Location: ${m.meetingCity} (Pin: ${m.meetingPinCode || 'N/A'})` : `Customer avg monthly bill: ₹${m.avgMonthlyBill.toLocaleString('en-IN')}`,
        timestamp: m.createdAt,
        date: m.meetingDate
      }));
    }

    // 3. MEETINGS RECORDED
    else if (type === 'meetings_recorded') {
      const meetings = await prisma.meetingBooking.findMany({
        where: {
          assignedExecutiveId: { in: teamUserIds },
          OR: [
            { meetingStartedAt: { not: null } },
            { meetingEndedAt: { not: null } },
            { audioRecordingPath: { not: null } }
          ],
          ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {})
        },
        include: {
          executive: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      results = meetings.map((m) => ({
        id: m.id,
        leadId: m.lead?.id,
        leadCode: m.lead?.leadCode,
        customerName: m.lead?.customerName,
        executedBy: {
          id: m.executive.id,
          name: m.executive.name,
          role: m.executive.role.toUpperCase(),
          designation: m.executive.designation?.name || m.executive.role.toUpperCase()
        },
        detail1: m.audioRecordingPath ? `Audio recorded & uploaded (${m.meetingDurationSec ? `${Math.floor(m.meetingDurationSec / 60)}m ${m.meetingDurationSec % 60}s` : 'audio file logged'})` : `Site visit commenced & completed`,
        detail2: m.meetingStartedAt ? `Session started at ${new Date(m.meetingStartedAt).toLocaleTimeString('en-IN')}` : `Site visit logged`,
        timestamp: m.meetingStartedAt || m.createdAt,
        date: m.meetingDate
      }));
    }

    // 4. SALES DONE
    else if (type === 'sales_done') {
      const saleLogs = await prisma.leadActivityLog.findMany({
        where: {
          userId: { in: teamUserIds },
          toStatus: 13,
          ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {})
        },
        include: {
          user: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: {
            select: {
              id: true,
              leadCode: true,
              customerName: true,
              city: true,
              order: { select: { totalValue: true, systemSizeKw: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      results = saleLogs.map((log) => ({
        id: log.id,
        leadId: log.lead?.id,
        leadCode: log.lead?.leadCode,
        customerName: log.lead?.customerName,
        executedBy: {
          id: log.user.id,
          name: log.user.name,
          role: log.user.role.toUpperCase(),
          designation: log.user.designation?.name || log.user.role.toUpperCase()
        },
        detail1: `Sale Done: System size ${log.lead?.order?.systemSizeKw || 'N/A'} kW`,
        detail2: log.remark || `Customer deal closed successfully`,
        value: log.lead?.order?.totalValue || 0,
        timestamp: log.createdAt,
        date: new Date(log.createdAt).toLocaleString('en-IN')
      }));
    }

    // 5. ORDERS PUNCHED
    else if (type === 'orders_punched') {
      const orders = await prisma.order.findMany({
        where: {
          submittedById: { in: teamUserIds },
          ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {})
        },
        include: {
          submittedBy: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      results = orders.map((o) => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        executedBy: {
          id: o.submittedBy.id,
          name: o.submittedBy.name,
          role: o.submittedBy.role.toUpperCase(),
          designation: o.submittedBy.designation?.name || o.submittedBy.role.toUpperCase()
        },
        detail1: `Order generated: System ${o.systemSizeKw} kW`,
        detail2: `Current order status: ${o.status.toUpperCase()}`,
        value: o.totalValue,
        timestamp: o.createdAt,
        date: new Date(o.createdAt).toLocaleDateString('en-IN')
      }));
    }

    // 6. ORDERS VERIFIED
    else if (type === 'orders_verified') {
      const orders = await prisma.order.findMany({
        where: {
          financeProcessedById: { in: teamUserIds },
          status: { in: ['finance_verified', 'ops_assigned', 'completed'] },
          ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {})
        },
        include: {
          financeProcessedBy: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      results = orders.map((o) => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        executedBy: o.financeProcessedBy ? {
          id: o.financeProcessedBy.id,
          name: o.financeProcessedBy.name,
          role: o.financeProcessedBy.role.toUpperCase(),
          designation: o.financeProcessedBy.designation?.name || o.financeProcessedBy.role.toUpperCase()
        } : { id: userId, name: employee.name, role: employee.role.toUpperCase(), designation: employee.designation?.name || 'Finance' },
        detail1: `Order verification completed: Size ${o.systemSizeKw} kW`,
        detail2: `Downpayment & documents verified`,
        value: o.totalValue,
        timestamp: o.updatedAt,
        date: new Date(o.updatedAt).toLocaleDateString('en-IN')
      }));
    }

    // 7. LEDGER ACTIVITIES
    else if (type === 'ledger_activities') {
      const payments = await prisma.payment.findMany({
        where: {
          recordedById: { in: teamUserIds },
          ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {})
        },
        include: {
          recordedBy: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          order: {
            include: {
              lead: { select: { id: true, leadCode: true, customerName: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      results = payments.map((p) => ({
        id: p.id,
        leadId: p.order?.lead?.id,
        leadCode: p.order?.lead?.leadCode,
        customerName: p.order?.lead?.customerName,
        executedBy: {
          id: p.recordedBy.id,
          name: p.recordedBy.name,
          role: p.recordedBy.role.toUpperCase(),
          designation: p.recordedBy.designation?.name || p.recordedBy.role.toUpperCase()
        },
        detail1: `Payment recorded: ₹${p.amount.toLocaleString('en-IN')} via ${p.paymentMethod.toUpperCase()}`,
        detail2: p.isDiscarded ? `Discarded: "${p.discardReason || 'N/A'}"` : `Ref: ${p.transactionRef || 'N/A'}`,
        value: p.amount,
        timestamp: p.createdAt,
        date: new Date(p.createdAt).toLocaleDateString('en-IN')
      }));
    }

    // 8. DELIVERIES
    else if (type === 'deliveries_completed') {
      const orders = await prisma.order.findMany({
        where: {
          isDelivered: true,
          OR: [
            { assignedOpsId: { in: teamUserIds } },
            { lead: { OR: [{ assignedConsultantId: { in: teamUserIds } }, { assignedTlId: { in: teamUserIds } }, { assignedManagerId: { in: teamUserIds } }] } }
          ],
          ...(dateRangeFilter ? { actualDeliveryAt: dateRangeFilter } : {})
        },
        include: {
          assignedOps: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });

      results = orders.map((o) => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        executedBy: o.assignedOps ? {
          id: o.assignedOps.id,
          name: o.assignedOps.name,
          role: o.assignedOps.role.toUpperCase(),
          designation: o.assignedOps.designation?.name || 'Operations'
        } : { id: userId, name: employee.name, role: employee.role.toUpperCase(), designation: employee.designation?.name || 'Operations' },
        detail1: `Solar equipment delivered: ${o.systemSizeKw} kW package`,
        detail2: `Delivery verified on site`,
        value: o.totalValue,
        timestamp: o.actualDeliveryAt || o.updatedAt,
        date: new Date(o.actualDeliveryAt || o.updatedAt).toLocaleDateString('en-IN')
      }));
    }

    // 9. INSTALLATIONS
    else if (type === 'installations_completed') {
      const orders = await prisma.order.findMany({
        where: {
          isInstalled: true,
          OR: [
            { assignedOpsId: { in: teamUserIds } },
            { lead: { OR: [{ assignedConsultantId: { in: teamUserIds } }, { assignedTlId: { in: teamUserIds } }, { assignedManagerId: { in: teamUserIds } }] } }
          ],
          ...(dateRangeFilter ? { actualInstallationAt: dateRangeFilter } : {})
        },
        include: {
          assignedOps: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });

      results = orders.map((o) => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        executedBy: o.assignedOps ? {
          id: o.assignedOps.id,
          name: o.assignedOps.name,
          role: o.assignedOps.role.toUpperCase(),
          designation: o.assignedOps.designation?.name || 'Operations'
        } : { id: userId, name: employee.name, role: employee.role.toUpperCase(), designation: employee.designation?.name || 'Operations' },
        detail1: `Solar structural & electrical installation complete: ${o.systemSizeKw} kW`,
        detail2: `Module mounting & wiring completed`,
        value: o.totalValue,
        timestamp: o.actualInstallationAt || o.updatedAt,
        date: new Date(o.actualInstallationAt || o.updatedAt).toLocaleDateString('en-IN')
      }));
    }

    // 10. COMMISSIONED
    else if (type === 'commissioned_completed') {
      const orders = await prisma.order.findMany({
        where: {
          isCommissioned: true,
          OR: [
            { assignedOpsId: { in: teamUserIds } },
            { lead: { OR: [{ assignedConsultantId: { in: teamUserIds } }, { assignedTlId: { in: teamUserIds } }, { assignedManagerId: { in: teamUserIds } }] } }
          ],
          ...(dateRangeFilter ? { actualCommissionedAt: dateRangeFilter } : {})
        },
        include: {
          assignedOps: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });

      results = orders.map((o) => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        executedBy: o.assignedOps ? {
          id: o.assignedOps.id,
          name: o.assignedOps.name,
          role: o.assignedOps.role.toUpperCase(),
          designation: o.assignedOps.designation?.name || 'Operations'
        } : { id: userId, name: employee.name, role: employee.role.toUpperCase(), designation: employee.designation?.name || 'Operations' },
        detail1: `Plant commissioned & net-meter grid connected: ${o.systemSizeKw} kW`,
        detail2: `Plant operational & generating solar power`,
        value: o.totalValue,
        timestamp: o.actualCommissionedAt || o.updatedAt,
        date: new Date(o.actualCommissionedAt || o.updatedAt).toLocaleDateString('en-IN')
      }));
    }

    // 11. SUBSIDIES APPLIED
    else if (type === 'subsidies_applied') {
      const orders = await prisma.order.findMany({
        where: {
          isSubsidyApplied: true,
          OR: [
            { assignedOpsId: { in: teamUserIds } },
            { lead: { OR: [{ assignedConsultantId: { in: teamUserIds } }, { assignedTlId: { in: teamUserIds } }, { assignedManagerId: { in: teamUserIds } }] } }
          ],
          ...(dateRangeFilter ? { actualSubsidyAppliedAt: dateRangeFilter } : {})
        },
        include: {
          assignedOps: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
          lead: { select: { id: true, leadCode: true, customerName: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });

      results = orders.map((o) => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        executedBy: o.assignedOps ? {
          id: o.assignedOps.id,
          name: o.assignedOps.name,
          role: o.assignedOps.role.toUpperCase(),
          designation: o.assignedOps.designation?.name || 'Operations'
        } : { id: userId, name: employee.name, role: employee.role.toUpperCase(), designation: employee.designation?.name || 'Operations' },
        detail1: `Government subsidy application filed: Amount ₹${o.subsidyAmount?.toLocaleString('en-IN') || 'N/A'}`,
        detail2: `Subsidy documentation submitted to Discom`,
        value: o.subsidyAmount || 0,
        timestamp: o.actualSubsidyAppliedAt || o.updatedAt,
        date: new Date(o.actualSubsidyAppliedAt || o.updatedAt).toLocaleDateString('en-IN')
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        employee,
        teamSize: teamUserIds.length,
        results
      }
    });
  } catch (error: any) {
    console.error('Employee audit details API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
