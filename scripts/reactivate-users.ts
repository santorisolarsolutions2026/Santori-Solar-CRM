import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log("Reactivating all users in database...");
  const result = await prisma.user.updateMany({
    data: {
      isActive: true
    }
  });
  console.log(`Successfully reactivated ${result.count} users.`);
}

main()
  .catch(err => {
    console.error("Error reactivating users:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
