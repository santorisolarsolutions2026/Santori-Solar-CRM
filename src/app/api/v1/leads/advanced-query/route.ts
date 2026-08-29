import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserSession } from '@/lib/auth';
import { parseQuery } from '@/lib/queryParser';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;

    console.log("ADVANCED QUERY API RUNNING - User ID:", userPayload.id, "Role:", userRole, "Permissions:", userPermissions);

    if (!userPermissions.includes('leads:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view leads.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { queryObj, page = 1, limit = 25, sortBy = 'updatedAt', sortOrder = 'desc', ids_only = false, search = '' } = body;

    const skip = (page - 1) * limit;

    // Log incoming request body to scratch/api_debug.log
    try {
      const fs = require('fs');
      fs.appendFileSync('scratch/api_debug.log', JSON.stringify({
        timestamp: new Date().toISOString(),
        queryObj
      }, null, 2) + "\n---\n");
    } catch (e) {}

    // Parse the dynamic query builder payload
    const parsedQuery = parseQuery(queryObj);

    const andConditions: any[] = [];
    if (Object.keys(parsedQuery).length > 0) {
      andConditions.push(parsedQuery);
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      andConditions.push({
        OR: [
          { customerName: { contains: cleanSearch, mode: 'insensitive' } },
          { mobile: { contains: cleanSearch, mode: 'insensitive' } },
          { leadCode: { contains: cleanSearch, mode: 'insensitive' } },
        ]
      });
    }

    // Default to active leads only, unless query specifically targets isActive
    const queryStr = queryObj ? JSON.stringify(queryObj) : '';
    if (!queryStr.includes('"field":"isActive"')) {
      andConditions.push({ isActive: true });
    }

    // Role-based visibility enforcement
    const hasViewAll = userPermissions.includes('leads:view_all');
    if (!hasViewAll) {
      const { getLeadVisibilityCondition } = await import('@/lib/hierarchy');
      const hierarchyCondition = await getLeadVisibilityCondition(userPayload.id, userRole, userPermissions);

      if (baseRole === 'finance') {
        andConditions.push({
          status: { in: [13] },
          ...hierarchyCondition
        });
      } else if (baseRole === 'operations') {
        andConditions.push({
          order: { isNot: null },
          ...hierarchyCondition
        });
      } else {
        andConditions.push(hierarchyCondition);
      }
    }

    const where: any = andConditions.length > 1 ? { AND: andConditions } : andConditions[0] || {};

    if (ids_only) {
      const matchingLeads = await prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        select: { id: true }
      });
      return NextResponse.json({
        success: true,
        data: matchingLeads.map((l) => l.id)
      });
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          consultant: { select: { id: true, name: true } },
          tl: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          order: {
            select: {
              id: true,
              status: true,
              rejectionReason: true,
              installationImages: {
                select: { id: true, status: true }
              }
            }
          }
        }
      }),
      prisma.lead.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Advanced query leads route error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
