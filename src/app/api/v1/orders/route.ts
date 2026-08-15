import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions, getUserSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;

    if (!userPermissions.includes('orders:view') && !userPermissions.includes('orders:operations')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view orders.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const clientType = searchParams.get('client_type') || '';
    const search = searchParams.get('search') || '';

    const hasDeliveredPerm = userPermissions.includes('ops:delivered_orders') || ['admin', 'director'].includes(baseRole);

    const isITOrAdmin = ['admin', 'director'].includes(baseRole);
    const where: Prisma.OrderWhereInput = {};

    // 1. Finance Role Filtering
    if (baseRole === 'finance') {
      const hasFinanceViewAll = userPermissions.includes('finance:view_all_orders') || isITOrAdmin;
      if (!hasFinanceViewAll) {
        const { getSubordinateIds, getAncestorIds } = await import('@/lib/hierarchy');
        const subIds = await getSubordinateIds(userPayload.id);
        const ancestorIds = await getAncestorIds(userPayload.id);
        const allowedIds = [userPayload.id, ...subIds, ...ancestorIds];
        where.OR = [
          { assignedFinanceId: { in: allowedIds } },
          { assignedFinanceId: null }
        ];
      }
      
      const financeStatuses = hasDeliveredPerm 
        ? ['submitted', 'finance_verified', 'ops_assigned', 'completed'] 
        : ['submitted', 'finance_verified', 'ops_assigned'];
      if (status) {
        if (status === 'completed' && !hasDeliveredPerm) {
          return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view completed orders.' }, { status: 403 });
        }
        where.status = financeStatuses.includes(status) ? status : { in: financeStatuses };
      } else {
        where.status = { in: financeStatuses };
      }
    } 
    // 2. Operations Role Filtering
    else if (baseRole === 'operations') {
      const hasOpsViewAll = userPermissions.includes('ops:view_all_orders') || isITOrAdmin;
      if (!hasOpsViewAll) {
        const { getSubordinateIds } = await import('@/lib/hierarchy');
        const subIds = await getSubordinateIds(userPayload.id);
        const opsAllowedIds = [userPayload.id, ...subIds];
        where.assignedOpsId = { in: opsAllowedIds };
      }

      const opsStatuses = hasDeliveredPerm 
        ? ['finance_verified', 'ops_assigned', 'completed'] 
        : ['finance_verified', 'ops_assigned'];
      if (status) {
        if (status === 'completed' && !hasDeliveredPerm) {
          return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view completed orders.' }, { status: 403 });
        }
        where.status = opsStatuses.includes(status) ? status : { in: opsStatuses };
      } else {
        where.status = { in: opsStatuses };
      }
    } 
    // 3. Other Roles (Sales, etc.)
    else {
      const hasSalesViewAll = userPermissions.includes('orders:view_all') || ['sales_head'].includes(baseRole) || isITOrAdmin;
      if (!hasSalesViewAll) {
        const userDetail = await prisma.user.findUnique({
          where: { id: userPayload.id },
          select: { teamId: true }
        });
        const { getSubordinateIds, getAncestorIds } = await import('@/lib/hierarchy');
        const subIds = await getSubordinateIds(userPayload.id);
        const ancestorIds = await getAncestorIds(userPayload.id);
        const allowedIds = [userPayload.id, ...subIds, ...ancestorIds];

        const leadConditions: Prisma.LeadWhereInput = {
          OR: [
            { assignedConsultantId: { in: allowedIds } },
            { assignedTlId: { in: allowedIds } },
            { assignedManagerId: { in: allowedIds } },
            { createdById: userPayload.id }
          ]
        };
        if (userDetail?.teamId) {
          (leadConditions.OR as any).push({ assignedTeamId: userDetail.teamId });
        }
        where.lead = leadConditions;
      }

      if (status) {
        if (status === 'completed' && !hasDeliveredPerm) {
          return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view completed orders.' }, { status: 403 });
        }
        where.status = status;
      } else if (!hasDeliveredPerm) {
        where.status = { not: 'completed' };
      }
    }

    if (clientType) {
      where.clientType = clientType;
    }

    if (search) {
      where.OR = [
        { orderCode: { contains: search } },
        { connectionNumber: { contains: search } },
        { lead: { customerName: { contains: search } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            mobile: true,
            city: true,
            state: true,
            address: true,
            pinCode: true,
            leadCode: true,
          },
        },
        submittedBy: { select: { name: true } },
        financeProcessedBy: { select: { name: true } },
        assignedOps: { select: { id: true, name: true, role: true, designation: { select: { name: true } } } },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            paymentDate: true,
          },
        },
        documents: {
          select: {
            id: true,
            docType: true,
            fileName: true,
            fileSizeOctets: true,
            mimeType: true,
          },
        },
        installationImages: {
          select: {
            id: true,
            status: true,
            fileName: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
