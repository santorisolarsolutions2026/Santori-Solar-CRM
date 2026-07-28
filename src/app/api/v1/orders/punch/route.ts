import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasPunchPerm =
      userPermissions.includes('sales:fill_order_form') ||
      userPermissions.includes('sales:order_punch') ||
      userPermissions.includes('orders:create') ||
      ['admin', 'director'].includes(userPayload.role);

    if (!hasPunchPerm) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. You do not possess the Fill Order Punching Form (sales:fill_order_form) permission.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      leadId,
      connectionNumber,
      systemSizeKw,
      totalValue,
      downPayment,
      paymentMethod,
      transactionRef,
      remainingMethod,
      financeProvider,
      clientType,
      subsidyApplicable,
      subsidyAmount,
      additionalNotes
    } = body;

    if (!leadId || !connectionNumber || !systemSizeKw || !totalValue || !downPayment || !paymentMethod || !remainingMethod || !clientType) {
      return NextResponse.json(
        { success: false, message: 'Missing required order fields.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: Number(leadId) }
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    const orderCode = `ORD-${Date.now().toString().slice(-6)}`;

    // Create or update order
    const order = await prisma.order.upsert({
      where: { leadId: Number(leadId) },
      update: {
        orderCode,
        connectionNumber: String(connectionNumber),
        systemSizeKw: parseFloat(systemSizeKw),
        totalValue: parseFloat(totalValue),
        downPayment: parseFloat(downPayment),
        paymentMethod: String(paymentMethod),
        transactionRef: transactionRef || null,
        remainingMethod: String(remainingMethod),
        financeProvider: financeProvider || null,
        clientType: String(clientType),
        subsidyApplicable: Boolean(subsidyApplicable),
        subsidyAmount: subsidyAmount ? parseFloat(subsidyAmount) : null,
        additionalNotes: additionalNotes || null,
        status: 'submitted',
        submittedById: userPayload.id,
      },
      create: {
        leadId: Number(leadId),
        orderCode,
        connectionNumber: String(connectionNumber),
        systemSizeKw: parseFloat(systemSizeKw),
        totalValue: parseFloat(totalValue),
        downPayment: parseFloat(downPayment),
        paymentMethod: String(paymentMethod),
        transactionRef: transactionRef || null,
        remainingMethod: String(remainingMethod),
        financeProvider: financeProvider || null,
        clientType: String(clientType),
        subsidyApplicable: Boolean(subsidyApplicable),
        subsidyAmount: subsidyAmount ? parseFloat(subsidyAmount) : null,
        additionalNotes: additionalNotes || null,
        status: 'submitted',
        submittedById: userPayload.id,
      }
    });

    // Update lead status to 14 (Order Submitted to Finance)
    await prisma.lead.update({
      where: { id: Number(leadId) },
      data: { status: 14 }
    });

    // Create initial payment record if downPayment > 0
    if (parseFloat(downPayment) > 0) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: parseFloat(downPayment),
          paymentMethod: String(paymentMethod),
          transactionRef: transactionRef || null,
          remarks: 'Initial Down Payment upon Order Punching',
          recordedById: userPayload.id
        }
      });
    }

    // Lead activity log
    await prisma.leadActivityLog.create({
      data: {
        leadId: Number(leadId),
        userId: userPayload.id,
        fromStatus: lead.status,
        toStatus: 14,
        remark: `[ORDER PUNCHED] System: ${systemSizeKw}kW, Value: ₹${totalValue}, Down Payment: ₹${downPayment}. Order code: ${orderCode}. Submitted to Finance.`
      }
    });

    // Audit log
    await recordAuditLog({
      userId: userPayload.id,
      tableName: 'Order',
      recordId: order.id,
      fieldName: 'status',
      oldValue: 'draft',
      newValue: 'submitted',
      leadId: Number(leadId),
      module: 'sales',
      action: `Punched Order Form (${orderCode}) and submitted to Finance`,
      req
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: `Order ${orderCode} punched successfully and submitted to Finance.`
    });
  } catch (error: any) {
    console.error('Order punch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
