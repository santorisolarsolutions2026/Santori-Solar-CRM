import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Photograph file is required.' }, { status: 400 });
    }

    // Validate MIME type to ensure it's an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, message: 'Only image files are allowed.' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const fileExt = file.name.split('.').pop() || 'png';
    const blobPath = `photographs/avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    
    const blob = await put(blobPath, file, {
      access: 'public',
    });

    const relativePath = blob.url;

    return NextResponse.json({
      success: true,
      filePath: relativePath,
      message: 'Photograph uploaded successfully.',
    });
  } catch (error: any) {
    console.error('Photograph upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
