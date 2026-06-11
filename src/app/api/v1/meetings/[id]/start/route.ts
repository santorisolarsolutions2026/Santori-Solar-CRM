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

    const meeting = await prisma.meetingBooking.findUnique({
      where: { id: meetingId },
      include: { lead: true }
    });

    if (!meeting) {
      return NextResponse.json({ success: false, message: 'Meeting not found.' }, { status: 404 });
    }

    let city: string | null = null;
    let locality: string | null = null;
    let pinCode: string | null = null;

    if (latitude && longitude) {
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
    }

    // Update meeting details
    const updatedMeeting = await prisma.meetingBooking.update({
      where: { id: meetingId },
      data: {
        meetingStartedAt: new Date(),
        meetingLatitude: latitude ? parseFloat(latitude) : null,
        meetingLongitude: longitude ? parseFloat(longitude) : null,
        meetingCity: city,
        meetingLocality: locality,
        meetingPinCode: pinCode,
      },
    });

    // Write a lead activity log
    await prisma.leadActivityLog.create({
      data: {
        leadId: meeting.leadId,
        userId: userPayload.id,
        fromStatus: meeting.lead.status,
        toStatus: meeting.lead.status,
        remark: `[MEETING COMMENCED] Started meeting. Location coordinates: ${latitude || 'unknown'}, ${longitude || 'unknown'}.`,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedMeeting,
      message: 'Meeting started and location logged.',
    });
  } catch (error: any) {
    console.error('Start meeting error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
