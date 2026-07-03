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
    const hasAccess = userPermissions.includes('reports:view') ||
                      userPermissions.includes('leads:view') ||
                      userPermissions.includes('leads:create') ||
                      userPermissions.includes('leads:edit') ||
                      userPermissions.includes('orders:view') ||
                      userPermissions.includes('orders:create');

    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view reports.' }, { status: 403 });
    }

    // Role filtration criteria
    const leadWhere: any = {};
    const hasViewAll = userPermissions.includes('leads:view_all');
    if (!hasViewAll) {
      if (userPayload.role === 'manager') {
        leadWhere.assignedManagerId = userPayload.id;
      } else if (['tl', 'psa_tl'].includes(userPayload.role)) {
        leadWhere.assignedTlId = userPayload.id;
      } else if (userPayload.role === 'consultant' || userPayload.role === 'psa') {
        leadWhere.assignedConsultantId = userPayload.id;
      }
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Queries
    // 1. Total Leads (Fresh Leads pool: status >= 1)
    const totalFreshLeads = await prisma.lead.count({
      where: {
        ...leadWhere,
        status: { gte: 1 },
      },
    });

    // 2. Active Leads (not in terminal: 0 Uninitiated, 6 Already Installed, 12 Can't Fit, 13 Sale Done)
    const activeWhere = { ...leadWhere, status: { notIn: [0, 6, 12, 13] }, isActive: true };
    const activeLeads = await prisma.lead.count({ where: activeWhere });

    // 3. Meetings Booked (This month)
    const meetingWhere = {
      ...leadWhere,
      status: { in: [8, 9, 13] },
      createdAt: { gte: startOfMonth },
    };
    const meetingsBookedThisMonth = await prisma.lead.count({ where: meetingWhere });

    // 4. Sales Done (This month)
    const salesWhere = {
      ...leadWhere,
      status: 13,
      createdAt: { gte: startOfMonth },
    };
    const salesDoneThisMonth = await prisma.lead.count({ where: salesWhere });

    // 5. Today's Follow-Ups
    const followUpWhere = {
      ...leadWhere,
      status: { in: [3, 5] },
      followupAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    };
    const todayFollowUps = await prisma.lead.count({ where: followUpWhere });

    // 6. Conversion Rate (Sales / Total Fresh Leads * 100)
    const conversionRate = totalFreshLeads > 0 ? parseFloat(((salesDoneThisMonth / totalFreshLeads) * 100).toFixed(2)) : 0.0;

    return NextResponse.json({
      success: true,
      data: {
        totalLeads: totalFreshLeads,
        activeLeads,
        meetingsBookedThisMonth,
        salesDoneThisMonth,
        todayFollowUps,
        conversionRate,
      },
    });
  } catch (error: any) {
    console.error('Reports overview error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
