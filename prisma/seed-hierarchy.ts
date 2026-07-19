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
  console.log('--- START SEEDING HIERARCHY ---');
  const passwordHash = await bcrypt.hash('Password123', 10);

  // Clear everything to prevent foreign key errors
  console.log('Clearing database tables...');
  await prisma.activity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.orderDocument.deleteMany();
  await prisma.order.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.meetingBooking.deleteMany();
  await prisma.leadActivityLog.deleteMany();
  await prisma.employeeAssignment.deleteMany();
  await prisma.leadTeamAssignment.deleteMany();
  await prisma.leadTask.deleteMany();
  await prisma.leadDocument.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.department.deleteMany();

  // 1. Create Departments
  const getOrCreateDept = async (name: string) => {
    return prisma.department.create({ data: { name } });
  };

  const adminDept = await getOrCreateDept('Admin');
  const salesDept = await getOrCreateDept('Sales');
  const financeDept = await getOrCreateDept('Finance');
  const opsDept = await getOrCreateDept('Operations');
  const itDept = await getOrCreateDept('IT');

  // 2. Seed Designation levels
  const getOrCreateDesignation = async (name: string, level: number, departmentId: number | null = null) => {
    return prisma.designation.create({
      data: { name, level, departmentId }
    });
  };

  const adminDes = await getOrCreateDesignation('System Admin', 0);
  const headDes = await getOrCreateDesignation('Department Head', 1);
  const srManagerDes = await getOrCreateDesignation('Senior Manager', 2);
  const managerDes = await getOrCreateDesignation('Manager', 3);
  const tlDes = await getOrCreateDesignation('Team Leader', 4);
  const consultantDes = await getOrCreateDesignation('Consultant', 5);
  const psaConsultantDes = await getOrCreateDesignation('PSA Consultant', 6, salesDept.id);

  // 3. Seed users establishing the direct supervisor relationships
  const createUser = async (name: string, email: string, role: string, deptId: number, desId: number, reportsToId: number | null = null) => {
    return prisma.user.create({
      data: {
        name,
        email,
        phone: '9999999999',
        passwordHash,
        role,
        isActive: true,
        departmentId: deptId,
        designationId: desId,
        reportsTo: reportsToId
      }
    });
  };

  console.log('Seeding users and building relationships...');

  // Level 0 - Admin
  const adminUser = await createUser('Main Admin', 'admin@solarcrm.com', 'admin', adminDept.id, adminDes.id);
  console.log(`Created: ${adminUser.name} (Level 0 System Admin)`);

  // Helper to build a complete reporting stack for a department
  const buildDeptHierarchy = async (deptName: string, deptId: number, headRole: string, otherRole: string) => {
    console.log(`Building hierarchy for ${deptName} Department...`);
    
    // Level 1 Head (reports to Admin)
    const head = await createUser(`${deptName} Head`, `${deptName.toLowerCase()}head@solarcrm.com`, headRole, deptId, headDes.id, adminUser.id);
    
    // Level 2 Senior Manager (reports to Head)
    const srmgr = await createUser(`${deptName} Senior Manager`, `${deptName.toLowerCase()}srmgr@solarcrm.com`, otherRole, deptId, srManagerDes.id, head.id);
    
    // Level 3 Manager (reports to Senior Manager)
    const mgr = await createUser(`${deptName} Manager`, `${deptName.toLowerCase()}mgr@solarcrm.com`, otherRole, deptId, managerDes.id, srmgr.id);
    
    // Level 4 Team Leader (reports to Manager)
    const tl = await createUser(`${deptName} Team Leader`, `${deptName.toLowerCase()}tl@solarcrm.com`, otherRole, deptId, tlDes.id, mgr.id);
    
    // Level 5 Consultant (reports to Team Leader)
    const consultant = await createUser(`${deptName} Consultant`, `${deptName.toLowerCase()}consultant@solarcrm.com`, otherRole, deptId, consultantDes.id, tl.id);

    console.log(`- Created Head, Senior Manager, Manager, TL, Consultant for ${deptName}`);

    return { head, srmgr, mgr, tl, consultant };
  };

  // Seed Sales department
  const salesStack = await buildDeptHierarchy('Sales', salesDept.id, 'sales_head', 'consultant');
  // Add Level 6 PSA Consultant for Sales (reports to Sales Consultant)
  const salesPsa = await createUser('Sales PSA Consultant', 'salespsa@solarcrm.com', 'psa', salesDept.id, psaConsultantDes.id, salesStack.consultant.id);
  console.log(`- Created PSA Consultant reporting to Sales Consultant`);

  // Seed Finance department
  await buildDeptHierarchy('Finance', financeDept.id, 'finance', 'finance');

  // Seed Operations department
  await buildDeptHierarchy('Operations', opsDept.id, 'operations', 'operations');

  // Seed IT department
  await buildDeptHierarchy('IT', itDept.id, 'admin', 'admin');

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
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
