import { prisma } from './src/lib/db';

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

main().catch(console.error).finally(() => prisma.$disconnect());
