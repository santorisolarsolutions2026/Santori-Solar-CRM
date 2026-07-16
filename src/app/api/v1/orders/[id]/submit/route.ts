import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

export async function POST(
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
        documents: true,
        lead: { select: { customerName: true, leadCode: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:create')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to submit orders.' }, { status: 403 });
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
        return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to submit this order.' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { financeManagerId, financeTlId, financeConsultantId } = body;

    // Validate that order fields are complete
    if (!order.connectionNumber || order.systemSizeKw <= 0 || order.totalValue <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order submission rejected. Please complete the connection number, system size, and total order value.',
        },
        { status: 422 }
      );
    }

    // Update status to submitted
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'submitted',
          rejectionReason: null,
          submittedById: userPayload.id,
        },
      });

      // Update Lead assignments to Finance
      if (financeManagerId || financeTlId || financeConsultantId) {
        await tx.lead.update({
          where: { id: order.leadId },
          data: {
            assignedManagerId: financeManagerId ? parseInt(financeManagerId, 10) : null,
            assignedTlId: financeTlId ? parseInt(financeTlId, 10) : null,
            assignedConsultantId: financeConsultantId ? parseInt(financeConsultantId, 10) : null,
          },
        });
      }

      // Log activity
      await tx.leadActivityLog.create({
        data: {
          leadId: order.leadId,
          userId: userPayload.id,
          fromStatus: 13, // Sale Done
          toStatus: 13,
          remark: 'Order punched and submitted to Finance with documents.',
        },
      });

      // Notify Finance Team members
      const financeUsers = await tx.user.findMany({
        where: { role: 'finance', isActive: true },
        select: { id: true },
      });

      for (const finUser of financeUsers) {
        await tx.notification.create({
          data: {
            userId: finUser.id,
            type: 'order_submitted',
            title: 'New order submitted',
            body: `New order submitted for processing: Order #${order.orderCode} (${order.lead.customerName})`,
            leadId: order.leadId,
          },
        });
      }

      return res;
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order submitted to Finance successfully.',
    });
  } catch (error: any) {
    console.error('Submit order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
