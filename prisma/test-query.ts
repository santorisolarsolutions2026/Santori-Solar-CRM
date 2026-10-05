import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          const value = trimmed.substring(index + 1).trim().replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.error('Failed to parse .env file:', err);
}

const dbUser = process.env.DB_USER || "postgres";
const dbPassword = process.env.DB_PASSWORD || "";
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = process.env.DB_PORT || "5432";
const dbName = process.env.DB_NAME || "solar_crm";

const connectionString = process.env.DATABASE_URL || `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { leadCode: 'SL-292177' },
        { leadCode: { contains: '292177' } },
        { id: 292177 }
      ]
    },
    include: {
      consultant: { select: { id: true, name: true, role: true, email: true } },
      tl: { select: { id: true, name: true, role: true } },
      manager: { select: { id: true, name: true, role: true } },
      creator: { select: { id: true, name: true, role: true } },
      activityLogs: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' }
      },
      auditLogs: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' }
      },
      employeeAssignments: {
        include: {
          employee: { select: { id: true, name: true, role: true } },
          assignedBy: { select: { id: true, name: true, role: true } }
        },
        orderBy: { assignedAt: 'asc' }
      },
      meetings: {
        orderBy: { createdAt: 'asc' }
      },
      tasks: true,
      order: true
    }
  });

  console.log('--- LEAD DETAILS ---');
  console.log(JSON.stringify(lead, null, 2));
}

main().finally(() => pool.end());
