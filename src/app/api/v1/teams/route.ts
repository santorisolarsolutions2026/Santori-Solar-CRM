import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const teams = await prisma.team.findMany({
      include: {
        department: { select: { id: true, name: true } },
        leader: { select: { id: true, name: true, role: true } },
        members: { select: { id: true, name: true, role: true, reportsTo: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: teams,
    });
  } catch (error: any) {
    console.error('Fetch teams error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const permissions = await getUserPermissions(userPayload.id);
    if (!permissions.includes('team:manage')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to manage teams.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, departmentId, leaderId } = body;

    if (!name || !departmentId) {
      return NextResponse.json({ success: false, message: 'Name and Department ID are required.' }, { status: 400 });
    }

    const existing = await prisma.team.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json({ success: false, message: 'A team with this name already exists.' }, { status: 409 });
    }

    const team = await prisma.team.create({
      data: {
        name,
        departmentId: parseInt(departmentId, 10),
        leaderId: leaderId ? parseInt(leaderId, 10) : null,
      },
      include: {
        department: { select: { id: true, name: true } },
        leader: { select: { id: true, name: true, role: true } },
      },
    });

    // If a leader is specified, update their teamId to this team
    if (leaderId) {
      await prisma.user.update({
        where: { id: parseInt(leaderId, 10) },
        data: { teamId: team.id },
      });
    }

    return NextResponse.json({
      success: true,
      data: team,
      message: 'Team created successfully',
    });
  } catch (error: any) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
