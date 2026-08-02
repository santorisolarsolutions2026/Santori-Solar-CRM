import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const isAdmin = ['admin', 'director'].includes(userPayload.role) || userPayload.role?.startsWith('admin:');
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can wipe tracking journey history.' }, { status: 403 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.leadActivityLog.deleteMany({ where: { leadId } }),
      prisma.auditLog.deleteMany({ where: { leadId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Tracking journey history successfully wiped.',
    });
  } catch (error: any) {
    console.error('Wipe tracking history error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
