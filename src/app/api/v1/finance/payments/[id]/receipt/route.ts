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

    if (payment.receiptUrl.startsWith('http')) {
      try {
        const response = await fetch(payment.receiptUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch receipt from blob: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Length', arrayBuffer.byteLength.toString());
        headers.set('Cache-Control', 'private, max-age=3600');
        
        return new Response(arrayBuffer, {
          status: 200,
          headers,
        });
      } catch (err) {
        console.error('Proxy payment receipt error:', err);
        return NextResponse.redirect(payment.receiptUrl);
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
