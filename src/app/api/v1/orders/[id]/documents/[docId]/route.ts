import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id, docId } = await params;
    const orderId = parseInt(id, 10);
    const documentId = parseInt(docId, 10);

    if (isNaN(orderId) || isNaN(documentId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID parameters.' }, { status: 400 });
    }

    const doc = await prisma.orderDocument.findUnique({
      where: { id: documentId },
      include: {
        order: true,
      },
    });

    if (!doc || doc.orderId !== orderId) {
      return NextResponse.json({ success: false, message: 'Document not found.' }, { status: 404 });
    }

    // Role/Permission visibility check
    const userPermissions = await getUserPermissions(userPayload.id);
    const isOwner = doc.order.submittedById === userPayload.id;
    const hasViewAccess = userPermissions.includes('orders:view') || isOwner;

    if (!hasViewAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. No access to this document.' }, { status: 403 });
    }

    // Resolve file path
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const localFileName = path.basename(doc.filePath);
    const localPath = path.join(uploadsDir, localFileName);

    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ success: false, message: 'File not found on disk.' }, { status: 404 });
    }

    // Stream file contents
    const fileBuffer = await fs.promises.readFile(localPath);
    
    const headers = new Headers();
    headers.set('Content-Type', doc.mimeType);
    headers.set('Content-Disposition', `inline; filename="${doc.fileName}"`);
    headers.set('Content-Length', fileBuffer.length.toString());

    return new Response(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Download document error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id, docId } = await params;
    const orderId = parseInt(id, 10);
    const documentId = parseInt(docId, 10);

    if (isNaN(orderId) || isNaN(documentId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID parameters.' }, { status: 400 });
    }

    const doc = await prisma.orderDocument.findUnique({
      where: { id: documentId },
      include: {
        order: true,
      },
    });

    if (!doc || doc.orderId !== orderId) {
      return NextResponse.json({ success: false, message: 'Document not found.' }, { status: 404 });
    }

    // Permission visibility check for delete:
    // User must have orders:verify or orders:submit_installation or orders:view_all permission,
    // OR the submitting Consultant if the order is still in draft state.
    const userPermissions = await getUserPermissions(userPayload.id);
    const isOwner = doc.order.submittedById === userPayload.id;
    const canDelete = userPermissions.includes('orders:verify') || 
                      userPermissions.includes('orders:submit_installation') || 
                      userPermissions.includes('orders:view_all') ||
                      (isOwner && doc.order.status === 'draft');

    if (!canDelete) {
      return NextResponse.json({ success: false, message: 'Forbidden. No permission to delete this document.' }, { status: 403 });
    }

    // Delete local file
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const localFileName = path.basename(doc.filePath);
    const localPath = path.join(uploadsDir, localFileName);

    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (err) {
        console.error('Failed to delete physical file:', err);
      }
    }

    // Delete DB record
    await prisma.orderDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
