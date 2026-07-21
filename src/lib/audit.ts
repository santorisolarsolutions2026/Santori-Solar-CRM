import { prisma } from './db';

interface AuditParams {
  userId: number;
  tableName: string;
  recordId: number;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  leadId?: number | null;
  ip?: string | null;
}

export async function recordAuditLog(params: AuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId,
        tableName: params.tableName,
        recordId: params.recordId,
        fieldName: params.fieldName,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        leadId: params.leadId || null,
        ip: params.ip || null,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}
