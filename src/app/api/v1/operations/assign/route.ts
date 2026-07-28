import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { isSubordinate } from '@/lib/hierarchy';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasAssignPerm =
      userPermissions.includes('operations:assign_orders') ||
      userPermissions.includes('ops:delivery_manage') ||
      userPermissions.includes('orders:assign_ops') ||
      ['admin', 'director'].includes(userPayload.role);

    if (!hasAssignPerm) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not possess the Assign Operations Orders (operations:assign_orders) permission.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId, targetUserId } = body;

    if (!orderId || !targetUserId) {
      return NextResponse.json({ success: false, message: 'orderId and targetUserId are required.' }, { status: 400 });
    }

    const orderIdNum = Number(orderId);
    const targetUserIdNum = Number(targetUserId);

    const order = await prisma.order.findUnique({
      where: { id: orderIdNum },
      include: { lead: true }
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Enforce Hierarchy Rule: Can only assign downward to subordinates!
    const isAdmin = ['admin', 'director'].includes(userPayload.role);
    if (!isAdmin) {
      const allowed = await isSubordinate(userPayload.id, targetUserIdNum);
      if (!allowed) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden. You can only assign operations execution to team members strictly lower in your hierarchy tree.'
        }, { status: 403 });
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserIdNum },
      select: { id: true, name: true, employeeId: true }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'Target operations employee not found.' }, { status: 404 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: {
        assignedOpsId: targetUserIdNum,
        status: 'ops_assigned'
      }
    });

    // Lead activity log
    await prisma.leadActivityLog.create({
      data: {
        leadId: order.leadId,
        userId: userPayload.id,
        fromStatus: order.lead.status,
        toStatus: order.lead.status,
        remark: `[OPERATIONS ASSIGNMENT] Operations task assigned to ${targetUser.name} (${targetUser.employeeId || targetUser.id}).`
      }
    });

    // Audit log
    await recordAuditLog({
      userId: userPayload.id,
      tableName: 'Order',
      recordId: orderIdNum,
      fieldName: 'assignedOpsId',
      oldValue: order.assignedOpsId ? String(order.assignedOpsId) : 'Unassigned',
      newValue: targetUser.name,
      leadId: order.leadId,
      module: 'operations',
      action: `Assigned Operations Order (${order.orderCode}) to subordinate ${targetUser.name}`,
      req
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `Order ${order.orderCode} operations execution assigned to ${targetUser.name}.`
    });
  } catch (error: any) {
    console.error('Assign ops order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
