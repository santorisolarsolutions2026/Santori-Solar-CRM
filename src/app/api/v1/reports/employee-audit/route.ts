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
    const hasAccess = userPermissions.includes('reports:view') || userPayload.role === 'admin';
    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view employee audit logs.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const startStr = url.searchParams.get('startDate');
    const endStr = url.searchParams.get('endDate');

    let dateRangeFilter: any = {};
    if (startStr && endStr) {
      const sDate = new Date(startStr);
      sDate.setHours(0, 0, 0, 0);
      const eDate = new Date(endStr);
      eDate.setHours(23, 59, 59, 999);
      dateRangeFilter = { gte: sDate, lte: eDate };
    }

    // Fetch active employees
    const employees = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true, level: true } }
      },
      orderBy: { name: 'asc' },
    });

    // Build conditional where clauses for date ranges
    const meetingsWhere = startStr && endStr ? { meetingStartedAt: dateRangeFilter } : {};
    const ordersWhere = startStr && endStr ? { createdAt: dateRangeFilter } : {};
    const logsWhere = startStr && endStr ? { createdAt: dateRangeFilter } : {};

    // Fetch all records for mapping
    const [leads, meetings, orders, logs] = await Promise.all([
      prisma.lead.findMany({
        select: {
          id: true,
          leadCode: true,
          customerName: true,
          status: true,
          createdById: true,
          assignedConsultantId: true,
          assignedTlId: true,
          assignedManagerId: true,
          createdAt: true,
        }
      }),
      prisma.meetingBooking.findMany({
        where: meetingsWhere,
        select: {
          id: true,
          leadId: true,
          assignedExecutiveId: true,
        }
      }),
      prisma.order.findMany({
        where: ordersWhere,
        select: {
          id: true,
          leadId: true,
          status: true,
          totalValue: true,
          submittedById: true,
          financeProcessedById: true,
          createdAt: true,
        }
      }),
      prisma.leadActivityLog.findMany({
        where: logsWhere,
        select: {
          leadId: true,
          userId: true,
        }
      })
    ]);

    // Build fast lookups / indexes
    const userLogMap = new Map<number, Set<number>>();
    logs.forEach(l => {
      if (!userLogMap.has(l.userId)) {
        userLogMap.set(l.userId, new Set());
      }
      userLogMap.get(l.userId)!.add(l.leadId);
    });

    const leadOrderMap = new Map<number, typeof orders[0]>();
    orders.forEach(o => {
      leadOrderMap.set(o.leadId, o);
    });

    // Calculate metrics for each employee
    const processedEmployees = employees.map(emp => {
      const uId = emp.id;
      const loggedLeads = userLogMap.get(uId) || new Set<number>();

      // Filter leads they worked on
      const empLeads = leads.filter(lead => {
        // If date range is specified, lead is "worked on" if created or log-acted in that timeframe
        if (startStr && endStr) {
          const createdInTime = lead.createdAt >= dateRangeFilter.gte && lead.createdAt <= dateRangeFilter.lte;
          return createdInTime || loggedLeads.has(lead.id);
        }
        return (
          lead.createdById === uId ||
          lead.assignedConsultantId === uId ||
          lead.assignedTlId === uId ||
          lead.assignedManagerId === uId ||
          loggedLeads.has(lead.id)
        );
      });

      // Meetings Booked:
      // Meetings where they were executive OR lead was created/assigned to them
      const empMeetings = meetings.filter(m => {
        if (m.assignedExecutiveId === uId) return true;
        const lead = leads.find(l => l.id === m.leadId);
        if (!lead) return false;
        return (
          lead.createdById === uId ||
          lead.assignedConsultantId === uId ||
          lead.assignedTlId === uId ||
          lead.assignedManagerId === uId
        );
      });

      // Meetings Converted (Sale Done / status >= 6 / has verified/submitted order)
      const empConvertedLeads = empLeads.filter(lead => {
        const order = leadOrderMap.get(lead.id);
        const hasOrder = order !== undefined && order.status !== 'draft';
        return lead.status >= 6 || hasOrder;
      });

      // Orders Punched
      const empOrdersPunched = orders.filter(o => {
        if (o.submittedById === uId) return true;
        const lead = leads.find(l => l.id === o.leadId);
        if (!lead) return false;
        return (
          lead.assignedConsultantId === uId ||
          lead.assignedTlId === uId ||
          lead.assignedManagerId === uId
        );
      });
      const ordersPunchedValue = empOrdersPunched.reduce((sum, o) => sum + (o.totalValue || 0), 0);

      // Orders Verified
      const empOrdersVerified = orders.filter(o => {
        if (o.status === 'draft' || o.status === 'submitted') return false;
        if (o.financeProcessedById === uId) return true;
        const lead = leads.find(l => l.id === o.leadId);
        if (!lead) return false;
        return (
          lead.assignedConsultantId === uId ||
          lead.assignedTlId === uId ||
          lead.assignedManagerId === uId
        );
      });
      const ordersVerifiedValue = empOrdersVerified.reduce((sum, o) => sum + (o.totalValue || 0), 0);

      // Installations Completed
      const empInstallationsCompleted = orders.filter(o => {
        if (o.status !== 'completed') return false;
        const lead = leads.find(l => l.id === o.leadId);
        if (!lead) return false;
        return (
          lead.assignedConsultantId === uId ||
          lead.assignedTlId === uId ||
          lead.assignedManagerId === uId
        );
      });

      const leadsWorked = empLeads.length;
      const meetingsBooked = empMeetings.length;
      const meetingsConverted = empConvertedLeads.length;
      const conversionRate = meetingsBooked > 0 
        ? Math.round((meetingsConverted / meetingsBooked) * 100) 
        : (leadsWorked > 0 ? Math.round((meetingsConverted / leadsWorked) * 100) : 0);

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department?.name || 'Unassigned',
        designation: emp.designation?.name || 'Employee',
        role: emp.role,
        metrics: {
          leadsWorked,
          meetingsBooked,
          meetingsConverted,
          conversionRate,
          ordersPunched: empOrdersPunched.length,
          ordersPunchedValue,
          ordersVerified: empOrdersVerified.length,
          ordersVerifiedValue,
          installationsCompleted: empInstallationsCompleted.length
        }
      };
    });

    // Group by Department
    const departments: Record<string, typeof processedEmployees> = {
      'PSA': [],
      'Sales': [],
      'Finance': [],
      'Operations': [],
      'IT': [],
      'Unassigned': []
    };

    processedEmployees.forEach(emp => {
      const dept = emp.department;
      if (dept === 'Sales') {
        const isPsa = emp.designation.includes('PSA') || emp.role.includes('psa');
        if (isPsa) {
          departments['PSA'].push(emp);
        } else {
          departments['Sales'].push(emp);
        }
      } else if (departments[dept]) {
        departments[dept].push(emp);
      } else {
        departments['Unassigned'].push(emp);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        departments
      }
    });
  } catch (error: any) {
    console.error('Employee audit API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
