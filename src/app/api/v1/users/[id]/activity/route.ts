import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Role verification (Admin, Director, Sales Head only)
    const allowedRoles = ['admin', 'director', 'sales_head'];
    if (!allowedRoles.includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden. Unauthorized to view activity logs.' }, { status: 403 });
    }

    const { id } = await params;
    const targetUserId = parseInt(id, 10);
    if (isNaN(targetUserId)) {
      return NextResponse.json({ success: false, message: 'Invalid User ID.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate'); // YYYY-MM-DD
    const endDateStr = searchParams.get('endDate');     // YYYY-MM-DD

    const where: any = {
      userId: targetUserId,
    };

    if (startDateStr) {
      // Safely parse YYYY-MM-DD to UTC start of day
      const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
      const start = new Date(Date.UTC(sYear, sMonth - 1, sDay, 0, 0, 0, 0));

      // Safely parse end date to UTC end of day
      const endStr = endDateStr || startDateStr;
      const [eYear, eMonth, eDay] = endStr.split('-').map(Number);
      const end = new Date(Date.UTC(eYear, eMonth - 1, eDay, 23, 59, 59, 999));

      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    const logs = await prisma.leadActivityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            leadCode: true,
            customerName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Fetch user activities error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
