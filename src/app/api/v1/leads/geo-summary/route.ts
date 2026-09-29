import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const isAdmin = userPayload.role === 'admin' || userPayload.role === 'director' || userPermissions.includes('admin:access');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Geographic reference map is restricted to Admin only.' },
        { status: 403 }
      );
    }

    // Fetch lightweight columns of active leads
    const leads = await prisma.lead.findMany({
      where: { isActive: true },
      select: {
        id: true,
        state: true,
        city: true,
        division: true,
        assignedManagerId: true,
        assignedTlId: true,
        assignedConsultantId: true,
        status: true,
      },
    });

    let totalLeads = 0;
    let totalAssigned = 0;
    let totalUnassigned = 0;

    // Structure: State Map -> City Map -> Division Map
    const stateMap: Record<
      string,
      {
        name: string;
        total: number;
        assigned: number;
        unassigned: number;
        cities: Record<
          string,
          {
            name: string;
            state: string;
            total: number;
            assigned: number;
            unassigned: number;
            divisions: Record<
              string,
              {
                name: string;
                total: number;
                assigned: number;
                unassigned: number;
              }
            >;
          }
        >;
      }
    > = {};

    for (const lead of leads) {
      totalLeads++;
      const isAssigned = Boolean(
        lead.assignedManagerId || lead.assignedTlId || lead.assignedConsultantId
      );

      if (isAssigned) {
        totalAssigned++;
      } else {
        totalUnassigned++;
      }

      const rawState = lead.state?.trim() || 'Unknown State';
      // Normalize state name capitalization
      const stateName = rawState.charAt(0).toUpperCase() + rawState.slice(1);

      const rawCity = lead.city?.trim() || 'Unknown City';
      const cityName = rawCity.charAt(0).toUpperCase() + rawCity.slice(1);

      const rawDivision = lead.division?.trim() || 'Other / General Area';
      const divisionName = rawDivision.charAt(0).toUpperCase() + rawDivision.slice(1);

      // Init State
      if (!stateMap[stateName]) {
        stateMap[stateName] = {
          name: stateName,
          total: 0,
          assigned: 0,
          unassigned: 0,
          cities: {},
        };
      }
      stateMap[stateName].total++;
      if (isAssigned) stateMap[stateName].assigned++;
      else stateMap[stateName].unassigned++;

      // Init City
      if (!stateMap[stateName].cities[cityName]) {
        stateMap[stateName].cities[cityName] = {
          name: cityName,
          state: stateName,
          total: 0,
          assigned: 0,
          unassigned: 0,
          divisions: {},
        };
      }
      stateMap[stateName].cities[cityName].total++;
      if (isAssigned) stateMap[stateName].cities[cityName].assigned++;
      else stateMap[stateName].cities[cityName].unassigned++;

      // Init Division
      if (!stateMap[stateName].cities[cityName].divisions[divisionName]) {
        stateMap[stateName].cities[cityName].divisions[divisionName] = {
          name: divisionName,
          total: 0,
          assigned: 0,
          unassigned: 0,
        };
      }
      stateMap[stateName].cities[cityName].divisions[divisionName].total++;
      if (isAssigned) stateMap[stateName].cities[cityName].divisions[divisionName].assigned++;
      else stateMap[stateName].cities[cityName].divisions[divisionName].unassigned++;
    }

    // Convert into clean arrays
    const statesArray = Object.values(stateMap).map((st) => ({
      name: st.name,
      total: st.total,
      assigned: st.assigned,
      unassigned: st.unassigned,
      cities: Object.values(st.cities)
        .map((ct) => ({
          name: ct.name,
          state: ct.state,
          total: ct.total,
          assigned: ct.assigned,
          unassigned: ct.unassigned,
          divisions: Object.values(ct.divisions).sort((a, b) => b.total - a.total),
        }))
        .sort((a, b) => b.total - a.total),
    })).sort((a, b) => b.total - a.total);

    // Flat list of cities for instant map rendering
    const citiesFlat = statesArray.flatMap((st) => st.cities);

    return NextResponse.json({
      success: true,
      summary: {
        totalLeads,
        totalAssigned,
        totalUnassigned,
        assignedPercentage: totalLeads > 0 ? Math.round((totalAssigned / totalLeads) * 100) : 0,
        unassignedPercentage: totalLeads > 0 ? Math.round((totalUnassigned / totalLeads) * 100) : 0,
        totalStates: statesArray.length,
        totalCities: citiesFlat.length,
      },
      states: statesArray,
      cities: citiesFlat,
    });
  } catch (error: any) {
    console.error('Error fetching geo summary:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
