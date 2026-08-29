import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function test() {
  try {
    const users = await prisma.user.findMany({
      include: {
        designation: true,
        department: true
      },
      orderBy: { id: 'asc' }
    });

    console.log("=== ALL USERS IN SYSTEM ===");
    for (const u of users) {
      console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Designation: ${u.designation?.name} (Level: ${u.designation?.level}) | Active: ${u.isActive}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
