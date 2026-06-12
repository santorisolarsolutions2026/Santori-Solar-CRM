import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';

// GET: List installation images metadata for a specific order
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'director', 'sales_head', 'finance', 'operations', 'consultant'];
    if (!allowedRoles.includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, message: 'Invalid Order ID.' }, { status: 400 });
    }

    const images = await prisma.installationImage.findMany({
      where: { orderId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        status: true,
        fileName: true,
        uploadedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: images,
    });
  } catch (error: any) {
    console.error('Fetch installation images error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

// POST: Upload an installation image
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'director', 'sales_head', 'operations'];
    if (!allowedRoles.includes(userPayload.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, message: 'Invalid Order ID.' }, { status: 400 });
    }

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Enforce 7 image maximum limit
    const existingCount = await prisma.installationImage.count({
      where: { orderId },
    });
    if (existingCount >= 7) {
      return NextResponse.json({
        success: false,
        message: 'Maximum limit of 7 installation images has been reached.',
      }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const status = formData.get('status') as string; // in_progress | completed

    if (!file) {
      return NextResponse.json({ success: false, message: 'Image file is required.' }, { status: 400 });
    }
    if (!status || !['in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Status must be in_progress or completed.' }, { status: 400 });
    }

    // Ensure it is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, message: 'Only image files are allowed.' }, { status: 400 });
    }

    // Setup folder
    const installationsDir = path.join(process.cwd(), 'uploads', 'installations');
    if (!fs.existsSync(installationsDir)) {
      fs.mkdirSync(installationsDir, { recursive: true });
    }

    // Generate unique local file name
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanFileName = `install_${orderId}_${status}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const localPath = path.join(installationsDir, cleanFileName);

    // Save file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(localPath, buffer);

    // Relative save path
    const relativePath = `uploads/installations/${cleanFileName}`;

    // Create DB record
    const newImage = await prisma.installationImage.create({
      data: {
        orderId,
        status,
        filePath: relativePath,
        fileName: file.name,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newImage.id,
        status: newImage.status,
        fileName: newImage.fileName,
        uploadedAt: newImage.uploadedAt,
      },
      message: 'Installation photograph uploaded successfully.',
    });
  } catch (error: any) {
    console.error('Upload installation image error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
