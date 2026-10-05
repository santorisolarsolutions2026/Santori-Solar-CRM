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

    // Fetch latest activity logs (excluding per-lead bulk territory items to avoid spamming the stream)
    const logs = await prisma.leadActivityLog.findMany({
      where: {
        NOT: {
          remark: {
            startsWith: 'Territory assigned to',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
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

    // Fetch recent Territory Assignment batch summaries from AuditLog
    const territoryAudits = await prisma.auditLog.findMany({
      where: { fieldName: 'territory_assign' },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Format territory audits as clean unified activity entries
    const territoryLogs = territoryAudits.map((a) => ({
      id: a.id,
      remark: a.newValue || 'Territory leads assigned.',
      fromStatus: null,
      toStatus: 1,
      createdAt: a.createdAt.toISOString(),
      isTerritoryAssign: true,
      lead: null,
      user: a.user,
    }));

    // Merge and sort chronologically (newest first)
    const combinedLogs = [...logs, ...territoryLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return NextResponse.json({
      success: true,
      data: {
        logs: combinedLogs,
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
