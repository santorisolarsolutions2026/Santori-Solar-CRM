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
    const canAssign = userPermissions.includes('leads:assign') || 
                      userPermissions.includes('sales:lead_assign') || 
                      ['admin', 'director'].includes(userPayload.role);

    if (!canAssign) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not have permission to assign or reassign leads.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { leadIds, assigneeId, targetUserId, assignedManagerId, assignedTlId, assignedConsultantId, status } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Please select at least one lead.' }, { status: 400 });
    }

    const singleAssigneeId = assigneeId || targetUserId;
    const updateData: any = {};

    if (singleAssigneeId !== undefined && singleAssigneeId !== 'UNCHANGED') {
      if (singleAssigneeId === null || singleAssigneeId === '' || singleAssigneeId === 'UNASSIGN') {
        updateData.assignedManagerId = null;
        updateData.assignedTlId = null;
        updateData.assignedConsultantId = null;
      } else {
        const targetIdNum = Number(singleAssigneeId);
        const { resolveHierarchyAssignments } = await import('@/lib/hierarchy');
        const resolved = await resolveHierarchyAssignments(targetIdNum);
        updateData.assignedManagerId = resolved.assignedManagerId;
        updateData.assignedTlId = resolved.assignedTlId;
        updateData.assignedConsultantId = resolved.assignedConsultantId;
      }
    } else {
      if (assignedManagerId !== undefined) {
        updateData.assignedManagerId = assignedManagerId === null || assignedManagerId === '' || assignedManagerId === 'UNASSIGN' ? null : Number(assignedManagerId);
      }
      if (assignedTlId !== undefined) {
        updateData.assignedTlId = assignedTlId === null || assignedTlId === '' || assignedTlId === 'UNASSIGN' ? null : Number(assignedTlId);
      }
      if (assignedConsultantId !== undefined) {
        updateData.assignedConsultantId = assignedConsultantId === null || assignedConsultantId === '' || assignedConsultantId === 'UNASSIGN' ? null : Number(assignedConsultantId);
      }
    }

    if (status !== undefined && status !== null && status !== 'UNCHANGED') {
      updateData.status = Number(status);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'No assignment or status changes specified.' }, { status: 400 });
    }

    const isAdmin = ['admin', 'director'].includes(userPayload.role) || userPayload.role?.startsWith('admin:');

    if (status !== undefined && status !== null && Number(status) === 1) {
      if (!isAdmin) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden. Reverting leads to Fresh Lead status can only be performed by an Admin.'
        }, { status: 403 });
      }

      // Reverting to Fresh Lead automatically returns the lead to Unassigned
      updateData.assignedManagerId = null;
      updateData.assignedTlId = null;
      updateData.assignedConsultantId = null;
      updateData.assignedTeamId = null;
    }

    if (!isAdmin) {
      const { getSubordinateIds } = await import('@/lib/hierarchy');
      const subordinateIds = await getSubordinateIds(userPayload.id);

      const targetIds = [updateData.assignedManagerId, updateData.assignedTlId, updateData.assignedConsultantId].filter(id => id !== undefined && id !== null);
      for (const tid of targetIds) {
        if (tid !== userPayload.id && !subordinateIds.includes(tid)) {
          return NextResponse.json({
            success: false,
            message: 'Forbidden. You can only assign leads to yourself or team members in your hierarchy tree.'
          }, { status: 403 });
        }
      }
    }

    // Fetch leads to inspect their current statuses and assignments
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, status: true, assignedManagerId: true, assignedTlId: true, assignedConsultantId: true },
    });

    // Update leads inside a database transaction to calculate promotion individually
    const result = await prisma.$transaction(async (tx) => {
      let count = 0;
      const logEntries: any[] = [];

      if (Number(status) === 1) {
        // Deactivate all active assignments in EmployeeAssignment table for target leads
        await tx.employeeAssignment.updateMany({
          where: { leadId: { in: leadIds }, isActive: true },
          data: { isActive: false },
        });

        // Wipe previous tracking journey history if clearHistory is true/truthy
        const shouldClear = body.clearHistory === true || String(body.clearHistory) === 'true';
        if (shouldClear) {
          await tx.meetingBooking.deleteMany({
            where: { leadId: { in: leadIds } },
          });
          await tx.leadTask.deleteMany({
            where: { leadId: { in: leadIds } },
          });
          await tx.activity.deleteMany({
            where: { leadId: { in: leadIds } },
          });
          await tx.leadActivityLog.deleteMany({
            where: { leadId: { in: leadIds } },
          });
          await tx.auditLog.deleteMany({
            where: { leadId: { in: leadIds } },
          });
        }
      }

      const shouldClear = Number(status) === 1 && (body.clearHistory === true || String(body.clearHistory) === 'true');

      for (const lead of leads) {
        const finalManagerId = assignedManagerId !== undefined ? (assignedManagerId === null || assignedManagerId === '' ? null : Number(assignedManagerId)) : lead.assignedManagerId;
        const finalTlId = assignedTlId !== undefined ? (assignedTlId === null || assignedTlId === '' ? null : Number(assignedTlId)) : lead.assignedTlId;
        const finalConsId = assignedConsultantId !== undefined ? (assignedConsultantId === null || assignedConsultantId === '' ? null : Number(assignedConsultantId)) : lead.assignedConsultantId;

        const individualUpdate: any = { ...updateData };
        let newStatus = status !== undefined && status !== null && status !== 'UNCHANGED' ? Number(status) : lead.status;

        // Auto-promote from Uninitiated (0) to Fresh Lead (1) when any coordinator gets assigned
        if (lead.status === 0 && (finalManagerId !== null || finalTlId !== null || finalConsId !== null) && (status === undefined || status === null || status === 'UNCHANGED')) {
          individualUpdate.status = 1;
          newStatus = 1;
        }

        await tx.lead.update({
          where: { id: lead.id },
          data: individualUpdate,
        });
        count++;

        logEntries.push({
          leadId: lead.id,
          userId: userPayload.id,
          fromStatus: shouldClear ? null : lead.status,
          toStatus: newStatus,
          remark: Number(status) === 1
            ? `Reverted to Fresh Lead by Admin (${userPayload.name}).${shouldClear ? ' Track journey history cleared.' : ''}`
            : (status !== undefined && status !== null && status !== 'UNCHANGED'
              ? `Bulk updated pipeline status to Stage ${status} (${userPayload.name}).`
              : `Bulk updated team assignments. Updated fields: ${Object.keys(updateData).join(', ')}.${newStatus === 1 && lead.status === 0 ? ' Status auto-promoted to Fresh Lead.' : ''}`),
        });
      }

      if (logEntries.length > 0) {
        await tx.leadActivityLog.createMany({
          data: logEntries,
        });
      }

      return { count };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully reassigned ${result.count} lead(s).`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Bulk lead assign error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
