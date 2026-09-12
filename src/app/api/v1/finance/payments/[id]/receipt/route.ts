import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserSession } from '@/lib/auth';

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
    const paymentId = parseInt(id, 10);
    if (isNaN(paymentId)) {
      return NextResponse.json({ success: false, message: 'Invalid Payment ID.' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ success: false, message: 'Payment record not found.' }, { status: 404 });
    }

    // Role/Permission visibility check
    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    const baseRole = userRole.includes(':') ? userRole.split(':')[0] : userRole;
    const hasAccess = userPermissions.includes('orders:finance_access') || 
                      userPermissions.includes('orders:view') || 
                      ['admin', 'director'].includes(baseRole);

    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Forbidden. No access to this payment receipt.' }, { status: 403 });
    }

    if (!payment.receiptUrl) {
      return NextResponse.json({ success: false, message: 'Receipt not found for this payment.' }, { status: 404 });
    }

    if (payment.receiptUrl.startsWith('http') || payment.receiptUrl.includes('blob.vercel-storage.com')) {
      try {
        const { fetchBlobContent } = await import('@/lib/blob');
        const content = await fetchBlobContent(payment.receiptUrl);
        
        const headers = new Headers();
        headers.set('Content-Type', content.contentType || 'image/png');
        if (content.contentLength) {
          headers.set('Content-Length', content.contentLength);
        }
        headers.set('Cache-Control', 'private, max-age=3600');
        
        return new Response((content.stream || content.buffer) as any, {
          status: 200,
          headers,
        });
      } catch (err) {
        console.error('Proxy payment receipt error:', err);
        if (payment.receiptUrl.startsWith('http')) {
          return NextResponse.redirect(payment.receiptUrl);
        }
        return NextResponse.json({ success: false, message: 'Receipt could not be retrieved from storage.' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: false, message: 'Invalid receipt file path.' }, { status: 400 });
  } catch (error: any) {
    console.error('Get payment receipt error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
