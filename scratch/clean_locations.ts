import { prisma } from '../src/lib/db';

async function main() {
  console.log('--- STARTING LOCATION CLEANUP ---');

  // 1. Clean UP -> Uttar Pradesh
  const stateUpdate = await prisma.lead.updateMany({
    where: {
      state: {
        equals: 'UP',
        mode: 'insensitive'
      }
    },
    data: {
      state: 'Uttar Pradesh'
    }
  });
  console.log(`Updated state 'UP' to 'Uttar Pradesh' for ${stateUpdate.count} leads.`);

  // 2. Clean Allahabad -> Prayagraj
  const cityUpdate = await prisma.lead.updateMany({
    where: {
      city: {
        equals: 'Allahabad',
        mode: 'insensitive'
      }
    },
    data: {
      city: 'Prayagraj'
    }
  });
  console.log(`Updated city 'Allahabad' to 'Prayagraj' for ${cityUpdate.count} leads.`);

  console.log('--- LOCATION CLEANUP COMPLETED ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
