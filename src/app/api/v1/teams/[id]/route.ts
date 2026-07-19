import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return NextResponse.json({ success: false, message: 'Invalid Team ID.' }, { status: 400 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const canManageTeams = userPermissions.includes('team:manage') || userPayload.role === 'admin';
    if (!canManageTeams) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to manage teams.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, departmentId, memberAssignments } = body;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (departmentId !== undefined) updateData.departmentId = parseInt(departmentId, 10);

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
    });

    // If member assignments are provided, update their reportsTo and teamId in bulk
    // memberAssignments structure: [{ userId: 1, reportsTo: 2, teamId: 3 }]
    if (memberAssignments && Array.isArray(memberAssignments)) {
      for (const assign of memberAssignments) {
        const uid = parseInt(assign.userId, 10);
        const repTo = assign.reportsTo ? parseInt(assign.reportsTo, 10) : null;
        const tid = assign.teamId ? parseInt(assign.teamId, 10) : null;

        await prisma.user.update({
          where: { id: uid },
          data: {
            reportsTo: isNaN(repTo as number) ? null : repTo,
            teamId: isNaN(tid as number) ? null : tid,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedTeam,
    });
  } catch (error: any) {
    console.error('Update team error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return NextResponse.json({ success: false, message: 'Invalid Team ID.' }, { status: 400 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const canManageTeams = userPermissions.includes('team:manage') || userPayload.role === 'admin';
    if (!canManageTeams) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to manage teams.' }, { status: 403 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    // Set teamId to null for all users and leads in this team before deletion
    await prisma.user.updateMany({
      where: { teamId },
      data: { teamId: null },
    });
    await prisma.lead.updateMany({
      where: { assignedTeamId: teamId },
      data: { assignedTeamId: null },
    });

    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({
      success: true,
      message: 'Team successfully deleted.',
    });
  } catch (error: any) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
