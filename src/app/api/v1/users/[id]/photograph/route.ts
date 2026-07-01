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
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'Invalid User ID.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { photograph: true },
    });

    if (!user || !user.photograph) {
      return NextResponse.json({ success: false, message: 'Photograph not found.' }, { status: 404 });
    }

    if (user.photograph.startsWith('http')) {
      return NextResponse.redirect(user.photograph);
    }

    // Resolve local path
    const localPath = path.join(/*turbopackIgnore: true*/ process.cwd(), user.photograph);

    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ success: false, message: 'Photograph file not found on disk.' }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(localPath);

    // Determine Content-Type based on extension
    const ext = path.extname(localPath).toLowerCase();
    let contentType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    if (ext === '.webp') contentType = 'image/webp';
    if (ext === '.gif') contentType = 'image/gif';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Cache-Control', 'private, max-age=3600');

    return new Response(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Photograph download error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
