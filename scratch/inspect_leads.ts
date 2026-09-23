import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const localities = [
    'bhelupur', 'bhelupura', 'durgakund', 'sigra', 'lanka', 
    'gurubagh', 'assi', 'khojwa', 'mahmoorganj', 'sonarpura',
    'jawahar nagar', 'ravindrapuri', 'nagwa', 'luxa'
  ];

  console.log('=== Bhelupur Division Localities (Varanasi) ===');
  for (const loc of localities) {
    const total = await prisma.lead.count({
      where: {
        address: { contains: loc, mode: 'insensitive' },
        city: { contains: 'Varanasi', mode: 'insensitive' }
      }
    });
    const unassigned = await prisma.lead.count({
      where: {
        address: { contains: loc, mode: 'insensitive' },
        city: { contains: 'Varanasi', mode: 'insensitive' },
        assignedConsultantId: null
      }
    });
    console.log(`${loc.padEnd(16)} -> Total: ${total.toString().padEnd(5)} | Unassigned: ${unassigned}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
