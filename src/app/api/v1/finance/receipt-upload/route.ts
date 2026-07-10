import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:verify')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not have permission to upload receipts.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Receipt file is required.' }, { status: 400 });
    }

    // Validate MIME type to ensure it's an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, message: 'Only image files are allowed.' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const fileExt = file.name.split('.').pop() || 'png';
    const blobPath = `receipts/receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const blob = await put(blobPath, file, {
      access: 'public',
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      message: 'Receipt uploaded successfully.',
    });
  } catch (error: any) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
