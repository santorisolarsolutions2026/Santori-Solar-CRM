import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const leadWhere: any = {};
    if (userPayload.role === 'manager') {
      leadWhere.assignedManagerId = userPayload.id;
    } else if (userPayload.role === 'tl') {
      leadWhere.assignedTlId = userPayload.id;
    } else if (userPayload.role === 'consultant' || userPayload.role === 'psa') {
      leadWhere.assignedConsultantId = userPayload.id;
    }

    // Group by status and count
    const stagesCounts = await prisma.lead.groupBy({
      by: ['status'],
      where: leadWhere,
      _count: {
        id: true,
      },
    });

    // Format output as array of 13 stages with counts (ensuring stages with 0 are filled)
    const formatted = Array.from({ length: 13 }, (_, i) => {
      const stageNum = i + 1;
      const match = stagesCounts.find((s) => s.status === stageNum);
      return {
        stage: stageNum,
        count: match?._count.id || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('Pipeline reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
