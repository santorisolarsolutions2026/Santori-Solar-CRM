import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    const { getLeadVisibilityCondition } = await import('@/lib/hierarchy');
    const leadWhere = await getLeadVisibilityCondition(userPayload.id, userRole, userPermissions);

    // Group leads by leadSource, counting only non-null and non-empty leadSource records
    const groupedSources = await prisma.lead.groupBy({
      by: ['leadSource'],
      where: {
        ...leadWhere,
        leadSource: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    });

    const result = groupedSources
      .filter((item) => item.leadSource && item.leadSource.trim() !== '')
      .map((item) => {
        const rawSource = item.leadSource!.trim();
        // Capitalize nicely e.g. "meta" -> "Meta", "cold_call" -> "Cold Call"
        const formattedName = rawSource
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return {
          name: formattedName,
          value: item._count.id,
        };
      })
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Lead sources report error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
