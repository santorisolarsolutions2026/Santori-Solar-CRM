import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
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

    // Role visibility check: Admin, Director, Sales Head, Finance, Operations, or the Consultant who submitted the order
    const allowedRoles = ['admin', 'director', 'sales_head', 'finance', 'operations'];
    const isOwner = doc.order.submittedById === userPayload.id;

    if (!allowedRoles.includes(userPayload.role) && !isOwner) {
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
