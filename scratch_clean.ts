import "dotenv/config";
import { prisma } from './src/lib/db';

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      deliveryDate: true,
      deliveryTime: true,
      isDelivered: true,
    }
  });
  console.log('Orders found:', orders.length);
  console.log('Sample order deliveryDate:', orders[0]?.deliveryDate);
}

main().catch(console.error).finally(() => prisma.$disconnect());
