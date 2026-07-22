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

    if (!Array.isArray(orderIds) || orderIds.length === 0 || !targetUserId || !department) {
      return NextResponse.json({ success: false, message: 'Invalid payload. orderIds array, targetUserId, and department required.' }, { status: 400 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);

    // Validate hierarchy restriction: target user MUST be in user's reporting hierarchy (or user is Admin/IT)
    const isITOrAdmin = userPayload.role === 'admin' || userPayload.role === 'director';
    const subordinateIds = await getSubordinateIds(userPayload.id);
    const allowedUserIds = [userPayload.id, ...subordinateIds];

    if (!isITOrAdmin && !allowedUserIds.includes(Number(targetUserId))) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden. You can only assign orders to yourself or team members below you in your hierarchy.'
      }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(targetUserId) },
      select: { id: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'Target team member not found.' }, { status: 404 });
    }

    if (department === 'finance') {
      const hasFinanceAssignPerm = userPermissions.includes('finance:order_assign') || userPermissions.includes('orders:finance_access') || isITOrAdmin;
      if (!hasFinanceAssignPerm) {
        return NextResponse.json({ success: false, message: 'Permission denied: finance:order_assign required.' }, { status: 403 });
      }

      await prisma.order.updateMany({
        where: { id: { in: orderIds.map(Number) } },
        data: { assignedFinanceId: Number(targetUserId) }
      });
    } else if (department === 'ops') {
      const hasOpsAssignPerm = userPermissions.includes('finance:ops_assign') || userPermissions.includes('orders:operations') || isITOrAdmin;
      if (!hasOpsAssignPerm) {
        return NextResponse.json({ success: false, message: 'Permission denied: ops assignment required.' }, { status: 403 });
      }

      await prisma.order.updateMany({
        where: { id: { in: orderIds.map(Number) } },
        data: { assignedOpsId: Number(targetUserId) }
      });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid department specified.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${orderIds.length} order(s) to ${targetUser.name}.`
    });

  } catch (error: any) {
    console.error('Error in bulk assign orders:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
