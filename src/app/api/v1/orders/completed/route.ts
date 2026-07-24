import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { getSubordinateIds } from '@/lib/hierarchy';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'team'; // 'my' | 'team' | 'all'
    const memberId = searchParams.get('memberId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const clientType = searchParams.get('clientType');

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasDeliveredPerm = userPermissions.includes('ops:delivered_orders') || userPayload.role === 'admin' || userPayload.role === 'director';

    if (!hasDeliveredPerm) {
      return NextResponse.json({ success: false, message: 'Forbidden. Custom access level permission (Show Delivered Orders) is required to view completed orders.' }, { status: 403 });
    }

    const isITOrAdmin = userPayload.role === 'admin' || userPayload.role === 'director' || userPermissions.includes('leads:view_all') || userPermissions.includes('orders:view_all');

    // Hierarchy filter calculation
    const subordinateIds = await getSubordinateIds(userPayload.id);
    const teamUserIds = [userPayload.id, ...subordinateIds];

    let whereClause: any = {
      OR: [
        { status: 'completed' },
        { opsStage: 5 },
        { isCommissioned: true }
      ]
    };

    // Filter by User scope if not admin requesting all
    if (!isITOrAdmin || scope !== 'all') {
      if (scope === 'my') {
        whereClause.AND = [
          {
            OR: [
              { submittedById: userPayload.id },
              { financeProcessedById: userPayload.id },
              { assignedFinanceId: userPayload.id },
              { assignedOpsId: userPayload.id }
            ]
          }
        ];
      } else {
        // 'team'
        whereClause.AND = [
          {
            OR: [
              { submittedById: { in: teamUserIds } },
              { financeProcessedById: { in: teamUserIds } },
              { assignedFinanceId: { in: teamUserIds } },
              { assignedOpsId: { in: teamUserIds } }
            ]
          }
        ];
      }
    }

    // Specific member filter
    if (memberId) {
      const targetId = Number(memberId);
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { submittedById: targetId },
            { financeProcessedById: targetId },
            { assignedFinanceId: targetId },
            { assignedOpsId: targetId }
          ]
        }
      ];
    }

    // Search query filter
    if (search && search.trim() !== '') {
      const q = search.trim();
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { orderCode: { contains: q, mode: 'insensitive' } },
            { connectionNumber: { contains: q, mode: 'insensitive' } },
            { lead: { customerName: { contains: q, mode: 'insensitive' } } },
            { lead: { mobile: { contains: q, mode: 'insensitive' } } },
            { lead: { city: { contains: q, mode: 'insensitive' } } },
            { lead: { leadCode: { contains: q, mode: 'insensitive' } } },
          ]
        }
      ];
    }

    // Client Type filter
    if (clientType && clientType !== 'all') {
      whereClause.clientType = clientType;
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            leadCode: true,
            customerName: true,
            mobile: true,
            mobileAlt: true,
            city: true,
            state: true,
            address: true,
            pinCode: true,
            sanctionedLoadKw: true,
            connectionType: true,
            leadSource: true,
            discomName: true,
            connectionNumber: true,
          }
        },
        submittedBy: { select: { id: true, name: true, email: true, role: true } },
        financeProcessedBy: { select: { id: true, name: true, email: true } },
        assignedFinance: { select: { id: true, name: true, email: true } },
        assignedOps: { select: { id: true, name: true, email: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { recordedBy: { select: { id: true, name: true } } }
        },
        documents: {
          select: { id: true, docType: true, fileName: true, mimeType: true, filePath: true, uploadedAt: true }
        },
        installationImages: {
          select: { id: true, status: true, filePath: true, fileName: true, uploadedAt: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders: orders.map(o => {
        const totalPaid = (o.payments || []).reduce((sum, p) => p.isDiscarded ? sum : sum + p.amount, 0);
        const balanceOutstanding = Math.max(0, o.totalValue - totalPaid);
        return {
          ...o,
          totalPaid,
          balanceOutstanding
        };
      })
    });

  } catch (error: any) {
    console.error('Error fetching completed orders:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
