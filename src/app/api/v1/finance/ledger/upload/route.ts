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
    if (!userPermissions.includes('orders:finance_access') && !userPermissions.includes('orders:verify')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to upload receipts.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Receipt file is required.' }, { status: 400 });
    }

    // Validate type: images and PDFs allowed
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Only JPEG, PNG, WEBP images or PDF files are allowed.' }, { status: 400 });
    }

    // Validate size: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File size exceeds 5MB limit.' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const fileExt = file.name.split('.').pop() || 'dat';
    const blobPath = `receipts/receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    
    const blob = await put(blobPath, file, {
      access: 'public',
    });

    return NextResponse.json({
      success: true,
      filePath: blob.url,
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
