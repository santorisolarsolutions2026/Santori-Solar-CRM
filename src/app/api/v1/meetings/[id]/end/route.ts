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
    const { remark } = body;

    const meeting = await prisma.meetingBooking.findUnique({
      where: { id: meetingId },
      include: { lead: true }
    });

    if (!meeting) {
      return NextResponse.json({ success: false, message: 'Meeting not found.' }, { status: 404 });
    }

    const startedAt = meeting.meetingStartedAt || meeting.createdAt;
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - startedAt.getTime();
    const calculatedDurationSec = Math.max(0, Math.floor(durationMs / 1000));

    // Update meeting details and advance lead status to 9 (Meeting Done) inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch inside the transaction to avoid race conditions with concurrent audio upload
      const currentMeeting = await tx.meetingBooking.findUnique({
        where: { id: meetingId },
      });

      const meetingDurationSec =
        currentMeeting?.meetingDurationSec !== null && currentMeeting?.meetingDurationSec !== undefined
          ? currentMeeting.meetingDurationSec
          : calculatedDurationSec;

      const updatedMeeting = await tx.meetingBooking.update({
        where: { id: meetingId },
        data: {
          meetingEndedAt: endedAt,
          meetingDurationSec,
        },
      });

      // Update lead stage to Stage 9 (Meeting Done)
      const updatedLead = await tx.lead.update({
        where: { id: meeting.leadId },
        data: {
          status: 9,
        },
      });

      // Create activity log
      await tx.leadActivityLog.create({
        data: {
          leadId: meeting.leadId,
          userId: userPayload.id,
          fromStatus: meeting.lead.status,
          toStatus: 9,
          remark: remark || `Meeting completed. Duration: ${Math.floor(meetingDurationSec / 60)}m ${meetingDurationSec % 60}s.`,
        },
      });

      // Create a notification for manager / supervisor about meeting completion
      if (meeting.lead.assignedManagerId) {
        await tx.notification.create({
          data: {
            userId: meeting.lead.assignedManagerId,
            type: 'meeting_done',
            title: `Meeting Done: ${meeting.lead.customerName}`,
            body: `Consultant ${userPayload.name} finished the site meeting. Duration: ${Math.floor(meetingDurationSec / 60)}m ${meetingDurationSec % 60}s.`,
            leadId: meeting.leadId,
          },
        });
      }

      return { updatedMeeting, updatedLead };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Meeting ended and lead moved to Stage 9 (Meeting Done).',
    });
  } catch (error: any) {
    console.error('End meeting error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
