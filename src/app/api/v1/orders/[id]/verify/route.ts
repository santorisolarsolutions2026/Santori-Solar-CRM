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
    const { approve, remark, opsManagerId, opsTlId, opsConsultantId } = body; // approve is boolean, remark is string

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

      if (approve && (opsManagerId || opsTlId || opsConsultantId)) {
        const selectedOpsUserId = parseInt(opsConsultantId || opsTlId || opsManagerId, 10);
        
        let finalManagerId: number | null = null;
        let finalTlId: number | null = null;
        let finalConsultantId: number | null = null;
        let teamIdToAssign: number | null = null;

        const targetUser = await tx.user.findUnique({
          where: { id: selectedOpsUserId },
          select: { id: true, reportsTo: true, teamId: true, designation: { select: { level: true } } }
        });

        if (targetUser) {
          teamIdToAssign = targetUser.teamId;
          const level = targetUser.designation?.level ?? 6;
          if (level <= 3) {
            finalManagerId = targetUser.id;
          } else if (level === 4) {
            finalTlId = targetUser.id;
            // auto-resolve Manager
            if (targetUser.reportsTo) {
              const mgrUser = await tx.user.findUnique({
                where: { id: targetUser.reportsTo },
                select: { id: true }
              });
              if (mgrUser) finalManagerId = mgrUser.id;
            }
          } else {
            finalConsultantId = targetUser.id;
            // auto-resolve TL and Manager
            if (targetUser.reportsTo) {
              finalTlId = targetUser.reportsTo;
              const tlUser = await tx.user.findUnique({
                where: { id: finalTlId },
                select: { reportsTo: true }
              });
              if (tlUser?.reportsTo) {
                finalManagerId = tlUser.reportsTo;
              }
            }
          }
        }

        // Update the Lead fields
        await tx.lead.update({
          where: { id: order.leadId },
          data: {
            assignedManagerId: finalManagerId,
            assignedTlId: finalTlId,
            assignedConsultantId: finalConsultantId,
            assignedTeamId: teamIdToAssign,
          },
        });

        // Only create an EmployeeAssignment for the selected user to keep assignment table clean
        if (targetUser) {
          const existingAssign = await tx.employeeAssignment.findFirst({
            where: { leadId: order.leadId, employeeId: targetUser.id, isActive: true }
          });
          if (!existingAssign) {
            await tx.employeeAssignment.create({
              data: {
                leadId: order.leadId,
                employeeId: targetUser.id,
                assignedById: userPayload.id,
                priority: 'medium',
                isActive: true,
              }
            });
          }
        }
      }

      if (approve) {
        // Create initial ledger payment entry for the down payment
        const existingPayments = await tx.payment.findMany({
          where: { orderId },
        });
        if (existingPayments.length === 0 && order.downPayment > 0) {
          await tx.payment.create({
            data: {
              orderId,
              amount: order.downPayment,
              paymentMethod: order.paymentMethod,
              transactionRef: order.transactionRef,
              remarks: 'Initial Down Payment recorded upon order verification.',
              recordedById: userPayload.id,
            },
          });
        }
      }


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

      // Log in central Activity table
      await tx.activity.create({
        data: {
          employeeId: userPayload.id,
          leadId: order.leadId,
          activityType: approve ? 'ORDER_APPROVED' : 'ORDER_REJECTED',
          metadata: JSON.stringify({ remark: remark || '' }),
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
