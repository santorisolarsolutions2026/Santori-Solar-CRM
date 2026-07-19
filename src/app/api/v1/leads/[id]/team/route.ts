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

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { assignedTeam: true },
    });
    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const canAssign = userPermissions.includes('leads:assign') || ['admin', 'director', 'sales_head'].includes(userPayload.role);
    if (!canAssign) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to assign leads.' }, { status: 403 });
    }

    const body = await req.json();
    const { teamId } = body;
    if (!teamId) {
      return NextResponse.json({ success: false, message: 'Team ID is required.' }, { status: 400 });
    }

    const targetTeamId = parseInt(teamId, 10);
    if (isNaN(targetTeamId)) {
      return NextResponse.json({ success: false, message: 'Invalid Team ID.' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: targetTeamId },
      include: { department: true },
    });
    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    const oldTeamName = lead.assignedTeam?.name || 'Unassigned';

    // Update lead team assignment
    await prisma.lead.update({
      where: { id: leadId },
      data: { assignedTeamId: targetTeamId },
    });

    // Save team assignment history
    const assignment = await prisma.leadTeamAssignment.create({
      data: {
        leadId,
        teamId: targetTeamId,
        assignedById: userPayload.id,
      },
    });

    // Write to audit log
    await prisma.auditLog.create({
      data: {
        leadId,
        tableName: 'Lead',
        recordId: leadId,
        fieldName: 'assignedTeamId',
        oldValue: oldTeamName,
        newValue: team.name,
        userId: userPayload.id,
      },
    });

    // Write to LeadActivityLog
    await prisma.leadActivityLog.create({
      data: {
        leadId,
        userId: userPayload.id,
        toStatus: lead.status,
        remark: `[TEAM ASSIGNMENT] Lead transferred from Team ${oldTeamName} to Team ${team.name}.`,
      },
    });

    return NextResponse.json({
      success: true,
      data: assignment,
      message: `Successfully assigned lead to ${team.name}.`,
    });
  } catch (error: any) {
    console.error('Assign lead team error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
