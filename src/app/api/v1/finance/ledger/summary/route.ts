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
    if (!userPermissions.includes('orders:finance_access')) {
      return NextResponse.json({ success: false, message: 'Forbidden.' }, { status: 403 });
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

    // Fetch matching orders and their payments
    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        totalValue: true,
        payments: {
          where: Object.keys(paymentsSubFilter).length > 0 ? paymentsSubFilter : undefined,
          select: {
            amount: true,
            paymentMethod: true,
          }
        }
      }
    });

    // Aggregate totals
    let totalCash = 0;
    let totalUpi = 0;
    let totalNeft = 0;
    let totalCheque = 0;
    let totalCollected = 0;
    let totalBookedValue = 0;

    orders.forEach((order) => {
      totalBookedValue += order.totalValue;
      order.payments.forEach((payment) => {
        const amt = payment.amount;
        totalCollected += amt;
        
        const method = payment.paymentMethod.toLowerCase();
        if (method === 'cash') {
          totalCash += amt;
        } else if (method === 'upi') {
          totalUpi += amt;
        } else if (method === 'cheque') {
          totalCheque += amt;
        } else if (method === 'neft' || method === 'bank_transfer') {
          totalNeft += amt;
        }
      });
    });

    const totalOutstanding = Math.max(0, totalBookedValue - totalCollected);

    return NextResponse.json({
      success: true,
      data: {
        totalBookedValue,
        totalCollected,
        totalOutstanding,
        cash: totalCash,
        upi: totalUpi,
        neft: totalNeft,
        cheque: totalCheque,
      }
    });
  } catch (error: any) {
    console.error('Ledger summary error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
