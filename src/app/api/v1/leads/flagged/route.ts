import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const flaggedLeads = await prisma.lead.findMany({
      where: {
        isActive: true,
        OR: [
          { isUnreachable: true },
          { status: { in: [2, 4, 10, 11, 12] } },
          {
            AND: [
              { status: 13 },
              {
                order: {
                  status: 'draft',
                  rejectionReason: { not: null }
                }
              }
            ]
          }
        ]
      },
      include: {
        order: { select: { rejectionReason: true, status: true } },
        consultant: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const mapped = flaggedLeads.map(lead => {
      let issueType = 'Flagged Issue';
      let issueDescription = 'General alert';

      if (lead.isUnreachable) {
        issueType = 'Unreachable';
        issueDescription = 'Client is currently unreachable by phone.';
      } else if (lead.status === 13 && lead.order?.status === 'draft' && lead.order?.rejectionReason) {
        issueType = 'Rejected Order';
        issueDescription = `Order rejected: "${lead.order.rejectionReason}"`;
      } else if (lead.status === 2) {
        issueType = 'DNP';
        issueDescription = 'Customer did not pick up the call.';
      } else if (lead.status === 4) {
        issueType = 'Not Interested';
        issueDescription = 'Customer declared no interest in solar installation.';
      } else if (lead.status === 10) {
        issueType = 'Disconnected';
        issueDescription = 'Call was disconnected or active number is unavailable.';
      } else if (lead.status === 11) {
        issueType = 'Switch Off';
        issueDescription = 'Customer phone is switched off.';
      } else if (lead.status === 12) {
        issueType = 'Disqualified';
        issueDescription = 'Site is disqualified (cannot fit solar panel installation).';
      }

      return {
        id: lead.id,
        leadCode: lead.leadCode,
        customerName: lead.customerName,
        mobile: lead.mobile,
        city: lead.city,
        status: lead.status,
        consultantName: lead.consultant?.name || 'Unassigned',
        issueType,
        issueDescription,
        updatedAt: lead.updatedAt
      };
    });

    return NextResponse.json({
      success: true,
      data: mapped
    });
  } catch (error: any) {
    console.error('Fetch flagged leads error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    }, { status: 500 });
  }
}
