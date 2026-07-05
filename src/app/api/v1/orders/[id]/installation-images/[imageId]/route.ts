import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { del } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';

// GET: Stream the installation image contents
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:view') && !userPermissions.includes('orders:operations')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view orders.' }, { status: 403 });
    }

    const { id, imageId } = await params;
    const orderId = parseInt(id, 10);
    const imgId = parseInt(imageId, 10);
    if (isNaN(orderId) || isNaN(imgId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID parameters.' }, { status: 400 });
    }

    const image = await prisma.installationImage.findUnique({
      where: { id: imgId },
    });

    if (!image || image.orderId !== orderId) {
      return NextResponse.json({ success: false, message: 'Image not found.' }, { status: 404 });
    }

    if (image.filePath.startsWith('http')) {
      return NextResponse.redirect(image.filePath);
    }

    // Resolve local path
    const localPath = path.join(/*turbopackIgnore: true*/ process.cwd(), image.filePath);

    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ success: false, message: 'Image file not found on disk.' }, { status: 404 });
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
    headers.set('Cache-Control', 'private, max-age=86400'); // Cache for 1 day since these are static uploads

    return new Response(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Download installation image error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

// DELETE: Delete an installation image
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
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

    const { id, imageId } = await params;
    const orderId = parseInt(id, 10);
    const imgId = parseInt(imageId, 10);
    if (isNaN(orderId) || isNaN(imgId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID parameters.' }, { status: 400 });
    }

    const image = await prisma.installationImage.findUnique({
      where: { id: imgId },
    });

    if (!image || image.orderId !== orderId) {
      return NextResponse.json({ success: false, message: 'Image not found.' }, { status: 404 });
    }

    // Delete database record and sync lead status
    await prisma.$transaction(async (tx) => {
      await tx.installationImage.delete({
        where: { id: imgId },
      });

      if (image.status === 'completed') {
      }
    });

    // Delete file from Vercel Blob or disk
    if (image.filePath.startsWith('http')) {
      try {
        await del(image.filePath);
      } catch (err) {
        console.error('Failed to delete file from Vercel Blob:', err);
      }
    } else {
      const localPath = path.join(/*turbopackIgnore: true*/ process.cwd(), image.filePath);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch (err) {
          console.error('Failed to delete file from disk:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Installation photograph deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete installation image error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
