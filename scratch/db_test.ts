import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function test() {
  console.log("Testing database connection...");
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      }
    });
    console.log("Database connection successful!");
    console.log("Users in DB:", users);
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

test();
