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
    const { leadIds, assignedManagerId, assignedTlId, assignedConsultantId } = body;

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

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'No assignment changes specified.' }, { status: 400 });
    }

    // Update leads in database
    const result = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
      },
      data: updateData,
    });

    // Create audit log entries for each assigned lead
    try {
      const logEntries = leadIds.map((leadId: number) => ({
        leadId,
        userId: userPayload.id,
        fromStatus: 0,
        toStatus: 0,
        remark: `Bulk updated team assignments. Updated fields: ${Object.keys(updateData).join(', ')}.`,
      }));

      await prisma.leadActivityLog.createMany({
        data: logEntries,
      });
    } catch (e) {
      console.warn('Failed to record activity logs for bulk assignment:', e);
    }

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
