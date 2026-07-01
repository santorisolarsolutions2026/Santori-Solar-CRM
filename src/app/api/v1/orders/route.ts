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

    if (!userPermissions.includes('orders:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view orders.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const clientType = searchParams.get('client_type') || '';
    const search = searchParams.get('search') || '';

    const where: Prisma.OrderWhereInput = {};
    const hasViewAll = userPermissions.includes('orders:view_all');

    // Role-specific filtering
    if (!hasViewAll) {
      if (baseRole === 'finance') {
        // Finance sees orders in submitted, verified, ops_assigned, completed
        const financeStatuses = ['submitted', 'finance_verified', 'ops_assigned', 'completed'];
        if (status) {
          where.status = financeStatuses.includes(status) ? status : { in: financeStatuses };
        } else {
          where.status = { in: financeStatuses };
        }
      } else if (baseRole === 'operations') {
        // Operations sees only orders that are verified/assigned/completed
        const opsStatuses = ['finance_verified', 'ops_assigned', 'completed'];
        if (status) {
          where.status = opsStatuses.includes(status) ? status : { in: opsStatuses };
        } else {
          where.status = { in: opsStatuses };
        }
      } else {
        // Filter orders by lead assignments for normal team members
        if (['tl', 'psa_tl'].includes(baseRole)) {
          where.lead = { ...(where.lead as Prisma.LeadWhereInput), assignedTlId: userPayload.id };
        } else if (baseRole === 'manager') {
          where.lead = { ...(where.lead as Prisma.LeadWhereInput), assignedManagerId: userPayload.id };
        } else if (['admin', 'director', 'sales_head'].includes(baseRole)) {
          // Administrative roles can view all orders even without view_all permission
        } else {
          where.lead = { ...(where.lead as Prisma.LeadWhereInput), assignedConsultantId: userPayload.id };
        }

        if (status) {
          where.status = status;
        }
      }
    } else {
      if (status) {
        where.status = status;
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
