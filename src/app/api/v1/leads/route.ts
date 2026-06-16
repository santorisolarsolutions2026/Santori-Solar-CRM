import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

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

    const userPermissions = await getUserPermissions(userPayload.id);
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

    const skip = (page - 1) * limit;

    // Define base query conditions (enforce isActive: true to support soft delete / deactivation)
    const andConditions: Prisma.LeadWhereInput[] = [
      { isActive: true }
    ];

    const hasViewAll = userPermissions.includes('leads:view_all');

    // 1. Role-based visibility enforcement
    if (!hasViewAll) {
      if (userPayload.role === 'manager') {
        andConditions.push({
          OR: [
            { assignedManagerId: userPayload.id },
            { assignedTlId: null, assignedConsultantId: null }
          ]
        });
      } else if (userPayload.role === 'tl') {
        andConditions.push({
          OR: [
            { assignedTlId: userPayload.id },
            { assignedTlId: null, assignedConsultantId: null }
          ]
        });
      } else if (userPayload.role === 'consultant' || userPayload.role === 'psa') {
        andConditions.push({ assignedConsultantId: userPayload.id });
      } else if (userPayload.role === 'finance') {
        // Finance sees only leads at Stage 13+ (Sale Done)
        andConditions.push({ status: { in: [13] } });
      } else if (userPayload.role === 'operations') {
        // Operations sees only leads with orders processed by finance
        andConditions.push({
          status: 13,
          order: {
            status: { in: ['finance_verified', 'ops_assigned', 'completed'] },
          }
        });
      } else {
        // Fallback for role without view_all permission
        andConditions.push({ assignedConsultantId: userPayload.id });
      }
    }

    // 2. Extra Filters
    if (search) {
      andConditions.push({
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } },
          { leadCode: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    if (statusParam) {
      const statuses = statusParam.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
      if (statuses.length > 0) {
        andConditions.push({ status: { in: statuses } });
      }
    } else {
      // Exclude Stage 13 (SALE DONE) leads where order status is completed and has completed installation photos
      andConditions.push({
        NOT: {
          status: 13,
          order: {
            status: 'completed',
            installationImages: {
              some: {
                status: 'completed'
              }
            }
          }
        }
      });
    }

    if (city) {
      andConditions.push({ city: { contains: city, mode: 'insensitive' } });
    }

    if (consultantIdStr) {
      const consultantId = parseInt(consultantIdStr, 10);
      if (!isNaN(consultantId)) {
        andConditions.push({ assignedConsultantId: consultantId });
      }
    }

    if (connectionType) {
      andConditions.push({ connectionType });
    }

    if (leadSource) {
      andConditions.push({ leadSource });
    }

    const where: Prisma.LeadWhereInput = { AND: andConditions };

    const idsOnly = searchParams.get('ids_only') === 'true';
    if (idsOnly) {
      const matchingLeads = await prisma.lead.findMany({
        where,
        select: { id: true }
      });
      return NextResponse.json({
        success: true,
        data: matchingLeads.map(l => l.id)
      });
    }

    // Sorting
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (['createdAt', 'updatedAt', 'id', 'status', 'customerName'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy['updatedAt'] = 'desc';
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
              installationImages: {
                select: { id: true, status: true }
              }
            }
          },
        },
      }),
    ]);

    // Enforce data masking for PSA
    const isPSA = userPayload.role === 'psa';
    const processedLeads = leads.map((lead) => {
      if (isPSA && lead.mobile) {
        return {
          ...lead,
          mobile: lead.mobile.substring(0, 5) + 'XXXXX',
          mobileAlt: lead.mobileAlt ? lead.mobileAlt.substring(0, 5) + 'XXXXX' : null,
          address: '[Masked for PSA]',
        };
      }
      return lead;
    });

    return NextResponse.json({
      success: true,
      data: {
        leads: processedLeads,
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

    const userPermissions = await getUserPermissions(userPayload.id);
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
      notes,
      overrideDuplicate,
      discomName,
      connectionNumber,
    } = body;

    // Validation - only Customer Name and Mobile Number are strictly required
    if (!customerName || !mobile) {
      return NextResponse.json({ success: false, message: 'Missing required Customer Name or Mobile Number.' }, { status: 400 });
    }

    // Clean phone number (strip spaces/dashes and float decimals)
    let cleanMobile = String(mobile).trim().replace(/[\s-]/g, '');
    if (cleanMobile.includes('.')) {
      cleanMobile = cleanMobile.split('.')[0];
    }
    if (cleanMobile.length !== 10) {
      return NextResponse.json({ success: false, message: 'Mobile number must be exactly 10 digits.' }, { status: 400 });
    }

    // Clean mobileAlt if present
    let cleanMobileAlt = mobileAlt ? String(mobileAlt).trim().replace(/[\s-]/g, '') : null;
    if (cleanMobileAlt && cleanMobileAlt.includes('.')) {
      cleanMobileAlt = cleanMobileAlt.split('.')[0];
    }

    const isUserAdmin = ['admin', 'director'].includes(userPayload.role);

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

    if (userPayload.role === 'manager') {
      managerId = userPayload.id;
    } else if (userPayload.role === 'tl') {
      tlId = userPayload.id;
      // Get manager who supervises this TL
      const tlUser = await prisma.user.findUnique({
        where: { id: userPayload.id },
        select: { reportsTo: true },
      });
      managerId = tlUser?.reportsTo || null;
    }

    // If consultant is assigned, ensure we set TL and manager hierarchy correctly
    let finalConsultantId = assignedConsultantId ? parseInt(assignedConsultantId, 10) : null;
    let finalTlId = assignedTlId ? parseInt(assignedTlId, 10) : tlId;
    let finalManagerId = managerId;

    if (finalConsultantId) {
      const consUser = await prisma.user.findUnique({
        where: { id: finalConsultantId },
        select: { reportsTo: true },
      });
      // Reports to TL
      if (consUser?.reportsTo) {
        finalTlId = consUser.reportsTo;
        const tlUser = await prisma.user.findUnique({
          where: { id: finalTlId },
          select: { reportsTo: true },
        });
        finalManagerId = tlUser?.reportsTo || null;
      }
    }

    const leadCode = await generateLeadCode();
    const statusToSet = (finalTlId || finalConsultantId) ? 1 : 0;

    // Create lead inside a database transaction
    const lead = await prisma.$transaction(async (tx) => {
      const newLead = await tx.lead.create({
        data: {
          leadCode,
          customerName,
          mobile: cleanMobile,
          mobileAlt: cleanMobileAlt,
          connectionType: connectionType || 'residential',
          sanctionedLoadKw: sanctionedLoadKw ? parseFloat(sanctionedLoadKw) : null,
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
    if (!userPermissions.includes('leads:edit')) {
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
