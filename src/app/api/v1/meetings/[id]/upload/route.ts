import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';

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

    // Create /uploads/meetings directory if it doesn't exist
    const meetingsDir = path.join(process.cwd(), 'uploads', 'meetings');
    if (!fs.existsSync(meetingsDir)) {
      fs.mkdirSync(meetingsDir, { recursive: true });
    }

    // Generate unique local file name
    const fileExt = file.name.split('.').pop() || 'webm';
    const cleanFileName = `meeting_${meetingId}_${Date.now()}.${fileExt}`;
    const localPath = path.join(meetingsDir, cleanFileName);

    // Write file to filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(localPath, buffer);

    // Save relative reference to DB
    const relativePath = `/uploads/meetings/${cleanFileName}`;

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
