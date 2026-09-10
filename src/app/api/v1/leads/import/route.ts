import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, getUserPermissions } from '@/lib/auth';
import { normalizeLocation } from '@/lib/location';

const STAGE_NAMES: Record<number, string> = {
  0: 'Stage 0 - Fresh Untouched',
  1: 'Stage 1 - Fresh Lead',
  2: 'Stage 2 - DNP',
  3: 'Stage 3 - Call Back',
  4: 'Stage 4 - Switch Off / Unreachable',
  5: 'Stage 5 - Meeting Scheduled',
  6: 'Stage 6 - Meeting Rescheduled',
  7: 'Stage 7 - Site Survey Done',
  8: 'Stage 8 - Quotation Sent',
  9: 'Stage 9 - Negotiation',
  10: 'Stage 10 - Disconnected',
  11: 'Stage 11 - Can’t Fit / Roof Not Feasible',
  12: 'Stage 12 - Lost / Not Interested',
  13: 'Stage 13 - Sale Done / Order Punched',
  14: 'Stage 14 - Cancelled',
};

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

    // Track duplicate in-batch rows to prevent self-collisions within the same batch
    const processedCombosInBatch = new Set<string>();
    const cleanLeads: any[] = [];

    for (const item of leads) {
      const { customerName, mobile, connectionNumber } = item;

      // Clean connection / account ID first
      const cleanConnNum = connectionNumber 
        ? (String(connectionNumber).trim().endsWith('.0') ? String(connectionNumber).trim().slice(0, -2) : String(connectionNumber).trim())
        : null;

      // Clean mobile number (strip +91, 0 prefixes, spaces/dashes/brackets, scientific notation and float decimal .0 endings)
      let cleanMobile = '';
      if (mobile !== undefined && mobile !== null && mobile !== '') {
        let str = String(mobile).trim();
        if (/[eE][+-]?\d+/.test(str)) {
          const num = Number(str.replace(/[^0-9eE.+-]/g, ''));
          if (!isNaN(num) && num > 0) {
            str = BigInt(Math.round(num)).toString();
          }
        } else if (str.includes('.')) {
          str = str.split('.')[0];
        }
        str = str.replace(/\D/g, '');
        if (str.length === 12 && str.startsWith('91')) {
          str = str.slice(2);
        } else if (str.length === 11 && str.startsWith('0')) {
          str = str.slice(1);
        }
        cleanMobile = str;
      }

      // Check if neither mobile nor connection number is present
      if (!cleanMobile && !cleanConnNum) {
        skipped.push({
          mobile: 'N/A',
          customerName: customerName || 'Unknown',
          connectionNumber: 'N/A',
          reason: 'Missing both Contact Number and Account ID / Connection Number.',
        });
        continue;
      }

      // If mobile is missing or <10 digits, but we have cleanConnNum:
      let isAccountOnly = false;
      if (cleanMobile.length !== 10) {
        if (cleanConnNum) {
          isAccountOnly = true;
          cleanMobile = `AID-${cleanConnNum}`;
        } else {
          skipped.push({
            mobile: cleanMobile || 'N/A',
            customerName: customerName || 'Unknown',
            connectionNumber: 'N/A',
            reason: 'Mobile number must be exactly 10 digits when Account ID is missing.',
          });
          continue;
        }
      }

      // Fallback customer name if blank or missing
      const finalCustomerName = (customerName && String(customerName).trim())
        ? String(customerName).trim()
        : (isAccountOnly 
            ? `Solar Prospect - ${cleanConnNum ? cleanConnNum.slice(-4) : 'DISCOM'}` 
            : `Solar Prospect - ${cleanMobile.slice(-4)}`);

      // In-batch duplicate check
      const comboKey = `${cleanMobile}_${cleanConnNum || ''}`;
      if (processedCombosInBatch.has(comboKey)) {
        skipped.push({
          mobile: isAccountOnly ? 'N/A' : cleanMobile,
          customerName: finalCustomerName,
          connectionNumber: cleanConnNum || 'N/A',
          reason: 'Duplicate row within the same CSV file.',
        });
        continue;
      }

      processedCombosInBatch.add(comboKey);
      cleanLeads.push({
        ...item,
        customerName: finalCustomerName,
        cleanMobile,
        cleanConnNum,
        isAccountOnly,
      });
    }

    if (cleanLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Import complete. Imported: 0, Skipped: ${skipped.length}`,
        data: { importedCount: 0, skippedCount: skipped.length, imported: [], skipped },
      });
    }

    const cleanMobileNumbers = cleanLeads.map(l => l.cleanMobile);
    const cleanConnNumbers = cleanLeads.map(l => l.cleanConnNum).filter(Boolean) as string[];

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      // Find existing leads by matching mobile OR matching connectionNumber
      const orConditions: any[] = [];
      if (cleanMobileNumbers.length > 0) {
        orConditions.push({ mobile: { in: cleanMobileNumbers } });
      }
      if (cleanConnNumbers.length > 0) {
        orConditions.push({ connectionNumber: { in: cleanConnNumbers } });
      }

      const existingLeadsFromDb = await tx.lead.findMany({
        where: { OR: orConditions },
        select: {
          id: true,
          mobile: true,
          leadCode: true,
          status: true,
          customerName: true,
          address: true,
          pinCode: true,
          city: true,
          state: true,
          discomName: true,
          connectionNumber: true,
          sanctionedLoadKw: true,
          otherData: true,
        },
      });

      // Index existing leads by mobile and by connectionNumber
      const existingDbMobilesMap = new Map<string, typeof existingLeadsFromDb[0]>();
      const existingDbAccountsMap = new Map<string, typeof existingLeadsFromDb[0]>();

      for (const l of existingLeadsFromDb) {
        if (l.mobile) existingDbMobilesMap.set(l.mobile, l);
        if (l.connectionNumber) existingDbAccountsMap.set(l.connectionNumber, l);
      }

      // Get last lead ID to increment leadCode safely
      const lastLead = await tx.lead.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      let currentIdIndex = lastLead?.id || 0;

      for (const item of cleanLeads) {
        const {
          customerName,
          cleanMobile,
          cleanConnNum,
          isAccountOnly,
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
        } = item;

        // Check 1: Is this exact Account ID already in CRM?
        if (cleanConnNum && existingDbAccountsMap.has(cleanConnNum)) {
          const existingAccLead = existingDbAccountsMap.get(cleanConnNum)!;
          const stageName = STAGE_NAMES[existingAccLead.status] || `Stage ${existingAccLead.status}`;
          skipped.push({
            mobile: isAccountOnly ? 'N/A' : cleanMobile,
            customerName,
            connectionNumber: cleanConnNum,
            reason: `Account ID already exists in CRM (Lead Code: ${existingAccLead.leadCode}, Current Stage: ${stageName}).`,
          });
          continue;
        }

        // Check 2: Does this exact mobile already exist in CRM?
        const existingMobileLead = existingDbMobilesMap.get(cleanMobile);

        if (existingMobileLead) {
          // If existing lead has the same connection number or neither has one -> Exact Duplicate
          if (!cleanConnNum || existingMobileLead.connectionNumber === cleanConnNum) {
            const stageName = STAGE_NAMES[existingMobileLead.status] || `Stage ${existingMobileLead.status}`;
            skipped.push({
              mobile: cleanMobile,
              customerName,
              connectionNumber: cleanConnNum || existingMobileLead.connectionNumber || 'N/A',
              reason: `Lead already exists in CRM (Lead Code: ${existingMobileLead.leadCode}, Current Stage: ${stageName}).`,
            });
            continue;
          }

          // Case: Multi-Meter Sibling Connection (Same Phone, but NAYA / DIFFERENT Account ID!)
          currentIdIndex += 1;
          const leadCode = `SL-${String(currentIdIndex).padStart(5, '0')}`;
          const siblingMobile = `${cleanMobile}-#${cleanConnNum}`;

          const norm = normalizeLocation(city || existingMobileLead.city, state || existingMobileLead.state, address || existingMobileLead.address, pinCode || existingMobileLead.pinCode);
          const cleanPin = pinCode ? (String(pinCode).trim().endsWith('.0') ? String(pinCode).trim().slice(0, -2) : String(pinCode).trim()) : (norm.pinCode || existingMobileLead.pinCode || '');

          let cleanLoadKw: number | null = null;
          if (sanctionedLoadKw !== null && sanctionedLoadKw !== undefined && sanctionedLoadKw !== '') {
            if (typeof sanctionedLoadKw === 'number') {
              cleanLoadKw = isNaN(sanctionedLoadKw) ? null : sanctionedLoadKw;
            } else {
              const match = String(sanctionedLoadKw).trim().match(/([0-9]+(?:\.[0-9]+)?)/);
              if (match && match[1]) {
                const parsed = parseFloat(match[1]);
                cleanLoadKw = isNaN(parsed) ? null : parsed;
              }
            }
          }

          // Build mutual links in otherData
          let newLeadOtherObj: any = {};
          try {
            if (otherData) newLeadOtherObj = typeof otherData === 'string' ? JSON.parse(otherData) : otherData;
          } catch (e) {}
          newLeadOtherObj.linkedLeadCode = existingMobileLead.leadCode;
          newLeadOtherObj.linkedAccountId = existingMobileLead.connectionNumber || 'Primary Connection';

          const newSiblingLead = await tx.lead.create({
            data: {
              leadCode,
              customerName,
              mobile: siblingMobile,
              mobileAlt: mobileAlt ? String(mobileAlt).trim() : null,
              connectionType: connectionType || 'residential',
              sanctionedLoadKw: cleanLoadKw,
              address: address || existingMobileLead.address || '',
              pinCode: cleanPin,
              city: norm.city,
              state: norm.state,
              leadSource: leadSource || 'other',
              status: 1, // Stage 1 Fresh Lead
              createdById: userPayload.id,
              otherData: JSON.stringify(newLeadOtherObj),
              isActive: true,
              discomName: discomName || existingMobileLead.discomName || null,
              connectionNumber: cleanConnNum,
            },
          });

          // Also link back on primary existing lead
          let primaryOtherObj: any = {};
          try {
            if (existingMobileLead.otherData) primaryOtherObj = JSON.parse(existingMobileLead.otherData);
          } catch (e) {}
          primaryOtherObj.linkedLeadCode = leadCode;
          primaryOtherObj.linkedAccountId = cleanConnNum;

          await tx.lead.update({
            where: { id: existingMobileLead.id },
            data: { otherData: JSON.stringify(primaryOtherObj) },
          });

          await tx.leadActivityLog.create({
            data: {
              leadId: newSiblingLead.id,
              userId: userPayload.id,
              fromStatus: null,
              toStatus: 1,
              remark: `Multi-meter connection created for Account ID: ${cleanConnNum} (Linked to Lead #${existingMobileLead.leadCode}).`,
            },
          });

          // Add to local maps to prevent collision within subsequent rows of the same batch
          existingDbAccountsMap.set(cleanConnNum, newSiblingLead as any);

          imported.push({
            id: newSiblingLead.id,
            leadCode: newSiblingLead.leadCode,
            customerName: newSiblingLead.customerName,
            mobile: cleanMobile,
            connectionNumber: cleanConnNum,
            isLinked: true,
          });
          continue;
        }

        // Check 3: Standard Fresh Lead (New Phone / New Account ID)
        currentIdIndex += 1;
        const leadCode = `SL-${String(currentIdIndex).padStart(5, '0')}`;

        const norm = normalizeLocation(city, state, address, pinCode);
        const cleanPin = pinCode ? (String(pinCode).trim().endsWith('.0') ? String(pinCode).trim().slice(0, -2) : String(pinCode).trim()) : (norm.pinCode || '');

        let cleanLoadKw: number | null = null;
        if (sanctionedLoadKw !== null && sanctionedLoadKw !== undefined && sanctionedLoadKw !== '') {
          if (typeof sanctionedLoadKw === 'number') {
            cleanLoadKw = isNaN(sanctionedLoadKw) ? null : sanctionedLoadKw;
          } else {
            const match = String(sanctionedLoadKw).trim().match(/([0-9]+(?:\.[0-9]+)?)/);
            if (match && match[1]) {
              const parsed = parseFloat(match[1]);
              cleanLoadKw = isNaN(parsed) ? null : parsed;
            }
          }
        }

        // Clean mobileAlt if present
        let cleanMobileAlt = mobileAlt ? String(mobileAlt).trim() : null;
        if (cleanMobileAlt) {
          if (/[eE][+-]?\d+/.test(cleanMobileAlt)) {
            const numAlt = Number(cleanMobileAlt.replace(/[^0-9eE.+-]/g, ''));
            if (!isNaN(numAlt) && numAlt > 0) {
              cleanMobileAlt = BigInt(Math.round(numAlt)).toString();
            }
          } else if (cleanMobileAlt.includes('.')) {
            cleanMobileAlt = cleanMobileAlt.split('.')[0];
          }
          cleanMobileAlt = cleanMobileAlt.replace(/\D/g, '');
          if (cleanMobileAlt.length === 12 && cleanMobileAlt.startsWith('91')) {
            cleanMobileAlt = cleanMobileAlt.slice(2);
          } else if (cleanMobileAlt.length === 11 && cleanMobileAlt.startsWith('0')) {
            cleanMobileAlt = cleanMobileAlt.slice(1);
          }
          if (cleanMobileAlt.length !== 10) {
            cleanMobileAlt = null;
          }
        }

        const newLead = await tx.lead.create({
          data: {
            leadCode,
            customerName,
            mobile: cleanMobile,
            mobileAlt: cleanMobileAlt,
            connectionType: connectionType || 'residential',
            sanctionedLoadKw: cleanLoadKw,
            address: address || '',
            pinCode: cleanPin,
            city: norm.city,
            state: norm.state,
            leadSource: leadSource || 'other',
            status: 1, // 1 = Fresh Lead
            createdById: userPayload.id,
            otherData: otherData ? (typeof otherData === 'string' ? otherData : JSON.stringify(otherData)) : null,
            isActive: true,
            discomName: discomName || null,
            connectionNumber: cleanConnNum,
          },
        });

        await tx.leadActivityLog.create({
          data: {
            leadId: newLead.id,
            userId: userPayload.id,
            fromStatus: null,
            toStatus: 1,
            remark: isAccountOnly 
              ? `Lead imported as a Fresh Lead from CSV based on Account ID: ${cleanConnNum}.`
              : 'Lead imported as a Fresh Lead from CSV.',
          },
        });

        if (cleanConnNum) existingDbAccountsMap.set(cleanConnNum, newLead as any);
        existingDbMobilesMap.set(cleanMobile, newLead as any);

        imported.push({
          id: newLead.id,
          leadCode: newLead.leadCode,
          customerName: newLead.customerName,
          mobile: isAccountOnly ? 'N/A' : newLead.mobile,
          connectionNumber: cleanConnNum,
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
