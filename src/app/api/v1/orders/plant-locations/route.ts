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

    // High performance query: Only fetch scalar coordinates and essential marker display data
    const plants = await prisma.order.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        orderCode: true,
        connectionNumber: true,
        systemSizeKw: true,
        clientType: true,
        status: true,
        isInstalled: true,
        actualInstallationAt: true,
        isCommissioned: true,
        actualCommissionedAt: true,
        latitude: true,
        longitude: true,
        installationImages: {
          select: {
            id: true,
            status: true,
            filePath: true,
            fileName: true,
          },
          orderBy: { id: 'desc' },
        },
        lead: {
          select: {
            id: true,
            customerName: true,
            mobile: true,
            address: true,
            city: true,
            division: true,
            state: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: plants,
      count: plants.length,
    });
  } catch (error: any) {
    console.error('Error fetching plant locations:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch plant locations.' },
      { status: 500 }
    );
  }
}
