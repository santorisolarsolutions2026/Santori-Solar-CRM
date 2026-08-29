import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function test() {
  try {
    const leadIds = ['SL-72871', 'SL-52397', 'SL-72292'];
    const leads = await prisma.lead.findMany({
      where: {
        leadCode: { in: leadIds }
      },
      select: {
        id: true,
        leadCode: true,
        customerName: true,
        assignedManagerId: true,
        manager: { select: { id: true, name: true } },
        assignedConsultantId: true,
        consultant: { select: { id: true, name: true } }
      }
    });

    console.log("=== INSPECTED LEADS ===");
    console.log(JSON.stringify(leads, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
