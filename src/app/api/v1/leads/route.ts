import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions, getUserSession } from '@/lib/auth';

// Helper to generate lead code
async function generateLeadCode() {
  const lastLead = await prisma.lead.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  const nextId = (lastLead?.id || 0) + 1;
  return `SL-${String(nextId).padStart(5, '0')}`;
}

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;

    if (!userPermissions.includes('leads:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view leads.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const statusParam = searchParams.get('status') || '';
    const city = searchParams.get('city') || '';
    const consultantIdStr = searchParams.get('consultant_id') || '';
    const connectionType = searchParams.get('connection_type') || '';
    const leadSource = searchParams.get('lead_source') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const sortBy = searchParams.get('sort_by') || 'updatedAt';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const unassignedParam = searchParams.get('unassigned') === 'true';

    const skip = (page - 1) * limit;

    let hasInactiveStatusFilter = false;
    let filteredStatuses: number[] = [];
    if (statusParam) {
      filteredStatuses = statusParam.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
      if (filteredStatuses.some(s => [4, 6, 12].includes(s))) {
        hasInactiveStatusFilter = true;
      }
    }

    // Define base query conditions (enforce isActive: true to support soft delete / deactivation unless filtering by inactive stage or selecting All pipeline stages)
    const andConditions: Prisma.LeadWhereInput[] = [];
    if (!hasInactiveStatusFilter) {
      andConditions.push({
        isActive: true
      });
    }

    const hasViewAll = userPermissions.includes('leads:view_all');

    // Fetch user designation level
    const userDetail = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: { designation: { select: { level: true } } },
    });
    const designationLevel = userDetail?.designation?.level ?? 6;

    // 1. Role-based visibility enforcement
    if (!hasViewAll) {
      if (baseRole === 'finance') {
        // Finance sees only leads at Stage 13+ (Sale Done) by default
        if (filteredStatuses.length === 0) {
          andConditions.push({ status: { in: [13] } });
        }
      } else if (baseRole === 'operations') {
        // Operations sees only leads with orders processed by finance by default
        if (filteredStatuses.length === 0) {
          andConditions.push({
            status: 13,
            order: {
              status: { in: ['finance_verified', 'ops_assigned', 'completed'] },
            }
          });
        } else {
          // If they filtered by status, they still only see leads with orders
          andConditions.push({
            order: { isNot: null }
          });
        }
      } else if (designationLevel <= 5) {
        // TL, Manager, Senior Manager, Head (Level 2 to 5)
        const { getSubordinateIds } = await import('@/lib/hierarchy');
        const subordinateIds = await getSubordinateIds(userPayload.id);
        const allowedIds = [userPayload.id, ...subordinateIds];

        andConditions.push({
          OR: [
            { assignedConsultantId: { in: allowedIds } },
            { assignedTlId: { in: allowedIds } },
            { assignedManagerId: { in: allowedIds } },
            { createdById: userPayload.id },
            { assignedTlId: null, assignedConsultantId: null }, // view unassigned leads
            {
              order: {
                status: 'draft',
                rejectionReason: { not: null },
                submittedById: userPayload.id,
              }
            }
          ]
        });
      } else {
        // Consultant / PSA Consultant (Level 6)
        andConditions.push({
          OR: [
            { assignedConsultantId: userPayload.id },
            {
              order: {
                status: 'draft',
                rejectionReason: { not: null },
                submittedById: userPayload.id,
              }
            }
          ]
        });
      }
    }

    // 2. Extra Filters
    const state = searchParams.get('state') || '';
    const tlIdStr = searchParams.get('tl_id') || '';
    const managerIdStr = searchParams.get('manager_id') || '';
    const dateFromStr = searchParams.get('date_from') || '';
    const dateToStr = searchParams.get('date_to') || '';

    if (search) {
      andConditions.push({
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } },
          { leadCode: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    if (filteredStatuses.length > 0) {
      andConditions.push({ status: { in: filteredStatuses } });
    }

    if (city) {
      andConditions.push({ city: { contains: city, mode: 'insensitive' } });
    }

    if (state) {
      andConditions.push({ state: { contains: state, mode: 'insensitive' } });
    }

    if (consultantIdStr) {
      const parts = consultantIdStr.split(',').map(s => s.trim());
      const hasUnassigned = parts.includes('unassigned');
      const consultantIds = parts.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
      
      if (hasUnassigned && consultantIds.length > 0) {
        andConditions.push({
          OR: [
            { assignedConsultantId: null },
            { assignedConsultantId: { in: consultantIds } }
          ]
        });
      } else if (hasUnassigned) {
        andConditions.push({ assignedConsultantId: null });
      } else if (consultantIds.length > 0) {
        andConditions.push({ assignedConsultantId: { in: consultantIds } });
      }
    }

    if (tlIdStr) {
      const parts = tlIdStr.split(',').map(s => s.trim());
      const hasUnassigned = parts.includes('unassigned');
      const tlIds = parts.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
      
      if (hasUnassigned && tlIds.length > 0) {
        andConditions.push({
          OR: [
            { assignedTlId: null },
            { assignedTlId: { in: tlIds } }
          ]
        });
      } else if (hasUnassigned) {
        andConditions.push({ assignedTlId: null });
      } else if (tlIds.length > 0) {
        andConditions.push({ assignedTlId: { in: tlIds } });
      }
    }

    if (managerIdStr) {
      const parts = managerIdStr.split(',').map(s => s.trim());
      const hasUnassigned = parts.includes('unassigned');
      const managerIds = parts.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
      
      if (hasUnassigned && managerIds.length > 0) {
        andConditions.push({
          OR: [
            { assignedManagerId: null },
            { assignedManagerId: { in: managerIds } }
          ]
        });
      } else if (hasUnassigned) {
        andConditions.push({ assignedManagerId: null });
      } else if (managerIds.length > 0) {
        andConditions.push({ assignedManagerId: { in: managerIds } });
      }
    }

    if (unassignedParam) {
      andConditions.push({
        assignedConsultantId: null,
        assignedTlId: null,
        assignedManagerId: null,
      });
    }

    if (connectionType) {
      const types = connectionType.split(',').map(s => s.trim()).filter(Boolean);
      if (types.length > 0) {
        andConditions.push({ connectionType: { in: types } });
      }
    }

    if (leadSource) {
      const sources = leadSource.split(',').map(s => s.trim()).filter(Boolean);
      if (sources.length > 0) {
        andConditions.push({ leadSource: { in: sources } });
      }
    }

    if (dateFromStr || dateToStr) {
      const dateQuery: any = {};
      if (dateFromStr) {
        const d = new Date(dateFromStr);
        if (!isNaN(d.getTime())) dateQuery.gte = d;
      }
      if (dateToStr) {
        const d = new Date(dateToStr);
        if (!isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          dateQuery.lte = d;
        }
      }
      if (Object.keys(dateQuery).length > 0) {
        andConditions.push({ createdAt: dateQuery });
      }
    }

    const where: Prisma.LeadWhereInput = { AND: andConditions };

    // Sorting
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (['createdAt', 'updatedAt', 'id', 'status', 'customerName'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy['updatedAt'] = 'desc';
    }

    const idsOnly = searchParams.get('ids_only') === 'true';
    if (idsOnly) {
      const matchingLeads = await prisma.lead.findMany({
        where,
        orderBy,
        select: { id: true }
      });
      return NextResponse.json({
        success: true,
        data: matchingLeads.map(l => l.id)
      });
    }

    // Execute queries
    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          consultant: { select: { id: true, name: true } },
          tl: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
          order: {
            select: {
              id: true,
              status: true,
              rejectionReason: true,
              installationImages: {
                select: { id: true, status: true }
              }
            }
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        leads: leads,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Fetch leads error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;

    if (!userPermissions.includes('leads:create')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to add leads.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerName,
      mobile,
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
      notes,
      overrideDuplicate,
      discomName,
      connectionNumber,
    } = body;

    // Validation - only Customer Name and Mobile Number are strictly required
    if (!customerName || !mobile) {
      return NextResponse.json({ success: false, message: 'Customer Name and Mobile Number are required.' }, { status: 400 });
    }

    const cleanMobile = String(mobile).trim().replace(/[\s-]/g, '');
    if (cleanMobile.length !== 10 || isNaN(Number(cleanMobile))) {
      return NextResponse.json({ success: false, message: 'Mobile number must be exactly 10 digits.' }, { status: 400 });
    }

    // Clean mobileAlt if present
    let cleanMobileAlt = mobileAlt ? String(mobileAlt).trim().replace(/[\s-]/g, '') : null;
    if (cleanMobileAlt && cleanMobileAlt.includes('.')) {
      cleanMobileAlt = cleanMobileAlt.split('.')[0];
    }

    const isUserAdmin = ['admin', 'director'].includes(baseRole);

    // Duplicate check
    const existingLead = await prisma.lead.findUnique({
      where: { mobile: cleanMobile },
      include: { consultant: { select: { name: true } } },
    });

    if (existingLead) {
      // If not overriding or not Admin, reject creation
      if (!overrideDuplicate || !isUserAdmin) {
        const assignedName = existingLead.consultant?.name || 'Unassigned';
        return NextResponse.json({
          success: false,
          duplicate: true,
          message: `A lead with this number already exists. Lead ID: #${existingLead.leadCode} — assigned to ${assignedName}.`,
        }, { status: 409 });
      }
    }

    // Get manager & TL automatically if not fully provided
    let managerId = null;
    let tlId = null;

    if (baseRole === 'manager') {
      managerId = userPayload.id;
    } else if (['tl', 'psa_tl'].includes(baseRole)) {
      tlId = userPayload.id;
      // Get manager who supervises this TL
      const tlUser = await prisma.user.findUnique({
        where: { id: userPayload.id },
        select: { reportsTo: true },
      });
      managerId = tlUser?.reportsTo || null;
    }

    // Enforce team assignment permission on lead creation
    const canAssign = userPermissions.includes('leads:assign') || ['admin', 'director'].includes(baseRole);
    if (!canAssign && (assignedConsultantId || assignedTlId || assignedManagerId)) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to assign team members to leads.' }, { status: 403 });
    }

    // Resolve assignments hierarchy
    let finalConsultantId = (assignedConsultantId && !isNaN(parseInt(assignedConsultantId, 10))) ? parseInt(assignedConsultantId, 10) : null;
    let finalTlId = (assignedTlId && !isNaN(parseInt(assignedTlId, 10))) ? parseInt(assignedTlId, 10) : tlId;
    let finalManagerId = (assignedManagerId && !isNaN(parseInt(assignedManagerId, 10))) ? parseInt(assignedManagerId, 10) : managerId;

    if (finalConsultantId && !assignedTlId && !assignedManagerId) {
      // Auto-resolve if consultant is assigned and TL/Manager are not explicitly chosen
      const consUser = await prisma.user.findUnique({
        where: { id: finalConsultantId },
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
    } else if (finalTlId && !assignedManagerId) {
      // Auto-resolve if TL is assigned and Manager is not explicitly chosen
      const tlUser = await prisma.user.findUnique({
        where: { id: finalTlId },
        select: { reportsTo: true },
      });
      finalManagerId = tlUser?.reportsTo || null;
    }

    let parsedLoadKw = null;
    if (sanctionedLoadKw !== undefined && sanctionedLoadKw !== null && String(sanctionedLoadKw).trim() !== '') {
      const p = parseFloat(String(sanctionedLoadKw));
      if (!isNaN(p)) parsedLoadKw = p;
    }

    const leadCode = await generateLeadCode();
    const statusToSet = 1;

    // Create lead inside a database transaction
    const lead = await prisma.$transaction(async (tx) => {
      const newLead = await tx.lead.create({
        data: {
          leadCode,
          customerName,
          mobile: cleanMobile,
          mobileAlt: cleanMobileAlt,
          connectionType: connectionType || 'residential',
          sanctionedLoadKw: parsedLoadKw,
          address: address || '',
          pinCode: pinCode || '',
          city: city || '',
          state: state || '',
          leadSource: leadSource || 'other',
          status: statusToSet,
          assignedManagerId: finalManagerId,
          assignedTlId: finalTlId,
          assignedConsultantId: finalConsultantId,
          createdById: userPayload.id,
          isActive: true,
          discomName: discomName || null,
          connectionNumber: connectionNumber || null,
        },
      });

      // Log activity
      await tx.leadActivityLog.create({
        data: {
          leadId: newLead.id,
          userId: userPayload.id,
          fromStatus: null,
          toStatus: statusToSet,
          remark: notes || (statusToSet === 1 ? 'Lead added to the system as Fresh Lead.' : 'Lead added to the system as unassigned Simple Lead.'),
        },
      });

      // Log activity in central Activity table
      await tx.activity.create({
        data: {
          employeeId: userPayload.id,
          leadId: newLead.id,
          activityType: 'LEAD_CREATED',
          metadata: JSON.stringify({ notes: notes || 'Lead added to the system.' }),
        },
      });

      // Send notification if assigned
      if (finalConsultantId) {
        await tx.notification.create({
          data: {
            userId: finalConsultantId,
            type: 'lead_assigned',
            title: 'New lead assigned',
            body: `New lead assigned to you: ${customerName} — Lead #${leadCode}`,
            leadId: newLead.id,
          },
        });
      }

      // Add a duplicate link note if overridden by Admin
      if (existingLead && overrideDuplicate && isUserAdmin) {
        await tx.leadActivityLog.create({
          data: {
            leadId: newLead.id,
            userId: userPayload.id,
            fromStatus: statusToSet,
            toStatus: statusToSet,
            remark: `[SYSTEM NOTE] Duplicate override. Linked to existing Lead #${existingLead.leadCode}.`,
          },
        });
      }

      return newLead;
    });

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
    });
  } catch (error: any) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('leads:delete')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to delete leads.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idsStr = searchParams.get('ids') || '';
    if (!idsStr) {
      return NextResponse.json({ success: false, message: 'No Lead IDs provided.' }, { status: 400 });
    }

    const leadIds = idsStr.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (leadIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid Lead IDs.' }, { status: 400 });
    }

    // Hard delete leads from PostgreSQL (cascade deletes activity logs, meetings, orders)
    const deleteResult = await prisma.lead.deleteMany({
      where: { id: { in: leadIds } },
    });

    return NextResponse.json({
      success: true,
      message: `${deleteResult.count} leads deleted permanently from database.`,
    });
  } catch (error: any) {
    console.error('Bulk delete leads error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
