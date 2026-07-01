import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { put } from '@vercel/blob';

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

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:view')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view orders.' }, { status: 403 });
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

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:submit_installation')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to submit installations.' }, { status: 403 });
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
    if (existingCount >= 20) {
      return NextResponse.json({
        success: false,
        message: 'Maximum limit of 20 installation files has been reached.',
      }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const status = formData.get('status') as string;

    if (!file) {
      return NextResponse.json({ success: false, message: 'File is required.' }, { status: 400 });
    }
    if (!status || !['in_progress', 'completed', 'delivered_items', 'installation_done', 'meter_sealing_paper', 'plant_commissioned'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Status must be in_progress, completed, delivered_items, installation_done, meter_sealing_paper, or plant_commissioned.' }, { status: 400 });
    }

    // Ensure it is an image or video
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return NextResponse.json({ success: false, message: 'Only image and video files are allowed.' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const fileExt = file.name.split('.').pop() || 'png';
    const blobPath = `installations/install_${orderId}_${status}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    
    const blob = await put(blobPath, file, {
      access: 'public',
    });

    const relativePath = blob.url;

    // Create DB record
    const newImage = await prisma.$transaction(async (tx) => {
      const img = await tx.installationImage.create({
        data: {
          orderId,
          status,
          filePath: relativePath,
          fileName: file.name,
        },
      });

      return img;
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
