import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { put } from '@vercel/blob';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    // Fetch all documents for this lead (including inactive versions for history)
    const documents = await prisma.leadDocument.findMany({
      where: { leadId },
      include: {
        uploader: { select: { id: true, name: true } },
      },
      orderBy: [
        { docType: 'asc' },
        { version: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    console.error('Fetch lead documents error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

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
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const docType = formData.get('doc_type') as string;

    if (!file || !docType) {
      return NextResponse.json({ success: false, message: 'File and doc_type are required.' }, { status: 400 });
    }

    const validDocTypes = [
      'quotation', 'site_photo', 'agreement', 'kyc', 'payment_receipt', 
      'order_punching_form', 'installation', 'commissioning', 'subsidy'
    ];
    if (!validDocTypes.includes(docType)) {
      return NextResponse.json({ success: false, message: 'Invalid document type.' }, { status: 400 });
    }

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

    // Determine the next version number
    const latestDoc = await prisma.leadDocument.findFirst({
      where: { leadId, docType },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = latestDoc ? latestDoc.version + 1 : 1;

    // Upload to Vercel Blob
    const fileExt = file.name.split('.').pop() || 'dat';
    const blobPath = `leads/lead_${leadId}_${docType}_v${nextVersion}_${Date.now()}.${fileExt}`;
    const blob = await put(blobPath, file, {
      access: 'public',
    });

    // Mark previous active documents of same type as inactive
    await prisma.leadDocument.updateMany({
      where: { leadId, docType, isActive: true },
      data: { isActive: false },
    });

    // Create the new document version
    const newDoc = await prisma.leadDocument.create({
      data: {
        leadId,
        docType,
        filePath: blob.url,
        fileName: file.name,
        fileSize: file.size,
        version: nextVersion,
        uploadedById: userPayload.id,
        isActive: true,
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    // Write to audit log
    await prisma.auditLog.create({
      data: {
        leadId,
        tableName: 'LeadDocument',
        recordId: newDoc.id,
        fieldName: 'version',
        oldValue: nextVersion > 1 ? `Version ${nextVersion - 1}` : 'None',
        newValue: `Version ${nextVersion}`,
        userId: userPayload.id,
      },
    });

    // Write to LeadActivityLog
    await prisma.leadActivityLog.create({
      data: {
        leadId,
        userId: userPayload.id,
        toStatus: lead.status,
        remark: `[DOCUMENT UPLOAD] New version (v${nextVersion}) of "${docType}" uploaded: "${file.name}".`,
      },
    });

    // If docType is 'order_punching_form' or other order-related ones, check if we need to auto-complete task
    if (docType === 'quotation') {
      const task = await prisma.leadTask.findFirst({
        where: { leadId, taskName: 'Quotation Uploaded' }
      });
      if (task) {
        await prisma.leadTask.update({
          where: { id: task.id },
          data: { isCompleted: true, completedById: userPayload.id, completedAt: new Date() }
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: newDoc,
      message: `Document uploaded successfully as Version ${nextVersion}.`,
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
