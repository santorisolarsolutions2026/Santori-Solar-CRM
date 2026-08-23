import { prisma } from '../src/lib/db';

async function main() {
  const counts = await prisma.lead.groupBy({
    by: ['status'],
    _count: {
      id: true
    },
    orderBy: {
      status: 'asc'
    }
  });

  console.log('--- LEADS COUNT BY STAGE ---');
  for (const c of counts) {
    console.log(`Stage: ${c.status} | Count: ${c._count.id}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
