import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

// Transition validation matrix
const TRANSITIONS: Record<number, { to: number[]; roles: string[] }> = {
  1: { to: [2, 3, 4, 5, 10, 11], roles: ['consultant', 'psa', 'tl', 'manager'] },
  2: { to: [2, 3, 4, 5, 10, 11], roles: ['consultant', 'psa'] },
  3: { to: [3, 4, 5, 7, 8, 10, 11], roles: ['consultant', 'psa'] },
  4: { to: [3], roles: ['manager', 'admin', 'director', 'sales_head'] }, // reactivate only
  5: { to: [2, 3, 4, 8, 10, 11], roles: ['consultant', 'psa'] },
  6: { to: [], roles: [] }, // terminal
  7: { to: [3, 4, 5, 8], roles: ['consultant', 'tl', 'manager'] },
  8: { to: [9], roles: ['consultant', 'tl'] },
  9: { to: [3, 4, 13], roles: ['consultant', 'tl', 'manager'] },
  10: { to: [2, 3, 4, 5], roles: ['consultant', 'psa'] },
  11: { to: [2, 3, 4, 5], roles: ['consultant', 'psa'] },
  12: { to: [], roles: [] }, // terminal
  13: { to: [], roles: [] }, // terminal
};

// Helper to generate order code
async function generateOrderCode() {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  const nextId = (lastOrder?.id || 0) + 1;
  return `ORD-${String(nextId).padStart(5, '0')}`;
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

    const userPermissions = await getUserPermissions(userPayload.id);
    if (!userPermissions.includes('leads:change_status')) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to change lead status.' }, { status: 403 });
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

    const body = await req.json();
    const { to_status, remark, sub_status, followup_at, formB, formC } = body;

    const toStatusNum = parseInt(to_status, 10);
    if (isNaN(toStatusNum) || toStatusNum < 1 || toStatusNum > 13) {
      return NextResponse.json({ success: false, message: 'Invalid target status.' }, { status: 400 });
    }

    if (!remark) {
      return NextResponse.json({ success: false, message: 'Remark is mandatory for status change.' }, { status: 400 });
    }

    // 1. Transition Checks (Admin, Director, and Sales Head can bypass standard matrix, but must follow terminal constraints)
    const isAdminOrSalesHead = ['admin', 'director', 'sales_head'].includes(userPayload.role) || userPermissions.includes('leads:view_all');
    const rule = TRANSITIONS[lead.status];

    if (!isAdminOrSalesHead) {
      if (!rule) {
        return NextResponse.json({ success: false, message: `Invalid source status: ${lead.status}` }, { status: 400 });
      }

      // Check if role is authorized
      if (!rule.roles.includes(userPayload.role)) {
        return NextResponse.json({ success: false, message: `Role '${userPayload.role}' is not authorized to transition from stage ${lead.status}.` }, { status: 403 });
      }

      // Check if target status is allowed
      if (!rule.to.includes(toStatusNum)) {
        return NextResponse.json({ success: false, message: `Transition from stage ${lead.status} to ${toStatusNum} is not allowed.` }, { status: 400 });
      }
    }

    // Prepare updates
    const updateData: any = {
      status: toStatusNum,
      updatedAt: new Date(),
    };

    let meetingBookingData: any = null;
    let orderCreationData: any = null;
    let finalStatusNum = toStatusNum;

    // 2. Specific Form Validations

    // Stage 3 - Follow Up
    if (toStatusNum === 3) {
      if (!sub_status || !['warm', 'hot'].includes(sub_status)) {
        return NextResponse.json({ success: false, message: 'Sub-status (warm/hot) is required for Follow Up stage.' }, { status: 422 });
      }
      if (!followup_at) {
        return NextResponse.json({ success: false, message: 'Follow Up Date & Time is required.' }, { status: 422 });
      }
      updateData.statusSub = sub_status;
      updateData.followupAt = new Date(followup_at);
      updateData.isActive = true;
    }

    // Stage 5 - Call Later
    if (toStatusNum === 5) {
      if (!followup_at) {
        return NextResponse.json({ success: false, message: 'Call Back Date & Time is required.' }, { status: 422 });
      }
      updateData.followupAt = new Date(followup_at);
      updateData.isActive = true;
    }

    // Stage 12 - Can't Fit Solar
    if (toStatusNum === 12) {
      if (!sub_status) {
        return NextResponse.json({ success: false, message: 'Reason is required for Can\'t Fit Solar.' }, { status: 422 });
      }
      updateData.statusSub = sub_status;
      updateData.isActive = false; // Disqualified
    }

    // Stage 4 - Not Interested / Stage 6 - Already Installed
    if (toStatusNum === 4 || toStatusNum === 6) {
      updateData.isActive = false; // Inactive
    }

    // Stage 8 - Meeting Booked (Form B validation)
    if (toStatusNum === 8) {
      if (!formB) {
        return NextResponse.json({ success: false, message: 'Form B (Meeting Booking Details) is required.' }, { status: 422 });
      }
      const {
        address,
        pinCode,
        mobile,
        mobileAlt,
        meetingDate,
        meetingTime,
        avgMonthlyBill,
        connectionType,
        assignedExecutiveId,
        notes,
      } = formB;

      if (!address || !pinCode || !mobile || !meetingDate || !meetingTime || !avgMonthlyBill || !connectionType || !assignedExecutiveId) {
        return NextResponse.json({ success: false, message: 'Missing required Form B fields.' }, { status: 422 });
      }

      meetingBookingData = {
        address,
        pinCode,
        mobile,
        mobileAlt,
        meetingDate,
        meetingTime,
        avgMonthlyBill: parseFloat(avgMonthlyBill),
        connectionType,
        assignedExecutiveId: parseInt(assignedExecutiveId, 10),
        notes,
      };

      // Sync lead details with Form B address if updated
      updateData.address = address;
      updateData.pinCode = pinCode;
      updateData.connectionType = connectionType;
      updateData.assignedConsultantId = parseInt(assignedExecutiveId, 10);
    }

    // Stage 9 - Meeting Done (Form C validation)
    if (toStatusNum === 9) {
      if (!formC || !formC.outcome) {
        return NextResponse.json({ success: false, message: 'Form C (Meeting Outcome) is required.' }, { status: 422 });
      }

      const { outcome, remark: formCRemark, sub_status: formCSubStatus, followup_at: formCFollowUpAt } = formC;

      if (outcome === 'sale_done') {
        finalStatusNum = 13;
        updateData.status = 13;
        // Proceed with Stage 13 Setup
        const orderCode = await generateOrderCode();
        orderCreationData = {
          orderCode,
          connectionNumber: '',
          systemSizeKw: 0.0,
          totalValue: 0.0,
          downPayment: 0.0,
          paymentMethod: 'cash',
          remainingMethod: 'cash',
          clientType: 'on_grid',
          subsidyApplicable: false,
          submittedById: userPayload.id,
          status: 'draft',
        };
      } else if (outcome === 'follow_up') {
        finalStatusNum = 3;
        updateData.status = 3;
        if (!formCSubStatus || !['warm', 'hot'].includes(formCSubStatus)) {
          return NextResponse.json({ success: false, message: 'Sub-status (warm/hot) is required for Follow Up outcome.' }, { status: 422 });
        }
        if (!formCFollowUpAt) {
          return NextResponse.json({ success: false, message: 'Follow Up Date & Time is required.' }, { status: 422 });
        }
        updateData.statusSub = formCSubStatus;
        updateData.followupAt = new Date(formCFollowUpAt);
      } else if (outcome === 'not_interested') {
        finalStatusNum = 4;
        updateData.status = 4;
        updateData.statusSub = formCSubStatus || 'Price'; // Dropdown reason
        updateData.isActive = false;
      } else {
        return NextResponse.json({ success: false, message: 'Invalid outcome selected.' }, { status: 422 });
      }
    }

    // Stage 13 - Direct Sale Done Setup
    if (toStatusNum === 13 && finalStatusNum === 13) {
      // Create draft order if it doesn't exist
      const existingOrder = await prisma.order.findUnique({
        where: { leadId },
      });
      if (!existingOrder) {
        const orderCode = await generateOrderCode();
        orderCreationData = {
          orderCode,
          connectionNumber: '',
          systemSizeKw: 0.0,
          totalValue: 0.0,
          downPayment: 0.0,
          paymentMethod: 'cash',
          remainingMethod: 'cash',
          clientType: 'on_grid',
          subsidyApplicable: false,
          submittedById: userPayload.id,
          status: 'draft',
        };
      }
    }

    // 3. Auto-flagging Unreachable Leads
    // Check if new status is DNP (2), call disconnected (10), switch off (11)
    if ([2, 10, 11].includes(finalStatusNum)) {
      // Find the last 4 log entries for this lead
      const pastLogs = await prisma.leadActivityLog.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { toStatus: true },
      });

      // Including the current transition, check if we have 5 consecutive failed attempts
      const allFailed = [finalStatusNum, ...pastLogs.map((l) => l.toStatus)].every((status) =>
        [2, 10, 11].includes(status)
      );

      if (allFailed && pastLogs.length >= 4) {
        updateData.isUnreachable = true;
      }
    }

    // Run DB transaction
    const updatedLead = await prisma.$transaction(async (tx) => {
      const res = await tx.lead.update({
        where: { id: leadId },
        data: updateData,
        include: {
          consultant: { select: { name: true } },
          tl: { select: { id: true } },
          manager: { select: { id: true } },
        },
      });

      // Create Lead Activity Log
      await tx.leadActivityLog.create({
        data: {
          leadId,
          userId: userPayload.id,
          fromStatus: lead.status,
          toStatus: finalStatusNum,
          remark,
        },
      });

      // Create Meeting Booking if present
      if (meetingBookingData) {
        await tx.meetingBooking.create({
          data: {
            leadId,
            ...meetingBookingData,
          },
        });

        // Send notifications
        // 1. To assigned executive
        await tx.notification.create({
          data: {
            userId: meetingBookingData.assignedExecutiveId,
            type: 'meeting_booked',
            title: '📅 New meeting booked',
            body: `New meeting booked for ${res.customerName} on ${meetingBookingData.meetingDate} at ${meetingBookingData.meetingTime}. Lead #${res.leadCode}`,
            leadId,
          },
        });

        // 2. To manager if present
        if (res.assignedManagerId) {
          await tx.notification.create({
            data: {
              userId: res.assignedManagerId,
              type: 'meeting_booked',
              title: '📅 New meeting booked in team',
              body: `Meeting booked for ${res.customerName} on ${meetingBookingData.meetingDate} at ${meetingBookingData.meetingTime}. Lead #${res.leadCode}`,
              leadId,
            },
          });
        }
      }

      // Create Draft Order if present
      if (orderCreationData) {
        await tx.order.create({
          data: {
            leadId,
            ...orderCreationData,
          },
        });

        // Send notifications for Sale Done
        if (res.assignedConsultantId) {
          await tx.notification.create({
            data: {
              userId: res.assignedConsultantId,
              type: 'sale_done',
              title: '🎉 Sale closed!',
              body: `🎉 Sale closed! ${res.customerName} — Lead #${res.leadCode} by ${res.consultant?.name || 'you'}`,
              leadId,
            },
          });
        }

        // Notify Admin
        const adminUser = await tx.user.findFirst({
          where: { role: 'admin' },
          select: { id: true },
        });

        if (adminUser) {
          await tx.notification.create({
            data: {
              userId: adminUser.id,
              type: 'sale_done',
              title: '🎉 Sale closed!',
              body: `Sale closed! ${res.customerName} — Lead #${res.leadCode} by ${res.consultant?.name || 'Consultant'}`,
              leadId,
            },
          });
        }
      }

      // Create notification for unreachable lead
      if (updateData.isUnreachable && !lead.isUnreachable) {
        if (res.assignedManagerId) {
          await tx.notification.create({
            data: {
              userId: res.assignedManagerId,
              type: 'unreachable_lead',
              title: '⚠️ Lead unreachable',
              body: `Lead #${res.leadCode} flagged unreachable after 5 failed attempts.`,
              leadId,
            },
          });
        }
        if (res.assignedTlId) {
          await tx.notification.create({
            data: {
              userId: res.assignedTlId,
              type: 'unreachable_lead',
              title: '⚠️ Lead unreachable',
              body: `Lead #${res.leadCode} flagged unreachable after 5 failed attempts.`,
              leadId,
            },
          });
        }
      }

      return res;
    });

    return NextResponse.json({
      success: true,
      data: updatedLead,
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    console.error('Update lead status error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
