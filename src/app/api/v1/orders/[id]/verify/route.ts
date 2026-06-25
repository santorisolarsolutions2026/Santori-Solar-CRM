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

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:verify')) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only users with verify permissions can process orders.' }, { status: 403 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, message: 'Invalid Order ID.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lead: { select: { customerName: true, leadCode: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    if (order.status !== 'submitted') {
      return NextResponse.json({ success: false, message: 'Order must be in submitted state to be verified.' }, { status: 400 });
    }

    const body = await req.json();
    const { approve, remark } = body; // approve is boolean, remark is string

    if (approve === undefined) {
      return NextResponse.json({ success: false, message: 'Approval status (approve: true/false) is required.' }, { status: 400 });
    }

    const newStatus = approve ? 'finance_verified' : 'draft'; // send back to draft if rejected

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          financeProcessedById: userPayload.id,
          rejectionReason: approve ? null : (remark || 'Documents/payment issue'),
        },
      });

      // Log activity
      await tx.leadActivityLog.create({
        data: {
          leadId: order.leadId,
          userId: userPayload.id,
          fromStatus: 13,
          toStatus: 13,
          remark: approve
            ? `Order verified by Finance (${userPayload.name}). Notes: ${remark || 'None'}`
            : `Order rejected by Finance (${userPayload.name}). Reason: ${remark || 'Documents/payment issue'}`,
        },
      });

      // Notify submitting consultant
      await tx.notification.create({
        data: {
          userId: order.submittedById,
          type: approve ? 'order_verified' : 'order_rejected',
          title: approve ? '🎉 Order verified by Finance!' : '⚠️ Order rejected by Finance',
          body: approve
            ? `Your order for ${order.lead.customerName} has been verified.`
            : `Your order for ${order.lead.customerName} was rejected. Reason: ${remark || 'Check details'}`,
          leadId: order.leadId,
        },
      });

      // If approved, notify Operations Team
      if (approve) {
        const opsUsers = await tx.user.findMany({
          where: { role: 'operations', isActive: true },
          select: { id: true },
        });

        for (const opsUser of opsUsers) {
          await tx.notification.create({
            data: {
              userId: opsUser.id,
              type: 'ops_assigned',
              title: '🔧 New installation job ready',
              body: `Order #${order.orderCode} (${order.lead.customerName}) verified and ready for installation planning.`,
              leadId: order.leadId,
            },
          });
        }
      }

      return res;
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: approve ? 'Order verified successfully.' : 'Order sent back to draft (rejected) successfully.',
    });
  } catch (error: any) {
    console.error('Verify order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
