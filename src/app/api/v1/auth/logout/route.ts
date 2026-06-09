import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    let location = 'Unknown Location';
    
    try {
      const body = await req.json();
      if (body && body.location) {
        location = body.location;
      }
    } catch (e) {
      // Body might be empty or not json, ignore
    }

    if (userPayload) {
      // Update lastLogoutAt and logoutLocation in DB
      await prisma.user.update({
        where: { id: userPayload.id },
        data: {
          lastLogoutAt: new Date(),
          logoutLocation: location,
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear cookie by setting expiry in past
    response.headers.append(
      'Set-Cookie',
      'token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );

    return response;
  } catch (error: any) {
    console.error('Logout API error:', error);
    // Clear cookie and logout even on database error
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
    response.headers.append(
      'Set-Cookie',
      'token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );
    return response;
  }
}
