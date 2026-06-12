import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';


export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get('role') || '';

    const where: any = {};
    if (roleParam) {
      where.role = roleParam;
    }

    const isAdminOrDirectorOrSalesHead = ['admin', 'director', 'sales_head'].includes(userPayload.role);

    // If it's a basic user fetching the team, we don't apply the hierarchy filter since everyone is visible.
    // However, if we do a role filter, we can keep it.
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
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

    // Allow Admin, Director, and Sales Head to create users
    if (!['admin', 'director', 'sales_head'].includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admin, Director, and Sales Head can create users.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, role, password, reportsTo, joiningDate, photograph } = body;

    if (!name || !email || !role || !password) {
      return NextResponse.json({ success: false, message: 'Missing required user fields.' }, { status: 400 });
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role,
        passwordHash,
        reportsTo: reportsTo ? parseInt(reportsTo, 10) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        photograph: photograph || null,
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
