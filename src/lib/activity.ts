import { prisma } from './db';

type PrismaTx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Logs a standard CRM action into the Activity table.
 * Supports running inside database transactions by passing the transaction context.
 */
export async function logActivity(
  employeeId: number,
  leadId: number | null,
  activityType: string,
  metadata?: any,
  tx?: PrismaTx
) {
  const db = tx || prisma;
  try {
    return await db.activity.create({
      data: {
        employeeId,
        leadId,
        activityType,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error('[logActivity] Error logging activity:', error);
  }
}
