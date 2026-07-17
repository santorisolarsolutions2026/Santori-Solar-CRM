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
                      ['admin', 'director'].includes(userPayload.role);

    if (!canAssign) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not have permission to assign or reassign leads.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { leadIds, assignedManagerId, assignedTlId, assignedConsultantId, status } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Please select at least one lead.' }, { status: 400 });
    }

    const updateData: any = {};

    if (assignedManagerId !== undefined) {
      updateData.assignedManagerId = assignedManagerId === null || assignedManagerId === '' ? null : Number(assignedManagerId);
    }

    if (assignedTlId !== undefined) {
      updateData.assignedTlId = assignedTlId === null || assignedTlId === '' ? null : Number(assignedTlId);
    }

    if (assignedConsultantId !== undefined) {
      updateData.assignedConsultantId = assignedConsultantId === null || assignedConsultantId === '' ? null : Number(assignedConsultantId);
    }

    if (status !== undefined && status !== null && status !== 'UNCHANGED') {
      updateData.status = Number(status);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'No assignment or status changes specified.' }, { status: 400 });
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
          fromStatus: lead.status,
          toStatus: newStatus,
          remark: status !== undefined && status !== null && status !== 'UNCHANGED'
            ? `Bulk updated pipeline status to Stage ${status} (${userPayload.name}).`
            : `Bulk updated team assignments. Updated fields: ${Object.keys(updateData).join(', ')}.${newStatus === 1 && lead.status === 0 ? ' Status auto-promoted to Fresh Lead.' : ''}`,
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
