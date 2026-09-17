import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      const res = NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
      res.headers.append(
        'Set-Cookie',
        'token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      );
      return res;
    }

    if (userPayload.sessionToken) {
      const activeSession = await prisma.userSession.findUnique({
        where: { sessionToken: userPayload.sessionToken },
        select: { id: true },
      });

      if (!activeSession) {
        const res = NextResponse.json(
          { success: false, message: 'Session terminated or expired.' },
          { status: 401 }
        );
        res.headers.append(
          'Set-Cookie',
          'token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        );
        return res;
      }
    }

    await prisma.user.update({
      where: { id: userPayload.id },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Heartbeat registered.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
