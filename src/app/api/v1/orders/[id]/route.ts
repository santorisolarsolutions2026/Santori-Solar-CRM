import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

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
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, message: 'Invalid Order ID.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lead: {
          select: {
            customerName: true,
            mobile: true,
            city: true,
            state: true,
            address: true,
            pinCode: true,
            leadCode: true,
          },
        },
        submittedBy: { select: { name: true } },
        financeProcessedBy: { select: { name: true } },
        documents: {
          select: {
            id: true,
            docType: true,
            fileName: true,
            fileSizeOctets: true,
            mimeType: true,
            uploadedAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Check permission to view orders
    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('orders:view') && !userPermissions.includes('orders:operations')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to view orders.' }, { status: 403 });
    }

    const hasViewAll = userPermissions.includes('orders:view_all');
    if (!hasViewAll && order.submittedById !== userPayload.id) {
      // Check supervisor status
      const lead = await prisma.lead.findUnique({
        where: { id: order.leadId },
        select: { assignedTlId: true, assignedManagerId: true }
      });
      const isLeadSupervisor = lead && (lead.assignedTlId === userPayload.id || lead.assignedManagerId === userPayload.id);
      if (!isLeadSupervisor) {
        return NextResponse.json({ success: false, message: 'Forbidden. You do not have access to this order.' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const canCreateOrders = userPermissions.includes('orders:create');
    const canVerify = userPermissions.includes('orders:verify');
    const canInstall = userPermissions.includes('orders:submit_installation');
    const hasViewAll = userPermissions.includes('orders:view_all');

    const body = await req.json();
    const {
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
      additionalNotes,
      status, // Ops / Admin can update installation statuses
      opsStage,
      deliveryDate,
      deliveryTime,
      isDelivered,
      installationDate,
      installationTime,
      isInstalled,
      actualDeliveryAt,
      actualInstallationAt,
      isMeterInstalled,
      actualMeterInstalledAt,
      isCommissioned,
      actualCommissionedAt,
      isSubsidyApplied,
      actualSubsidyAppliedAt,
    } = body;

    // Check what is being updated
    const isPunchingUpdate = [
      connectionNumber, systemSizeKw, totalValue, downPayment, paymentMethod,
      transactionRef, remainingMethod, financeProvider, clientType
    ].some(v => v !== undefined);

    const isStatusUpdate = status !== undefined || opsStage !== undefined || deliveryDate !== undefined || deliveryTime !== undefined || isDelivered !== undefined || installationDate !== undefined || installationTime !== undefined || isInstalled !== undefined || actualDeliveryAt !== undefined || actualInstallationAt !== undefined || isMeterInstalled !== undefined || actualMeterInstalledAt !== undefined || isCommissioned !== undefined || actualCommissionedAt !== undefined || isSubsidyApplied !== undefined || actualSubsidyAppliedAt !== undefined;

    // 1. Check permissions for updating punching fields
    if (isPunchingUpdate && !canCreateOrders) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to edit sales punching details.' }, { status: 403 });
    }

    if (isPunchingUpdate && order.status !== 'draft') {
      return NextResponse.json({ success: false, message: 'Forbidden. Punching fields are locked because the order has already been submitted to Finance.' }, { status: 403 });
    }


    // 2. Check permissions for status updates
    if (isStatusUpdate && !canVerify && !canInstall) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to change order status.' }, { status: 403 });
    }

    // 3. Scope validation:
    // Non-view-all users must own the order or be the lead's TL/Manager,
    // EXCEPT when a Finance/Operations user with correct permissions is updating the status/notes of a non-draft order.
    const isFinanceOrOpsUpdate = (canVerify || canInstall) && order.status !== 'draft' && !isPunchingUpdate;

    if (!hasViewAll && !isFinanceOrOpsUpdate && order.submittedById !== userPayload.id) {
      const lead = await prisma.lead.findUnique({
        where: { id: order.leadId },
        select: { assignedTlId: true, assignedManagerId: true }
      });
      const isLeadSupervisor = lead && (lead.assignedTlId === userPayload.id || lead.assignedManagerId === userPayload.id);
      if (!isLeadSupervisor) {
        return NextResponse.json({ success: false, message: 'Forbidden. You do not have access to edit this order.' }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (connectionNumber !== undefined) updateData.connectionNumber = connectionNumber;
    if (systemSizeKw !== undefined) updateData.systemSizeKw = parseFloat(systemSizeKw);
    if (totalValue !== undefined) updateData.totalValue = parseFloat(totalValue);
    if (downPayment !== undefined) updateData.downPayment = parseFloat(downPayment);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (transactionRef !== undefined) updateData.transactionRef = transactionRef;
    if (remainingMethod !== undefined) updateData.remainingMethod = remainingMethod;
    if (financeProvider !== undefined) updateData.financeProvider = financeProvider;
    if (clientType !== undefined) updateData.clientType = clientType;
    if (subsidyApplicable !== undefined) updateData.subsidyApplicable = !!subsidyApplicable;
    if (subsidyAmount !== undefined) updateData.subsidyAmount = subsidyAmount ? parseFloat(subsidyAmount) : null;
    if (additionalNotes !== undefined) updateData.additionalNotes = additionalNotes;
    if (status !== undefined) updateData.status = status;
    if (opsStage !== undefined) updateData.opsStage = parseInt(opsStage, 10);
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate;
    if (deliveryTime !== undefined) updateData.deliveryTime = deliveryTime;
    if (isDelivered !== undefined) {
      updateData.isDelivered = !!isDelivered;
      if (!!isDelivered) {
        updateData.actualDeliveryAt = actualDeliveryAt ? new Date(actualDeliveryAt) : new Date();
      } else {
        updateData.actualDeliveryAt = null;
      }
    } else if (actualDeliveryAt !== undefined) {
      updateData.actualDeliveryAt = actualDeliveryAt ? new Date(actualDeliveryAt) : null;
    }

    if (installationDate !== undefined) updateData.installationDate = installationDate;
    if (installationTime !== undefined) updateData.installationTime = installationTime;
    if (isInstalled !== undefined) {
      updateData.isInstalled = !!isInstalled;
      if (!!isInstalled) {
        updateData.actualInstallationAt = actualInstallationAt ? new Date(actualInstallationAt) : new Date();
      } else {
        updateData.actualInstallationAt = null;
      }
    } else if (actualInstallationAt !== undefined) {
      updateData.actualInstallationAt = actualInstallationAt ? new Date(actualInstallationAt) : null;
    }

    if (isMeterInstalled !== undefined) {
      updateData.isMeterInstalled = !!isMeterInstalled;
      if (!!isMeterInstalled) {
        updateData.actualMeterInstalledAt = actualMeterInstalledAt ? new Date(actualMeterInstalledAt) : new Date();
      } else {
        updateData.actualMeterInstalledAt = null;
      }
    } else if (actualMeterInstalledAt !== undefined) {
      updateData.actualMeterInstalledAt = actualMeterInstalledAt ? new Date(actualMeterInstalledAt) : null;
    }

    if (isCommissioned !== undefined) {
      updateData.isCommissioned = !!isCommissioned;
      if (!!isCommissioned) {
        updateData.actualCommissionedAt = actualCommissionedAt ? new Date(actualCommissionedAt) : new Date();
      } else {
        updateData.actualCommissionedAt = null;
      }
    } else if (actualCommissionedAt !== undefined) {
      updateData.actualCommissionedAt = actualCommissionedAt ? new Date(actualCommissionedAt) : null;
    }

    if (isSubsidyApplied !== undefined) {
      updateData.isSubsidyApplied = !!isSubsidyApplied;
      if (!!isSubsidyApplied) {
        // Enforce that outstanding balance must be 0 (all amount paid by customer)
        const totalPaid = order.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const balanceOutstanding = Math.max(0, order.totalValue - totalPaid);
        if (balanceOutstanding > 0) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Cannot apply subsidy. Customer outstanding balance is ₹${balanceOutstanding.toLocaleString('en-IN')}. All outstanding payments must be cleared (balance outstanding must be ₹0) before the subsidy stage can be registered.` 
            }, 
            { status: 400 }
          );
        }
        updateData.actualSubsidyAppliedAt = actualSubsidyAppliedAt ? new Date(actualSubsidyAppliedAt) : new Date();
      } else {
        updateData.actualSubsidyAppliedAt = null;
      }
    } else if (actualSubsidyAppliedAt !== undefined) {
      updateData.actualSubsidyAppliedAt = actualSubsidyAppliedAt ? new Date(actualSubsidyAppliedAt) : null;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    try {
      if (isInstalled !== undefined && !!isInstalled) {
        await prisma.activity.create({
          data: {
            employeeId: userPayload.id,
            leadId: order.leadId,
            activityType: 'INSTALLATION_COMPLETED',
            metadata: JSON.stringify({ orderCode: order.orderCode }),
          },
        });
      } else if (status !== undefined && status === 'completed') {
        await prisma.activity.create({
          data: {
            employeeId: userPayload.id,
            leadId: order.leadId,
            activityType: 'ORDER_COMPLETED',
            metadata: JSON.stringify({ orderCode: order.orderCode }),
          },
        });
      }
    } catch (actErr) {
      console.error('Error logging ops activity:', actErr);
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order details updated successfully',
    });
  } catch (error: any) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
