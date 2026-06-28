import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

function createPrismaClient() {
  const dbUser = process.env.DB_USER || "postgres";
  const dbPassword = process.env.DB_PASSWORD || "";
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = process.env.DB_PORT || "5432";
  const dbName = process.env.DB_NAME || "solarcrm";

  console.log("[db.ts] dbUser:", dbUser);
  console.log("[db.ts] dbPassword length:", dbPassword ? dbPassword.length : 'empty');
  console.log("[db.ts] dbHost:", dbHost);
  console.log("[db.ts] dbPort:", dbPort);
  console.log("[db.ts] dbName:", dbName);

  const connectionString = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?schema=public`;

  const ssl = dbHost !== 'localhost' && dbHost !== '127.0.5.1' && dbHost !== '127.0.0.1'
    ? { rejectUnauthorized: false }
    : undefined;

  const pool = new pg.Pool({ connectionString, ssl, password: dbPassword });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!globalForPrisma.prisma || !(globalForPrisma.prisma as any).attendance) {
    globalForPrisma.prisma = createPrismaClient();
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
export * from '../generated/prisma/client';
