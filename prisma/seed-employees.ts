import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
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
  console.log('Seeding employees per designation...');
  const passwordHash = await bcrypt.hash('Password123', 10);

  // Fetch departments
  const departments = await prisma.department.findMany();
  const salesDept = departments.find(d => d.name === 'Sales');
  const financeDept = departments.find(d => d.name === 'Finance');
  const opsDept = departments.find(d => d.name === 'Operations');
  const itDept = departments.find(d => d.name === 'IT');

  if (!salesDept || !financeDept || !opsDept || !itDept) {
    console.error('Core departments missing. Please run seed.ts first.');
    return;
  }

  // Fetch designations
  const designations = await prisma.designation.findMany();

  // Helper function to create if not exists
  const getOrCreateUser = async (name: string, email: string, role: string, deptId: number, desId: number) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`User ${email} already exists.`);
      return existing;
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: '9999999999',
        passwordHash,
        role,
        isActive: true,
        departmentId: deptId,
        designationId: desId
      }
    });
    console.log(`Created user ${name} (${email}) - Role: ${role}`);
    return user;
  };

  // PSA Designations (inside Sales department)
  const psaSrMgrDes = designations.find(d => d.name === 'PSA Senior Manager');
  const psaMgrDes = designations.find(d => d.name === 'PSA Manager');
  const psaTlDes = designations.find(d => d.name === 'PSA TL');
  const psaConsDes = designations.find(d => d.name === 'PSA Consultant');

  if (psaSrMgrDes) await getOrCreateUser('PSA Senior Manager User', 'psasrmgr@solarcrm.com', 'psa', salesDept.id, psaSrMgrDes.id);
  if (psaMgrDes) await getOrCreateUser('PSA Manager User', 'psamgr@solarcrm.com', 'psa', salesDept.id, psaMgrDes.id);
  if (psaTlDes) await getOrCreateUser('PSA TL User', 'psatl@solarcrm.com', 'psa', salesDept.id, psaTlDes.id);
  if (psaConsDes) await getOrCreateUser('PSA Consultant User', 'psaconsultant@solarcrm.com', 'psa', salesDept.id, psaConsDes.id);

  // Sales Designations
  const headDes = designations.find(d => d.name === 'Head');
  const srManagerDes = designations.find(d => d.name === 'Senior Manager');
  const managerDes = designations.find(d => d.name === 'Manager');
  const tlDes = designations.find(d => d.name === 'TL');
  const consultantDes = designations.find(d => d.name === 'Consultant');

  if (headDes) await getOrCreateUser('Sales Head User', 'saleshead_test@solarcrm.com', 'sales_head', salesDept.id, headDes.id);
  if (srManagerDes) await getOrCreateUser('Sales Senior Manager User', 'salessrmgr@solarcrm.com', 'manager', salesDept.id, srManagerDes.id);
  if (managerDes) await getOrCreateUser('Sales Manager User', 'salesmgr@solarcrm.com', 'manager', salesDept.id, managerDes.id);
  if (tlDes) await getOrCreateUser('Sales TL User', 'salestl@solarcrm.com', 'tl', salesDept.id, tlDes.id);
  if (consultantDes) await getOrCreateUser('Sales Consultant User', 'salesconsultant@solarcrm.com', 'consultant', salesDept.id, consultantDes.id);

  // Finance Designations
  if (headDes) await getOrCreateUser('Finance Head User', 'financehead@solarcrm.com', 'finance', financeDept.id, headDes.id);
  if (managerDes) await getOrCreateUser('Finance Manager User', 'financemgr@solarcrm.com', 'finance', financeDept.id, managerDes.id);
  if (tlDes) await getOrCreateUser('Finance TL User', 'financetl@solarcrm.com', 'finance', financeDept.id, tlDes.id);
  if (consultantDes) await getOrCreateUser('Finance Consultant User', 'financeconsultant@solarcrm.com', 'finance', financeDept.id, consultantDes.id);

  // Operations Designations
  if (headDes) await getOrCreateUser('Operations Head User', 'opshead@solarcrm.com', 'operations', opsDept.id, headDes.id);
  if (managerDes) await getOrCreateUser('Operations Manager User', 'opsmgr@solarcrm.com', 'operations', opsDept.id, managerDes.id);
  if (tlDes) await getOrCreateUser('Operations TL User', 'opstl@solarcrm.com', 'operations', opsDept.id, tlDes.id);
  if (consultantDes) await getOrCreateUser('Operations Consultant User', 'opsconsultant@solarcrm.com', 'operations', opsDept.id, consultantDes.id);

  // IT Designations
  const adminDes = designations.find(d => d.name === 'Admin');
  if (adminDes) await getOrCreateUser('IT Admin User', 'itadmin@solarcrm.com', 'admin', itDept.id, adminDes.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
