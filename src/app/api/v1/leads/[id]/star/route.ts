import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid lead ID' }, { status: 400 });
    }

    const star = await prisma.starredLead.findUnique({
      where: {
        userId_leadId: {
          userId: userPayload.id,
          leadId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: star ? { isStarred: true, priority: star.priority, reason: star.reason } : { isStarred: false },
    });
  } catch (error: any) {
    console.error('Error fetching lead star status:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid lead ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    let { priority, reason } = body;

    const validPriorities = ['high', 'medium', 'low'];
    if (!priority || !validPriorities.includes(priority.toLowerCase())) {
      priority = 'medium';
    } else {
      priority = priority.toLowerCase();
    }

    const star = await prisma.starredLead.upsert({
      where: {
        userId_leadId: {
          userId: userPayload.id,
          leadId,
        },
      },
      update: {
        priority,
        reason: reason ? String(reason).trim() : null,
      },
      create: {
        userId: userPayload.id,
        leadId,
        priority,
        reason: reason ? String(reason).trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead starred in your personal bucket',
      data: star,
    });
  } catch (error: any) {
    console.error('Error starring lead:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid lead ID' }, { status: 400 });
    }

    await prisma.starredLead.deleteMany({
      where: {
        userId: userPayload.id,
        leadId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead removed from your personal bucket',
    });
  } catch (error: any) {
    console.error('Error unstarring lead:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
