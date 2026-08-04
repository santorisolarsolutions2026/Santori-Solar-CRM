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

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, leadCode: true, customerName: true, createdAt: true },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated orders & sub-records
      const orders = await tx.order.findMany({ where: { leadId }, select: { id: true } });
      const orderIds = orders.map(o => o.id);
      if (orderIds.length > 0) {
        await tx.installationImage.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.orderDocument.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      // 2. Delete meeting bookings, tasks, activities, and assignments
      await tx.meetingBooking.deleteMany({ where: { leadId } });
      await tx.leadTask.deleteMany({ where: { leadId } });
      await tx.activity.deleteMany({ where: { leadId } });
      await tx.employeeAssignment.updateMany({
        where: { leadId, isActive: true },
        data: { isActive: false },
      });

      // 3. Wipe all previous activity and audit logs
      await tx.leadActivityLog.deleteMany({ where: { leadId } });
      await tx.auditLog.deleteMany({ where: { leadId } });

      // 4. Reset lead status to Fresh Lead (Stage 1) and clear all pipeline data
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: 1,
          statusSub: null,
          isUnreachable: false,
          isActive: true,
          assignedConsultantId: null,
          assignedTlId: null,
          assignedManagerId: null,
          assignedTeamId: null,
          followupAt: null,
          updatedAt: new Date(),
        },
      });

      // 5. Create ONLY initial Lead Opportunity Registered log entry
      await tx.leadActivityLog.create({
        data: {
          leadId,
          userId: userPayload.id,
          fromStatus: null,
          toStatus: 1,
          remark: `Lead #${updatedLead.leadCode || updatedLead.id} created in system for customer ${updatedLead.customerName}.`,
          createdAt: lead.createdAt || new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Tracking journey history successfully wiped. Lead reset to Fresh Lead state.',
    });
  } catch (error: any) {
    console.error('Wipe tracking history error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
