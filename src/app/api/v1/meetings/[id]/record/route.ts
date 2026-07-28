import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasRecordPerm =
      userPermissions.includes('sales:record_meeting') ||
      userPermissions.includes('sales:meeting_done') ||
      ['admin', 'director'].includes(userPayload.role);

    if (!hasRecordPerm) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not possess the Record Meetings (sales:record_meeting) permission.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const meetingId = parseInt(id, 10);
    if (isNaN(meetingId)) {
      return NextResponse.json({ success: false, message: 'Invalid Meeting ID.' }, { status: 400 });
    }

    const meeting = await prisma.meetingBooking.findUnique({
      where: { id: meetingId },
      include: { lead: true }
    });

    if (!meeting) {
      return NextResponse.json({ success: false, message: 'Meeting not found.' }, { status: 404 });
    }

    if (meeting.isLocked) {
      return NextResponse.json(
        { success: false, message: 'This meeting record is locked. Previous meeting details cannot be modified.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { outcome, latitude, longitude, city, locality, pinCode, audioRecordingPath, notes } = body;

    // Outcome options: 'Sale Done' | 'Follow Up' | 'Not Interested'
    if (!outcome || !['Sale Done', 'Follow Up', 'Not Interested'].includes(outcome)) {
      return NextResponse.json(
        { success: false, message: 'Invalid outcome. Must be "Sale Done", "Follow Up", or "Not Interested".' },
        { status: 400 }
      );
    }

    const updatedMeeting = await prisma.meetingBooking.update({
      where: { id: meetingId },
      data: {
        outcome,
        meetingLatitude: latitude ? parseFloat(latitude) : meeting.meetingLatitude,
        meetingLongitude: longitude ? parseFloat(longitude) : meeting.meetingLongitude,
        meetingCity: city || meeting.meetingCity,
        meetingLocality: locality || meeting.meetingLocality,
        meetingPinCode: pinCode || meeting.meetingPinCode,
        audioRecordingPath: audioRecordingPath || meeting.audioRecordingPath,
        notes: notes || meeting.notes,
        isLocked: true, // Lock recorded meeting information
        meetingEndedAt: new Date()
      }
    });

    // Determine new lead status based on outcome
    let nextLeadStatus = 9; // Default Meeting Done
    if (outcome === 'Sale Done') {
      nextLeadStatus = 13; // Stage 13: Sale Done / Ready for Order Punching
    } else if (outcome === 'Follow Up') {
      nextLeadStatus = 3; // Follow-up
    } else if (outcome === 'Not Interested') {
      nextLeadStatus = 12; // Lost / Not Interested
    }

    await prisma.lead.update({
      where: { id: meeting.leadId },
      data: { status: nextLeadStatus }
    });

    // Record activity log
    await prisma.leadActivityLog.create({
      data: {
        leadId: meeting.leadId,
        userId: userPayload.id,
        fromStatus: meeting.lead.status,
        toStatus: nextLeadStatus,
        remark: `[MEETING RECORDED] Outcome: ${outcome}. GPS: ${city || 'Recorded'}. Audio: ${audioRecordingPath ? 'Saved' : 'N/A'}. Details locked.`
      }
    });

    // Audit log
    await recordAuditLog({
      userId: userPayload.id,
      tableName: 'MeetingBooking',
      recordId: meetingId,
      fieldName: 'outcome',
      oldValue: meeting.outcome || 'Pending',
      newValue: outcome,
      leadId: meeting.leadId,
      module: 'sales',
      action: `Recorded Meeting Outcome (${outcome}) & Locked Record`,
      req
    });

    return NextResponse.json({
      success: true,
      data: { meeting: updatedMeeting, leadStatus: nextLeadStatus },
      message: `Meeting successfully recorded with outcome "${outcome}" and details locked.`
    });
  } catch (error: any) {
    console.error('Record meeting error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
