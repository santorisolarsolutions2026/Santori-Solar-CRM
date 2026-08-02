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

    // Employee-specific recent activities
    const leadWhere: any = {};
    if (userPayload.role !== 'admin' && userPayload.role !== 'director') {
      const { getSubordinateIds } = await import('@/lib/hierarchy');
      const subIds = await getSubordinateIds(userPayload.id);
      const allowedIds = [userPayload.id, ...subIds];
      leadWhere.OR = [
        { assignedManagerId: { in: allowedIds } },
        { assignedTlId: { in: allowedIds } },
        { assignedConsultantId: { in: allowedIds } },
        { assignedPsaId: { in: allowedIds } },
        { createdById: { in: allowedIds } },
      ];
    }

    // Fetch latest 10 activity logs for leads the user is authorized to see
    const logs = await prisma.leadActivityLog.findMany({
      where: {
        lead: leadWhere
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            leadCode: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        logs,
      },
    });
  } catch (error: any) {
    console.error('Recent activity reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
