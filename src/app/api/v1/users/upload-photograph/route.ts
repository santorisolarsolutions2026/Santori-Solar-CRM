import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';

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

    // Create /uploads/photographs directory if it doesn't exist
    const photographsDir = path.join(process.cwd(), 'uploads', 'photographs');
    if (!fs.existsSync(photographsDir)) {
      fs.mkdirSync(photographsDir, { recursive: true });
    }

    // Generate unique local file name
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanFileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const localPath = path.join(photographsDir, cleanFileName);

    // Write file to filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(localPath, buffer);

    // Save relative reference
    const relativePath = `/uploads/photographs/${cleanFileName}`;

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
