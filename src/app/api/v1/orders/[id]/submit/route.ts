import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

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

    // Only the submitting consultant or Admin can submit
    if (userPayload.role === 'consultant' && order.submittedById !== userPayload.id) {
      return NextResponse.json({ success: false, message: 'Forbidden. Not your order.' }, { status: 403 });
    }

    // Backend checklist validation (Section 10.4)
    const requiredTypes = ['aadhaar', 'pan', 'electricity_bill', 'bank_passbook'];
    const uploadedTypes = order.documents.map((d) => d.docType);
    const missingTypes = requiredTypes.filter((type) => !uploadedTypes.includes(type));

    if (missingTypes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order submission rejected. Missing mandatory documents.',
          errors: { missingDocuments: missingTypes },
        },
        { status: 422 }
      );
    }

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
        data: { status: 'submitted' },
      });

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
