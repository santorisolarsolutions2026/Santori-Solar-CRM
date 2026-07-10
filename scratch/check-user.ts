import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { getUserPermissions } from '../src/lib/auth';

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { name: { contains: 'Deepak', mode: 'insensitive' } }
    });

    if (!user) {
      console.log('User Deepak not found.');
      return;
    }

    const permissions = await getUserPermissions(user.id);
    console.log({
      id: user.id,
      name: user.name,
      role: user.role,
      permissionsInDb: user.permissions,
      computedPermissions: permissions,
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
