import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Allowed roles: Admin, Director, Sales Head, Finance, Operations
    const allowedRoles = ['admin', 'director', 'sales_head', 'finance', 'operations'];
    if (!allowedRoles.includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const clientType = searchParams.get('client_type') || '';
    const search = searchParams.get('search') || '';

    const where: Prisma.OrderWhereInput = {};

    // Role-specific filtering
    if (userPayload.role === 'finance') {
      // Finance sees orders in submitted, verified, ops_assigned, completed
      where.status = { in: ['submitted', 'finance_verified', 'ops_assigned', 'completed'] };
    } else if (userPayload.role === 'operations') {
      // Operations sees only orders that are verified/assigned/completed
      where.status = { in: ['finance_verified', 'ops_assigned', 'completed'] };
    }

    if (status) {
      where.status = status;
    } else {
      // By default (when status filter is not explicitly set), exclude completed orders
      // UNLESS they have no completed installation images.
      where.NOT = {
        status: 'completed',
        installationImages: {
          some: {
            status: 'completed'
          }
        }
      };
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
            leadCode: true,
          },
        },
        submittedBy: { select: { name: true } },
        financeProcessedBy: { select: { name: true } },
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
