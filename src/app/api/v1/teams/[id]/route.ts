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

    const body = await req.json();
    const { name, departmentId, memberAssignments } = body;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const isEditingUserAdmin = userPayload.role === 'admin';
    const canManageTeamsGlobal = userPermissions.includes('team:manage') || isEditingUserAdmin;

    let canManageThisTeam = canManageTeamsGlobal;
    let editorLevel = 99;
    let editorDeptId: number | null = null;

    if (!canManageTeamsGlobal) {
      const editorDetail = await prisma.user.findUnique({
        where: { id: userPayload.id },
        include: { designation: true }
      });
      if (editorDetail) {
        editorLevel = editorDetail.designation?.level ?? 99;
        editorDeptId = editorDetail.departmentId;
        // Editor must be in the same department and have a supervisor level (< 5)
        if (editorDeptId === team.departmentId && editorLevel < 5) {
          canManageThisTeam = true;
        }
      }
    }

    if (!canManageThisTeam) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to manage this team.' }, { status: 403 });
    }

    // Supervisors cannot edit name or departmentId
    if (!canManageTeamsGlobal && (name !== undefined || departmentId !== undefined)) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only administrators can rename or change team departments.' }, { status: 403 });
    }

    // Validate assignments if editor is a local supervisor
    if (!canManageTeamsGlobal && memberAssignments && Array.isArray(memberAssignments)) {
      for (const assign of memberAssignments) {
        const uid = parseInt(assign.userId, 10);
        const targetUser = await prisma.user.findUnique({
          where: { id: uid },
          include: { designation: true }
        });
        if (!targetUser) {
          return NextResponse.json({ success: false, message: `User with ID ${uid} not found.` }, { status: 400 });
        }
        const targetLevel = targetUser.designation?.level ?? 99;
        if (editorLevel >= targetLevel) {
          return NextResponse.json({ success: false, message: 'Forbidden. You can only assign/remove users who are below you in the hierarchy.' }, { status: 403 });
        }

        const tid = assign.teamId ? parseInt(assign.teamId, 10) : null;
        if (tid !== null && tid !== teamId) {
          return NextResponse.json({ success: false, message: 'Forbidden. You can only assign users to your own team.' }, { status: 403 });
        }
        if (tid === teamId && targetUser.departmentId !== team.departmentId) {
          return NextResponse.json({ success: false, message: 'Forbidden. You can only add team members from your own department.' }, { status: 403 });
        }
        if (tid === null && targetUser.teamId !== teamId) {
          return NextResponse.json({ success: false, message: 'Forbidden. You can only remove users who are currently in your team.' }, { status: 403 });
        }
      }
    }

    const updateData: any = {};
    if (canManageTeamsGlobal) {
      if (name !== undefined) updateData.name = name;
      if (departmentId !== undefined) updateData.departmentId = parseInt(departmentId, 10);
    }

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
