const { PrismaClient } = require('../src/generated/prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      reportsTo: true,
      designation: {
        select: {
          name: true,
          level: true
        }
      }
    }
  });

  console.log('--- ALL USERS ---');
  for (const u of users) {
    console.log(`ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | ReportsTo: ${u.reportsTo} | Designation: ${u.designation?.name} | Level: ${u.designation?.level}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
