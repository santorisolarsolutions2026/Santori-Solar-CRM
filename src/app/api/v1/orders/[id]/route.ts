import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

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

    // Check permission to view orders
    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view orders.' }, { status: 403 });
    }

    const hasViewAll = userPermissions.includes('orders:view_all');
    if (!hasViewAll && order.submittedById !== userPayload.id) {
      // Check supervisor status
      const lead = await prisma.lead.findUnique({
        where: { id: order.leadId },
        select: { assignedTlId: true, assignedManagerId: true }
      });
      const isLeadSupervisor = lead && (lead.assignedTlId === userPayload.id || lead.assignedManagerId === userPayload.id);
      if (!isLeadSupervisor) {
        return NextResponse.json({ success: false, message: 'Forbidden. You do not have access to this order.' }, { status: 403 });
      }
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
    const userPermissions = await getUserPermissions(userPayload.id);
    const canCreateOrders = userPermissions.includes('orders:create');
    const hasViewAll = userPermissions.includes('orders:view_all');
    
    if (!canCreateOrders) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to edit orders.' }, { status: 403 });
    }

    if (!hasViewAll && order.submittedById !== userPayload.id) {
      const lead = await prisma.lead.findUnique({
        where: { id: order.leadId },
        select: { assignedTlId: true, assignedManagerId: true }
      });
      const isLeadSupervisor = lead && (lead.assignedTlId === userPayload.id || lead.assignedManagerId === userPayload.id);
      if (!isLeadSupervisor) {
        return NextResponse.json({ success: false, message: 'Forbidden. You do not have access to edit this order.' }, { status: 403 });
      }
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
      const canVerify = userPermissions.includes('orders:verify');
      const canInstall = userPermissions.includes('orders:submit_installation');
      if (!canVerify && !canInstall) {
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
