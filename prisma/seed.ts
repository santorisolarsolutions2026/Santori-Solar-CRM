import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const dbUser = process.env.DB_USER || "postgres";
const dbPassword = process.env.DB_PASSWORD || "";
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = process.env.DB_PORT || "5432";
const dbName = process.env.DB_NAME || "solarcrm";

const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database...');
  await prisma.notification.deleteMany();
  await prisma.orderDocument.deleteMany();
  await prisma.order.deleteMany();
  await prisma.meetingBooking.deleteMany();
  await prisma.leadActivityLog.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash('Password123', 10);

  // 1. Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Deepak Sir',
      email: 'admin@solarcrm.com',
      phone: '9876543210',
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  // 2. Sales Head
  const salesHead = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'saleshead@solarcrm.com',
      phone: '9876543211',
      passwordHash,
      role: 'sales_head',
      reportsTo: admin.id,
      isActive: true,
    },
  });

  // 3. Managers
  const manager1 = await prisma.user.create({
    data: {
      name: 'Amit Sharma',
      email: 'manager1@solarcrm.com',
      phone: '9876543212',
      passwordHash,
      role: 'manager',
      reportsTo: salesHead.id,
      isActive: true,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'manager2@solarcrm.com',
      phone: '9876543213',
      passwordHash,
      role: 'manager',
      reportsTo: salesHead.id,
      isActive: true,
    },
  });

  // 4. Team Leaders (TLs)
  const tl1 = await prisma.user.create({
    data: {
      name: 'Vikram Singh',
      email: 'tl1@solarcrm.com',
      phone: '9876543214',
      passwordHash,
      role: 'tl',
      reportsTo: manager1.id,
      isActive: true,
    },
  });

  const tl2 = await prisma.user.create({
    data: {
      name: 'Neha Gupta',
      email: 'tl2@solarcrm.com',
      phone: '9876543215',
      passwordHash,
      role: 'tl',
      reportsTo: manager2.id,
      isActive: true,
    },
  });

  // 5. Consultants
  const consultant1 = await prisma.user.create({
    data: {
      name: 'Siddharth Verma',
      email: 'consultant1@solarcrm.com',
      phone: '9876543216',
      passwordHash,
      role: 'consultant',
      reportsTo: tl1.id,
      isActive: true,
    },
  });

  const consultant2 = await prisma.user.create({
    data: {
      name: 'Rohan Mehta',
      email: 'consultant2@solarcrm.com',
      phone: '9876543217',
      passwordHash,
      role: 'consultant',
      reportsTo: tl1.id,
      isActive: true,
    },
  });

  const consultant3 = await prisma.user.create({
    data: {
      name: 'Anjali Desai',
      email: 'consultant3@solarcrm.com',
      phone: '9876543218',
      passwordHash,
      role: 'consultant',
      reportsTo: tl2.id,
      isActive: true,
    },
  });

  const consultant4 = await prisma.user.create({
    data: {
      name: 'Karan Malhotra',
      email: 'consultant4@solarcrm.com',
      phone: '9876543219',
      passwordHash,
      role: 'consultant',
      reportsTo: tl2.id,
      isActive: true,
    },
  });

  // 6. PSAs
  const psa1 = await prisma.user.create({
    data: {
      name: 'Jyoti Rao',
      email: 'psa1@solarcrm.com',
      phone: '9876543220',
      passwordHash,
      role: 'psa',
      reportsTo: tl1.id,
      isActive: true,
    },
  });

  const psa2 = await prisma.user.create({
    data: {
      name: 'Rahul Mishra',
      email: 'psa2@solarcrm.com',
      phone: '9876543221',
      passwordHash,
      role: 'psa',
      reportsTo: tl2.id,
      isActive: true,
    },
  });

  // 7. Finance
  const finance = await prisma.user.create({
    data: {
      name: 'Sanjay Shah',
      email: 'finance@solarcrm.com',
      phone: '9876543222',
      passwordHash,
      role: 'finance',
      reportsTo: admin.id,
      isActive: true,
    },
  });

  // 8. Operations
  const ops = await prisma.user.create({
    data: {
      name: 'Vijay Yadav',
      email: 'ops@solarcrm.com',
      phone: '9876543223',
      passwordHash,
      role: 'operations',
      reportsTo: admin.id,
      isActive: true,
    },
  });

  console.log('Users seeded.');

  console.log('System user accounts seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
