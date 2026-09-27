import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const meetingId = parseInt(id, 10);
    if (isNaN(meetingId)) {
      return NextResponse.json({ success: false, message: 'Invalid Meeting ID.' }, { status: 400 });
    }

    const body = await req.json();
    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return NextResponse.json({ success: false, message: 'Latitude and Longitude are required.' }, { status: 400 });
    }

    const meeting = await prisma.meetingBooking.findUnique({
      where: { id: meetingId },
      include: { lead: true },
    });

    if (!meeting) {
      return NextResponse.json({ success: false, message: 'Meeting not found.' }, { status: 404 });
    }

    let city: string | null = meeting.meetingCity;
    let locality: string | null = meeting.meetingLocality;
    let pinCode: string | null = meeting.meetingPinCode;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'SolarCRM/1.0 (contact@santorisolar.com)',
            'Accept-Language': 'en',
          },
        }
      );
      clearTimeout(timeoutId);

      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.address) {
          const addr = geoData.address;
          city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || addr.county || null;

          const localityParts = [];
          if (addr.suburb) localityParts.push(addr.suburb);
          else if (addr.neighbourhood) localityParts.push(addr.neighbourhood);
          else if (addr.quarter) localityParts.push(addr.quarter);

          if (addr.road) localityParts.push(addr.road);

          locality = localityParts.length > 0 ? localityParts.join(', ') : (addr.state_district || null);
          pinCode = addr.postcode || null;
        }
      }
    } catch (err) {
      console.error('Reverse geocoding failed or timed out:', err);
    }

    const updatedMeeting = await prisma.meetingBooking.update({
      where: { id: meetingId },
      data: {
        meetingLatitude: parseFloat(latitude),
        meetingLongitude: parseFloat(longitude),
        meetingCity: city,
        meetingLocality: locality,
        meetingPinCode: pinCode,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Meeting location updated successfully.',
      data: updatedMeeting,
    });
  } catch (error: any) {
    console.error('Error updating meeting location:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
