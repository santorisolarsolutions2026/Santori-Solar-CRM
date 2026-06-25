const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log("Users count:", users.length);
  console.log("Users:", users.map(u => ({ id: u.id, name: u.name, role: u.role, isActive: u.isActive })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
