import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentIdStr = searchParams.get('departmentId') || '';

    const where: any = {};
    if (departmentIdStr) {
      const deptId = parseInt(departmentIdStr, 10);
      if (!isNaN(deptId)) {
        where.OR = [
          { departmentId: deptId },
          { departmentId: null } // shared/nullable designations
        ];
      }
    }

    const designations = await prisma.designation.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: designations,
    });
  } catch (error: any) {
    console.error('Fetch designations error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/v1/designations
export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can create designations.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, level, departmentId, permissions } = body;

    if (!name || level === undefined) {
      return NextResponse.json({ success: false, message: 'Name and level are required.' }, { status: 400 });
    }

    const levelNum = parseInt(level, 10);
    if (isNaN(levelNum) || levelNum < 0 || levelNum > 6) {
      return NextResponse.json({ success: false, message: 'Level must be between 0 (Admin) and 6 (PSA Consultant).' }, { status: 400 });
    }

    const deptId = departmentId ? parseInt(departmentId, 10) : null;

    const exists = await prisma.designation.findUnique({
      where: { name }
    });
    if (exists) {
      return NextResponse.json({ success: false, message: 'Designation name already exists.' }, { status: 400 });
    }

    const newDesignation = await prisma.designation.create({
      data: {
        name,
        level: levelNum,
        departmentId: deptId && !isNaN(deptId) ? deptId : null,
        permissions: permissions || '',
      }
    });


    return NextResponse.json({
      success: true,
      data: newDesignation,
      message: 'Designation created successfully.',
    });
  } catch (error: any) {
    console.error('Create designation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

// PUT /api/v1/designations
export async function PUT(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can modify designations.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, level, departmentId, permissions } = body;

    if (!id || !name || level === undefined) {
      return NextResponse.json({ success: false, message: 'ID, name, and level are required.' }, { status: 400 });
    }

    const dId = parseInt(id, 10);
    const levelNum = parseInt(level, 10);
    if (isNaN(dId) || isNaN(levelNum) || levelNum < 0 || levelNum > 6) {
      return NextResponse.json({ success: false, message: 'Invalid ID or level parameters.' }, { status: 400 });
    }

    const deptId = departmentId ? parseInt(departmentId, 10) : null;

    // Check if name is taken by another record
    const exists = await prisma.designation.findFirst({
      where: { name, NOT: { id: dId } }
    });
    if (exists) {
      return NextResponse.json({ success: false, message: 'Designation name already taken.' }, { status: 400 });
    }

    const updated = await prisma.designation.update({
      where: { id: dId },
      data: {
        name,
        level: levelNum,
        departmentId: deptId && !isNaN(deptId) ? deptId : null,
        permissions: permissions !== undefined ? permissions : undefined,
      }
    });


    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Designation updated successfully.',
    });
  } catch (error: any) {
    console.error('Update designation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/designations
export async function DELETE(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can delete designations.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Designation ID is required.' }, { status: 400 });
    }

    const dId = parseInt(id, 10);
    if (isNaN(dId)) {
      return NextResponse.json({ success: false, message: 'Invalid Designation ID.' }, { status: 400 });
    }

    // Check if any employees are linked
    const usersCount = await prisma.user.count({
      where: { designationId: dId }
    });

    if (usersCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Cannot delete designation. There are ${usersCount} active employee(s) assigned to this designation.`
      }, { status: 400 });
    }

    await prisma.designation.delete({
      where: { id: dId }
    });

    return NextResponse.json({
      success: true,
      message: 'Designation deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete designation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
