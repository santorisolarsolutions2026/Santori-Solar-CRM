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

    const permissions = await getUserPermissions(userPayload.id);
    if (!permissions.includes('team:manage')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to manage teams.' }, { status: 403 });
    }

    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return NextResponse.json({ success: false, message: 'Invalid Team ID.' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { name, departmentId, leaderId, memberIds } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (departmentId) updateData.departmentId = parseInt(departmentId, 10);
    
    // Set leaderId (handles clearing if null)
    if (leaderId !== undefined) {
      updateData.leaderId = leaderId ? parseInt(leaderId, 10) : null;
    }

    const updatedTeam = await prisma.$transaction(async (tx) => {
      // 1. Update basic team info
      const res = await tx.team.update({
        where: { id: teamId },
        data: updateData,
        include: {
          department: { select: { id: true, name: true } },
          leader: { select: { id: true, name: true } },
        },
      });

      // 2. If leader is updated, make sure they are mapped to this team
      if (leaderId) {
        await tx.user.update({
          where: { id: parseInt(leaderId, 10) },
          data: { teamId },
        });
      }

      // 3. If memberIds is provided, update team membership
      if (memberIds && Array.isArray(memberIds)) {
        const parsedMemberIds = memberIds.map(mId => parseInt(mId, 10)).filter(mId => !isNaN(mId));

        // Reset teamId for any users currently in the team but not in the new member list
        await tx.user.updateMany({
          where: {
            teamId,
            id: { notIn: parsedMemberIds },
            // Don't clear teamId of the team leader if they are not in the member list
            ...(res.leaderId ? { id: { notIn: [res.leaderId, ...parsedMemberIds] } } : {}),
          },
          data: { teamId: null },
        });

        // Set teamId for all new members
        if (parsedMemberIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: parsedMemberIds } },
            data: { teamId },
          });
        }
      }

      return res;
    });

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Team updated successfully',
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

    const permissions = await getUserPermissions(userPayload.id);
    if (!permissions.includes('team:manage')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to manage teams.' }, { status: 403 });
    }

    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return NextResponse.json({ success: false, message: 'Invalid Team ID.' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Clear teamId for all users in the team
      await tx.user.updateMany({
        where: { teamId },
        data: { teamId: null },
      });

      // 2. Clear assignedTeamId on any leads assigned to this team
      await tx.lead.updateMany({
        where: { assignedTeamId: teamId },
        data: { assignedTeamId: null },
      });

      // 3. Delete the team itself
      await tx.team.delete({
        where: { id: teamId },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
