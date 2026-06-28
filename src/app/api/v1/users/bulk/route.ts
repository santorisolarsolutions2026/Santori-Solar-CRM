import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const isAdminOrManager = userPayload.role === 'admin' || userPayload.role.startsWith('admin:') || userPermissions.includes('team:manage');

    if (!isAdminOrManager) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Only administrators or managers can perform bulk team actions.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userIds, action, confirmUnassign } = body; // action: 'activate' | 'deactivate' | 'delete'

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Please select at least one team member.' }, { status: 400 });
    }

    const targetIds = userIds.filter((id: number) => id !== userPayload.id);

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Cannot perform bulk action on your own account.' }, { status: 400 });
    }

    if (action === 'activate') {
      await prisma.user.updateMany({
        where: { id: { in: targetIds } },
        data: { isActive: true },
      });
      return NextResponse.json({
        success: true,
        message: `Successfully activated ${targetIds.length} team member(s).`,
      });
    } else if (action === 'deactivate') {
      await prisma.user.updateMany({
        where: { id: { in: targetIds } },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: `Successfully deactivated ${targetIds.length} team member(s).`,
      });
    } else if (action === 'delete') {
      // Count associated leads for target IDs
      const totalAssociatedLeads = await prisma.lead.count({
        where: {
          OR: [
            { assignedManagerId: { in: targetIds } },
            { assignedTlId: { in: targetIds } },
            { assignedConsultantId: { in: targetIds } },
          ],
        },
      });

      if (totalAssociatedLeads > 0 && !confirmUnassign) {
        return NextResponse.json({
          success: false,
          requiresConfirmation: true,
          totalAssociatedLeads,
          message: `Warning: Selected team member(s) have ${totalAssociatedLeads} associated lead(s). Deleting them will make all their associated leads unassigned. Do you want to proceed?`,
        });
      }

      // Unassign leads if any
      if (totalAssociatedLeads > 0) {
        await prisma.lead.updateMany({
          where: { assignedManagerId: { in: targetIds } },
          data: { assignedManagerId: null },
        });
        await prisma.lead.updateMany({
          where: { assignedTlId: { in: targetIds } },
          data: { assignedTlId: null },
        });
        await prisma.lead.updateMany({
          where: { assignedConsultantId: { in: targetIds } },
          data: { assignedConsultantId: null },
        });
      }

      // Purge and soft delete from system
      await prisma.user.updateMany({
        where: { id: { in: targetIds } },
        data: { isActive: false, employeeId: null },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${targetIds.length} team member(s). Associated leads have been unassigned.`,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action specified.' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk user action error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
