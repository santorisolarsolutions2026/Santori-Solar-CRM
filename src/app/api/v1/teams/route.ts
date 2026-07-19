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
      orderBy: { name: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            designation: { select: { id: true, name: true, level: true } },
            reportsTo: true,
          },
        },
      },
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

    const userPermissions = await getUserPermissions(userPayload.id);
    const canManageTeams = userPermissions.includes('team:manage') || userPayload.role === 'admin';
    if (!canManageTeams) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to manage teams.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, departmentId } = body;

    if (!name || !departmentId) {
      return NextResponse.json({ success: false, message: 'Name and Department ID are required.' }, { status: 400 });
    }

    const deptId = parseInt(departmentId, 10);
    if (isNaN(deptId)) {
      return NextResponse.json({ success: false, message: 'Invalid Department ID.' }, { status: 400 });
    }

    // Check if team already exists
    const existing = await prisma.team.findUnique({
      where: { name },
    });
    if (existing) {
      return NextResponse.json({ success: false, message: 'A team with this name already exists.' }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name,
        departmentId: deptId,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: team,
    });
  } catch (error: any) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
