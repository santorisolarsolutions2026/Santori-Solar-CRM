import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  console.log("=== USERS IN DB ===");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
