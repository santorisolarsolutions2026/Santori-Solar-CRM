import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { uploadPrivateBlob } from '@/lib/blob';
import fs from 'node:fs';
import path from 'node:path';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const isAdmin =
      userPayload.role === 'admin' ||
      userPayload.role?.startsWith('admin:') ||
      userPayload.role === 'director';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Only administrators can upload broadcast photos.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No photo provided.' }, { status: 400 });
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Photo size exceeds the 5MB limit.' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'Only image files (JPEG, PNG, WebP, GIF) are allowed.' },
        { status: 400 }
      );
    }

    const fileExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `bc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    // Ensure uploads/broadcasts directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'broadcasts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localFilePath = path.join(uploadsDir, fileName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save locally
    fs.writeFileSync(localFilePath, buffer);

    // Also attempt upload to Vercel Blob if configured
    try {
      const blobPath = `broadcasts/${fileName}`;
      await uploadPrivateBlob(blobPath, file);
    } catch (blobErr) {
      // Local fallback is saved, log warning
      console.warn('Vercel Blob storage sync skipped/failed for broadcast image, local copy retained:', blobErr);
    }

    const publicUrl = `/api/v1/notifications/media/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      message: 'Photo uploaded successfully.',
    });
  } catch (error: any) {
    console.error('Broadcast photo upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload photo', error: error.message },
      { status: 500 }
    );
  }
}
