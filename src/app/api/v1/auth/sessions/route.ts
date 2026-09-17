import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, markSessionKilled } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserIdParam = searchParams.get('userId');
    const isAdmin = ['admin', 'director'].includes(userPayload.role) || userPayload.role?.startsWith('admin:');

    let targetUserId = userPayload.id;
    if (targetUserIdParam && isAdmin) {
      const parsed = parseInt(targetUserIdParam, 10);
      if (!isNaN(parsed)) {
        targetUserId = parsed;
      }
    }

    const sessions = await prisma.userSession.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      location: s.location || 'Unknown Location',
      createdAt: s.createdAt,
      isCurrentSession: userPayload.sessionToken === s.sessionToken,
    }));

    return NextResponse.json({
      success: true,
      data: formattedSessions,
      count: formattedSessions.length,
      maxAllowed: 3,
    });
  } catch (error: any) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionIdParam = searchParams.get('id');

    if (!sessionIdParam) {
      return NextResponse.json({ success: false, message: 'Session ID is required.' }, { status: 400 });
    }

    const sessionId = parseInt(sessionIdParam, 10);
    if (isNaN(sessionId)) {
      return NextResponse.json({ success: false, message: 'Invalid Session ID.' }, { status: 400 });
    }

    const targetSession = await prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!targetSession) {
      return NextResponse.json({ success: false, message: 'Session not found or already terminated.' }, { status: 404 });
    }

    const isAdmin = ['admin', 'director'].includes(userPayload.role) || userPayload.role?.startsWith('admin:');
    if (targetSession.userId !== userPayload.id && !isAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden. You cannot terminate this session.' }, { status: 403 });
    }

    // Invalidate in memory immediately
    markSessionKilled(targetSession.sessionToken);

    // Remove from database
    await prisma.userSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully.',
    });
  } catch (error: any) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
