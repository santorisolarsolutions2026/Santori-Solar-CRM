import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

let cachedLocations: Record<string, string[]> | null = null;
let lastFetched = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const now = Date.now();
    if (cachedLocations && (now - lastFetched < CACHE_DURATION)) {
      return NextResponse.json({
        success: true,
        data: cachedLocations
      });
    }

    // Get unique state and city combinations
    const locations = await prisma.lead.findMany({
      where: { isActive: true },
      select: {
        state: true,
        city: true
      },
      distinct: ['state', 'city']
    });

    // Group cities by state
    const stateCitiesMap: Record<string, string[]> = {};
    locations.forEach(loc => {
      const state = loc.state ? loc.state.trim() : '';
      const city = loc.city ? loc.city.trim() : '';
      
      if (state && city) {
        if (!stateCitiesMap[state]) {
          stateCitiesMap[state] = [];
        }
        if (!stateCitiesMap[state].includes(city)) {
          stateCitiesMap[state].push(city);
        }
      }
    });

    cachedLocations = stateCitiesMap;
    lastFetched = now;

    return NextResponse.json({
      success: true,
      data: stateCitiesMap
    });
  } catch (error: any) {
    console.error('Fetch locations error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
