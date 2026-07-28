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
    const hasManagePerm =
      userPermissions.includes('operations:manage_stages') ||
      userPermissions.includes('ops:update_stages') ||
      userPermissions.includes('orders:operations') ||
      ['admin', 'director'].includes(userPayload.role);

    if (!hasManagePerm) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not possess the Manage Operations Stages (operations:manage_stages) permission.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId, stageId, notes } = body;

    if (!orderId || !stageId) {
      return NextResponse.json({ success: false, message: 'orderId and stageId are required.' }, { status: 400 });
    }

    const orderIdNum = Number(orderId);
    const stageIdNum = Number(stageId);

    const order = await prisma.order.findUnique({
      where: { id: orderIdNum },
      include: { lead: true }
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    const opStage = await prisma.operationStage.findUnique({
      where: { id: stageIdNum }
    });

    if (!opStage) {
      return NextResponse.json({ success: false, message: 'Configurable Operation Stage not found.' }, { status: 404 });
    }

    // Check if stage is completed stage
    const isCompletedStage = opStage.code === 'completed' || opStage.displayOrder >= 6;
    const newOrderStatus = isCompletedStage ? 'completed' : 'ops_assigned';

    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: {
        opsStage: opStage.displayOrder,
        status: newOrderStatus,
        actualCommissionedAt: isCompletedStage ? new Date() : order.actualCommissionedAt
      }
    });

    // Create OperationHistory timeline event
    const opHistory = await prisma.operationHistory.create({
      data: {
        orderId: orderIdNum,
        stageId: stageIdNum,
        stageName: opStage.name,
        updatedById: userPayload.id,
        notes: notes || `Advanced stage to ${opStage.name}`
      }
    });

    // Lead activity log
    await prisma.leadActivityLog.create({
      data: {
        leadId: order.leadId,
        userId: userPayload.id,
        fromStatus: order.lead.status,
        toStatus: isCompletedStage ? 14 : order.lead.status,
        remark: `[OPERATIONS STAGE UPDATED] Advanced to "${opStage.name}" stage by Operations (${userPayload.name}). Notes: ${notes || 'None'}`
      }
    });

    // Audit log
    await recordAuditLog({
      userId: userPayload.id,
      tableName: 'Order',
      recordId: orderIdNum,
      fieldName: 'opsStage',
      oldValue: `Stage #${order.opsStage}`,
      newValue: opStage.name,
      leadId: order.leadId,
      module: 'operations',
      action: `Updated Operations Stage to "${opStage.name}"`,
      req
    });

    return NextResponse.json({
      success: true,
      data: { order: updatedOrder, history: opHistory },
      message: `Operations stage successfully updated to "${opStage.name}". Timeline event created.`
    });
  } catch (error: any) {
    console.error('Update operations stage error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
