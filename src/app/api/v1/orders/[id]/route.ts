import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, message: 'Invalid Order ID.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
        documents: {
          select: {
            id: true,
            docType: true,
            fileName: true,
            fileSizeOctets: true,
            mimeType: true,
            uploadedAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Role visibility check
    const allowedRoles = ['admin', 'director', 'sales_head', 'finance', 'operations', 'consultant'];
    if (!allowedRoles.includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden.' }, { status: 403 });
    }

    if (userPayload.role === 'consultant' && order.submittedById !== userPayload.id) {
      return NextResponse.json({ success: false, message: 'Forbidden. Not your order.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, message: 'Invalid Order ID.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Validate update rights
    if (userPayload.role === 'consultant') {
      if (order.submittedById !== userPayload.id) {
        return NextResponse.json({ success: false, message: 'Forbidden. Not your order.' }, { status: 403 });
      }
      if (order.status !== 'draft') {
        return NextResponse.json({ success: false, message: 'Forbidden. Cannot edit a submitted order.' }, { status: 403 });
      }
    } else if (!['admin', 'director', 'sales_head', 'finance', 'operations'].includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden. Role cannot edit orders.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      connectionNumber,
      systemSizeKw,
      totalValue,
      downPayment,
      paymentMethod,
      transactionRef,
      remainingMethod,
      financeProvider,
      clientType,
      subsidyApplicable,
      subsidyAmount,
      additionalNotes,
      status, // Ops / Admin can update installation statuses
    } = body;

    const updateData: any = {};
    if (connectionNumber !== undefined) updateData.connectionNumber = connectionNumber;
    if (systemSizeKw !== undefined) updateData.systemSizeKw = parseFloat(systemSizeKw);
    if (totalValue !== undefined) updateData.totalValue = parseFloat(totalValue);
    if (downPayment !== undefined) updateData.downPayment = parseFloat(downPayment);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (transactionRef !== undefined) updateData.transactionRef = transactionRef;
    if (remainingMethod !== undefined) updateData.remainingMethod = remainingMethod;
    if (financeProvider !== undefined) updateData.financeProvider = financeProvider;
    if (clientType !== undefined) updateData.clientType = clientType;
    if (subsidyApplicable !== undefined) updateData.subsidyApplicable = !!subsidyApplicable;
    if (subsidyAmount !== undefined) updateData.subsidyAmount = subsidyAmount ? parseFloat(subsidyAmount) : null;
    if (additionalNotes !== undefined) updateData.additionalNotes = additionalNotes;

    // Direct status updates (e.g. for installation tracking by Operations / Admin)
    if (status !== undefined) {
      const allowedStatusUpdates = ['admin', 'director', 'sales_head', 'operations', 'finance'];
      if (!allowedStatusUpdates.includes(userPayload.role)) {
        return NextResponse.json({ success: false, message: 'Forbidden. You cannot change order status directly.' }, { status: 403 });
      }
      updateData.status = status;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order details updated successfully',
    });
  } catch (error: any) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
