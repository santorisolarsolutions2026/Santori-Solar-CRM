import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
  const dbUser = process.env.DB_USER || "postgres";
  const dbPassword = process.env.DB_PASSWORD || "";
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = process.env.DB_PORT || "5432";
  const dbName = process.env.DB_NAME || "solar_crm";

  const connectionString = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?schema=public`;

  const pool = new pg.Pool({ connectionString, password: dbPassword });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  console.log("Executing exact findMany select query...");
  const users = await client.user.findMany({
    where: {},
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      employeeId: true,
      role: true,
      reportsTo: true,
      isActive: true,
      lastSeenAt: true,
      createdAt: true,
      lastLoginAt: true,
      loginLocation: true,
      lastLogoutAt: true,
      logoutLocation: true,
      joiningDate: true,
      photograph: true,
      permissions: true,
      supervisor: { select: { id: true, name: true } },
      _count: {
        select: {
          consultantLeads: { where: { status: 13 } },
          tlLeads: { where: { status: 13 } },
          managedLeads: { where: { status: 13 } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log("Query success! count:", users.length);
  await pool.end();
}

main().catch(console.error);
