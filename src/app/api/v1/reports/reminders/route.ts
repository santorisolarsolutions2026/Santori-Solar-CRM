import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    // Role filtration criteria
    const leadWhere: any = {};
    if (userPayload.role === 'manager') {
      leadWhere.assignedManagerId = userPayload.id;
    } else if (userPayload.role === 'tl') {
      leadWhere.assignedTlId = userPayload.id;
    } else if (userPayload.role === 'consultant' || userPayload.role === 'psa') {
      leadWhere.assignedConsultantId = userPayload.id;
    }

    // 1. Fetch upcoming meetings
    const meetings = await prisma.meetingBooking.findMany({
      where: {
        lead: {
          ...leadWhere,
          isActive: true,
        },
      },
      include: {
        lead: {
          select: {
            customerName: true,
            leadCode: true,
          },
        },
        executive: {
          select: {
            name: true,
          },
        },
      },
    });

    const formattedMeetings: any[] = [];
    for (const m of meetings) {
      try {
        const datetime = new Date(`${m.meetingDate}T${m.meetingTime}:00`);
        if (!isNaN(datetime.getTime())) {
          formattedMeetings.push({
            id: `meeting-${m.id}`,
            type: 'meeting',
            title: 'Meeting Scheduled 📅',
            datetime,
            leadId: m.leadId,
            customerName: m.lead.customerName,
            leadCode: m.lead.leadCode,
            subtitle: `Executive: ${m.executive.name}. Notes: ${m.notes || 'None'}`,
          });
        }
      } catch (err) {
        console.error('Error parsing meeting datetime:', err);
      }
    }

    // 2. Fetch upcoming follow-ups
    const followups = await prisma.lead.findMany({
      where: {
        ...leadWhere,
        isActive: true,
        followupAt: {
          not: null,
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Today onwards / last 24h
        },
      },
      select: {
        id: true,
        customerName: true,
        leadCode: true,
        followupAt: true,
        statusSub: true,
      },
    });

    const formattedFollowups = followups.map((f) => ({
      id: `followup-${f.id}`,
      type: 'followup',
      title: 'Follow Up Scheduled 📞',
      datetime: new Date(f.followupAt!),
      leadId: f.id,
      customerName: f.customerName,
      leadCode: f.leadCode,
      subtitle: f.statusSub ? `Priority: ${f.statusSub.toUpperCase()}` : 'Priority: WARM',
    })).filter((f) => !isNaN(f.datetime.getTime()));

    // Combine and sort ascending chronologically (earliest/closest first)
    const allReminders = [...formattedMeetings, ...formattedFollowups];
    
    // Filter out reminders that are more than 2 hours in the past
    const cutOffTime = Date.now() - 2 * 60 * 60 * 1000;
    const activeReminders = allReminders.filter((r) => r.datetime.getTime() >= cutOffTime);

    activeReminders.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    return NextResponse.json({
      success: true,
      data: activeReminders,
    });
  } catch (error: any) {
    console.error('Fetch reminders error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
