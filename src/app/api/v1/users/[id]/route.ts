import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

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
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid User ID.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        reportsTo: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        supervisor: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Get user details error:', error);
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

    // Only Admin can modify users (Section 2.1)
    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admin can update users.' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid User ID.' }, { status: 400 });
    }

    // Cannot change own role/status
    if (userId === userPayload.id) {
      return NextResponse.json({ success: false, message: 'Cannot modify your own user profile status or role.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, role, reportsTo, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (reportsTo !== undefined) updateData.reportsTo = reportsTo ? parseInt(reportsTo, 10) : null;
    
    let isDeactivating = false;
    if (isActive !== undefined) {
      updateData.isActive = !!isActive;
      if (user.isActive && !isActive) {
        isDeactivating = true;
      }
    }

    // Perform deactivation and reassignment inside transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      const res = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      if (isDeactivating) {
        // Reassignment logic: Find all active leads assigned to this consultant/user
        // Terminal stages in our specification: 6 (Already Installed), 12 (Can't Fit Solar), 13 (Sale Done)
        const activeLeads = await tx.lead.findMany({
          where: {
            assignedConsultantId: userId,
            status: { notIn: [6, 12, 13] },
            isActive: true,
          },
        });

        if (activeLeads.length > 0) {
          // Identify replacement assignee
          let newAssigneeId = user.reportsTo; // Primary replacement is the TL

          if (newAssigneeId) {
            const tlUser = await tx.user.findUnique({
              where: { id: newAssigneeId },
              select: { isActive: true, role: true, reportsTo: true },
            });
            
            // If TL is also inactive, reassign to Manager (the TL's supervisor)
            if (!tlUser || !tlUser.isActive) {
              newAssigneeId = tlUser?.reportsTo || null;
            }
          }

          // If still no assignee, falls back to Admin or unassigned
          if (newAssigneeId) {
            // Update all leads
            await tx.lead.updateMany({
              where: {
                id: { in: activeLeads.map((l) => l.id) },
              },
              data: {
                assignedConsultantId: newAssigneeId,
              },
            });

            // Write logs and notifications for each lead
            for (const lead of activeLeads) {
              await tx.leadActivityLog.create({
                data: {
                  leadId: lead.id,
                  userId: userPayload.id,
                  fromStatus: lead.status,
                  toStatus: lead.status,
                  remark: `[SYSTEM NOTE] Lead reassigned to TL/Manager because Consultant ${user.name} was deactivated.`,
                },
              });

              // Notify new assignee
              await tx.notification.create({
                data: {
                  userId: newAssigneeId,
                  type: 'lead_assigned',
                  title: 'Lead reassigned to you (Deactivation)',
                  body: `Lead #${lead.leadCode} (${lead.customerName}) reassigned to you because ${user.name} was deactivated.`,
                  leadId: lead.id,
                },
              });
            }
          }
        }
      }

      return res;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
      message: isDeactivating
        ? 'User deactivated and active leads successfully reassigned.'
        : 'User updated successfully.',
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
