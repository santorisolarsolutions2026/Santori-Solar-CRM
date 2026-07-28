import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasVerifyPerm =
      userPermissions.includes('finance:verify_orders') ||
      userPermissions.includes('finance:order_verify_reject') ||
      userPermissions.includes('orders:verify') ||
      ['admin', 'director'].includes(userPayload.role);

    if (!hasVerifyPerm) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not possess the Verify Orders (finance:verify_orders) permission.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId, action, rejectionReason } = body;

    if (!orderId || !action || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'OrderId and action ("verify" or "reject") are required.' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { lead: true }
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    if (action === 'verify') {
      // Approve order and move to Operations
      const updatedOrder = await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          status: 'finance_verified',
          financeProcessedById: userPayload.id,
          rejectionReason: null
        }
      });

      // Create initial operation history event (Site Visit / Stage 1)
      const firstOpsStage = await prisma.operationStage.findFirst({
        orderBy: { displayOrder: 'asc' }
      });

      if (firstOpsStage) {
        await prisma.operationHistory.create({
          data: {
            orderId: order.id,
            stageId: firstOpsStage.id,
            stageName: firstOpsStage.name,
            updatedById: userPayload.id,
            notes: 'Order verified by Finance and automatically transferred to Operations.'
          }
        });
      }

      // Record activity log
      await prisma.leadActivityLog.create({
        data: {
          leadId: order.leadId,
          userId: userPayload.id,
          fromStatus: order.lead.status,
          toStatus: 14,
          remark: `[FINANCE VERIFIED] Order ${order.orderCode} verified by Finance (${userPayload.name}). Automatically transferred to Operations.`
        }
      });

      // Audit log
      await recordAuditLog({
        userId: userPayload.id,
        tableName: 'Order',
        recordId: order.id,
        fieldName: 'status',
        oldValue: order.status,
        newValue: 'finance_verified',
        leadId: order.leadId,
        module: 'finance',
        action: `Verified Order (${order.orderCode}) and moved to Operations`,
        req
      });

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: `Order ${order.orderCode} verified successfully and moved to Operations.`
      });
    } else {
      // Reject order and send back to Sales draft
      if (!rejectionReason) {
        return NextResponse.json({ success: false, message: 'Rejection reason is required.' }, { status: 400 });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          status: 'draft',
          rejectionReason,
          financeProcessedById: userPayload.id
        }
      });

      // Activity log
      await prisma.leadActivityLog.create({
        data: {
          leadId: order.leadId,
          userId: userPayload.id,
          fromStatus: order.lead.status,
          toStatus: 13,
          remark: `[FINANCE REJECTED] Order ${order.orderCode} rejected by Finance (${userPayload.name}). Reason: ${rejectionReason}`
        }
      });

      // Audit log
      await recordAuditLog({
        userId: userPayload.id,
        tableName: 'Order',
        recordId: order.id,
        fieldName: 'status',
        oldValue: order.status,
        newValue: 'draft (rejected)',
        leadId: order.leadId,
        module: 'finance',
        action: `Rejected Order (${order.orderCode}). Reason: ${rejectionReason}`,
        req
      });

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: `Order ${order.orderCode} rejected. Reason logged for sales team.`
      });
    }
  } catch (error: any) {
    console.error('Finance verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
