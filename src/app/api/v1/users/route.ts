import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
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

    // Truncate non-basic details for basic users, except for their own profile
    const responseData = users.map((u) => {
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
        department: u.department,
        designation: u.designation,
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

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('team:manage')) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only users with team management permissions can create users.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, address, employeeId, password, reportsTo, joiningDate, photograph, permissions, departmentId, designationId } = body;

    if (!name || !email || !employeeId || !password || !phone || !address || !designationId) {
      return NextResponse.json({ success: false, message: 'Missing required user fields (Name, Email, Employee ID, Password, Phone, Address, and Designation are required).' }, { status: 400 });
    }

    const empIdTrim = String(employeeId).trim();

    // Derive role and default permissions
    let role = 'consultant';
    const desId = parseInt(designationId, 10);
    const designation = await prisma.designation.findUnique({ where: { id: desId } });
    if (!designation) {
      return NextResponse.json({ success: false, message: 'Invalid designation selected.' }, { status: 400 });
    }

    let departmentName = '';
    let deptId: number | null = null;
    if (departmentId) {
      deptId = parseInt(departmentId, 10);
      const department = await prisma.department.findUnique({ where: { id: deptId } });
      if (department) {
        departmentName = department.name;
      }
    }

    if (designation.name === 'Admin' || designation.level === 0) {
      role = 'admin';
    } else if (departmentName === 'Finance') {
      role = 'finance';
    } else if (departmentName === 'Operations') {
      role = 'operations';
    } else if (departmentName === 'IT') {
      if (designation.level === 1) {
        role = 'director';
      } else if (designation.level === 2 || designation.level === 3) {
        role = 'manager';
      } else if (designation.level === 4) {
        role = 'tl';
      } else {
        role = 'consultant';
      }
    } else if (departmentName === 'Sales') {
      if (designation.name.includes('Head') || designation.level === 1) {
        role = 'sales_head';
      } else if (designation.name.includes('PSA Senior Manager') || designation.name.includes('PSA Manager') || designation.level === 2 || designation.level === 3) {
        role = 'manager';
      } else if (designation.name === 'PSA TL' || (designation.level === 4 && designation.name.includes('PSA'))) {
        role = 'psa_tl';
      } else if (designation.name === 'TL' || designation.level === 4) {
        role = 'tl';
      } else if (designation.name === 'PSA Consultant' || designation.level === 6) {
        role = 'psa';
      } else if (designation.name === 'Consultant' || designation.level === 5) {
        role = 'consultant';
      }
    } else {
      if (designation.level === 1 || designation.level === 2) {
        role = 'director';
      } else if (designation.level === 3) {
        role = 'manager';
      } else if (designation.level === 4) {
        role = 'tl';
      } else {
        role = 'consultant';
      }
    }

    // Reports To Hierarchical Validation
    const currentLevel = designation.level;
    if (currentLevel > 1 && !reportsTo) {
      return NextResponse.json({ success: false, message: 'Supervisor (Reports To) is required for this designation.' }, { status: 400 });
    }

    if (reportsTo) {
      const reportsToId = parseInt(reportsTo, 10);
      const supervisorUser = await prisma.user.findUnique({
        where: { id: reportsToId },
        include: { designation: true }
      });
      if (!supervisorUser) {
        return NextResponse.json({ success: false, message: 'Supervisor not found.' }, { status: 400 });
      }

      const supLevel = supervisorUser.designation?.level ?? 0;

      // Admin (level 0) is supervisor of Department Heads (level 1)
      if (supLevel === 0 || supervisorUser.role === 'admin') {
        if (currentLevel !== 1) {
          return NextResponse.json({ success: false, message: 'Only Department Heads (Level 1) can report to the Admin.' }, { status: 400 });
        }
      } else {
        // Must be in same department and higher in hierarchy (lower level number)
        if (supervisorUser.departmentId !== deptId) {
          return NextResponse.json({ success: false, message: 'Supervisor must belong to the same department.' }, { status: 400 });
        }
        if (supLevel >= currentLevel) {
          return NextResponse.json({ success: false, message: 'Supervisor must be above the employee in the hierarchy.' }, { status: 400 });
        }
      }
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
