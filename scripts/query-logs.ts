import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const logs = await prisma.leadActivityLog.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { name: true, role: true } },
      lead: { select: { customerName: true, leadCode: true } }
    }
  });

  console.log("=== LEAD ACTIVITY LOGS ===");
  for (const log of logs) {
    console.log(`[${log.createdAt.toISOString()}] Lead: ${log.lead.customerName} (${log.lead.leadCode}) | From: ${log.fromStatus} -> To: ${log.toStatus} | User: ${log.user.name} (${log.user.role}) | Remark: ${log.remark}`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
