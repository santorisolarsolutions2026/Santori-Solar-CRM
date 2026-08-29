import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function test() {
  try {
    const managers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ['manager', 'sales_head', 'admin', 'director'] } },
          { designation: { level: { lte: 3 } } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: { select: { name: true, level: true } }
      }
    });

    console.log("=== MANAGERS AND THEIR LEADS COUNT ===");
    for (const m of managers) {
      const managerCount = await prisma.lead.count({
        where: { assignedManagerId: m.id, isActive: true }
      });
      const tlCount = await prisma.lead.count({
        where: { assignedTlId: m.id, isActive: true }
      });
      const consultantCount = await prisma.lead.count({
        where: { assignedConsultantId: m.id, isActive: true }
      });
      console.log(`ID: ${m.id} | Name: ${m.name} | Email: ${m.email} | ManagerLeads: ${managerCount} | TlLeads: ${tlCount} | ConsultantLeads: ${consultantCount}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
