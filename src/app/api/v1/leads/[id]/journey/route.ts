import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
      include: {
        creator: { select: { id: true, name: true, employeeId: true, role: true } },
        manager: { select: { id: true, name: true, employeeId: true } },
        tl: { select: { id: true, name: true, employeeId: true } },
        consultant: { select: { id: true, name: true, employeeId: true } },
        activityLogs: {
          include: { user: { select: { id: true, name: true, employeeId: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        },
        meetings: {
          include: { executive: { select: { id: true, name: true, employeeId: true } } },
          orderBy: { createdAt: 'asc' }
        },
        order: {
          include: {
            submittedBy: { select: { id: true, name: true, employeeId: true } },
            financeProcessedBy: { select: { id: true, name: true, employeeId: true } },
            assignedFinance: { select: { id: true, name: true, employeeId: true } },
            assignedOps: { select: { id: true, name: true, employeeId: true } },
            payments: {
              include: { recordedBy: { select: { id: true, name: true, employeeId: true } } },
              orderBy: { createdAt: 'asc' }
            },
            operationHistories: {
              include: { updatedBy: { select: { id: true, name: true, employeeId: true } }, stage: true },
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        auditLogs: {
          include: { user: { select: { id: true, name: true, employeeId: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    // Build timeline items
    const timelineItems: Array<{
      id: string;
      stageName: string;
      description: string;
      timestamp: string;
      employee: { id: number; name: string; employeeId?: string | null };
      metadata?: any;
    }> = [];

    // 1. Lead Created
    timelineItems.push({
      id: `created-${lead.id}`,
      stageName: 'Lead Created',
      description: `Lead created for ${lead.customerName} (${lead.leadCode})`,
      timestamp: lead.createdAt.toISOString(),
      employee: { id: lead.creator.id, name: lead.creator.name, employeeId: lead.creator.employeeId }
    });

    // 2. Assignments & Reassignments
    lead.auditLogs
      .filter(log => log.fieldName === 'assignedEmployee' || log.fieldName === 'assignedConsultantId')
      .forEach(log => {
        timelineItems.push({
          id: `audit-${log.id}`,
          stageName: 'Assigned',
          description: log.action || `Lead reassigned from ${log.oldValue || 'None'} to ${log.newValue}`,
          timestamp: log.createdAt.toISOString(),
          employee: { id: log.user.id, name: log.user.name, employeeId: log.user.employeeId }
        });
      });

    // 3. Pipeline Changes
    lead.activityLogs.forEach(log => {
      timelineItems.push({
        id: `act-${log.id}`,
        stageName: 'Pipeline Stage Change',
        description: log.remark || `Changed stage from ${log.fromStatus} to ${log.toStatus}`,
        timestamp: log.createdAt.toISOString(),
        employee: { id: log.user.id, name: log.user.name, employeeId: log.user.employeeId }
      });
    });

    // 4. Meetings
    lead.meetings.forEach(meeting => {
      timelineItems.push({
        id: `meeting-${meeting.id}`,
        stageName: meeting.outcome ? `Meeting Recorded (${meeting.outcome})` : 'Meeting Scheduled',
        description: meeting.outcome
          ? `Outcome: ${meeting.outcome}. Location: ${meeting.meetingCity || 'Recorded'}. Audio: ${meeting.audioRecordingPath ? 'Recorded' : 'N/A'}`
          : `Scheduled for ${meeting.meetingDate} at ${meeting.meetingTime}`,
        timestamp: (meeting.meetingEndedAt || meeting.createdAt).toISOString(),
        employee: { id: meeting.executive.id, name: meeting.executive.name, employeeId: meeting.executive.employeeId },
        metadata: {
          outcome: meeting.outcome,
          isLocked: meeting.isLocked,
          audioRecordingPath: meeting.audioRecordingPath,
          latitude: meeting.meetingLatitude,
          longitude: meeting.meetingLongitude
        }
      });
    });

    // 5. Order Submitted & Verified & Ops Progress
    if (lead.order) {
      timelineItems.push({
        id: `order-sub-${lead.order.id}`,
        stageName: 'Order Submitted',
        description: `Order ${lead.order.orderCode} submitted to Finance. Valuation: ₹${lead.order.totalValue}`,
        timestamp: lead.order.createdAt.toISOString(),
        employee: { id: lead.order.submittedBy.id, name: lead.order.submittedBy.name, employeeId: lead.order.submittedBy.employeeId }
      });

      if (lead.order.financeProcessedBy) {
        timelineItems.push({
          id: `order-ver-${lead.order.id}`,
          stageName: 'Finance Verification',
          description: `Order ${lead.order.orderCode} verified by Finance and moved to Operations.`,
          timestamp: lead.order.updatedAt.toISOString(),
          employee: { id: lead.order.financeProcessedBy.id, name: lead.order.financeProcessedBy.name, employeeId: lead.order.financeProcessedBy.employeeId }
        });
      }

      // Ledger Payments
      lead.order.payments.forEach(pay => {
        timelineItems.push({
          id: `pay-${pay.id}`,
          stageName: 'Ledger Payment Transaction',
          description: `Recorded payment of ₹${pay.amount} via ${pay.paymentMethod} (Ref: ${pay.transactionRef || 'N/A'})`,
          timestamp: pay.createdAt.toISOString(),
          employee: { id: pay.recordedBy.id, name: pay.recordedBy.name, employeeId: pay.recordedBy.employeeId }
        });
      });

      // Operations Stage Updates
      lead.order.operationHistories.forEach(opsHist => {
        timelineItems.push({
          id: `opshist-${opsHist.id}`,
          stageName: `Operations Stage: ${opsHist.stageName}`,
          description: opsHist.notes || `Advanced operations stage to ${opsHist.stageName}`,
          timestamp: opsHist.createdAt.toISOString(),
          employee: { id: opsHist.updatedBy.id, name: opsHist.updatedBy.name, employeeId: opsHist.updatedBy.employeeId }
        });
      });
    }

    // Sort timeline chronologically
    timelineItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          leadCode: lead.leadCode,
          customerName: lead.customerName,
          mobile: lead.mobile,
          status: lead.status
        },
        timeline: timelineItems
      }
    });
  } catch (error: any) {
    console.error('Fetch journey timeline error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only Admins can clear lead journey history.' }, { status: 403 });
    }

    const { id } = await params;
    const leadId = parseInt(id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ success: false, message: 'Invalid Lead ID.' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { order: true }
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
    }

    const isOrderPunched = lead.status === 13 || (lead.order && lead.order.status !== 'draft');
    if (isOrderPunched) {
      return NextResponse.json({
        success: false,
        message: 'Cannot clear tracking journey history. An order has already been punched for this lead.'
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.leadActivityLog.deleteMany({ where: { leadId } });
      await tx.leadActivityLog.create({
        data: {
          leadId,
          userId: userPayload.id,
          fromStatus: 0,
          toStatus: lead.status,
          remark: `Lead tracking journey history cleared by Admin (${userPayload.name}).`
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Lead journey tracking history cleared successfully.'
    });
  } catch (error: any) {
    console.error('Clear journey history error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.', error: error.message }, { status: 500 });
  }
}

