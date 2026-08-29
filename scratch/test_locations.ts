import { prisma } from '../src/lib/db';

async function main() {
  console.log("=== LEADS IN DATABASE ===");
  const totalLeads = await prisma.lead.count();
  const activeLeads = await prisma.lead.count({ where: { isActive: true } });
  const inactiveLeads = await prisma.lead.count({ where: { isActive: false } });
  console.log(`Total Leads: ${totalLeads}`);
  console.log(`Active Leads: ${activeLeads}`);
  console.log(`Inactive Leads: ${inactiveLeads}`);

  console.log("\n=== LEADS WITH ACTIVE STATES/CITIES ===");
  const leadsWithLocation = await prisma.lead.findMany({
    where: { isActive: true },
    select: { state: true, city: true },
    distinct: ['state', 'city'],
    take: 10
  });
  console.log("Active leads locations sample:", leadsWithLocation);

  console.log("\n=== LEADS OF ORDERS ===");
  const ordersCount = await prisma.order.count();
  console.log(`Total Orders: ${ordersCount}`);

  const ordersLeadsActive = await prisma.order.count({
    where: { lead: { isActive: true } }
  });
  const ordersLeadsInactive = await prisma.order.count({
    where: { lead: { isActive: false } }
  });
  console.log(`Orders with Active Leads: ${ordersLeadsActive}`);
  console.log(`Orders with Inactive Leads: ${ordersLeadsInactive}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
