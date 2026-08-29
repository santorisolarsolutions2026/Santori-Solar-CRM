import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function test() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: true
      }
    });

    console.log("=== LEADS OWNER BREAKDOWN ===");
    for (const u of users) {
      const managerLeads = await prisma.lead.count({ where: { assignedManagerId: u.id, isActive: true } });
      const tlLeads = await prisma.lead.count({ where: { assignedTlId: u.id, isActive: true } });
      const consultantLeads = await prisma.lead.count({ where: { assignedConsultantId: u.id, isActive: true } });
      const totalLeads = managerLeads + tlLeads + consultantLeads;

      if (totalLeads > 0 || u.isActive) {
        console.log(`ID: ${u.id} | Name: ${u.name.padEnd(20)} | Email: ${u.email.padEnd(40)} | Active: ${String(u.isActive).padEnd(5)} | Role: ${u.role.padEnd(12)} | MgrLeads: ${String(managerLeads).padEnd(4)} | TlLeads: ${String(tlLeads).padEnd(3)} | ConsLeads: ${String(consultantLeads).padEnd(4)} | Total: ${totalLeads}`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
