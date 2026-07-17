import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can clear lead journey history.' }, { status: 403 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { order: true }
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    // Verify if order is punched
    const isOrderPunched = lead.status === 13 || (lead.order && lead.order.status !== 'draft');
    if (isOrderPunched) {
      return NextResponse.json({
        success: false,
        message: 'Cannot clear tracking journey history. An order has already been punched for this lead.'
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete all logs for this lead
      await tx.leadActivityLog.deleteMany({
        where: { leadId }
      });

      // Insert clean slate log
      await tx.leadActivityLog.create({
        data: {
          leadId,
          userId: userPayload.id,
          fromStatus: 0,
          toStatus: lead.status,
          remark: `Lead tracking journey history cleared by Admin (${userPayload.name}).`
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Lead journey tracking history cleared successfully.'
    });
  } catch (error: any) {
    console.error('Clear journey history error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    }, { status: 500 });
  }
}
