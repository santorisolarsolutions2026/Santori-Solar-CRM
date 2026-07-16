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
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view employee audit details.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const userIdStr = url.searchParams.get('userId');
    const type = url.searchParams.get('type') || 'leads_worked';
    const startStr = url.searchParams.get('startDate');
    const endStr = url.searchParams.get('endDate');
    
    if (!userIdStr) {
      return NextResponse.json({ success: false, message: 'Missing userId parameter.' }, { status: 400 });
    }
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid userId.' }, { status: 400 });
    }

    // Fetch user details
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
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

    let dateRangeFilter: any = {};
    const hasDates = !!(startStr && endStr);
    if (hasDates) {
      const sDate = new Date(startStr!);
      sDate.setHours(0, 0, 0, 0);
      const eDate = new Date(endStr!);
      eDate.setHours(23, 59, 59, 999);
      dateRangeFilter = { gte: sDate, lte: eDate };
    }

    let results: any[] = [];

    if (type === 'leads_worked') {
      const logWhere = hasDates ? { userId, createdAt: dateRangeFilter } : { userId };
      const logs = await prisma.leadActivityLog.findMany({
        where: logWhere,
        select: { leadId: true }
      });
      const loggedLeadIds = logs.map(l => l.leadId);

      const leadWhere: any = {
        OR: [
          { createdById: userId },
          { assignedConsultantId: userId },
          { assignedTlId: userId },
          { assignedManagerId: userId },
          { id: { in: loggedLeadIds } }
        ]
      };
      if (hasDates) {
        // If dates are given, they only count if they logged activity or were created during timeframe
        leadWhere.OR = [
          { createdById: userId, createdAt: dateRangeFilter },
          { id: { in: loggedLeadIds } }
        ];
      }

      const leads = await prisma.lead.findMany({
        where: leadWhere,
        select: {
          id: true,
          leadCode: true,
          customerName: true,
          city: true,
          status: true,
          createdAt: true,
          manager: { select: { name: true } },
          tl: { select: { name: true } },
          consultant: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      results = leads;
    } 
    else if (type === 'meetings_booked') {
      const meetingWhere: any = {
        OR: [
          { assignedExecutiveId: userId },
          {
            lead: {
              OR: [
                { createdById: userId },
                { assignedConsultantId: userId },
                { assignedTlId: userId },
                { assignedManagerId: userId }
              ]
            }
          }
        ]
      };
      if (hasDates) {
        meetingWhere.createdAt = dateRangeFilter;
      }

      const meetings = await prisma.meetingBooking.findMany({
        where: meetingWhere,
        select: {
          id: true,
          meetingDate: true,
          meetingTime: true,
          meetingPinCode: true,
          meetingCity: true,
          avgMonthlyBill: true,
          executive: { select: { name: true } },
          lead: {
            select: {
              id: true,
              leadCode: true,
              customerName: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      results = meetings.map(m => ({
        id: m.id,
        leadId: m.lead?.id,
        leadCode: m.lead?.leadCode,
        customerName: m.lead?.customerName,
        detail1: `Scheduled: ${m.meetingDate} ${m.meetingTime}`,
        detail2: m.meetingCity ? `Location: ${m.meetingCity} (${m.meetingPinCode || ''})` : `Avg Bill: ₹${m.avgMonthlyBill.toLocaleString('en-IN')}`,
        executiveName: m.executive?.name || 'Unassigned',
        date: m.meetingDate
      }));
    } 
    else if (type === 'meetings_converted') {
      const logWhere = hasDates ? { userId, createdAt: dateRangeFilter } : { userId };
      const logs = await prisma.leadActivityLog.findMany({
        where: logWhere,
        select: { leadId: true }
      });
      const loggedLeadIds = logs.map(l => l.leadId);

      const leadWhere: any = {
        status: { gte: 6 },
        OR: [
          { createdById: userId },
          { assignedConsultantId: userId },
          { assignedTlId: userId },
          { assignedManagerId: userId },
          { id: { in: loggedLeadIds } }
        ]
      };
      if (hasDates) {
        leadWhere.OR = [
          { createdById: userId, createdAt: dateRangeFilter },
          { id: { in: loggedLeadIds } }
        ];
      }

      const leads = await prisma.lead.findMany({
        where: leadWhere,
        select: {
          id: true,
          leadCode: true,
          customerName: true,
          city: true,
          status: true,
          createdAt: true,
          manager: { select: { name: true } },
          tl: { select: { name: true } },
          consultant: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      results = leads;
    } 
    else if (type === 'orders_punched') {
      const orderWhere: any = {
        OR: [
          { submittedById: userId },
          {
            lead: {
              OR: [
                { assignedConsultantId: userId },
                { assignedTlId: userId },
                { assignedManagerId: userId }
              ]
            }
          }
        ]
      };
      if (hasDates) {
        orderWhere.createdAt = dateRangeFilter;
      }

      const orders = await prisma.order.findMany({
        where: orderWhere,
        select: {
          id: true,
          orderCode: true,
          systemSizeKw: true,
          totalValue: true,
          status: true,
          createdAt: true,
          lead: {
            select: {
              id: true,
              leadCode: true,
              customerName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      results = orders.map(o => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        detail1: `System Size: ${o.systemSizeKw} kW`,
        detail2: `Order Status: ${o.status.toUpperCase()}`,
        value: o.totalValue,
        date: new Date(o.createdAt).toLocaleDateString('en-IN')
      }));
    } 
    else if (type === 'orders_verified') {
      const orderWhere: any = {
        status: { notIn: ['draft', 'submitted'] },
        OR: [
          { financeProcessedById: userId },
          {
            lead: {
              OR: [
                { assignedConsultantId: userId },
                { assignedTlId: userId },
                { assignedManagerId: userId }
              ]
            }
          }
        ]
      };
      if (hasDates) {
        orderWhere.createdAt = dateRangeFilter;
      }

      const orders = await prisma.order.findMany({
        where: orderWhere,
        select: {
          id: true,
          orderCode: true,
          systemSizeKw: true,
          totalValue: true,
          status: true,
          createdAt: true,
          lead: {
            select: {
              id: true,
              leadCode: true,
              customerName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      results = orders.map(o => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        detail1: `System Size: ${o.systemSizeKw} kW`,
        detail2: `Verified Status: ${o.status.toUpperCase()}`,
        value: o.totalValue,
        date: new Date(o.createdAt).toLocaleDateString('en-IN')
      }));
    } 
    else if (type === 'installations_completed') {
      const orderWhere: any = {
        status: 'completed',
        lead: {
          OR: [
            { assignedConsultantId: userId },
            { assignedTlId: userId },
            { assignedManagerId: userId }
          ]
        }
      };
      if (hasDates) {
        orderWhere.createdAt = dateRangeFilter;
      }

      const orders = await prisma.order.findMany({
        where: orderWhere,
        select: {
          id: true,
          orderCode: true,
          systemSizeKw: true,
          totalValue: true,
          status: true,
          createdAt: true,
          lead: {
            select: {
              id: true,
              leadCode: true,
              customerName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      results = orders.map(o => ({
        id: o.id,
        leadId: o.lead?.id,
        leadCode: o.lead?.leadCode,
        customerName: o.lead?.customerName,
        detail1: `System Size: ${o.systemSizeKw} kW`,
        detail2: `Fulfillment: Fully Commissioned`,
        value: o.totalValue,
        date: new Date(o.createdAt).toLocaleDateString('en-IN')
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        employee,
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
