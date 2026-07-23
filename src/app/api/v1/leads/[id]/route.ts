import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions, getUserSession } from '@/lib/auth';

// Helper to check lead access based on user role and hierarchy
async function canAccessLead(userId: number, lead: any): Promise<boolean> {
  const { role: userRole, permissions } = await getUserSession(userId);
  const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;

  if (permissions.includes('leads:view_all')) return true;

  const { getSubordinateIds, getAncestorIds } = await import('@/lib/hierarchy');
  const subordinateIds = await getSubordinateIds(userId);
  const ancestorIds = await getAncestorIds(userId);
  const allowedIds = [userId, ...subordinateIds, ...ancestorIds];

  const assignedPeople = [lead.assignedConsultantId, lead.assignedTlId, lead.assignedManagerId, lead.createdById].filter((id) => id !== null);
  const isAssignedToHierarchy = assignedPeople.some((id) => allowedIds.includes(id));
  
  if (baseRole === 'finance') {
    // Finance sees only leads at Stage 13 (Sale Done) AND must be in hierarchy
    return lead.status === 13 && isAssignedToHierarchy;
  }
  if (baseRole === 'operations') {
    // Operations sees leads at Stage 13 that are processed by finance AND must be in hierarchy
    return lead.status === 13 && 
      ['finance_verified', 'ops_assigned', 'completed'].includes(lead.order?.status || '') && 
      isAssignedToHierarchy;
  }

  // Allow Manager and TL to access unassigned leads so they can assign them
  const isUnassigned = !lead.assignedTlId && !lead.assignedConsultantId;
  if (isUnassigned && ['manager', 'tl', 'psa_tl'].includes(baseRole)) return true;

  if (isAssignedToHierarchy) return true;

  if (baseRole === 'psa') {
    const hasMeeting = await prisma.meetingBooking.findFirst({
      where: { leadId: lead.id, assignedExecutiveId: userId }
    });
    if (hasMeeting) return true;
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
        creator: { select: { id: true, name: true, role: true } },
        assignedTeam: { select: { id: true, name: true, departmentId: true } },
        employeeAssignments: {
          where: { isActive: true },
          include: {
            employee: { select: { id: true, name: true, role: true } },
            assignedBy: { select: { id: true, name: true } },
          },
        },
        tasks: {
          orderBy: { id: 'asc' },
          include: { completedBy: { select: { id: true, name: true } } },
        },
        documents: {
          include: { uploader: { select: { id: true, name: true } } },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, role: true } } },
        },
        meetings: {
          orderBy: { createdAt: 'desc' },
          include: {
            executive: { select: { id: true, name: true, role: true } },
          },
        },
        order: {
          include: {
            documents: {
              select: { id: true, docType: true, fileName: true, fileSizeOctets: true, mimeType: true, uploadedAt: true },
            },
            submittedBy: { select: { id: true, name: true, role: true } },
            financeProcessedBy: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    if (!userPermissions.includes('leads:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view leads.' }, { status: 403 });
    }

    if (!await canAccessLead(userPayload.id, lead)) {
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
    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;

    if (!userPermissions.includes('leads:edit')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to edit lead details.' }, { status: 403 });
    }

    if (!await canAccessLead(userPayload.id, lead)) {
      return NextResponse.json({ success: false, message: 'Forbidden. No access to this lead pool.' }, { status: 403 });
    }

    // PSA Edit Lock: If the user's role is psa, and the lead status is 8 (Meeting Booked), 9 (Meeting Done), or 13 (Sale Done), then details are locked.
    if (baseRole === 'psa') {
      const isLockedForPsa = lead.status === 8 || lead.status === 9 || lead.status === 13;
      if (isLockedForPsa) {
        return NextResponse.json({ success: false, message: 'Forbidden. Lead details are locked after meeting is booked.' }, { status: 403 });
      }
    }

    // Sales Edit Lock: once order has been sent to be verified, details are locked.
    const isSalesTeam = ['consultant', 'tl', 'manager'].includes(baseRole) && !userRole.includes('finance') && !userRole.includes('operations') && !userRole.includes('admin') && !userRole.includes('it');
    if (isSalesTeam) {
      const leadOrder = await prisma.order.findFirst({
        where: { leadId: lead.id }
      });
      if (leadOrder && leadOrder.status !== 'draft') {
        return NextResponse.json({ success: false, message: 'Forbidden. Lead details are locked once order is sent for verification.' }, { status: 403 });
      }
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
      const canAssign = userPermissions.includes('leads:assign') || ['admin', 'director'].includes(baseRole);
      if (!canAssign) {
        return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to assign or reassign leads.' }, { status: 403 });
      }
    }

    // Validate target assignee is in the user's subordinate hierarchy (unless Admin / View All)
    const isAdmin = ['admin', 'director'].includes(baseRole) || (userPayload as any).department?.name === 'IT' || userPermissions.includes('leads:view_all');
    if (!isAdmin && isChangingAssignment && assignedConsultantId && assignedConsultantId !== 'unassigned') {
      const targetId = parseInt(assignedConsultantId, 10);
      if (!isNaN(targetId)) {
        const { getSubordinateIds } = await import('@/lib/hierarchy');
        const subordinateIds = await getSubordinateIds(userPayload.id);
        const allowedAssigneeIds = [userPayload.id, ...subordinateIds];

        if (!allowedAssigneeIds.includes(targetId)) {
          return NextResponse.json({
            success: false,
            message: 'Forbidden. You can only assign leads to yourself or team members below you in hierarchy.'
          }, { status: 403 });
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
      let finalTlId = (assignedTlId && assignedTlId !== 'unassigned') ? parseInt(assignedTlId, 10) : null;
      let finalConsId = (assignedConsultantId && assignedConsultantId !== 'unassigned') ? parseInt(assignedConsultantId, 10) : null;
      let finalManagerId = (assignedManagerId && assignedManagerId !== 'unassigned') ? parseInt(assignedManagerId, 10) : null;

      // If we are setting exactly one assignee, let's clear the others and auto-resolve the supervisors
      if (finalConsId) {
        finalTlId = null;
        finalManagerId = null;
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
      } else if (finalTlId) {
        finalConsId = null;
        finalManagerId = null;
        const tlUser = await prisma.user.findUnique({
          where: { id: finalTlId },
          select: { reportsTo: true },
        });
        finalManagerId = tlUser?.reportsTo || null;
      } else if (finalManagerId) {
        finalConsId = null;
        finalTlId = null;
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

      // Log all changed fields in AuditLog
      const fieldsToTrack = [
        'customerName', 'mobileAlt', 'connectionType', 'sanctionedLoadKw', 
        'address', 'pinCode', 'city', 'state', 'leadSource', 'discomName', 'connectionNumber'
      ];
      for (const field of fieldsToTrack) {
        if (body[field] !== undefined && String(body[field]) !== String((lead as any)[field] || '')) {
          await tx.auditLog.create({
            data: {
              leadId,
              tableName: 'Lead',
              recordId: leadId,
              fieldName: field,
              oldValue: (lead as any)[field] !== null && (lead as any)[field] !== undefined ? String((lead as any)[field]) : 'None',
              newValue: body[field] !== null && body[field] !== undefined ? String(body[field]) : 'None',
              userId: userPayload.id,
            },
          });
        }
      }

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

    // Check permission to delete leads
    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('leads:delete')) {
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
