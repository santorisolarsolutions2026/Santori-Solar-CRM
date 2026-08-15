import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { getSubordinateIds } from '@/lib/hierarchy';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderIds, targetUserId, department } = body; // department: 'finance' | 'ops'

    if (!Array.isArray(orderIds) || orderIds.length === 0 || !department) {
      return NextResponse.json({ success: false, message: 'Invalid payload. orderIds array and department required.' }, { status: 400 });
    }

    const isUnassign = targetUserId === '' || targetUserId === null || targetUserId === undefined || targetUserId === 'unassigned';

    const userPermissions = await getUserPermissions(userPayload.id);

    // Validate hierarchy restriction: target user MUST be in user's reporting hierarchy (or user is Admin/IT)
    const isITOrAdmin = userPayload.role === 'admin' || userPayload.role === 'director';
    const subordinateIds = await getSubordinateIds(userPayload.id);
    const allowedUserIds = [userPayload.id, ...subordinateIds];

    if (!isUnassign && !isITOrAdmin && !allowedUserIds.includes(Number(targetUserId))) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden. You can only assign orders to yourself or team members below you in your hierarchy.'
      }, { status: 403 });
    }

    let targetUserName = 'Unassigned';
    if (!isUnassign) {
      const targetUser = await prisma.user.findUnique({
        where: { id: Number(targetUserId) },
        select: { id: true, name: true }
      });

      if (!targetUser) {
        return NextResponse.json({ success: false, message: 'Target team member not found.' }, { status: 404 });
      }
      targetUserName = targetUser.name;
    }

    if (department === 'finance') {
      const hasFinanceAssignPerm = userPermissions.includes('finance:order_assign') || userPermissions.includes('orders:finance_access') || userPermissions.includes('sales:finance_assign') || userPermissions.includes('orders:assign_finance') || isITOrAdmin;
      if (!hasFinanceAssignPerm) {
        return NextResponse.json({ success: false, message: 'Permission denied: finance:order_assign required.' }, { status: 403 });
      }

      await prisma.order.updateMany({
        where: { id: { in: orderIds.map(Number) } },
        data: { assignedFinanceId: isUnassign ? null : Number(targetUserId) }
      });
    } else if (department === 'ops') {
      const hasOpsAssignPerm = userPermissions.includes('finance:ops_assign') || userPermissions.includes('ops:order_assign') || isITOrAdmin;
      if (!hasOpsAssignPerm) {
        return NextResponse.json({ success: false, message: 'Permission denied: ops assignment required.' }, { status: 403 });
      }

      await prisma.order.updateMany({
        where: { id: { in: orderIds.map(Number) } },
        data: { assignedOpsId: isUnassign ? null : Number(targetUserId) }
      });

      if (!isUnassign) {
        await prisma.order.updateMany({
          where: {
            id: { in: orderIds.map(Number) },
            status: 'finance_verified'
          },
          data: { status: 'ops_assigned' }
        });
      } else {
        await prisma.order.updateMany({
          where: {
            id: { in: orderIds.map(Number) },
            status: 'ops_assigned'
          },
          data: { status: 'finance_verified' }
        });
      }
    } else {
      return NextResponse.json({ success: false, message: 'Invalid department specified.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: isUnassign 
        ? `Successfully unassigned ${orderIds.length} order(s).` 
        : `Successfully assigned ${orderIds.length} order(s) to ${targetUserName}.`
    });

  } catch (error: any) {
    console.error('Error in bulk assign orders:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
