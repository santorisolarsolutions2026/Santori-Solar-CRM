import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { getTerritoryPreviewData } from '@/lib/territorySql';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const previewCache = new Map<string, CacheEntry>();
const PREVIEW_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function invalidateTerritoryPreviewCache() {
  previewCache.clear();
}

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const canView =
      userPermissions.includes('leads:view') ||
      userPermissions.includes('leads:view_all') ||
      userPermissions.includes('sales:lead_assign') ||
      ['admin', 'director', 'sales_head', 'manager'].includes(userPayload.role);

    if (!canView) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not have permission to preview territory leads.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { city, localities, filterType = 'unassigned', page = 1, limit = 25 } = body;

    if (!Array.isArray(localities) || localities.length === 0) {
      return NextResponse.json({ success: false, message: 'Please select at least one locality.' }, { status: 400 });
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));

    const isSuperAdmin =
      userPayload.role === 'admin' ||
      userPayload.role === 'director' ||
      userPermissions.includes('admin:access');

    let allowedUserIds: number[] | undefined;
    if (!isSuperAdmin) {
      const { getSubordinateIds } = await import('@/lib/hierarchy');
      const subordinateIds = await getSubordinateIds(userPayload.id);
      allowedUserIds = [userPayload.id, ...subordinateIds];
    }

    const sortedLocs = [...localities].map((l) => String(l).trim().toLowerCase()).sort().join('|');
    const userScopeKey = isSuperAdmin ? 'all' : (allowedUserIds || []).sort().join(',');
    const cacheKey = `${(city || 'varanasi').toLowerCase().trim()}::${sortedLocs}::${filterType}::${pageNum}::${limitNum}::${userScopeKey}`;

    const cached = previewCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PREVIEW_CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const result = await getTerritoryPreviewData({
      city,
      localities,
      filterType,
      page: pageNum,
      limit: limitNum,
      allowedUserIds,
    });

    const responsePayload = {
      success: true,
      data: result.leads,
      counts: result.counts,
      pagination: {
        total: result.totalFiltered,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result.totalFiltered / limitNum) || 1,
      },
    };

    if (previewCache.size > 200) {
      const oldestKey = previewCache.keys().next().value;
      if (oldestKey) previewCache.delete(oldestKey);
    }
    previewCache.set(cacheKey, {
      data: responsePayload,
      timestamp: Date.now(),
    });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Territory preview error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to preview territory leads.' },
      { status: 500 }
    );
  }
}

