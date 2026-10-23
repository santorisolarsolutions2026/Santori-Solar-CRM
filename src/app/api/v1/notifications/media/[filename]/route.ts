import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { filename } = await params;
    const safeFileName = path.basename(filename);
    const uploadsDir = path.join(process.cwd(), 'uploads', 'broadcasts');
    const localPath = path.join(uploadsDir, safeFileName);

    const ext = path.extname(safeFileName).toLowerCase().replace('.', '');
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // 1. Check local file on disk
    if (fs.existsSync(localPath)) {
      const fileBuffer = fs.readFileSync(localPath);
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 2. Fallback to Vercel Blob store
    try {
      const { fetchBlobContent } = await import('@/lib/blob');
      const blobPath = `broadcasts/${safeFileName}`;
      const content = await fetchBlobContent(blobPath);
      const headers = new Headers();
      headers.set('Content-Type', content.contentType || contentType);
      if (content.contentLength) {
        headers.set('Content-Length', content.contentLength);
      }
      headers.set('Cache-Control', 'public, max-age=86400');
      return new Response((content.stream || content.buffer) as any, {
        status: 200,
        headers,
      });
    } catch {
      // Image not found in either storage
    }

    return NextResponse.json({ success: false, message: 'Broadcast media file not found.' }, { status: 404 });
  } catch (err: any) {
    console.error('Error serving broadcast media:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
