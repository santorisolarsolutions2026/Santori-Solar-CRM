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

    // Role filtration criteria (matching reports/overview criteria)
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
            customerName: true,
            leadCode: true,
          },
        },
        user: {
          select: {
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
