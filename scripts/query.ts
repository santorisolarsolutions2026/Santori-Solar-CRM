import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  try {
    console.log("=== ACTIVE & INACTIVE LEADS IN STAGES 6, 12, 13 ===");
    const leads = await prisma.lead.findMany({
      where: {
        status: { in: [6, 12, 13] }
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            orderCode: true,
          }
        }
      }
    });
    console.log(JSON.stringify(leads.map(l => ({
      id: l.id,
      leadCode: l.leadCode,
      customerName: l.customerName,
      status: l.status,
      isActive: l.isActive,
      order: l.order
    })), null, 2));

    console.log("\n=== COMPLETED ORDERS ===");
    const orders = await prisma.order.findMany({
      where: {
        status: 'completed'
      },
      include: {
        lead: {
          select: {
            id: true,
            leadCode: true,
            isActive: true,
            status: true,
            customerName: true
          }
        }
      }
    });
    console.log(JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
