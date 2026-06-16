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
    if (!userPermissions.includes('reports:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view reports.' }, { status: 403 });
    }

    // Role filtration criteria
    const leadWhere: any = {};
    const hasViewAll = userPermissions.includes('leads:view_all');
    if (!hasViewAll) {
      if (userPayload.role === 'manager') {
        leadWhere.assignedManagerId = userPayload.id;
      } else if (userPayload.role === 'tl') {
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
    // 1. Total Leads
    const totalLeads = await prisma.lead.count({ where: leadWhere });

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

    // 6. Conversion Rate (Sales / Total * 100)
    const conversionRate = totalLeads > 0 ? parseFloat(((salesDoneThisMonth / totalLeads) * 100).toFixed(2)) : 0.0;

    return NextResponse.json({
      success: true,
      data: {
        totalLeads,
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
