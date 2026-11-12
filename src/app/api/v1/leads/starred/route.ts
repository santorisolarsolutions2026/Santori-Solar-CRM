import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const starredItems = await prisma.starredLead.findMany({
      where: { userId: userPayload.id },
      orderBy: { createdAt: 'desc' },
      select: {
        priority: true,
        reason: true,
        lead: {
          select: {
            id: true,
            leadCode: true,
            customerName: true,
            mobile: true,
            mobileAlt: true,
            city: true,
            status: true,
          },
        },
      },
    });

    const leads = starredItems
      .filter((item) => item.lead !== null)
      .map((item) => ({
        id: item.lead.id,
        leadCode: item.lead.leadCode,
        customerName: item.lead.customerName,
        mobile: item.lead.mobile,
        mobileAlt: item.lead.mobileAlt,
        city: item.lead.city,
        status: item.lead.status,
        starredBy: [{ priority: item.priority, reason: item.reason }],
      }));

    return NextResponse.json({
      success: true,
      data: { leads },
    });
  } catch (error: any) {
    console.error('Error fetching starred leads:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
