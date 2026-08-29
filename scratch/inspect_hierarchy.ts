import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function test() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        reportsTo: true,
        supervisor: { select: { id: true, name: true } }
      }
    });

    console.log("=== USER REPORTING CHAIN ===");
    for (const u of users) {
      console.log(`ID: ${u.id} | Name: ${u.name} | Reports To: ${u.reportsTo ? `${u.reportsTo} (${u.supervisor?.name})` : 'None'}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
