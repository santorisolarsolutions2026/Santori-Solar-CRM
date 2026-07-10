import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { put } from '@vercel/blob';

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

    // Search query matches order code, connection number, or customer name
    const where: any = {
      status: { in: ['submitted', 'finance_verified', 'ops_assigned', 'completed'] }
    };

    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { connectionNumber: { contains: search, mode: 'insensitive' } },
        { lead: { customerName: { contains: search, mode: 'insensitive' } } },
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
            leadCode: true,
          },
        },
        submittedBy: { select: { id: true, name: true } },
        financeProcessedBy: { select: { id: true, name: true } },
        payments: {
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

    const contentType = req.headers.get('content-type') || '';
    let orderId: string, amount: string, paymentMethod: string, transactionRef: string | null = null, remarks: string | null = null;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      orderId = formData.get('orderId') as string;
      amount = formData.get('amount') as string;
      paymentMethod = formData.get('paymentMethod') as string;
      transactionRef = formData.get('transactionRef') as string | null;
      remarks = formData.get('remarks') as string | null;
      file = formData.get('file') as File | null;
    } else {
      const body = await req.json();
      orderId = body.orderId;
      amount = body.amount;
      paymentMethod = body.paymentMethod;
      transactionRef = body.transactionRef;
      remarks = body.remarks;
    }

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

    let receiptPath: string | null = null;
    if (file) {
      const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

      if (!ALLOWED_MIMES.includes(file.type)) {
        return NextResponse.json(
          { success: false, message: `Invalid file type: ${file.type}. Only JPEG, PNG, and PDF are allowed.` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: 'File size exceeds 5MB limit.' },
          { status: 400 }
        );
      }

      // Upload to Vercel Blob
      const fileExt = file.name.split('.').pop() || 'dat';
      const blobPath = `receipts/receipt_${orderIdNum}_${Date.now()}.${fileExt}`;
      const blob = await put(blobPath, file, {
        access: 'public',
      });
      receiptPath = blob.url;
    }

    // Create payment entry
    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          orderId: orderIdNum,
          amount: amountNum,
          paymentMethod,
          transactionRef: transactionRef || null,
          remarks: remarks || 'Additional payment received.',
          recordedById: userPayload.id,
          receiptPath: receiptPath,
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
          remark: `Payment of ₹${amountNum.toLocaleString('en-IN')} recorded by Finance (${userPayload.name}). Method: ${paymentMethod}. Ref: ${transactionRef || 'N/A'}${receiptPath ? ' with receipt attachment' : ''}`
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
