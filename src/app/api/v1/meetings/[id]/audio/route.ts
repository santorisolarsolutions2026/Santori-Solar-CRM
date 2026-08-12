import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';

// Helper to parse recording list
function parseRecordingsList(
  rawPath: string | null,
  totalDuration?: number | null,
  startedAt?: Date | null
): Array<{ index: number; path: string; durationSec?: number | null; createdAt?: string }> {
  if (!rawPath) return [];
  try {
    const parsed = JSON.parse(rawPath);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx: number) => ({
        index: idx,
        path: typeof item === 'string' ? item : item.path,
        durationSec: typeof item === 'object' ? item.durationSec : null,
        createdAt: typeof item === 'object' ? item.createdAt : null,
      }));
    }
    if (typeof parsed === 'string') {
      return [{ index: 0, path: parsed, durationSec: totalDuration, createdAt: startedAt?.toISOString() }];
    }
  } catch {
    // Plain string
  }
  return [{ index: 0, path: rawPath, durationSec: totalDuration, createdAt: startedAt?.toISOString() }];
}

export async function GET(
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

    const url = new URL(req.url);
    const recordings = parseRecordingsList(meeting.audioRecordingPath, meeting.meetingDurationSec, meeting.meetingStartedAt);

    // If client asks for JSON list of recordings
    if (url.searchParams.get('list') === 'true') {
      return NextResponse.json({
        success: true,
        recordings,
      });
    }

    if (recordings.length === 0) {
      return NextResponse.json({ success: false, message: 'No audio recording found for this meeting.' }, { status: 404 });
    }

    // Determine which recording to stream (default to index 0 or requested index)
    let selectedRecording = recordings[0];
    const indexParam = url.searchParams.get('index');
    if (indexParam !== null) {
      const idx = parseInt(indexParam, 10);
      if (!isNaN(idx) && idx >= 0 && idx < recordings.length) {
        selectedRecording = recordings[idx];
      }
    }

    const audioPath = selectedRecording.path;
    let fileBuffer: Uint8Array;
    let contentType = 'audio/webm';

    if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
      const response = await fetch(audioPath);
      if (!response.ok) {
        return NextResponse.json({ success: false, message: 'Audio recording file not found in blob storage.' }, { status: 404 });
      }
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      // Determine content type from headers or URL
      const contentTypeHeader = response.headers.get('content-type');
      if (contentTypeHeader) {
        contentType = contentTypeHeader;
      } else {
        const ext = path.extname(audioPath).toLowerCase();
        if (ext === '.wav') contentType = 'audio/wav';
        if (ext === '.ogg') contentType = 'audio/ogg';
        if (ext === '.mp3') contentType = 'audio/mpeg';
        if (ext === '.m4a') contentType = 'audio/mp4';
      }
    } else {
      // Resolve local path
      const localPath = path.join(/*turbopackIgnore: true*/ process.cwd(), audioPath);

      if (!fs.existsSync(localPath)) {
        return NextResponse.json({ success: false, message: 'Audio recording file not found on disk.' }, { status: 404 });
      }

      fileBuffer = await fs.promises.readFile(localPath);
      
      // Determine content type based on extension
      const ext = path.extname(localPath).toLowerCase();
      if (ext === '.wav') contentType = 'audio/wav';
      if (ext === '.ogg') contentType = 'audio/ogg';
      if (ext === '.mp3') contentType = 'audio/mpeg';
      if (ext === '.m4a') contentType = 'audio/mp4';
    }

    // Check if direct download requested
    const downloadParam = url.searchParams.get('download');
    if (downloadParam === 'true') {
      const fileName = `meeting-${meetingId}-recording-${selectedRecording.index + 1}.webm`;
      return new Response(fileBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    const rangeHeader = req.headers.get('range');
    const fileSize = fileBuffer.length;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response('', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunksize = (end - start) + 1;
      const slicedBuffer = fileBuffer.subarray(start, end + 1);

      return new Response(slicedBuffer as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
        },
      });
    }

    return new Response(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error: any) {
    console.error('Audio streaming error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

async function deleteSingleFile(filePath: string) {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      const { del } = await import('@vercel/blob');
      await del(filePath);
    } catch (delErr) {
      console.warn('Blob delete warning:', delErr);
    }
  } else {
    const localPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (delErr) {
        console.warn('Local file delete warning:', delErr);
      }
    }
  }
}

export async function DELETE(
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

    // Check if meeting is already ended/completed
    if (meeting.meetingEndedAt) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete audio recording after meeting is already completed.'
      }, { status: 400 });
    }

    const { getUserSession } = await import('@/lib/auth');
    const { role: userRole, permissions: userPermissions, department } = await getUserSession(userPayload.id);
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;
    const canRecordMeeting = userPermissions.includes('sales:meeting_done') || userPermissions.includes('leads:meeting_done') || ['admin', 'director'].includes(baseRole) || department?.name === 'IT';

    if (!canRecordMeeting) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to manage meeting audio.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const indexParam = url.searchParams.get('index');
    const recordings = parseRecordingsList(meeting.audioRecordingPath, meeting.meetingDurationSec, meeting.meetingStartedAt);

    if (indexParam !== null && indexParam !== '') {
      // Individual recording deletion
      const targetIndex = parseInt(indexParam, 10);
      if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= recordings.length) {
        return NextResponse.json({ success: false, message: 'Invalid recording index.' }, { status: 400 });
      }

      const itemToDelete = recordings[targetIndex];
      await deleteSingleFile(itemToDelete.path);

      // Remove from list
      recordings.splice(targetIndex, 1);

      if (recordings.length === 0) {
        const updated = await prisma.meetingBooking.update({
          where: { id: meetingId },
          data: {
            audioRecordingPath: null,
            meetingDurationSec: null,
          },
        });
        return NextResponse.json({
          success: true,
          message: 'Recording deleted successfully.',
          data: updated,
        });
      } else {
        const totalDuration = recordings.reduce((sum, item) => sum + (item.durationSec || 0), 0);
        const updated = await prisma.meetingBooking.update({
          where: { id: meetingId },
          data: {
            audioRecordingPath: JSON.stringify(recordings.map(r => ({ path: r.path, durationSec: r.durationSec, createdAt: r.createdAt }))),
            meetingDurationSec: totalDuration > 0 ? totalDuration : null,
          },
        });
        return NextResponse.json({
          success: true,
          message: 'Recording deleted successfully.',
          data: updated,
        });
      }
    }

    // Bulk Delete: Delete ALL recordings
    for (const rec of recordings) {
      await deleteSingleFile(rec.path);
    }

    // Clear audioRecordingPath and meetingDurationSec from database
    const updated = await prisma.meetingBooking.update({
      where: { id: meetingId },
      data: {
        audioRecordingPath: null,
        meetingDurationSec: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All audio recordings deleted successfully.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Delete audio error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
