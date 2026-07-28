import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { put } from '@vercel/blob';

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

    const meeting = await prisma.meetingBooking.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json({ success: false, message: 'Meeting not found.' }, { status: 404 });
    }

    const { getUserSession } = await import('@/lib/auth');
    const { role: userRole, permissions: userPermissions, department } = await getUserSession(userPayload.id);
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;
    const canRecordMeeting = userPermissions.includes('sales:meeting_done') || userPermissions.includes('leads:meeting_done') || ['admin', 'director'].includes(baseRole) || department?.name === 'IT';

    if (!canRecordMeeting) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to record meetings or upload meeting audio.' }, { status: 403 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: meeting.leadId } });
    const hasAssignedSalesMember = !!(lead?.assignedConsultantId || lead?.assignedTlId || lead?.assignedManagerId);

    if (!hasAssignedSalesMember) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden. A sales team member must be assigned to this lead before audio recording can be uploaded.'
      }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const durationStr = formData.get('duration') as string | null;
    let durationSec = durationStr ? parseInt(durationStr, 10) : null;
    if (durationSec !== null && (isNaN(durationSec) || durationSec < 0)) {
      durationSec = null;
    }

    if (!file) {
      return NextResponse.json({ success: false, message: 'Audio recording file is required.' }, { status: 400 });
    }
        // Upload to Vercel Blob
    const fileExt = file.name.split('.').pop() || 'webm';
    const blobPath = `meetings/meeting_${meetingId}_${Date.now()}.${fileExt}`;
    
    const blob = await put(blobPath, file, {
      access: 'public',
    });

    const relativePath = blob.url;

    // Update meeting record
    const updatedMeeting = await prisma.meetingBooking.update({
      where: { id: meetingId },
      data: {
        audioRecordingPath: relativePath,
        ...(durationSec !== null && { meetingDurationSec: durationSec }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedMeeting,
      message: 'Audio recording uploaded successfully.',
    });
  } catch (error: any) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
