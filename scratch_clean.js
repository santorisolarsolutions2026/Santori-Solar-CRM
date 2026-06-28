const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/solar_crm' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { isActive: false },
        { email: { contains: 'kartikey' } },
      ],
    },
  });

  console.log('Found users:', users.map(u => ({ id: u.id, name: u.name, email: u.email, isActive: u.isActive })));

  for (const u of users) {
    if (!u.isActive || u.email.includes('kartikey')) {
      if (!u.email.startsWith('deleted_')) {
        const newEmail = `deleted_${u.id}_${u.email}`;
        await prisma.user.update({
          where: { id: u.id },
          data: {
            email: newEmail,
            isActive: false,
            employeeId: null,
          },
        });
        console.log(`Updated user ${u.id} (${u.name}) email to ${newEmail}`);
      }
    }
  }

  console.log('Cleanup finished!');
}

main().catch(console.error).finally(() => pool.end());
