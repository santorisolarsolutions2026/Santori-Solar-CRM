import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userPayload = getAuthenticatedUser(req);
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(userPayload.id);
    const hasImportPerm = userPermissions.includes('leads:import') || 
                          userPermissions.includes('sales:lead_import') || 
                          ['admin', 'director'].includes(userPayload.role) || 
                          (userPayload as any).department?.name === 'IT';
    if (!hasImportPerm) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not have permission to import bulk leads.' }, { status: 403 });
    }

    const body = await req.json();
    const { leads } = body;

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json({ success: false, message: 'Invalid payload. "leads" must be an array.' }, { status: 400 });
    }

    const imported: any[] = [];
    const skipped: any[] = [];

    // Track duplicate mobiles within this batch to avoid database conflict errors from the batch itself
    const processedMobilesInBatch = new Set<string>();
    const cleanLeads: any[] = [];

    for (const item of leads) {
      const { customerName, mobile } = item;

      // Validation checks - customerName and mobile are strictly required
      if (!customerName || !mobile) {
        skipped.push({
          mobile: mobile || 'N/A',
          customerName: customerName || 'Unknown',
          reason: 'Missing required Customer Name or Mobile Number.',
        });
        continue;
      }

      // Clean mobile number (strip spaces/dashes and float decimal .0 endings)
      let cleanMobile = String(mobile).trim().replace(/[\s-]/g, '');
      if (cleanMobile.includes('.')) {
        cleanMobile = cleanMobile.split('.')[0];
      }

      if (cleanMobile.length !== 10) {
        skipped.push({
          mobile: cleanMobile,
          customerName,
          reason: 'Mobile number must be exactly 10 digits.',
        });
        continue;
      }

      // Duplicate checks in CSV
      if (processedMobilesInBatch.has(cleanMobile)) {
        skipped.push({
          mobile: cleanMobile,
          customerName,
          reason: 'Duplicate phone number found in the CSV file.',
        });
        continue;
      }

      processedMobilesInBatch.add(cleanMobile);
      cleanLeads.push({
        ...item,
        cleanMobile,
      });
    }

    const cleanMobileNumbers = cleanLeads.map(l => l.cleanMobile);

    // We do all creation in a transaction to safely fetch and increment lead codes
    await prisma.$transaction(async (tx) => {
      // Fetch existing leads in DB with matching mobile numbers
      const existingLeadsFromDb = await tx.lead.findMany({
        where: { mobile: { in: cleanMobileNumbers } },
        select: { mobile: true, leadCode: true },
      });

      const existingDbMobilesMap = new Map(
        existingLeadsFromDb.map(l => [l.mobile, l.leadCode])
      );

      // Get the last lead to know starting leadCode index
      const lastLead = await tx.lead.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      let currentIdIndex = lastLead?.id || 0;

      for (const item of cleanLeads) {
        const {
          customerName,
          cleanMobile,
          mobileAlt,
          connectionType,
          sanctionedLoadKw,
          address,
          pinCode,
          city,
          state,
          leadSource,
          otherData,
          discomName,
          connectionNumber,
        } = item;

        const existingLeadCode = existingDbMobilesMap.get(cleanMobile);
        if (existingLeadCode) {
          skipped.push({
            mobile: cleanMobile,
            customerName,
            reason: `Lead already exists in database (Lead Code: ${existingLeadCode}).`,
          });
          continue;
        }

        // Clean mobileAlt if present
        let cleanMobileAlt = mobileAlt ? String(mobileAlt).trim().replace(/[\s-]/g, '') : null;
        if (cleanMobileAlt && cleanMobileAlt.includes('.')) {
          cleanMobileAlt = cleanMobileAlt.split('.')[0];
        }

        currentIdIndex += 1;
        const leadCode = `SL-${String(currentIdIndex).padStart(5, '0')}`;

        // Create the simple lead
        const newLead = await tx.lead.create({
          data: {
            leadCode,
            customerName,
            mobile: cleanMobile,
            mobileAlt: cleanMobileAlt,
            connectionType: connectionType || 'residential',
            sanctionedLoadKw: sanctionedLoadKw ? parseFloat(sanctionedLoadKw) : null,
            address: address || '',
            pinCode: pinCode || '',
            city: city || '',
            state: state || '',
            leadSource: leadSource || 'other',
            status: 1, // 1 = Fresh Lead
            createdById: userPayload.id,
            otherData: otherData ? (typeof otherData === 'string' ? otherData : JSON.stringify(otherData)) : null,
            isActive: true,
            discomName: discomName || null,
            connectionNumber: connectionNumber || null,
          },
        });

        // Log the import action in LeadActivityLog
        await tx.leadActivityLog.create({
          data: {
            leadId: newLead.id,
            userId: userPayload.id,
            fromStatus: null,
            toStatus: 1,
            remark: 'Lead imported as a Fresh Lead from CSV.',
          },
        });

        imported.push({
          id: newLead.id,
          leadCode: newLead.leadCode,
          customerName: newLead.customerName,
          mobile: newLead.mobile,
        });
      }
    }, {
      maxWait: 30000,
      timeout: 180000,
    });

    return NextResponse.json({
      success: true,
      message: `Import complete. Imported: ${imported.length}, Skipped: ${skipped.length}`,
      data: {
        importedCount: imported.length,
        skippedCount: skipped.length,
        imported,
        skipped,
      },
    });
  } catch (error: any) {
    console.error('Import leads API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errors: { details: error.message } },
      { status: 500 }
    );
  }
}
