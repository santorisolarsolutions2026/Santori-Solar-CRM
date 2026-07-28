import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const stages = await prisma.operationStage.findMany({
      orderBy: { displayOrder: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: stages
    });
  } catch (error: any) {
    console.error('Fetch operations stages config error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasPerm =
      userPermissions.includes('operations:manage_stages') ||
      userPermissions.includes('admin:manage_permissions') ||
      ['admin', 'director'].includes(userPayload.role);

    if (!hasPerm) {
      return NextResponse.json({ success: false, message: 'Forbidden. Cannot configure stages.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description, displayOrder } = body;

    if (!name || !code) {
      return NextResponse.json({ success: false, message: 'Name and code are required.' }, { status: 400 });
    }

    const stage = await prisma.operationStage.create({
      data: {
        name,
        code: code.toLowerCase().trim().replace(/\s+/g, '_'),
        description: description || null,
        displayOrder: displayOrder ? parseInt(displayOrder, 10) : 10,
        isActive: true
      }
    });

    await recordAuditLog({
      userId: userPayload.id,
      tableName: 'OperationStage',
      recordId: stage.id,
      fieldName: 'name',
      oldValue: null,
      newValue: name,
      module: 'operations',
      action: `Created new configurable Operations Stage "${name}"`,
      req
    });

    return NextResponse.json({
      success: true,
      data: stage,
      message: `Operations stage "${name}" created successfully in database.`
    });
  } catch (error: any) {
    console.error('Create stage error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
