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

    // Role visibility rules (Section 5.6)
    if (userPayload.role === 'manager') {
      // Manager sees only users in their team (subordinates or reporting to subordinates)
      // For simplicity, we query users reporting to them directly (TLs) or reporting to their TLs (consultants/psas)
      const subordinates = await prisma.user.findMany({
        where: { reportsTo: userPayload.id },
        select: { id: true },
      });
      const subordinateIds = subordinates.map((s) => s.id);
      
      where.OR = [
        { id: userPayload.id }, // include self
        { reportsTo: userPayload.id }, // TLs reporting to Manager
        { reportsTo: { in: subordinateIds } }, // Consultants/PSAs reporting to TLs
      ];
    } else if (userPayload.role === 'tl') {
      // TL sees only consultants/PSAs reporting to them
      where.OR = [
        { id: userPayload.id },
        { reportsTo: userPayload.id },
      ];
    } else if (userPayload.role !== 'admin' && userPayload.role !== 'sales_head') {
      // Non-management roles can only see themselves
      where.id = userPayload.id;
    }

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
        supervisor: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: users,
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

    // Only Admin can create users (Section 2.1)
    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admin can create users.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, role, password, reportsTo } = body;

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
