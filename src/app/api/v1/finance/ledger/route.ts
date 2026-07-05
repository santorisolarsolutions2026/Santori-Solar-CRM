import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

// GET /api/v1/finance/ledger
export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:finance_access')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view this.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const paymentMethod = searchParams.get('paymentMethod') || 'all';
    const statusParam = searchParams.get('status') || 'all';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: any = {};

    if (statusParam && statusParam !== 'all') {
      where.status = statusParam;
    } else {
      where.status = { in: ['submitted', 'finance_verified', 'ops_assigned', 'completed'] };
    }

    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { orderCode: { contains: search, mode: 'insensitive' } },
          { connectionNumber: { contains: search, mode: 'insensitive' } },
          { lead: { customerName: { contains: search, mode: 'insensitive' } } },
        ]
      });
    }

    const paymentMethodFilter = paymentMethod !== 'all' ? paymentMethod : undefined;
    const hasDateFilter = !!(startDate || endDate);

    let dateFilter: any = undefined;
    if (hasDateFilter) {
      dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    const paymentsSubFilter: any = {};
    if (paymentMethodFilter) {
      paymentsSubFilter.paymentMethod = paymentMethodFilter;
    }
    if (dateFilter) {
      paymentsSubFilter.paymentDate = dateFilter;
    }

    if (paymentMethodFilter || hasDateFilter) {
      const orderCriteria: any[] = [{ payments: { none: {} } }];
      if (paymentMethodFilter) {
        orderCriteria.push({ paymentMethod: paymentMethodFilter });
      }
      if (dateFilter) {
        orderCriteria.push({ createdAt: dateFilter });
      }

      conditions.push({
        OR: [
          { payments: { some: paymentsSubFilter } },
          { AND: orderCriteria }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
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
            leadCode: true,
          },
        },
        submittedBy: { select: { id: true, name: true } },
        financeProcessedBy: { select: { id: true, name: true } },
        payments: {
          where: Object.keys(paymentsSubFilter).length > 0 ? paymentsSubFilter : undefined,
          include: {
            recordedBy: { select: { id: true, name: true } }
          },
          orderBy: { paymentDate: 'desc' }
        },
        documents: {
          select: {
            id: true,
            docType: true,
            fileName: true,
            mimeType: true,
          },
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Process orders to calculate totalPaid and balanceOutstanding
    const ledger = orders.map((order) => {
      const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
      const balanceOutstanding = Math.max(0, order.totalValue - totalPaid);
      return {
        ...order,
        totalPaid,
        balanceOutstanding,
      };
    });

    return NextResponse.json({
      success: true,
      data: ledger,
    });
  } catch (error: any) {
    console.error('Fetch ledger error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/v1/finance/ledger
export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:verify')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to modify ledger.' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, amount, paymentMethod, transactionRef, remarks, receiptPath } = body;

    if (!orderId || !amount || !paymentMethod) {
      return NextResponse.json({ success: false, message: 'OrderId, amount, and paymentMethod are required.' }, { status: 400 });
    }

    const orderIdNum = parseInt(orderId, 10);
    const amountNum = parseFloat(amount);

    if (isNaN(orderIdNum) || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid orderId or amount.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderIdNum },
      include: { lead: { select: { customerName: true } } }
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Create payment entry
    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          orderId: orderIdNum,
          amount: amountNum,
          paymentMethod,
          transactionRef: transactionRef || null,
          receiptPath: receiptPath || null,
          remarks: remarks || 'Additional payment received.',
          recordedById: userPayload.id,
        },
        include: {
          recordedBy: { select: { name: true } }
        }
      });

      // Log activity
      await tx.leadActivityLog.create({
        data: {
          leadId: order.leadId,
          userId: userPayload.id,
          fromStatus: 13,
          toStatus: 13,
          remark: `Payment of ₹${amountNum.toLocaleString('en-IN')} recorded by Finance (${userPayload.name}). Method: ${paymentMethod}. Ref: ${transactionRef || 'N/A'}`
        }
      });

      return newPayment;
    });

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment successfully recorded in ledger.',
    });
  } catch (error: any) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
