import { NextResponse } from 'next/server';
// @ts-ignore
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import { prisma, Prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions, getUserSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STAGE_NAMES: Record<number | string, string> = {
  0: 'Uninitiated',
  1: 'Fresh Lead',
  2: 'DNP',
  3: 'Follow Up',
  4: 'Not Interested',
  5: 'Call Later',
  6: 'Already Installed',
  7: 'Decision Pending',
  8: 'Meeting Booked',
  9: 'Meeting Done',
  10: 'Disconnected',
  11: 'Switch Off',
  12: "Can't Fit Solar",
  13: 'Sale Done',
  14: 'Meeting Cancelled',
  order_punched: 'Order Punched',
  awaiting_verification: 'Awaiting Verification',
  finance_verified: 'Finance Verified',
  delivery_scheduled: 'Delivery Scheduled',
  delivered: 'Materials Delivered',
  installation_scheduled: 'Installation Scheduled',
  installed: 'Solar Installed',
  meter_installed: 'Net Meter Installed',
  commissioned: 'Plant Commissioned',
  subsidy_applied: 'Subsidy Applied',
};

function getLeadStageName(lead: any): string {
  if (lead.status === 13 && lead.order) {
    if (lead.order.status === 'draft' && lead.order.rejectionReason) return 'Order Rejected';
    if (lead.order.isSubsidyApplied) return 'Subsidy Applied';
    if (lead.order.isCommissioned) return 'Plant Commissioned';
    if (lead.order.isMeterInstalled) return 'Net Meter Installed';
    if (lead.order.isInstalled) return 'Solar Installed';
    if (lead.order.installationDate && !lead.order.isInstalled) return 'Installation Scheduled';
    if (lead.order.isDelivered) return 'Materials Delivered';
    if (lead.order.deliveryDate && !lead.order.isDelivered) return 'Delivery Scheduled';
    if (lead.order.status === 'finance_verified') return 'Finance Verified';
    if (lead.order.status === 'submitted') return 'Awaiting Verification';
    return 'Order Punched';
  }
  return STAGE_NAMES[lead.status] || `Stage ${lead.status}`;
}

async function buildLeadsPdfBuffer(leads: any[], metadata: { filterTitle?: string; userName?: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 30,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 30;
      const contentWidth = pageWidth - margin * 2;

      // Color Tokens
      const emeraldColor = '#059669';
      const darkBg = '#0f172a';
      const altRowBg = '#f8fafc';
      const textColor = '#1e293b';
      const mutedText = '#64748b';
      const borderColor = '#e2e8f0';

      const columns = [
        { key: 'sn', label: '#', width: 28, align: 'center' as const },
        { key: 'leadCode', label: 'Lead ID', width: 75, align: 'left' as const },
        { key: 'customerName', label: 'Customer Name', width: 135, align: 'left' as const },
        { key: 'mobile', label: 'Mobile', width: 90, align: 'left' as const },
        { key: 'location', label: 'City / Area', width: 145, align: 'left' as const },
        { key: 'load', label: 'Type / Load', width: 85, align: 'left' as const },
        { key: 'stage', label: 'Pipeline Stage', width: 110, align: 'left' as const },
        { key: 'assigned', label: 'Assigned To', width: 113, align: 'left' as const },
      ];

      function drawHeader(pageNum: number, isFirstPage = false) {
        if (isFirstPage) {
          // Top Brand Banner
          doc.rect(margin, margin, contentWidth, 48).fill(darkBg);

          doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold')
            .text('SANTORI SOLAR CRM', margin + 14, margin + 12);
          
          doc.fillColor('#10b981').fontSize(8.5).font('Helvetica-Bold')
            .text('SALES LEADS PIPELINE EXPORT REPORT', margin + 14, margin + 29);

          const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
          doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
            .text(`Generated: ${now} IST`, margin + contentWidth - 280, margin + 11, { width: 265, align: 'right' });
          
          doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
            .text(`Total Leads: ${leads.length}  |  Filter: ${metadata.filterTitle || 'Active Selection'}`, margin + contentWidth - 280, margin + 27, { width: 265, align: 'right' });

          doc.y = margin + 56;
        } else {
          doc.y = margin;
        }

        // Table Header
        const headerY = doc.y;
        doc.rect(margin, headerY, contentWidth, 20).fill(emeraldColor);

        let currentX = margin;
        columns.forEach((col) => {
          doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
            .text(col.label, currentX + 4, headerY + 5.5, {
              width: col.width - 8,
              align: col.align,
            });
          currentX += col.width;
        });

        doc.y = headerY + 20;
      }

      drawHeader(1, true);

      let currentY = doc.y;
      const rowHeight = 21;

      leads.forEach((lead, index) => {
        if (currentY + rowHeight > pageHeight - margin - 22) {
          doc.addPage();
          drawHeader(doc.bufferedPageRange().count, false);
          currentY = doc.y;
        }

        const isEven = index % 2 === 0;
        doc.rect(margin, currentY, contentWidth, rowHeight).fill(isEven ? '#ffffff' : altRowBg);
        doc.rect(margin, currentY + rowHeight - 0.5, contentWidth, 0.5).fill(borderColor);

        let currentX = margin;
        const assignedName = lead.consultant?.name || lead.tl?.name || lead.manager?.name || 'Unassigned';
        const displayMobile = lead.mobile?.startsWith('AID-') ? 'N/A' : (lead.mobile?.includes('-#') ? lead.mobile.split('-#')[0] : lead.mobile);
        const stageDisplay = getLeadStageName(lead);

        const rowData: Record<string, string> = {
          sn: String(index + 1),
          leadCode: lead.leadCode || `SL-${lead.id}`,
          customerName: (lead.customerName || 'N/A').slice(0, 24),
          mobile: displayMobile || 'N/A',
          location: `${lead.city || ''}${lead.division ? ` (${lead.division})` : ''}`.slice(0, 26) || '—',
          load: `${lead.connectionType ? lead.connectionType.slice(0, 4) : 'Res'}${lead.sanctionedLoadKw ? ` - ${lead.sanctionedLoadKw}kW` : ''}`,
          stage: stageDisplay,
          assigned: assignedName.slice(0, 18),
        };

        columns.forEach((col) => {
          const val = rowData[col.key] || '';
          doc.fillColor(col.key === 'leadCode' ? emeraldColor : textColor)
            .fontSize(7.5)
            .font(col.key === 'leadCode' || col.key === 'sn' ? 'Helvetica-Bold' : 'Helvetica')
            .text(val, currentX + 4, currentY + 5.5, {
              width: col.width - 8,
              align: col.align,
              lineBreak: false,
              ellipsis: true,
            });
          currentX += col.width;
        });

        currentY += rowHeight;
      });

      // Page numbers in footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.rect(margin, pageHeight - margin - 14, contentWidth, 0.5).fill(borderColor);
        doc.fillColor(mutedText).fontSize(6.5).font('Helvetica')
          .text('Confidential — Santori Solar Internal Pipeline Report', margin, pageHeight - margin - 9, { align: 'left' });
        doc.fillColor(mutedText).fontSize(6.5).font('Helvetica')
          .text(`Page ${i + 1} of ${pages.count}`, margin, pageHeight - margin - 9, { align: 'right', width: contentWidth });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { role: userRole, permissions: userPermissions } = await getUserSession(userPayload.id);
    const baseRole = userRole?.includes(':') ? userRole.split(':')[0] : userRole;
    const isSuperAdmin = baseRole === 'admin' || baseRole === 'director' || userRole?.startsWith('admin:');
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden. Only administrators can export leads.' }, { status: 403 });
    }

    const body = await req.json();
    const { leadIds, limit = 50, filters = {} } = body;

    let leads: any[] = [];
    let filterTitle = 'Pipeline Leads';

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      // User selected specific lead IDs
      leads = await prisma.lead.findMany({
        where: {
          id: { in: leadIds },
        },
        orderBy: { id: 'desc' },
        include: {
          consultant: { select: { id: true, name: true } },
          tl: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
          order: {
            select: {
              id: true,
              status: true,
              rejectionReason: true,
              deliveryDate: true,
              isDelivered: true,
              installationDate: true,
              isInstalled: true,
              isMeterInstalled: true,
              isCommissioned: true,
              isSubsidyApplied: true,
              subsidyApplicable: true,
            }
          },
        },
      });
      filterTitle = `Selected (${leads.length} leads)`;
    } else {
      // Filter-based top N export (e.g. 50 or 100)
      const exportLimit = Math.min(Math.max(Number(limit) || 50, 1), 300); // capped at 300 for safety
      const andConditions: Prisma.LeadWhereInput[] = [];

      // Active leads condition
      andConditions.push({ isActive: true });

      const hasViewAll = userPermissions.includes('leads:view_all');
      if (!hasViewAll) {
        const { getLeadVisibilityCondition } = await import('@/lib/hierarchy');
        const hierarchyCondition = await getLeadVisibilityCondition(userPayload.id, userRole, userPermissions);
        andConditions.push(hierarchyCondition);
      }

      if (filters.search) {
        andConditions.push({
          OR: [
            { customerName: { contains: filters.search, mode: 'insensitive' } },
            { mobile: { contains: filters.search } },
            { leadCode: { contains: filters.search, mode: 'insensitive' } },
          ],
        });
      }

      if (filters.city) {
        andConditions.push({ city: { equals: filters.city, mode: 'insensitive' } });
      }

      if (filters.division) {
        andConditions.push({ division: { equals: filters.division, mode: 'insensitive' } });
      }

      if (filters.unassigned) {
        andConditions.push({
          assignedConsultantId: null,
          assignedTlId: null,
          assignedManagerId: null,
        });
      }

      if (filters.status) {
        const statuses = String(filters.status).split(',').map(s => s.trim()).filter(Boolean);
        const POST_SALES_STATUS_MAP: Record<string, Prisma.LeadWhereInput> = {
          order_punched: { status: 13, order: { is: { status: { not: 'draft' } } } },
          awaiting_verification: { status: 13, order: { is: { status: 'submitted' } } },
          finance_verified: { status: 13, order: { is: { status: 'finance_verified' } } },
          delivery_scheduled: { status: 13, order: { is: { isDelivered: false, deliveryDate: { not: null } } } },
          delivered: { status: 13, order: { is: { isDelivered: true, isInstalled: false } } },
          installation_scheduled: { status: 13, order: { is: { isInstalled: false, installationDate: { not: null } } } },
          installed: { status: 13, order: { is: { isInstalled: true, isMeterInstalled: false } } },
          meter_installed: { status: 13, order: { is: { isMeterInstalled: true, isCommissioned: false } } },
          commissioned: { status: 13, order: { is: { isCommissioned: true } } },
          subsidy_applied: { status: 13, order: { is: { isSubsidyApplied: true } } },
        };

        const statusOrConditions: Prisma.LeadWhereInput[] = [];
        const numericStatuses = statuses
          .filter(s => !isNaN(Number(s)) && s !== '13')
          .map(s => parseInt(s, 10));

        if (numericStatuses.length > 0) {
          statusOrConditions.push({ status: { in: numericStatuses } });
        }

        if (statuses.includes('13')) {
          statusOrConditions.push({
            status: 13,
            OR: [{ order: null }, { order: { status: 'draft' } }],
          });
        }

        Object.entries(POST_SALES_STATUS_MAP).forEach(([key, condition]) => {
          if (statuses.includes(key)) {
            statusOrConditions.push(condition);
          }
        });

        if (statusOrConditions.length === 1) {
          andConditions.push(statusOrConditions[0]);
        } else if (statusOrConditions.length > 1) {
          andConditions.push({ OR: statusOrConditions });
        }
      }

      if (filters.connectionType) {
        const types = String(filters.connectionType).split(',').map(s => s.trim()).filter(Boolean);
        if (types.length > 0) {
          andConditions.push({ connectionType: { in: types } });
        }
      }

      leads = await prisma.lead.findMany({
        where: andConditions.length > 0 ? { AND: andConditions } : {},
        take: exportLimit,
        orderBy: { updatedAt: 'desc' },
        include: {
          consultant: { select: { id: true, name: true } },
          tl: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
          order: {
            select: {
              id: true,
              status: true,
              rejectionReason: true,
              deliveryDate: true,
              isDelivered: true,
              installationDate: true,
              isInstalled: true,
              isMeterInstalled: true,
              isCommissioned: true,
              isSubsidyApplied: true,
              subsidyApplicable: true,
            }
          },
        },
      });

      filterTitle = `Top ${leads.length} Leads ${filters.city ? `(${filters.city})` : ''}`;
    }

    if (leads.length === 0) {
      return NextResponse.json({ success: false, message: 'No leads found to export.' }, { status: 404 });
    }

    const pdfBuffer = await buildLeadsPdfBuffer(leads, {
      filterTitle,
      userName: userPayload.email,
    });

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Santori_Leads_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('Error generating leads PDF:', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
