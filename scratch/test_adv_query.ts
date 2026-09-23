import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { parseQuery } from '../src/lib/queryParser';

async function main() {
  const queryObj = {
    logicalOperator: 'AND' as const,
    rules: [
      {
        field: 'address',
        operator: 'contains',
        value: 'Bhelupur'
      },
      {
        field: 'assignedConsultantId',
        operator: 'does_not_exist',
        value: ''
      }
    ]
  };

  const parsed = parseQuery(queryObj);
  console.log('Parsed Query:', JSON.stringify(parsed, null, 2));

  const count = await prisma.lead.count({
    where: {
      ...parsed,
      isActive: true
    }
  });

  console.log('Total Unassigned Bhelupur Leads via Advanced Query:', count);

  const sample = await prisma.lead.findMany({
    where: {
      ...parsed,
      isActive: true
    },
    take: 3,
    select: {
      id: true,
      leadCode: true,
      customerName: true,
      address: true,
      assignedConsultantId: true
    }
  });

  console.log('Sample matching leads:', sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
