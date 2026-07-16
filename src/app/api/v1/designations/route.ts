import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentIdStr = searchParams.get('departmentId') || '';

    const where: any = {};
    if (departmentIdStr) {
      const deptId = parseInt(departmentIdStr, 10);
      if (!isNaN(deptId)) {
        where.OR = [
          { departmentId: deptId },
          { departmentId: null } // shared/nullable designations
        ];
      }
    }

    const designations = await prisma.designation.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: designations,
    });
  } catch (error: any) {
    console.error('Fetch designations error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
