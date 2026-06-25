import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('team:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view team profiles.' }, { status: 403 });
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
        employeeId: true,
        role: true,
        permissions: true,
        reportsTo: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        lastLoginAt: true,
        loginLocation: true,
        lastLogoutAt: true,
        logoutLocation: true,
        joiningDate: true,
        photograph: true,
        supervisor: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const isAdminOrDirectorOrSalesHead = userPermissions.includes('team:manage');
    if (!isAdminOrDirectorOrSalesHead && userId !== userPayload.id) {
      // Basic users can only fetch basic details of others
      return NextResponse.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          role: user.role,
          joiningDate: user.joiningDate,
          photograph: user.photograph,
          isActive: user.isActive,
        },
      });
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

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid User ID.' }, { status: 400 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const isSelf = userId === userPayload.id;
    const isAdminOrDirectorOrSalesHead = userPermissions.includes('team:manage');

    // Only Admin, Director, Sales Head, or Self can modify details
    if (!isAdminOrDirectorOrSalesHead && !isSelf) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to update this user.' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, employeeId, role, reportsTo, isActive, joiningDate, photograph, permissions, password } = body;

    const isTargetAdmin = user.role.toLowerCase() === 'admin' || user.role.toLowerCase().startsWith('admin:');

    // 1. Safeguard existing admin user
    if (isTargetAdmin) {
      // Cannot deactivate the admin
      if (isActive !== undefined && !isActive) {
        return NextResponse.json({ success: false, message: 'The Admin user cannot be deactivated.' }, { status: 400 });
      }
      // Cannot change admin's role to something else
      if (role !== undefined) {
        const targetRoleLower = role.toLowerCase();
        if (targetRoleLower !== 'admin' && !targetRoleLower.startsWith('admin:')) {
          return NextResponse.json({ success: false, message: 'Cannot modify the role of the Admin user. There must always be exactly one Admin.' }, { status: 400 });
        }
      }
    }

    // 2. Safeguard against promoting another user to admin
    if (!isTargetAdmin && role !== undefined) {
      const targetRoleLower = role.toLowerCase();
      if (targetRoleLower === 'admin' || targetRoleLower.startsWith('admin:')) {
        const existingAdmin = await prisma.user.findFirst({
          where: {
            OR: [
              { role: 'admin' },
              { role: { startsWith: 'admin:' } }
            ]
          }
        });
        if (existingAdmin) {
          return NextResponse.json({ success: false, message: 'An Admin user already exists. There can only be one Admin in the system.' }, { status: 400 });
        }
      }
    }

    // Self-update validation (can only update phone and photograph)
    if (isSelf && !isAdminOrDirectorOrSalesHead) {
      const keys = Object.keys(body);
      const allowedKeys = ['phone', 'photograph'];
      const invalidKeys = keys.filter(k => !allowedKeys.includes(k));
      if (invalidKeys.length > 0) {
        return NextResponse.json({ success: false, message: 'Forbidden. You can only update your photograph and phone number.' }, { status: 403 });
      }
    }

    // Cannot change own role/status even if admin/director/sales_head
    if (userId === userPayload.id) {
      if (role !== undefined || isActive !== undefined) {
        return NextResponse.json({ success: false, message: 'Cannot modify your own user profile status or role.' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (reportsTo !== undefined) updateData.reportsTo = reportsTo ? parseInt(reportsTo, 10) : null;
    if (joiningDate !== undefined) updateData.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (photograph !== undefined) updateData.photograph = photograph;

    if (password !== undefined && password !== null) {
      if (!isAdminOrDirectorOrSalesHead) {
        return NextResponse.json({ success: false, message: 'Forbidden. Only users with team management privileges can reset passwords.' }, { status: 403 });
      }
      const pwdTrim = String(password).trim();
      if (pwdTrim.length < 6) {
        return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(pwdTrim, 10);
    }

    if (employeeId !== undefined) {
      const empIdTrim = String(employeeId).trim();
      if (!empIdTrim) {
        return NextResponse.json({ success: false, message: 'Employee ID is required and cannot be empty.' }, { status: 400 });
      }
      const existingEmp = await prisma.user.findFirst({
        where: {
          employeeId: empIdTrim,
          id: { not: userId }
        }
      });
      if (existingEmp) {
        return NextResponse.json({ success: false, message: 'User with this Employee ID already exists.' }, { status: 409 });
      }
      updateData.employeeId = empIdTrim;
    }
    
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
        employeeId: updatedUser.employeeId,
        isActive: updatedUser.isActive,
        joiningDate: updatedUser.joiningDate,
        photograph: updatedUser.photograph,
        permissions: updatedUser.permissions,
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Allow users with team management permissions to delete users
    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('team:manage')) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only users with team management permissions can delete users.' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid User ID.' }, { status: 400 });
    }

    // Cannot delete yourself
    if (userId === userPayload.id) {
      return NextResponse.json({ success: false, message: 'Cannot delete your own user account.' }, { status: 400 });
    }

    // Find target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const isTargetAdmin = targetUser.role.toLowerCase() === 'admin' || targetUser.role.toLowerCase().startsWith('admin:');
    if (isTargetAdmin) {
      return NextResponse.json({ success: false, message: 'The Admin user cannot be deleted.' }, { status: 400 });
    }

    // Enforce that user must be deactivated before deletion
    if (targetUser.isActive) {
      return NextResponse.json({ success: false, message: 'Cannot delete user. Please deactivate the user first.' }, { status: 400 });
    }

    // Check if user has any associated leads
    const associatedLeadCount = await prisma.lead.count({
      where: {
        OR: [
          { assignedManagerId: userId },
          { assignedTlId: userId },
          { assignedConsultantId: userId },
          { createdById: userId },
        ],
      },
    });

    if (associatedLeadCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Cannot delete user. This user has ${associatedLeadCount} associated lead(s) in the system. Reassign or delete their leads first.`,
      }, { status: 400 });
    }

    // Delete user from database
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `User '${targetUser.name}' has been successfully deleted.`,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
