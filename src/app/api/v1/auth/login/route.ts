import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signToken, resolveUserPermissions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, location } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        role: true,
        permissions: true,
        reportsTo: true,
        isActive: true,
        passwordHash: true,
        joiningDate: true,
        photograph: true,
        departmentId: true,
        teamId: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true, level: true, permissions: true } }
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated.' },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    // Update last seen presence & login tracking
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastSeenAt: new Date(),
        lastLoginAt: new Date(),
        loginLocation: location || null,
      },
    });

    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const permissionsList = resolveUserPermissions(user);
    const { passwordHash: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          ...userWithoutPassword,
          permissions: permissionsList,
        },
      },
      message: 'Login successful',
    });

    // Set cookie
    response.headers.append(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`
    );

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
