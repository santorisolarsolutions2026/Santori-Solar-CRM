import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { getSubordinateIds } from '@/lib/hierarchy';
import { RAW_CITY_CASE_STR, RAW_DIVISION_CASE_STR } from '@/lib/territorySql';

export const dynamic = 'force-dynamic';

interface GroupedRow {
  state: string;
  city: string;
  division: string;
  total: number;
  active: number;
  inactive: number;
  unassigned: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

const geoSummaryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60s cache TTL

export function invalidateGeoSummaryCache() {
  geoSummaryCache.clear();
}

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const isAuthorized =
      userPayload.role === 'admin' ||
      userPayload.role === 'director' ||
      userPayload.role === 'sales_head' ||
      userPayload.role === 'manager' ||
      userPermissions.includes('admin:access') ||
      userPermissions.includes('admin:analytics_view') ||
      userPermissions.includes('sales:lead_assign') ||
      userPermissions.includes('reports:view') ||
      userPermissions.includes('sales:analytics_view') ||
      userPermissions.includes('ops:analytics_view');

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Geographic reference map is restricted to Admin & Sales Management only.' },
        { status: 403 }
      );
    }

    const isSuperAdmin =
      userPayload.role === 'admin' ||
      userPayload.role === 'director' ||
      userPermissions.includes('admin:access');

    // Fast In-Memory Cache Lookup (0ms response if cached within last 60s)
    const url = new URL(req.url);
    const forceFresh = url.searchParams.get('fresh') === 'true';
    const cacheKey = isSuperAdmin ? 'global_super_admin' : `user_${userPayload.id}_${userPayload.role}`;

    if (!forceFresh) {
      const cached = geoSummaryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json(cached.data);
      }
    }

    let rows: GroupedRow[] = [];

    if (isSuperAdmin) {
      // Super Admin: Global company-wide lead pool
      const sql = `
        WITH analyzed_leads AS (
          SELECT 
            COALESCE(NULLIF(TRIM(state), ''), 'Uttar Pradesh') as state,
            ${RAW_CITY_CASE_STR} as city,
            ${RAW_DIVISION_CASE_STR} as area_cluster,
            "isActive",
            "assignedManagerId",
            "assignedTlId",
            "assignedConsultantId"
          FROM "Lead"
        )
        SELECT 
          state,
          city,
          area_cluster as division,
          COUNT(*)::int as total,
          COUNT(CASE WHEN ("isActive" = true OR "isActive" IS NULL) AND ("assignedManagerId" IS NOT NULL OR "assignedTlId" IS NOT NULL OR "assignedConsultantId" IS NOT NULL) THEN 1 END)::int as active,
          COUNT(CASE WHEN "isActive" = false THEN 1 END)::int as inactive,
          COUNT(CASE WHEN ("isActive" = true OR "isActive" IS NULL) AND "assignedManagerId" IS NULL AND "assignedTlId" IS NULL AND "assignedConsultantId" IS NULL THEN 1 END)::int as unassigned
        FROM analyzed_leads
        GROUP BY 1, 2, 3
        ORDER BY total DESC;
      `;
      rows = await prisma.$queryRawUnsafe<GroupedRow[]>(sql);
    } else {
      // Sales Manager / Team Head: Scoped to their allocated leads and subordinate hierarchy
      const subordinateIds = await getSubordinateIds(userPayload.id);
      const allowedIds = [userPayload.id, ...subordinateIds];

      const sql = `
        WITH analyzed_leads AS (
          SELECT 
            COALESCE(NULLIF(TRIM(state), ''), 'Uttar Pradesh') as state,
            ${RAW_CITY_CASE_STR} as city,
            ${RAW_DIVISION_CASE_STR} as area_cluster,
            "isActive",
            "assignedManagerId",
            "assignedTlId",
            "assignedConsultantId"
          FROM "Lead"
          WHERE ("assignedManagerId" = ANY($1::int[]) OR "assignedTlId" = ANY($1::int[]) OR "assignedConsultantId" = ANY($1::int[]))
        )
        SELECT 
          state,
          city,
          area_cluster as division,
          COUNT(*)::int as total,
          COUNT(CASE WHEN ("isActive" = true OR "isActive" IS NULL) AND ("assignedConsultantId" IS NOT NULL OR "assignedTlId" IS NOT NULL) THEN 1 END)::int as active,
          COUNT(CASE WHEN "isActive" = false THEN 1 END)::int as inactive,
          COUNT(CASE WHEN ("isActive" = true OR "isActive" IS NULL) AND "assignedManagerId" = ANY($1::int[]) AND "assignedTlId" IS NULL AND "assignedConsultantId" IS NULL THEN 1 END)::int as unassigned
        FROM analyzed_leads
        GROUP BY 1, 2, 3
        ORDER BY total DESC;
      `;
      rows = await prisma.$queryRawUnsafe<GroupedRow[]>(sql, allowedIds);
    }


    let totalLeads = 0;
    let totalActive = 0;
    let totalInactive = 0;
    let totalUnassigned = 0;

    // Structure: State Map -> City Map -> Division Map
    const stateMap: Record<
      string,
      {
        name: string;
        total: number;
        active: number;
        inactive: number;
        unassigned: number;
        assigned: number;
        cities: Record<
          string,
          {
            name: string;
            state: string;
            total: number;
            active: number;
            inactive: number;
            unassigned: number;
            assigned: number;
            divisions: Record<
              string,
              {
                name: string;
                total: number;
                active: number;
                inactive: number;
                unassigned: number;
                assigned: number;
              }
            >;
          }
        >;
      }
    > = {};

    for (const row of rows) {
      const rowTotal = Number(row.total || 0);
      const rowActive = Number(row.active || 0);
      const rowInactive = Number(row.inactive || 0);
      const rowUnassigned = Number(row.unassigned || 0);

      totalLeads += rowTotal;
      totalActive += rowActive;
      totalInactive += rowInactive;
      totalUnassigned += rowUnassigned;

      const stateName = row.state?.trim() || 'Uttar Pradesh';
      const cityName = row.city?.trim() || 'Varanasi';
      const divisionName = row.division?.trim() || 'Central & Other Wards';

      // Init State
      if (!stateMap[stateName]) {
        stateMap[stateName] = {
          name: stateName,
          total: 0,
          active: 0,
          inactive: 0,
          unassigned: 0,
          assigned: 0,
          cities: {},
        };
      }
      stateMap[stateName].total += rowTotal;
      stateMap[stateName].active += rowActive;
      stateMap[stateName].inactive += rowInactive;
      stateMap[stateName].unassigned += rowUnassigned;
      stateMap[stateName].assigned += rowActive;

      // Init City
      if (!stateMap[stateName].cities[cityName]) {
        stateMap[stateName].cities[cityName] = {
          name: cityName,
          state: stateName,
          total: 0,
          active: 0,
          inactive: 0,
          unassigned: 0,
          assigned: 0,
          divisions: {},
        };
      }
      stateMap[stateName].cities[cityName].total += rowTotal;
      stateMap[stateName].cities[cityName].active += rowActive;
      stateMap[stateName].cities[cityName].inactive += rowInactive;
      stateMap[stateName].cities[cityName].unassigned += rowUnassigned;
      stateMap[stateName].cities[cityName].assigned += rowActive;

      // Init Division
      if (!stateMap[stateName].cities[cityName].divisions[divisionName]) {
        stateMap[stateName].cities[cityName].divisions[divisionName] = {
          name: divisionName,
          total: 0,
          active: 0,
          inactive: 0,
          unassigned: 0,
          assigned: 0,
        };
      }
      stateMap[stateName].cities[cityName].divisions[divisionName].total += rowTotal;
      stateMap[stateName].cities[cityName].divisions[divisionName].active += rowActive;
      stateMap[stateName].cities[cityName].divisions[divisionName].inactive += rowInactive;
      stateMap[stateName].cities[cityName].divisions[divisionName].unassigned += rowUnassigned;
      stateMap[stateName].cities[cityName].divisions[divisionName].assigned += rowActive;
    }

    // Convert into clean sorted arrays
    const statesArray = Object.values(stateMap)
      .map((st) => ({
        name: st.name,
        total: st.total,
        active: st.active,
        inactive: st.inactive,
        unassigned: st.unassigned,
        assigned: st.active,
        cities: Object.values(st.cities)
          .map((ct) => ({
            name: ct.name,
            state: ct.state,
            total: ct.total,
            active: ct.active,
            inactive: ct.inactive,
            unassigned: ct.unassigned,
            assigned: ct.active,
            divisions: Object.values(ct.divisions).sort((a, b) => b.total - a.total),
          }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);

    const citiesFlat = statesArray.flatMap((st) => st.cities);

    const responsePayload = {
      success: true,
      summary: {
        totalLeads,
        totalActive,
        totalInactive,
        totalUnassigned,
        totalAssigned: totalActive,
        activePercentage: totalLeads > 0 ? Number(((totalActive / totalLeads) * 100).toFixed(2)) : 0,
        inactivePercentage: totalLeads > 0 ? Number(((totalInactive / totalLeads) * 100).toFixed(2)) : 0,
        unassignedPercentage: totalLeads > 0 ? Number(((totalUnassigned / totalLeads) * 100).toFixed(2)) : 0,
        assignedPercentage: totalLeads > 0 ? Number(((totalActive / totalLeads) * 100).toFixed(2)) : 0,
        totalStates: statesArray.length,
        totalCities: citiesFlat.length,
      },
      states: statesArray,
      cities: citiesFlat,
    };

    // Save into server memory cache
    geoSummaryCache.set(cacheKey, {
      data: responsePayload,
      timestamp: Date.now(),
    });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error fetching geo summary:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
