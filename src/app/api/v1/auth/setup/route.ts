import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      success: true,
      isSetupRequired: userCount === 0,
    });
  } catch (error: any) {
    console.error('Check setup error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { success: false, message: 'Initial setup has already been completed.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, email, phone, employeeId, password } = body;

    if (!name || !email || !password || !employeeId) {
      return NextResponse.json(
        { success: false, message: 'Name, email, password, and Employee ID are required.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        employeeId: employeeId,
        passwordHash,
        role: 'admin',
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
      message: 'Admin account created successfully.',
    });
  } catch (error: any) {
    console.error('Setup initial admin error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
