import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions, getUserSession } from '@/lib/auth';
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
        address: true,
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
        departmentId: true,
        designationId: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true, level: true } },
        supervisor: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const itDept = await prisma.department.findFirst({ where: { name: 'IT' } });
    if (itDept && user.departmentId === itDept.id && user.designation) {
      user.designation.name = 'IT Head';
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

    const isSelf = userId === userPayload.id;
    const { role: loggedInRole } = await getUserSession(userPayload.id);
    const loggedInBaseRole = loggedInRole.includes(':') ? loggedInRole.split(':')[0] : loggedInRole;
    const isEditingUserAdmin = loggedInBaseRole === 'admin';
    const userPermissions = await getUserPermissions(userPayload.id);
    const isAdminOrDirectorOrSalesHead = userPermissions.includes('team:manage');

    const currentUserDetail = await prisma.user.findUnique({
      where: { id: userPayload.id },
      include: { designation: true, department: true }
    });

    let hasWriteAccess = isEditingUserAdmin;

    if (!isEditingUserAdmin) {
      const currentLevel = currentUserDetail?.designation?.level ?? 99;
      const currentDeptId = currentUserDetail?.departmentId;

      // Get target user details
      const targetUserDetail = await prisma.user.findUnique({
        where: { id: userId },
        include: { designation: true }
      });
      const targetLevel = targetUserDetail?.designation?.level ?? 99;
      const targetDeptId = targetUserDetail?.departmentId;

      // Rule: same department, higher level (currentLevel < targetLevel) and reports recursively to current user
      if (currentDeptId !== null && currentDeptId === targetDeptId && currentLevel < targetLevel) {
        let currentReportsTo = targetUserDetail?.reportsTo;
        const visitedIds = new Set<number>();
        while (currentReportsTo !== null && currentReportsTo !== undefined && !visitedIds.has(currentReportsTo)) {
          visitedIds.add(currentReportsTo);
          if (currentReportsTo === userPayload.id) {
            hasWriteAccess = true;
            break;
          }
          const parent = await prisma.user.findUnique({
            where: { id: currentReportsTo }
          });
          currentReportsTo = parent?.reportsTo;
        }
      }
    }

    if (!hasWriteAccess && !isSelf) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to update this user.' }, { status: 403 });
    }


    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, address, employeeId, role, reportsTo, isActive, joiningDate, photograph, permissions, password, departmentId, designationId } = body;

    const loggedInUserDeptName = currentUserDetail?.department?.name || '';
    const isEditingUserIT = loggedInUserDeptName === 'IT';
    const hasTeamManagePermission = userPermissions.includes('team:manage');

    const canChangeAccess = isEditingUserAdmin || isEditingUserIT || hasTeamManagePermission;
    const isChangingAccess = role !== undefined || permissions !== undefined || departmentId !== undefined || designationId !== undefined || isActive !== undefined;

    if (isChangingAccess && !canChangeAccess) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden. Only IT department members, Admins, or users explicitly granted "team:manage" permission can modify roles, permissions, departments, designations, or active status.'
      }, { status: 403 });
    }

    const ALL_PERMISSIONS_MAP: Record<string, string> = {
      'leads:create': 'PSA',
      'leads:import': 'PSA',
      'leads:manage_calling_stages': 'PSA',
      'leads:book_meeting': 'PSA',
      'leads:track': 'PSA',
      'leads:edit': 'PSA',
      'leads:assign': 'Sales',
      'meetings:complete': 'Sales',
      'orders:create': 'Sales',
      'orders:submit_finance': 'Sales',
      'orders:assign_finance': 'Sales',
      'leads:view_sales_pipeline': 'Sales',
      'orders:finance_access': 'Finance',
      'orders:verify': 'Finance',
      'orders:assign_ops': 'Finance',
      'finance:manage_ledger': 'Finance',
      'reports:view_financials': 'Finance',
      'orders:operations': 'Operations',
      'ops:update_stages': 'Operations',
      'ops:upload_drawings': 'Operations',
      'team:view': 'IT',
      'attendance:view': 'IT',
      'team:manage': 'IT',
      'logs:view': 'IT',
      'leads:view_all': 'IT',
    };

    if (permissions !== undefined) {
      const itKeys = Object.keys(ALL_PERMISSIONS_MAP).filter((k: string) => ALL_PERMISSIONS_MAP[k] === 'IT');
      const cleanNewPerms = permissions.split(',').map((p: string) => p.trim()).filter((p: string) => p !== 'none');
      const itCount = cleanNewPerms.filter((k: string) => itKeys.includes(k)).length;
      if (itCount > 0 && itCount < itKeys.length) {
        return NextResponse.json({
          success: false,
          message: 'Validation failed. IT permissions must be granted either all together or none at all.'
        }, { status: 400 });
      }

      if (!isEditingUserAdmin) {
        const currentUserDetail = await prisma.user.findUnique({
          where: { id: userPayload.id },
          include: { department: true }
        });
        const deptName = currentUserDetail?.department?.name?.toLowerCase().trim() || '';

        const existingPermissions = user.permissions && user.permissions.trim()
          ? user.permissions.split(',').map(p => p.trim()).filter(p => p !== 'none')
          : [];

        const allKeys = new Set([...existingPermissions, ...cleanNewPerms]);
        for (const key of allKeys) {
          const wasChecked = existingPermissions.includes(key);
          const isCheckedNow = cleanNewPerms.includes(key);
          if (wasChecked !== isCheckedNow) {
            const category = ALL_PERMISSIONS_MAP[key] || 'Other';
            
            if (deptName === 'sales') {
              if (category !== 'PSA' && category !== 'Sales') {
                return NextResponse.json({
                  success: false,
                  message: 'Forbidden. Sales department supervisors can only modify Sales and PSA permissions.'
                }, { status: 403 });
              }
            } else if (deptName === 'finance') {
              if (category !== 'Finance') {
                return NextResponse.json({
                  success: false,
                  message: 'Forbidden. Finance department supervisors can only modify Finance permissions.'
                }, { status: 403 });
              }
            } else if (deptName === 'operations') {
              if (category !== 'Operations') {
                return NextResponse.json({
                  success: false,
                  message: 'Forbidden. Operations department supervisors can only modify Operations permissions.'
                }, { status: 403 });
              }
            } else if (deptName === 'it') {
              if (category !== 'IT') {
                return NextResponse.json({
                  success: false,
                  message: 'Forbidden. IT department supervisors can only modify IT permissions.'
                }, { status: 403 });
              }
            } else {
              return NextResponse.json({
                success: false,
                message: `Forbidden. You do not have permissions to modify ${category} permissions.`
              }, { status: 403 });
            }
          }
        }
      }
    }

    const isTargetAdmin = user.role.toLowerCase() === 'admin' || user.role.toLowerCase().startsWith('admin:');
    const isTargetDirector = user.role.toLowerCase() === 'director' || user.role.toLowerCase().startsWith('director:');
    
    // Only Admin can change the role or permissions of an Admin or Director
    if ((isTargetAdmin || isTargetDirector) && (role !== undefined || permissions !== undefined)) {
      if (!isEditingUserAdmin) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden. Only the Admin can change the role or permissions of an Admin or Director.'
        }, { status: 403 });
      }
    }

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

    // Self-update validation (can only update phone, address, and photograph)
    if (isSelf && !isAdminOrDirectorOrSalesHead) {
      const keys = Object.keys(body);
      const allowedKeys = ['phone', 'address', 'photograph'];
      const invalidKeys = keys.filter(k => !allowedKeys.includes(k));
      if (invalidKeys.length > 0) {
        return NextResponse.json({ success: false, message: 'Forbidden. You can only update your photograph, address, and phone number.' }, { status: 403 });
      }
    }

    // Cannot change own role/status even if admin/director/sales_head
    if (userId === userPayload.id) {
      if (role !== undefined || isActive !== undefined) {
        return NextResponse.json({ success: false, message: 'Cannot modify your own user profile status or role.' }, { status: 400 });
      }
    }

    let derivedRole = role;
    let derivedPermissions = permissions;

    const targetDesId = designationId !== undefined ? (designationId ? parseInt(designationId, 10) : null) : user.designationId;
    const targetDeptId = departmentId !== undefined ? (departmentId ? parseInt(departmentId, 10) : null) : user.departmentId;

    if (designationId !== undefined || departmentId !== undefined) {
      if (targetDesId) {
        const designation = await prisma.designation.findUnique({ where: { id: targetDesId } });
        if (!designation) {
          return NextResponse.json({ success: false, message: 'Invalid designation selected.' }, { status: 400 });
        }

        let departmentName = '';
        if (targetDeptId) {
          const department = await prisma.department.findUnique({ where: { id: targetDeptId } });
          if (department) {
            departmentName = department.name;
          }
        }

        // Derive role
        let roleName = 'consultant';
        if (designation.name === 'Admin' || designation.level === 0) {
          roleName = 'admin';
        } else if (departmentName === 'Finance') {
          roleName = 'finance';
        } else if (departmentName === 'Operations') {
          roleName = 'operations';
        } else if (departmentName === 'IT') {
          if (designation.level === 1) {
            roleName = 'director';
          } else if (designation.level === 2 || designation.level === 3) {
            roleName = 'manager';
          } else if (designation.level === 4) {
            roleName = 'tl';
          } else {
            roleName = 'consultant';
          }
        } else if (departmentName === 'Sales') {
          if (designation.name.includes('Head') || designation.level === 1) {
            roleName = 'sales_head';
          } else if (designation.name.includes('PSA Senior Manager') || designation.name.includes('PSA Manager') || designation.level === 2 || designation.level === 3) {
            roleName = 'manager';
          } else if (designation.name === 'PSA TL' || (designation.level === 4 && designation.name.includes('PSA'))) {
            roleName = 'psa_tl';
          } else if (designation.name === 'TL' || designation.level === 4) {
            roleName = 'tl';
          } else if (designation.name === 'PSA Consultant' || designation.level === 6) {
            roleName = 'psa';
          } else if (designation.name === 'Consultant' || designation.level === 5) {
            roleName = 'consultant';
          }
        } else {
          if (designation.level === 1 || designation.level === 2) {
            roleName = 'director';
          } else if (designation.level === 3) {
            roleName = 'manager';
          } else if (designation.level === 4) {
            roleName = 'tl';
          } else {
            roleName = 'consultant';
          }
        }
        derivedRole = roleName;

        if (derivedPermissions === undefined) {
          if (derivedRole !== user.role) {
            const { getDefaultPermissionsForRole } = await import('@/lib/auth');
            derivedPermissions = getDefaultPermissionsForRole(derivedRole).join(',');
          }
        }
      }
    }

    // Reports To Hierarchical Validation on Update
    const finalDesId = targetDesId || user.designationId;
    const finalDeptId = targetDeptId;
    
    let activeDesignation = null;
    if (finalDesId) {
      activeDesignation = await prisma.designation.findUnique({ where: { id: finalDesId } });
    }
    const currentLevel = activeDesignation?.level ?? 99;

    const finalReportsTo = reportsTo !== undefined ? (reportsTo ? parseInt(reportsTo, 10) : null) : user.reportsTo;

    if (currentLevel > 1 && !finalReportsTo) {
      return NextResponse.json({ success: false, message: 'Supervisor (Reports To) is required for this designation.' }, { status: 400 });
    }

    if (finalReportsTo) {
      if (finalReportsTo === userId) {
        return NextResponse.json({ success: false, message: 'User cannot report to themselves.' }, { status: 400 });
      }
      const supervisorUser = await prisma.user.findUnique({
        where: { id: finalReportsTo },
        include: { designation: true }
      });
      if (!supervisorUser) {
        return NextResponse.json({ success: false, message: 'Supervisor not found.' }, { status: 400 });
      }

      const supLevel = supervisorUser.designation?.level ?? 0;

      // Admin (level 0) is supervisor of Department Heads (level 1)
      if (supLevel === 0 || supervisorUser.role === 'admin') {
        if (currentLevel !== 1) {
          return NextResponse.json({ success: false, message: 'Only Department Heads (Level 1) can report to the Admin.' }, { status: 400 });
        }
      } else {
        // Must be in same department and higher in hierarchy (lower level number)
        if (supervisorUser.departmentId !== finalDeptId) {
          return NextResponse.json({ success: false, message: 'Supervisor must belong to the same department.' }, { status: 400 });
        }
        if (supLevel >= currentLevel) {
          return NextResponse.json({ success: false, message: 'Supervisor must be above the employee in the hierarchy.' }, { status: 400 });
        }
      }
    }


    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (derivedRole !== undefined) updateData.role = derivedRole;
    if (derivedPermissions !== undefined) updateData.permissions = derivedPermissions;
    if (reportsTo !== undefined) updateData.reportsTo = reportsTo ? parseInt(reportsTo, 10) : null;
    if (joiningDate !== undefined) updateData.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (photograph !== undefined) updateData.photograph = photograph;
    if (departmentId !== undefined) updateData.departmentId = departmentId ? parseInt(departmentId, 10) : null;
    if (designationId !== undefined) updateData.designationId = designationId ? parseInt(designationId, 10) : null;

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

      // Record user change in audit log
      for (const fieldName of Object.keys(updateData)) {
        if (fieldName === 'passwordHash') continue;
        const oldValue = String(user[fieldName as keyof typeof user] ?? '');
        const newValue = String(updateData[fieldName]);
        if (oldValue !== newValue) {
          await tx.auditLog.create({
            data: {
              userId: userPayload.id,
              tableName: 'User',
              recordId: userId,
              fieldName: fieldName,
              oldValue: oldValue,
              newValue: newValue,
            }
          });
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

    const { role: loggedInRole } = await getUserSession(userPayload.id);
    const loggedInBaseRole = loggedInRole.includes(':') ? loggedInRole.split(':')[0] : loggedInRole;
    const isEditingUserAdmin = loggedInBaseRole === 'admin';
    const userPermissions = await getUserPermissions(userPayload.id);

    const currentUserDetail = await prisma.user.findUnique({
      where: { id: userPayload.id },
      include: { department: true }
    });
    const loggedInUserDeptName = currentUserDetail?.department?.name || '';
    const isEditingUserIT = loggedInUserDeptName === 'IT';
    const hasTeamManagePermission = userPermissions.includes('team:manage');

    const canDeleteUser = isEditingUserAdmin || isEditingUserIT || hasTeamManagePermission;

    if (!canDeleteUser) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only IT department members, Admins, or users explicitly granted "team:manage" permission can delete users.' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid User ID.' }, { status: 400 });
    }

    if (userId === userPayload.id) {
      return NextResponse.json({ success: false, message: 'Cannot delete your own user account.' }, { status: 400 });
    }

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

    const { searchParams } = new URL(req.url);
    const confirmUnassign = searchParams.get('confirm_unassign') === 'true';

    // Count associated assigned leads
    const associatedLeadCount = await prisma.lead.count({
      where: {
        OR: [
          { assignedManagerId: userId },
          { assignedTlId: userId },
          { assignedConsultantId: userId },
        ],
      },
    });

    if (associatedLeadCount > 0 && !confirmUnassign) {
      return NextResponse.json({
        success: false,
        requiresConfirmation: true,
        associatedLeadCount,
        message: `Warning: '${targetUser.name}' has ${associatedLeadCount} associated lead(s). Deleting this team member will make all associated leads unassigned. Do you want to proceed?`,
      }, { status: 200 });
    }

    // Unassign associated leads if any
    if (associatedLeadCount > 0) {
      await prisma.lead.updateMany({
        where: { assignedManagerId: userId },
        data: { assignedManagerId: null },
      });
      await prisma.lead.updateMany({
        where: { assignedTlId: userId },
        data: { assignedTlId: null },
      });
      await prisma.lead.updateMany({
        where: { assignedConsultantId: userId },
        data: { assignedConsultantId: null },
      });
    }

    // Attempt database delete, fallback to soft-delete purge if referenced in foreign tables
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
    } catch (e) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false, employeeId: null },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Team member '${targetUser.name}' has been deleted successfully, and associated leads are now unassigned.`,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
