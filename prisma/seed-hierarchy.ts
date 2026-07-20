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
  console.log('--- START SEEDING HIERARCHY WITH REAL INDIAN NAMES ---');
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

  // 3. Create Teams
  console.log('Seeding Clans (Teams)...');
  const salesTeam = await prisma.team.create({
    data: { name: 'Sales Tigers', departmentId: salesDept.id }
  });
  const financeTeam = await prisma.team.create({
    data: { name: 'Finance Wizards', departmentId: financeDept.id }
  });
  const opsTeam = await prisma.team.create({
    data: { name: 'Ops Builders', departmentId: opsDept.id }
  });

  // 4. Seed users
  const createUser = async (name: string, email: string, role: string, deptId: number, desId: number, reportsToId: number | null = null, teamId: number | null = null) => {
    return prisma.user.create({
      data: {
        name,
        email,
        phone: '9876543210',
        passwordHash,
        role,
        isActive: true,
        departmentId: deptId,
        designationId: desId,
        reportsTo: reportsToId,
        teamId: teamId
      }
    });
  };

  console.log('Seeding users and building relationships...');

  // Level 0 - Admin (Aarav Sharma)
  const adminUser = await createUser('Aarav Sharma', 'admin@solarcrm.com', 'admin', adminDept.id, adminDes.id);
  console.log(`Created: ${adminUser.name} (Level 0 System Admin)`);

  // --- SALES DEPARTMENT ---
  console.log('Building Sales hierarchy...');
  const salesHead = await createUser('Rajesh Kumar', 'rajesh.k@solarcrm.com', 'sales_head', salesDept.id, headDes.id, adminUser.id, salesTeam.id);
  
  // Level 2 Sr. Managers reporting to Sales Head
  const salesSrMgr1 = await createUser('Amit Patel', 'amit.p@solarcrm.com', 'manager', salesDept.id, srManagerDes.id, salesHead.id, salesTeam.id);
  const salesSrMgr2 = await createUser('Priya Sharma', 'priya.s@solarcrm.com', 'manager', salesDept.id, srManagerDes.id, salesHead.id, salesTeam.id);

  // Level 3 Managers reporting to Sr. Managers
  const salesMgr1 = await createUser('Vikram Singh', 'vikram.s@solarcrm.com', 'manager', salesDept.id, managerDes.id, salesSrMgr1.id, salesTeam.id);
  const salesMgr2 = await createUser('Ananya Rao', 'ananya.r@solarcrm.com', 'manager', salesDept.id, managerDes.id, salesSrMgr2.id, salesTeam.id);

  // Level 4 Team Leaders reporting to Managers
  const salesTl1 = await createUser('Sandeep Verma', 'sandeep.v@solarcrm.com', 'tl', salesDept.id, tlDes.id, salesMgr1.id, salesTeam.id);
  const salesTl2 = await createUser('Neha Gupta', 'neha.g@solarcrm.com', 'tl', salesDept.id, tlDes.id, salesMgr1.id, salesTeam.id);
  const salesTl3 = await createUser('Karan Malhotra', 'karan.m@solarcrm.com', 'tl', salesDept.id, tlDes.id, salesMgr2.id, salesTeam.id);

  // Level 5 Consultants reporting to TLs
  const salesConsultant1 = await createUser('Rohan Das', 'rohan.d@solarcrm.com', 'consultant', salesDept.id, consultantDes.id, salesTl1.id, salesTeam.id);
  const salesConsultant2 = await createUser('Aditi Iyer', 'aditi.i@solarcrm.com', 'consultant', salesDept.id, consultantDes.id, salesTl1.id, salesTeam.id);
  const salesConsultant3 = await createUser('Rahul Bose', 'rahul.b@solarcrm.com', 'consultant', salesDept.id, consultantDes.id, salesTl2.id, salesTeam.id);
  const salesConsultant4 = await createUser('Sneha Reddy', 'sneha.r@solarcrm.com', 'consultant', salesDept.id, consultantDes.id, salesTl3.id, salesTeam.id);

  // Level 6 PSA Consultants reporting to Consultants
  await createUser('Arjun Mehta', 'arjun.m@solarcrm.com', 'psa', salesDept.id, psaConsultantDes.id, salesConsultant1.id, salesTeam.id);
  await createUser('Kavita Nair', 'kavita.n@solarcrm.com', 'psa', salesDept.id, psaConsultantDes.id, salesConsultant2.id, salesTeam.id);
  await createUser('Manish Joshi', 'manish.j@solarcrm.com', 'psa', salesDept.id, psaConsultantDes.id, salesConsultant3.id, salesTeam.id);
  await createUser('Divya Pillai', 'divya.p@solarcrm.com', 'psa', salesDept.id, psaConsultantDes.id, salesConsultant4.id, salesTeam.id);


  // --- FINANCE DEPARTMENT ---
  console.log('Building Finance hierarchy...');
  const financeHead = await createUser('Sunita Deshmukh', 'sunita.d@solarcrm.com', 'finance', financeDept.id, headDes.id, adminUser.id, financeTeam.id);
  const financeSrMgr = await createUser('Suresh Menon', 'suresh.m@solarcrm.com', 'finance', financeDept.id, srManagerDes.id, financeHead.id, financeTeam.id);
  const financeMgr = await createUser('Meera Nair', 'meera.n@solarcrm.com', 'finance', financeDept.id, managerDes.id, financeSrMgr.id, financeTeam.id);
  const financeTl = await createUser('Vijay Pillai', 'vijay.p@solarcrm.com', 'finance', financeDept.id, tlDes.id, financeMgr.id, financeTeam.id);
  
  // Multiple consultants for Finance
  await createUser('Deepak Shenoy', 'deepak.s@solarcrm.com', 'finance', financeDept.id, consultantDes.id, financeTl.id, financeTeam.id);
  await createUser('Ritu Roy', 'ritu.r@solarcrm.com', 'finance', financeDept.id, consultantDes.id, financeTl.id, financeTeam.id);


  // --- OPERATIONS DEPARTMENT ---
  console.log('Building Operations hierarchy...');
  const opsHead = await createUser('Anil Joshi', 'anil.j@solarcrm.com', 'operations', opsDept.id, headDes.id, adminUser.id, opsTeam.id);
  const opsSrMgr = await createUser('Harish Rawat', 'harish.r@solarcrm.com', 'operations', opsDept.id, srManagerDes.id, opsHead.id, opsTeam.id);
  const opsMgr = await createUser('Kriti Sanon', 'kriti.s@solarcrm.com', 'operations', opsDept.id, managerDes.id, opsSrMgr.id, opsTeam.id);
  const opsTl = await createUser('Ramesh Shinde', 'ramesh.s@solarcrm.com', 'operations', opsDept.id, tlDes.id, opsMgr.id, opsTeam.id);

  // Multiple consultants for Operations
  await createUser('Sanjay Dutt', 'sanjay.d@solarcrm.com', 'operations', opsDept.id, consultantDes.id, opsTl.id, opsTeam.id);
  await createUser('Pooja Hegde', 'pooja.h@solarcrm.com', 'operations', opsDept.id, consultantDes.id, opsTl.id, opsTeam.id);


  // --- IT DEPARTMENT ---
  console.log('Building IT hierarchy...');
  const itHead = await createUser('Devendra Fadnavis', 'devendra.f@solarcrm.com', 'admin', itDept.id, headDes.id, adminUser.id);
  const itSrMgr = await createUser('Nitin Gadkari', 'nitin.g@solarcrm.com', 'admin', itDept.id, srManagerDes.id, itHead.id);
  const itMgr = await createUser('Piyush Goyal', 'piyush.g@solarcrm.com', 'admin', itDept.id, managerDes.id, itSrMgr.id);
  const itTl = await createUser('Srinivas Murthy', 'srinivas.m@solarcrm.com', 'admin', itDept.id, tlDes.id, itMgr.id);
  await createUser('Ashish Shelar', 'ashish.s@solarcrm.com', 'admin', itDept.id, consultantDes.id, itTl.id);

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
