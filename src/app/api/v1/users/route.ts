import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions, getUserSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';


export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasAccess = userPermissions.includes('team:view') ||
                      userPermissions.includes('leads:view') ||
                      userPermissions.includes('leads:create') ||
                      userPermissions.includes('leads:edit') ||
                      userPermissions.includes('orders:view') ||
                      userPermissions.includes('orders:create');

    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view users.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get('role') || '';
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const where: any = includeInactive ? {} : { isActive: true };
    if (roleParam) {
      if (roleParam.includes(',')) {
        where.role = { in: roleParam.split(',') };
      } else {
        where.role = roleParam;
      }
    }

    const isAdminOrDirectorOrSalesHead = userPermissions.includes('team:manage');

    // If it's a basic user fetching the team, we don't apply the hierarchy filter since everyone is visible.
    // However, if we do a role filter, we can keep it.
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        employeeId: true,
        role: true,
        reportsTo: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        lastLoginAt: true,
        loginLocation: true,
        lastLogoutAt: true,
        logoutLocation: true,
        joiningDate: true,
        photograph: true,
        permissions: true,
        departmentId: true,
        designationId: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true, level: true } },
        supervisor: { select: { id: true, name: true } },
        _count: {
          select: {
            consultantLeads: { where: { status: 13 } },
            tlLeads: { where: { status: 13 } },
            managedLeads: { where: { status: 13 } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const itDept = await prisma.department.findFirst({ where: { name: 'IT' } });
    const responseData = users.map((u) => {
      if (itDept && u.departmentId === itDept.id && u.designation) {
        u.designation.name = 'IT Head';
      }
      const leadsClosed = (u._count?.consultantLeads || 0) + (u._count?.tlLeads || 0) + (u._count?.managedLeads || 0);
      const baseUser = {
        id: u.id,
        name: u.name,
        role: u.role,
        employeeId: u.employeeId,
        joiningDate: u.joiningDate,
        photograph: u.photograph,
        isActive: u.isActive,
        leadsClosed,
        departmentId: u.departmentId,
        designationId: u.designationId,
        reportsTo: u.reportsTo,
        department: u.department,
        designation: u.designation,
        supervisor: u.supervisor,
      };

      if (isAdminOrDirectorOrSalesHead || u.id === userPayload.id) {
        const { _count, ...rest } = u;
        return {
          ...rest,
          leadsClosed,
        };
      }

      return baseUser;
    });

    return NextResponse.json({
      success: true,
      data: responseData,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      }
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
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

    const { role: loggedInRole, permissions: userPermissions, department: loggedInUserDept } = await getUserSession(userPayload.id);
    const loggedInBaseRole = loggedInRole.includes(':') ? loggedInRole.split(':')[0] : loggedInRole;
    const isEditingUserAdmin = loggedInBaseRole === 'admin';
    const isEditingUserIT = loggedInUserDept?.name === 'IT';
    const hasTeamManagePermission = userPermissions.includes('team:manage');

    const canManageTeam = isEditingUserAdmin || isEditingUserIT || hasTeamManagePermission;

    if (!canManageTeam) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only IT department members, Admins, or users explicitly granted "team:manage" permission can create users.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, address, employeeId, password, reportsTo, joiningDate, photograph, permissions, departmentId, designationId, designationText, designationName } = body;

    if (!name || !email || !employeeId || !password || !phone || !address) {
      return NextResponse.json({ success: false, message: 'Missing required user fields (Name, Email, Employee ID, Password, Phone, and Address are required).' }, { status: 400 });
    }

    const empIdTrim = String(employeeId).trim();

    let departmentName = '';
    let deptId: number | null = null;
    if (departmentId) {
      deptId = parseInt(departmentId, 10);
      const department = await prisma.department.findUnique({ where: { id: deptId } });
      if (department) {
        departmentName = department.name;
      }
    }

    // Find or create designation if typed text or name provided
    let desId: number | null = designationId ? parseInt(designationId, 10) : null;
    const rawDesName = (designationText || designationName || '').trim();
    if (rawDesName) {
      let des = await prisma.designation.findFirst({ where: { name: rawDesName } });
      if (!des) {
        des = await prisma.designation.create({
          data: { name: rawDesName, level: 5, departmentId: deptId }
        });
      }
      desId = des.id;
    }

    let role = 'consultant';
    if (departmentName === 'Finance') {
      role = 'finance';
    } else if (departmentName === 'Operations') {
      role = 'operations';
    } else if (departmentName === 'Sales') {
      role = 'consultant';
    } else if (departmentName === 'PSA') {
      role = 'psa';
    } else if (departmentName === 'Admin') {
      role = 'admin';
    }


    const targetRoleLower = role.toLowerCase();
    if (targetRoleLower === 'admin' || targetRoleLower.startsWith('admin:')) {
      const existingAdmin = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: { startsWith: 'admin:' } }
          ]
        }
      });
      if (existingAdmin) {
        return NextResponse.json({ success: false, message: 'An Admin user already exists. There can only be one Admin in the system.' }, { status: 400 });
      }
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (!existingUser.isActive) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { email: `deleted_${existingUser.id}_${existingUser.email}` },
        });
      } else {
        return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 409 });
      }
    }

    // Check duplicate employeeId
    const existingEmpId = await prisma.user.findUnique({
      where: { employeeId: empIdTrim },
    });

    if (existingEmpId) {
      if (!existingEmpId.isActive) {
        await prisma.user.update({
          where: { id: existingEmpId.id },
          data: { employeeId: null },
        });
      } else {
        return NextResponse.json({ success: false, message: 'User with this Employee ID already exists.' }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { getDefaultPermissionsForRole } = await import('@/lib/auth');
    const finalPermissions = permissions || getDefaultPermissionsForRole(role).join(',');


    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: String(phone).trim(),
        address: String(address).trim(),
        employeeId: empIdTrim,
        role,
        passwordHash,
        reportsTo: reportsTo ? parseInt(reportsTo, 10) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        photograph: photograph || null,
        permissions: finalPermissions,
        isActive: true,
        departmentId: deptId,
        designationId: desId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        tableName: 'User',
        recordId: newUser.id,
        fieldName: 'CREATE',
        oldValue: null,
        newValue: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          employeeId: newUser.employeeId,
          departmentId: newUser.departmentId,
          designationId: newUser.designationId,
        }),
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        employeeId: newUser.employeeId,
      },
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
