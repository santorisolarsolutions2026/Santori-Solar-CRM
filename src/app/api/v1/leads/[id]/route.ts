import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

// Helper to check lead access based on user role
function canAccessLead(user: { id: number; role: string }, lead: any): boolean {
  if (user.role === 'admin' || user.role === 'sales_head') return true;
  if (user.role === 'manager' && lead.assignedManagerId === user.id) return true;
  if (user.role === 'tl' && lead.assignedTlId === user.id) return true;
  if (user.role === 'consultant' || user.role === 'psa') {
    return lead.assignedConsultantId === user.id;
  }
  if (user.role === 'finance') {
    // Finance sees only leads at Stage 13 (Sale Done)
    return lead.status === 13;
  }
  if (user.role === 'operations') {
    // Operations sees leads at Stage 13 that are processed by finance
    return lead.status === 13 && ['finance_verified', 'ops_assigned', 'completed'].includes(lead.order?.status || '');
  }
  return false;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        consultant: { select: { id: true, name: true, phone: true } },
        tl: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, role: true } } },
        },
        meetings: {
          orderBy: { createdAt: 'desc' },
        },
        order: {
          include: {
            documents: {
              select: { id: true, docType: true, fileName: true, fileSizeOctets: true, mimeType: true, uploadedAt: true },
            },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    if (!canAccessLead(userPayload, lead)) {
      return NextResponse.json({ success: false, message: 'Forbidden. No access to this lead.' }, { status: 403 });
    }

    // Process data masking for PSA
    if (userPayload.role === 'psa') {
      const maskedLead = {
        ...lead,
        mobile: lead.mobile.substring(0, 5) + 'XXXXX',
        mobileAlt: lead.mobileAlt ? lead.mobileAlt.substring(0, 5) + 'XXXXX' : null,
        address: '[Masked for PSA]',
        meetings: [], // Hide meetings for PSA
        order: null,   // Hide orders for PSA
      };
      return NextResponse.json({ success: true, data: maskedLead });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    console.error('Get lead details error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    // Enforce update permissions
    // Consultant can edit only status (handled in /status route). Form A updates are for TL, Manager, Admin
    const allowedEditRoles = ['admin', 'sales_head', 'manager', 'tl'];
    if (!allowedEditRoles.includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden. Role cannot edit lead details.' }, { status: 403 });
    }

    if (!canAccessLead(userPayload, lead)) {
      return NextResponse.json({ success: false, message: 'Forbidden. No access to this lead pool.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerName,
      mobileAlt,
      connectionType,
      sanctionedLoadKw,
      address,
      pinCode,
      city,
      state,
      leadSource,
      assignedTlId,
      assignedConsultantId,
    } = body;

    // Build update object
    const updateData: any = {};
    if (customerName) updateData.customerName = customerName;
    if (mobileAlt !== undefined) updateData.mobileAlt = mobileAlt ? mobileAlt.replace(/[\s-]/g, '') : null;
    if (connectionType) updateData.connectionType = connectionType;
    if (sanctionedLoadKw !== undefined) updateData.sanctionedLoadKw = sanctionedLoadKw ? parseFloat(sanctionedLoadKw) : null;
    if (address) updateData.address = address;
    if (pinCode) updateData.pinCode = pinCode;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (leadSource) updateData.leadSource = leadSource;

    // Handle assignments updates
    if (assignedTlId !== undefined) {
      updateData.assignedTlId = assignedTlId ? parseInt(assignedTlId, 10) : null;
    }
    if (assignedConsultantId !== undefined) {
      updateData.assignedConsultantId = assignedConsultantId ? parseInt(assignedConsultantId, 10) : null;
      
      // Auto assign manager and TL hierarchy if consultant is reassigned
      if (assignedConsultantId) {
        const consUser = await prisma.user.findUnique({
          where: { id: parseInt(assignedConsultantId, 10) },
          select: { reportsTo: true },
        });
        if (consUser?.reportsTo) {
          updateData.assignedTlId = consUser.reportsTo;
          const tlUser = await prisma.user.findUnique({
            where: { id: consUser.reportsTo },
            select: { reportsTo: true },
          });
          updateData.assignedManagerId = tlUser?.reportsTo || null;
        }
      }
    }

    const updatedLead = await prisma.$transaction(async (tx) => {
      const res = await tx.lead.update({
        where: { id: leadId },
        data: updateData,
        include: {
          consultant: { select: { name: true } },
        },
      });

      // Log the update activity
      await tx.leadActivityLog.create({
        data: {
          leadId,
          userId: userPayload.id,
          fromStatus: lead.status,
          toStatus: lead.status,
          remark: 'Lead details updated by management.',
        },
      });

      // Send assignment notification if reassigned
      if (assignedConsultantId && parseInt(assignedConsultantId, 10) !== lead.assignedConsultantId) {
        await tx.notification.create({
          data: {
            userId: parseInt(assignedConsultantId, 10),
            type: 'lead_assigned',
            title: 'Lead reassigned to you',
            body: `Lead #${lead.leadCode} has been reassigned to you.`,
            leadId,
          },
        });
      }

      return res;
    });

    return NextResponse.json({
      success: true,
      data: updatedLead,
      message: 'Lead updated successfully',
    });
  } catch (error: any) {
    console.error('Update lead details error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Only Admin can delete a lead
    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admin can delete leads.' }, { status: 403 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    // Soft delete lead by setting isActive = false and status to disqualified (or just soft deactivating)
    const softDeletedLead = await prisma.$transaction(async (tx) => {
      const res = await tx.lead.update({
        where: { id: leadId },
        data: {
          isActive: false,
        },
      });

      await tx.leadActivityLog.create({
        data: {
          leadId,
          userId: userPayload.id,
          fromStatus: res.status,
          toStatus: res.status,
          remark: 'Lead soft-deleted (deactivated) by Admin.',
        },
      });

      return res;
    });

    return NextResponse.json({
      success: true,
      data: softDeletedLead,
      message: 'Lead deactivated successfully.',
    });
  } catch (error: any) {
    console.error('Delete lead error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
