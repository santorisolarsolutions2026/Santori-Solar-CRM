import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function test() {
  try {
    console.log("=== MANAGER ID 131 LEADS COUNT ===");
    console.log("Active leads:", await prisma.lead.count({ where: { assignedManagerId: 131, isActive: true } }));
    console.log("Inactive leads:", await prisma.lead.count({ where: { assignedManagerId: 131, isActive: false } }));
    console.log("Total leads:", await prisma.lead.count({ where: { assignedManagerId: 131 } }));

    console.log("\n=== MANAGER ID 120 LEADS COUNT ===");
    console.log("Active leads:", await prisma.lead.count({ where: { assignedManagerId: 120, isActive: true } }));
    console.log("Inactive leads:", await prisma.lead.count({ where: { assignedManagerId: 120, isActive: false } }));
    console.log("Total leads:", await prisma.lead.count({ where: { assignedManagerId: 120 } }));

    console.log("\n=== MANAGER ID 130 LEADS COUNT ===");
    console.log("Active leads:", await prisma.lead.count({ where: { assignedManagerId: 130, isActive: true } }));
    console.log("Inactive leads:", await prisma.lead.count({ where: { assignedManagerId: 130, isActive: false } }));
    console.log("Total leads:", await prisma.lead.count({ where: { assignedManagerId: 130 } }));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
