import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { put } from '@vercel/blob';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:verify')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to upload receipts.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'File is required.' }, { status: 400 });
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `Invalid file type: ${file.type}. Only JPEG, PNG, WEBP, and PDF are allowed.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const fileExt = file.name.split('.').pop() || 'dat';
    const blobPath = `receipts/receipt_${Date.now()}.${fileExt}`;
    
    const blob = await put(blobPath, file, {
      access: 'public',
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      message: 'Receipt uploaded successfully',
    });
  } catch (error: any) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
