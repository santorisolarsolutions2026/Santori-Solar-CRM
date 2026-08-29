import { prisma } from '../src/lib/db';

async function main() {
  const states = await prisma.lead.groupBy({
    by: ['state'],
    _count: { id: true }
  });
  console.log('--- UNIQUE STATES IN DB ---');
  states.forEach(s => console.log(`State: "${s.state}" | Count: ${s._count.id}`));

  const cities = await prisma.lead.groupBy({
    by: ['city'],
    _count: { id: true },
    orderBy: { city: 'asc' }
  });
  console.log('\n--- UNIQUE CITIES IN DB (first 50) ---');
  cities.slice(0, 50).forEach(c => console.log(`City: "${c.city}" | Count: ${c._count.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
