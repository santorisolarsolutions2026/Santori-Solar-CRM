import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

export async function GET(
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

    const assignments = await prisma.employeeAssignment.findMany({
      where: { leadId, isActive: true },
      include: {
        employee: { select: { id: true, name: true, role: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    console.error('Fetch employee assignments error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

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
    });
    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const isManagerOrTl = ['admin', 'director', 'sales_head', 'manager', 'tl', 'psa_tl'].includes(userPayload.role);
    if (!isManagerOrTl && !userPermissions.includes('leads:assign')) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only managers or TLs can assign employees.' }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, dueDate, priority } = body;
    if (!employeeId) {
      return NextResponse.json({ success: false, message: 'Employee ID is required.' }, { status: 400 });
    }

    const empId = parseInt(employeeId, 10);
    if (isNaN(empId)) {
      return NextResponse.json({ success: false, message: 'Invalid Employee ID.' }, { status: 400 });
    }

    const employee = await prisma.user.findUnique({
      where: { id: empId },
    });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found.' }, { status: 404 });
    }

    const isAdmin = ['admin', 'director'].includes(userPayload.role) || userPayload.role?.startsWith('admin:');
    if (!isAdmin) {
      const { getSubordinateIds } = await import('@/lib/hierarchy');
      const subordinateIds = await getSubordinateIds(userPayload.id);

      if (!subordinateIds.includes(empId)) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden. You can only assign leads to team members strictly lower in your hierarchy tree.'
        }, { status: 403 });
      }
    }

    // Deactivate previous active employee assignments for this lead
    await prisma.employeeAssignment.updateMany({
      where: { leadId, isActive: true },
      data: { isActive: false },
    });

    // Create new active employee assignment
    const assignment = await prisma.employeeAssignment.create({
      data: {
        leadId,
        employeeId: empId,
        assignedById: userPayload.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'medium',
        isActive: true,
      },
    });

    // Sync back to Lead model legacy assignment fields for backward compatibility
    const empRole = employee.role.toLowerCase();
    const legacyUpdate: any = {};
    if (empRole.includes('consultant')) {
      legacyUpdate.assignedConsultantId = empId;
    } else if (empRole.includes('tl')) {
      legacyUpdate.assignedTlId = empId;
    } else if (empRole.includes('manager')) {
      legacyUpdate.assignedManagerId = empId;
    } else {
      // General consultant assignment fallback
      legacyUpdate.assignedConsultantId = empId;
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: legacyUpdate,
    });

    // Write to audit log
    await prisma.auditLog.create({
      data: {
        leadId,
        tableName: 'Lead',
        recordId: leadId,
        fieldName: 'assignedEmployee',
        oldValue: 'Previous assignee',
        newValue: employee.name,
        userId: userPayload.id,
      },
    });

    // Write to LeadActivityLog
    await prisma.leadActivityLog.create({
      data: {
        leadId,
        userId: userPayload.id,
        toStatus: lead.status,
        remark: `[EMPLOYEE ASSIGNMENT] Lead assigned to ${employee.name} (Priority: ${priority || 'medium'}, Due: ${dueDate || 'none'}).`,
      },
    });

    return NextResponse.json({
      success: true,
      data: assignment,
      message: `Lead successfully assigned to ${employee.name}.`,
    });
  } catch (error: any) {
    console.error('Assign lead employee error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
