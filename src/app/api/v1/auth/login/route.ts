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

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor 
      ? forwardedFor.split(',')[0].trim() 
      : req.headers.get('x-real-ip') || '127.0.0.1';

    // Clean up old attempts (older than 24 hours) to keep the DB clean
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      await prisma.failedLoginAttempt.deleteMany({
        where: {
          attemptedAt: {
            lt: oneDayAgo,
          },
        },
      });
    } catch (cleanErr) {
      console.error('Failed to clean up old login attempts:', cleanErr);
    }

    // Check if blocked (5 failed attempts in the last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // 1. Email-based check (max 5 attempts)
    const emailFailedCount = await prisma.failedLoginAttempt.count({
      where: {
        email,
        attemptedAt: {
          gte: fifteenMinutesAgo,
        },
      },
    });

    if (emailFailedCount >= 5) {
      return NextResponse.json(
        { success: false, message: 'Too many failed login attempts. Please try again after 15 minutes.' },
        { status: 429 }
      );
    }

    // 2. IP-based check (max 20 attempts for entire office/network)
    const ipFailedCount = await prisma.failedLoginAttempt.count({
      where: {
        ipAddress,
        attemptedAt: {
          gte: fifteenMinutesAgo,
        },
      },
    });

    if (ipFailedCount >= 20) {
      return NextResponse.json(
        { success: false, message: 'Too many failed login attempts from this network. Please try again after 15 minutes.' },
        { status: 429 }
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
      await prisma.failedLoginAttempt.create({
        data: { ipAddress, email },
      });
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
      await prisma.failedLoginAttempt.create({
        data: { ipAddress, email },
      });
      return NextResponse.json(
        { success: false, message: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful login
    await prisma.failedLoginAttempt.deleteMany({
      where: {
        OR: [
          { ipAddress },
          { email },
        ],
      },
    });

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
