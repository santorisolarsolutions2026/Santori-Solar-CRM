import { prisma } from './db';

interface AuditParams {
  userId: number;
  tableName: string;
  recordId: number;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  leadId?: number | null;
  employeeName?: string | null;
  employeeCode?: string | null;
  module?: string | null; // sales | finance | operations | admin
  action?: string | null;
  deviceInfo?: string | null;
  ip?: string | null;
  req?: Request | null;
}

export async function recordAuditLog(params: AuditParams) {
  try {
    let empName = params.employeeName;
    let empCode = params.employeeCode;

    if ((!empName || !empCode) && params.userId) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { name: true, employeeId: true }
      });
      if (user) {
        empName = empName || user.name;
        empCode = empCode || user.employeeId || `EMP-${user.name.substring(0, 3).toUpperCase()}`;
      }
    }

    let clientIp = params.ip || null;
    let devInfo = params.deviceInfo || null;

    if (params.req) {
      clientIp = clientIp || params.req.headers.get('x-forwarded-for') || params.req.headers.get('x-real-ip') || '127.0.0.1';
      devInfo = devInfo || params.req.headers.get('user-agent') || 'Browser / Unknown Device';
    }

    return await prisma.auditLog.create({
      data: {
        userId: params.userId,
        tableName: params.tableName,
        recordId: params.recordId,
        fieldName: params.fieldName,
        oldValue: params.oldValue ? String(params.oldValue) : null,
        newValue: params.newValue ? String(params.newValue) : null,
        leadId: params.leadId || null,
        employeeName: empName || `User #${params.userId}`,
        employeeCode: empCode || `EMP-${params.userId}`,
        module: params.module || 'system',
        action: params.action || `Updated ${params.fieldName} on ${params.tableName}`,
        deviceInfo: devInfo || 'Web App',
        ip: clientIp || '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}

