import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';
import { put, del } from '@vercel/blob';

// Define allowed mime types and size limit (5MB)
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, message: 'Invalid Order ID.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Permission verification:
    // Order creators (users with orders:create but without verification/installation privileges)
    // can only upload documents to their own orders, and only when the order is still in draft state.
    const userPermissions = await getUserPermissions(userPayload.id);
    const isOrderCreator = userPermissions.includes('orders:create') && 
                           !userPermissions.includes('orders:verify') && 
                           !userPermissions.includes('orders:submit_installation');

    if (isOrderCreator && order.submittedById !== userPayload.id) {
      return NextResponse.json({ success: false, message: 'Forbidden. Not your order.' }, { status: 403 });
    }
    
    if (isOrderCreator && order.status !== 'draft') {
      return NextResponse.json({ success: false, message: 'Forbidden. Cannot upload to a submitted order.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const docType = formData.get('doc_type') as string;

    if (!file || !docType) {
      return NextResponse.json({ success: false, message: 'File and doc_type are required.' }, { status: 400 });
    }

    if (!['aadhaar', 'pan', 'electricity_bill', 'bank_passbook', 'downpayment_receipt'].includes(docType)) {
      return NextResponse.json({ success: false, message: 'Invalid document type.' }, { status: 400 });
    }

    // Server-side validation (Section 12.1)
    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `Invalid file type: ${file.type}. Only JPEG, PNG, and PDF are allowed.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    // Create /uploads directory in workspace if it doesn't exist
        // Upload to Vercel Blob
    const fileExt = file.name.split('.').pop() || 'dat';
    const blobPath = `orders/order_${orderId}_${docType}_${Date.now()}.${fileExt}`;
    
    const blob = await put(blobPath, file, {
      access: 'public',
    });

    const fileUrl = blob.url;

    // Save metadata to DB
    const orderDoc = await prisma.$transaction(async (tx) => {
      // Remove any existing document of the same type for this order
      const existingDoc = await tx.orderDocument.findFirst({
        where: { orderId, docType },
      });

            if (existingDoc) {
        // Cleanup old file from Vercel Blob
        try {
          if (existingDoc.filePath.startsWith('http')) {
            await del(existingDoc.filePath);
          }
        } catch (err) {
          console.error('Error removing old blob file:', err);
        }

        // Delete from database
        await tx.orderDocument.delete({
          where: { id: existingDoc.id },
        });
      }

      const newDoc = await tx.orderDocument.create({
        data: {
          orderId,
          docType,
          filePath: fileUrl, // relative reference
          fileName: file.name,
          fileSizeOctets: file.size,
          mimeType: file.type,
          uploadedById: userPayload.id,
        },
      });

      return newDoc;
    });

    return NextResponse.json({
      success: true,
      data: orderDoc,
      message: 'Document uploaded successfully',
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
