import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('=== SEARCHING FOR BHELPUR LEADS IN DATABASE ===');
  
  const countAddress = await prisma.lead.count({
    where: {
      address: { contains: 'Bhelpur', mode: 'insensitive' },
      isActive: true,
    }
  });

  const countCity = await prisma.lead.count({
    where: {
      city: { contains: 'Bhelpur', mode: 'insensitive' },
      isActive: true,
    }
  });

  const countOther = await prisma.lead.count({
    where: {
      otherData: { contains: 'Bhelpur', mode: 'insensitive' },
      isActive: true,
    }
  });

  const countUnassignedBhelpur = await prisma.lead.count({
    where: {
      OR: [
        { address: { contains: 'Bhelpur', mode: 'insensitive' } },
        { city: { contains: 'Bhelpur', mode: 'insensitive' } },
        { otherData: { contains: 'Bhelpur', mode: 'insensitive' } }
      ],
      isActive: true,
      assignedConsultantId: null,
      assignedTlId: null,
    }
  });

  console.log(`Total Active Bhelpur in Address: ${countAddress}`);
  console.log(`Total Active Bhelpur in City: ${countCity}`);
  console.log(`Total Active Bhelpur in otherData: ${countOther}`);
  console.log(`Total Unassigned Bhelpur Leads: ${countUnassignedBhelpur}`);

  const sample = await prisma.lead.findMany({
    where: {
      OR: [
        { address: { contains: 'Bhelpur', mode: 'insensitive' } },
        { city: { contains: 'Bhelpur', mode: 'insensitive' } },
        { otherData: { contains: 'Bhelpur', mode: 'insensitive' } }
      ],
      isActive: true,
    },
    take: 5,
    select: {
      id: true,
      leadCode: true,
      customerName: true,
      mobile: true,
      address: true,
      city: true,
      status: true,
      assignedConsultantId: true,
      assignedManagerId: true,
    }
  });

  console.log('\n--- Sample 5 Bhelpur Leads ---');
  console.log(sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
