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

    const { getUserSession } = await import('@/lib/auth');
    const { role: userRole } = await getUserSession(userPayload.id);
    const { getLeadVisibilityCondition } = await import('@/lib/hierarchy');
    const leadWhere: any = await getLeadVisibilityCondition(userPayload.id, userRole, userPermissions);

    const url = new URL(req.url);
    const stateFilter = url.searchParams.get('state');
    const cityFilter = url.searchParams.get('city');

    if (stateFilter) {
      leadWhere.state = { equals: stateFilter, mode: 'insensitive' };
    }
    if (cityFilter) {
      leadWhere.city = { equals: cityFilter, mode: 'insensitive' };
    }

    const orderFilter: any = {};
    if (stateFilter || cityFilter) {
      orderFilter.lead = {
        state: stateFilter ? { equals: stateFilter, mode: 'insensitive' } : undefined,
        city: cityFilter ? { equals: cityFilter, mode: 'insensitive' } : undefined,
      };
    }

    // Batch daily queries concurrently using Promise.all
    const trendPromises = [];

    for (let i = 14; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const dateString = startOfDay.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });

      const dayPromise = Promise.all([
        prisma.lead.count({
          where: {
            ...leadWhere,
            status: { gte: 1 },
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
        prisma.lead.count({
          where: {
            ...leadWhere,
            status: 13,
            updatedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
        prisma.order.count({
          where: {
            ...orderFilter,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
        prisma.order.count({
          where: {
            ...orderFilter,
            status: { in: ['verified', 'finance_verified', 'ops_assigned', 'completed'] },
            updatedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
        prisma.order.count({
          where: {
            ...orderFilter,
            isCommissioned: true,
            updatedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
      ]).then(([createdCount, closedCount, ordersCount, verifiedCount, commissionedCount]) => ({
        date: dateString,
        created: createdCount,
        closed: closedCount,
        orders: ordersCount,
        verified: verifiedCount,
        commissioned: commissionedCount,
      }));

      trendPromises.push(dayPromise);
    }

    const trendData = await Promise.all(trendPromises);

    return NextResponse.json({
      success: true,
      data: trendData,
    });
  } catch (error: any) {
    console.error('Reports trend error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
