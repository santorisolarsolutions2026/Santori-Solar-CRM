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
    if (!userPermissions.includes('team:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view the team directory.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get('role') || '';

    const where: any = {};
    if (roleParam) {
      where.role = roleParam;
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
    const { name, email, phone, employeeId, role, password, reportsTo, joiningDate, photograph, permissions } = body;

    if (!name || !email || !employeeId || !role || !password) {
      return NextResponse.json({ success: false, message: 'Missing required user fields.' }, { status: 400 });
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 409 });
    }

    // Check duplicate employeeId
    const existingEmpId = await prisma.user.findUnique({
      where: { employeeId },
    });

    if (existingEmpId) {
      return NextResponse.json({ success: false, message: 'User with this Employee ID already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        employeeId,
        role,
        passwordHash,
        reportsTo: reportsTo ? parseInt(reportsTo, 10) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        photograph: photograph || null,
        permissions: permissions || "",
        isActive: true,
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
