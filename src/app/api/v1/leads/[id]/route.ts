import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

// Helper to check lead access based on user role
async function canAccessLead(userId: number, userRole: string, lead: any): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  if (permissions.includes('leads:view_all')) return true;
  
  // Allow Manager and TL to access unassigned leads so they can assign them
  const isUnassigned = !lead.assignedTlId && !lead.assignedConsultantId;
  if (isUnassigned && ['manager', 'tl', 'psa_tl'].includes(userRole)) return true;

  if (userRole === 'manager' && lead.assignedManagerId === userId) return true;
  if (['tl', 'psa_tl'].includes(userRole) && lead.assignedTlId === userId) return true;
  if (userRole === 'consultant' || userRole === 'psa') {
    return lead.assignedConsultantId === userId;
  }
  if (userRole === 'finance') {
    // Finance sees only leads at Stage 13 (Sale Done)
    return lead.status === 13;
  }
  if (userRole === 'operations') {
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

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('leads:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view leads.' }, { status: 403 });
    }

    if (!await canAccessLead(userPayload.id, userPayload.role, lead)) {
      return NextResponse.json({ success: false, message: 'Forbidden. No access to this lead.' }, { status: 403 });
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
    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('leads:edit')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to edit lead details.' }, { status: 403 });
    }

    if (!await canAccessLead(userPayload.id, userPayload.role, lead)) {
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
      assignedManagerId,
      discomName,
      connectionNumber,
      isActive,
    } = body;

    // Check assignment permission if modifying team assignment fields
    const isChangingAssignment = assignedTlId !== undefined || assignedConsultantId !== undefined || assignedManagerId !== undefined;
    if (isChangingAssignment) {
      const canAssign = userPermissions.includes('leads:assign') || ['admin', 'director'].includes(userPayload.role);
      if (!canAssign) {
        return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to assign or reassign leads.' }, { status: 403 });
      }
    }

    // Enforce specific assignment change rules
    if (['tl', 'psa_tl'].includes(userPayload.role)) {
      // TL can only assign to themselves if unassigned, or keep it as themselves
      if (assignedTlId !== undefined && assignedTlId) {
        const targetTlId = parseInt(assignedTlId, 10);
        if (targetTlId !== userPayload.id) {
          return NextResponse.json({ success: false, message: 'Forbidden. TL can only assign leads to themselves.' }, { status: 403 });
        }
      }
      
      // TL can change consultant, but only to a consultant reporting to them
      if (assignedConsultantId !== undefined && assignedConsultantId) {
        const consId = parseInt(assignedConsultantId, 10);
        const consUser = await prisma.user.findUnique({
          where: { id: consId },
          select: { reportsTo: true, role: true },
        });
        if (!consUser || !['consultant', 'psa'].includes(consUser.role) || consUser.reportsTo !== userPayload.id) {
          return NextResponse.json({ success: false, message: 'Forbidden. Selected consultant must report to you.' }, { status: 403 });
        }
      }
    } else if (userPayload.role === 'manager') {
      // Manager can assign TL and Consultant, but they must be under this manager
      if (assignedTlId !== undefined && assignedTlId) {
        const targetTlId = parseInt(assignedTlId, 10);
        const tlUser = await prisma.user.findUnique({
          where: { id: targetTlId },
          select: { reportsTo: true, role: true },
        });
        if (!tlUser || !['tl', 'psa_tl'].includes(tlUser.role) || tlUser.reportsTo !== userPayload.id) {
          return NextResponse.json({ success: false, message: 'Forbidden. Selected TL must report to you.' }, { status: 403 });
        }
      }
      
      if (assignedConsultantId !== undefined && assignedConsultantId) {
        const consId = parseInt(assignedConsultantId, 10);
        const consUser = await prisma.user.findUnique({
          where: { id: consId },
          select: { reportsTo: true, role: true },
        });
        if (!consUser || !['consultant', 'psa'].includes(consUser.role)) {
          return NextResponse.json({ success: false, message: 'Forbidden. Invalid consultant selected.' }, { status: 403 });
        }
        
        // Ensure the consultant's TL reports to this manager
        const tlOfConsultant = await prisma.user.findUnique({
          where: { id: consUser.reportsTo || 0 },
          select: { reportsTo: true },
        });
        if (!tlOfConsultant || tlOfConsultant.reportsTo !== userPayload.id) {
          return NextResponse.json({ success: false, message: 'Forbidden. Selected consultant must report to your team.' }, { status: 403 });
        }
      }
    }

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
    if (discomName !== undefined) updateData.discomName = discomName || null;
    if (connectionNumber !== undefined) updateData.connectionNumber = connectionNumber || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle assignments updates and auto-resolve hierarchy
    let shouldPromoteToFresh = false;
    if (assignedTlId !== undefined || assignedConsultantId !== undefined || assignedManagerId !== undefined) {
      let finalTlId = assignedTlId !== undefined ? (assignedTlId ? parseInt(assignedTlId, 10) : null) : lead.assignedTlId;
      let finalConsId = assignedConsultantId !== undefined ? (assignedConsultantId ? parseInt(assignedConsultantId, 10) : null) : lead.assignedConsultantId;
      let finalManagerId = assignedManagerId !== undefined ? (assignedManagerId ? parseInt(assignedManagerId, 10) : null) : lead.assignedManagerId;

      if (finalConsId && assignedTlId === undefined && assignedManagerId === undefined) {
        const consUser = await prisma.user.findUnique({
          where: { id: finalConsId },
          select: { reportsTo: true },
        });
        if (consUser?.reportsTo) {
          finalTlId = consUser.reportsTo;
          const tlUser = await prisma.user.findUnique({
            where: { id: finalTlId },
            select: { reportsTo: true },
          });
          finalManagerId = tlUser?.reportsTo || null;
        }
      } else if (finalTlId && assignedManagerId === undefined) {
        const tlUser = await prisma.user.findUnique({
          where: { id: finalTlId },
          select: { reportsTo: true },
        });
        finalManagerId = tlUser?.reportsTo || null;
      }

      updateData.assignedTlId = finalTlId;
      updateData.assignedConsultantId = finalConsId;
      updateData.assignedManagerId = finalManagerId;

      // Auto-promote from Simple Lead (0) to Fresh Lead (1) when any coordinator gets assigned
      if (lead.status === 0 && (finalTlId !== null || finalConsId !== null || finalManagerId !== null)) {
        updateData.status = 1;
        shouldPromoteToFresh = true;
      }
    }

    const updatedLead = await prisma.$transaction(async (tx) => {
      // Revert status to the stage before Already Installed if reactivating
      if (isActive && lead.status === 6) {
        const lastLog = await tx.leadActivityLog.findFirst({
          where: {
            leadId,
            toStatus: 6,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            fromStatus: true,
          },
        });
        updateData.status = lastLog ? lastLog.fromStatus : 1;
      }

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
          toStatus: shouldPromoteToFresh ? 1 : (updateData.status !== undefined ? updateData.status : lead.status),
          remark: shouldPromoteToFresh
            ? 'Lead assigned and promoted to Fresh Lead (Stage 1).'
            : (isActive !== undefined && isActive)
              ? (lead.status === 6 ? `Lead reactivated. Status reverted from Already Installed to Stage ${updateData.status || 1}.` : 'Lead reactivated / marked active.')
              : 'Lead details updated by management.',
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

    // Check permission to edit/delete leads
    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('leads:edit')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to delete leads.' }, { status: 403 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    // Hard delete lead from PostgreSQL (cascade deletes activity logs, meetings, orders)
    const deletedLead = await prisma.lead.delete({
      where: { id: leadId },
    });

    return NextResponse.json({
      success: true,
      data: deletedLead,
      message: 'Lead deleted permanently from database.',
    });
  } catch (error: any) {
    console.error('Delete lead error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
