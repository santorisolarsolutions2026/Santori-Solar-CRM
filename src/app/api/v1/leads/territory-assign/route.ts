import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { resolveHierarchyAssignments } from '@/lib/hierarchy';
import { getTerritoryUnassignedLeadIds, RAW_DIVISION_CASE_STR } from '@/lib/territorySql';
import { invalidateGeoSummaryCache } from '../geo-summary/route';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const canAssign =
      userPermissions.includes('leads:assign') ||
      userPermissions.includes('sales:lead_assign') ||
      ['admin', 'director', 'sales_head', 'manager'].includes(userPayload.role);

    if (!canAssign) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not have permission to assign leads.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { city, localities, assigneeId, count, priority = 'oldest' } = body;

    if (!assigneeId) {
      return NextResponse.json({ success: false, message: 'Please select an employee to assign leads to.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(assigneeId) },
      select: { id: true, name: true, role: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ success: false, message: 'Selected employee is inactive or not found.' }, { status: 400 });
    }

    if (!Array.isArray(localities) || localities.length === 0) {
      return NextResponse.json({ success: false, message: 'Please select at least one territory / locality.' }, { status: 400 });
    }

    const isSuperAdmin =
      userPayload.role === 'admin' ||
      userPayload.role === 'director' ||
      userPermissions.includes('admin:access');

    let allowedUserIds: number[] | undefined;
    if (!isSuperAdmin) {
      const { getSubordinateIds } = await import('@/lib/hierarchy');
      const subordinateIds = await getSubordinateIds(userPayload.id);
      allowedUserIds = [userPayload.id, ...subordinateIds];

      // Non-admin can only assign to employees in their subordinate hierarchy
      if (!allowedUserIds.includes(Number(assigneeId))) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden. You can only assign leads to employees in your hierarchy tree.',
        }, { status: 403 });
      }
    }

    // Safe hard limit: Max 500 leads per batch to protect performance
    const requestedCount = count && Number(count) > 0 ? Number(count) : 500;
    const safeCount = Math.min(500, Math.max(1, requestedCount));

    // Fetch unassigned lead IDs matching the exact unified Map View classification
    const leadIds = await getTerritoryUnassignedLeadIds({
      city,
      localities,
      count: safeCount,
      priority: priority === 'newest' ? 'newest' : 'oldest',
      allowedUserIds,
    });

    if (leadIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No unassigned leads found matching the selected territories.' },
        { status: 404 }
      );
    }

    // Resolve complete hierarchy chain for the target employee
    const resolved = await resolveHierarchyAssignments(Number(assigneeId));

    // Batch update leads
    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: {
        assignedManagerId: resolved.assignedManagerId,
        assignedTlId: resolved.assignedTlId,
        assignedConsultantId: resolved.assignedConsultantId,
        updatedAt: new Date(),
      },
    });

    // Calculate exact locality breakdown with counts for assigned leadIds
    let locBreakdownStr = '';
    try {
      const breakdownRows = await prisma.$queryRawUnsafe<{ division_name: string; count: number }[]>(
        `
        WITH analyzed AS (
          SELECT id, ${RAW_DIVISION_CASE_STR} as division_name
          FROM "Lead"
          WHERE id = ANY($1::int[])
        )
        SELECT division_name, COUNT(*)::int as count
        FROM analyzed
        GROUP BY division_name
        ORDER BY count DESC;
        `,
        leadIds
      );

      locBreakdownStr = breakdownRows
        .map((r) => `${r.division_name} (${r.count})`)
        .join(', ');
    } catch (e) {
      locBreakdownStr = localities.join(', ');
    }

    const summaryText = `Assigned ${leadIds.length} lead${leadIds.length > 1 ? 's' : ''} to ${targetUser.name} in ${city || 'Territory'}: ${locBreakdownStr}.`;

    // Create Activity Log Entries for Recent Activities and Journey Timelines
    try {
      if (leadIds.length > 0) {
        const logEntries = leadIds.map((id) => ({
          leadId: id,
          userId: userPayload.id,
          fromStatus: 0,
          toStatus: 1,
          remark: `Territory assigned to ${targetUser.name} in ${city || 'Territory'} (${locBreakdownStr}).`,
        }));
        await prisma.leadActivityLog.createMany({
          data: logEntries,
        });
      }
    } catch (actErr) {
      console.warn('LeadActivityLog creation failed for territory assign:', actErr);
    }

    // Create Audit Log Entry for Admin Console & Recent Activity Stream
    try {
      if (leadIds.length > 0) {
        await prisma.auditLog.create({
          data: {
            tableName: 'Lead',
            recordId: leadIds[0],
            fieldName: 'territory_assign',
            oldValue: 'Unassigned',
            newValue: summaryText,
            userId: userPayload.id,
          },
        });
      }
    } catch (auditErr) {
      console.warn('Audit log creation failed for territory assign:', auditErr);
    }

    // Invalidate server geo summary cache so UI updates immediately
    try {
      invalidateGeoSummaryCache();
    } catch {}

    return NextResponse.json({
      success: true,
      count: leadIds.length,
      assigneeName: targetUser.name,
      message: `Successfully assigned ${leadIds.length} territory leads to ${targetUser.name}.`,
    });
  } catch (error: any) {
    console.error('Territory assign error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to assign territory leads.' },
      { status: 500 }
    );
  }
}

