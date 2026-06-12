import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';

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

    if (!meeting.audioRecordingPath) {
      return NextResponse.json({ success: false, message: 'No audio recording found for this meeting.' }, { status: 404 });
    }

    // Resolve local path
    const localPath = path.join(/*turbopackIgnore: true*/ process.cwd(), meeting.audioRecordingPath);

    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ success: false, message: 'Audio recording file not found on disk.' }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(localPath);
    
    // Determine content type based on extension
    const ext = path.extname(localPath).toLowerCase();
    let contentType = 'audio/webm';
    if (ext === '.wav') contentType = 'audio/wav';
    if (ext === '.ogg') contentType = 'audio/ogg';
    if (ext === '.mp3') contentType = 'audio/mpeg';
    if (ext === '.m4a') contentType = 'audio/mp4';

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

      return new Response(slicedBuffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
        },
      });
    }

    return new Response(fileBuffer, {
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
