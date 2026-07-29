import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

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
  console.log('Clearing database...');
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

  console.log('Seeding departments...');
  const adminDept = await prisma.department.create({ data: { name: 'Admin' } });
  const salesDept = await prisma.department.create({ data: { name: 'Sales' } });
  const opsDept = await prisma.department.create({ data: { name: 'Operations' } });
  const psaDept = await prisma.department.create({ data: { name: 'PSA' } });
  const financeDept = await prisma.department.create({ data: { name: 'Finance' } });

  console.log('Seeding teams...');
  const salesTeamA = await prisma.team.create({ data: { name: 'Sales Team A', departmentId: salesDept.id } });
  const opsTeamA = await prisma.team.create({ data: { name: 'Operations Team A', departmentId: opsDept.id } });
  const psaTeamA = await prisma.team.create({ data: { name: 'PSA Team A', departmentId: psaDept.id } });

  console.log('Seeding designations...');
  const adminDes = await prisma.designation.create({ data: { name: 'Admin', level: 1 } });
  const headDes = await prisma.designation.create({ data: { name: 'Head', level: 2 } });
  const consultantDes = await prisma.designation.create({ data: { name: 'Consultant', level: 5 } });
  const psaExecDes = await prisma.designation.create({ data: { name: 'PSA Executive', level: 5, departmentId: psaDept.id } });
  const opsConsultantDes = await prisma.designation.create({ data: { name: 'Operations Consultant', level: 5, departmentId: opsDept.id } });

  console.log('Seeding specific company team members...');
  const passwordHash = await bcrypt.hash('Password123', 10);

  // 1. Deepak Pandey - Admin
  const deepakPandey = await prisma.user.create({
    data: {
      name: 'Deepak Pandey',
      email: 'deepak.pandey@solarcrm.com',
      phone: '9876543210',
      passwordHash,
      role: 'admin',
      isActive: true,
      departmentId: adminDept.id,
      designationId: adminDes.id,
    },
  });

  // Alias admin account for convenience
  await prisma.user.create({
    data: {
      name: 'Deepak Pandey (Admin Alias)',
      email: 'admin@solarcrm.com',
      phone: '9876543211',
      passwordHash,
      role: 'admin',
      isActive: true,
      departmentId: adminDept.id,
      designationId: adminDes.id,
    },
  });

  // 2. Sarvesh Chaubey - Sales Head
  const sarveshChaubey = await prisma.user.create({
    data: {
      name: 'Sarvesh Chaubey',
      email: 'sarvesh.chaubey@solarcrm.com',
      phone: '9876543212',
      passwordHash,
      role: 'sales_head',
      reportsTo: deepakPandey.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: headDes.id,
      teamId: salesTeamA.id,
    },
  });

  // 3. Sachin Pandey - Operations Head
  const sachinPandey = await prisma.user.create({
    data: {
      name: 'Sachin Pandey',
      email: 'sachin.pandey@solarcrm.com',
      phone: '9876543213',
      passwordHash,
      role: 'operations',
      reportsTo: deepakPandey.id,
      isActive: true,
      departmentId: opsDept.id,
      designationId: headDes.id,
      teamId: opsTeamA.id,
    },
  });

  // 4. Rudra Sahani - Sales Consultant
  const rudraSahani = await prisma.user.create({
    data: {
      name: 'Rudra Sahani',
      email: 'rudra.sahani@solarcrm.com',
      phone: '9876543214',
      passwordHash,
      role: 'consultant',
      reportsTo: sarveshChaubey.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: consultantDes.id,
      teamId: salesTeamA.id,
    },
  });

  // 5. Rishi Shilpkar - Sales Consultant
  const rishiShilpkar = await prisma.user.create({
    data: {
      name: 'Rishi Shilpkar',
      email: 'rishi.shilpkar@solarcrm.com',
      phone: '9876543215',
      passwordHash,
      role: 'consultant',
      reportsTo: sarveshChaubey.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: consultantDes.id,
      teamId: salesTeamA.id,
    },
  });

  // 6. Amit Singh - Sales Consultant
  const amitSingh = await prisma.user.create({
    data: {
      name: 'Amit Singh',
      email: 'amit.singh@solarcrm.com',
      phone: '9876543216',
      passwordHash,
      role: 'consultant',
      reportsTo: sarveshChaubey.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: consultantDes.id,
      teamId: salesTeamA.id,
    },
  });

  // 7. Rishab Mishra - Sales Consultant
  const rishabMishra = await prisma.user.create({
    data: {
      name: 'Rishab Mishra',
      email: 'rishab.mishra@solarcrm.com',
      phone: '9876543217',
      passwordHash,
      role: 'consultant',
      reportsTo: sarveshChaubey.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: consultantDes.id,
      teamId: salesTeamA.id,
    },
  });

  // 8. Diksha Dubey - PSA
  const dikshaDubey = await prisma.user.create({
    data: {
      name: 'Diksha Dubey',
      email: 'diksha.dubey@solarcrm.com',
      phone: '9876543218',
      passwordHash,
      role: 'psa',
      reportsTo: sarveshChaubey.id,
      isActive: true,
      departmentId: psaDept.id,
      designationId: psaExecDes.id,
      teamId: psaTeamA.id,
    },
  });

  // 9. Jyoti Kumari - PSA
  const jyotiKumari = await prisma.user.create({
    data: {
      name: 'Jyoti Kumari',
      email: 'jyoti.kumari@solarcrm.com',
      phone: '9876543219',
      passwordHash,
      role: 'psa',
      reportsTo: sarveshChaubey.id,
      isActive: true,
      departmentId: psaDept.id,
      designationId: psaExecDes.id,
      teamId: psaTeamA.id,
    },
  });

  // 10. Rohit Rai - Operations Consultant
  const rohitRai = await prisma.user.create({
    data: {
      name: 'Rohit Rai',
      email: 'rohit.rai@solarcrm.com',
      phone: '9876543220',
      passwordHash,
      role: 'operations',
      reportsTo: sachinPandey.id,
      isActive: true,
      departmentId: opsDept.id,
      designationId: opsConsultantDes.id,
      teamId: opsTeamA.id,
    },
  });

  console.log('Seeding sample leads and workflow links...');
  const makeLeadCode = (num: number) => `SL-${String(num).padStart(5, '0')}`;

  const seedMandatoryTasks = async (leadId: number) => {
    const salesTasks = [
      { taskName: 'Meeting Done', stageNum: 9 },
      { taskName: 'Site Visit Done', stageNum: 9 },
      { taskName: 'Quotation Uploaded', stageNum: 9 },
      { taskName: 'Customer Confirmation', stageNum: 9 },
      { taskName: 'Order Punching Form Submitted', stageNum: 13 },
    ];
    for (const t of salesTasks) {
      await prisma.leadTask.create({
        data: {
          leadId,
          taskName: t.taskName,
          stageNum: t.stageNum,
          isCompleted: false,
          isMandatory: true,
        }
      });
    }
  };

  // Lead 1: Fresh PSA Lead (Diksha Dubey)
  const lead1 = await prisma.lead.create({
    data: {
      leadCode: makeLeadCode(1),
      customerName: 'Aarav Mehta',
      mobile: '9812345670',
      connectionType: 'residential',
      sanctionedLoadKw: 5.0,
      address: 'Flat 402, Sunshine Heights, Sector 15',
      pinCode: '400703',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      leadSource: 'google_ad',
      status: 1,
      createdById: deepakPandey.id,
      assignedTeamId: psaTeamA.id,
    }
  });
  await seedMandatoryTasks(lead1.id);
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead1.id, teamId: psaTeamA.id, assignedById: deepakPandey.id }
  });
  await prisma.employeeAssignment.create({
    data: { leadId: lead1.id, employeeId: dikshaDubey.id, assignedById: sarveshChaubey.id, priority: 'medium' }
  });

  // Lead 2: Meeting Booked (Rudra Sahani)
  const lead2 = await prisma.lead.create({
    data: {
      leadCode: makeLeadCode(2),
      customerName: 'Ishaan Malhotra',
      mobile: '9812345671',
      connectionType: 'residential',
      sanctionedLoadKw: 3.5,
      address: 'House No. 12, Lane 4, Golf Links',
      pinCode: '110003',
      city: 'New Delhi',
      state: 'Delhi',
      leadSource: 'whatsapp',
      status: 8,
      createdById: deepakPandey.id,
      assignedTeamId: salesTeamA.id,
    }
  });
  await seedMandatoryTasks(lead2.id);
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead2.id, teamId: salesTeamA.id, assignedById: deepakPandey.id }
  });
  await prisma.employeeAssignment.create({
    data: { leadId: lead2.id, employeeId: rudraSahani.id, assignedById: sarveshChaubey.id, priority: 'high' }
  });
  await prisma.meetingBooking.create({
    data: {
      leadId: lead2.id,
      address: 'House No. 12, Lane 4, Golf Links',
      pinCode: '110003',
      mobile: '9812345671',
      meetingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meetingTime: '02:00 PM',
      avgMonthlyBill: 4500.0,
      connectionType: 'residential',
      assignedExecutiveId: rudraSahani.id,
      notes: 'Customer wants a premium on-grid proposal.',
    }
  });

  // Lead 3: Order Submitted (Rishi Shilpkar)
  const lead3 = await prisma.lead.create({
    data: {
      leadCode: makeLeadCode(3),
      customerName: 'Sneha Reddy',
      mobile: '9812345672',
      connectionType: 'commercial',
      sanctionedLoadKw: 15.0,
      address: 'Reddy Diagnostics, MG Road',
      pinCode: '500003',
      city: 'Hyderabad',
      state: 'Telangana',
      leadSource: 'referral',
      status: 13,
      createdById: deepakPandey.id,
      assignedTeamId: salesTeamA.id,
    }
  });
  await seedMandatoryTasks(lead3.id);
  await prisma.leadTask.updateMany({
    where: { leadId: lead3.id },
    data: { isCompleted: true }
  });
  await prisma.employeeAssignment.create({
    data: { leadId: lead3.id, employeeId: rishiShilpkar.id, assignedById: sarveshChaubey.id, priority: 'high' }
  });
  await prisma.order.create({
    data: {
      leadId: lead3.id,
      orderCode: `ORD-${String(lead3.id).padStart(5, '0')}`,
      connectionNumber: 'CON-12345678',
      systemSizeKw: 15.0,
      totalValue: 600000.0,
      downPayment: 150000.0,
      paymentMethod: 'neft',
      transactionRef: 'NEFT999888777',
      remainingMethod: 'cash',
      clientType: 'on_grid',
      subsidyApplicable: true,
      subsidyAmount: 50000.0,
      submittedById: rishiShilpkar.id,
      status: 'submitted',
    }
  });

  // Lead 4: Operations Installation (Rohit Rai & Sachin Pandey)
  const lead4 = await prisma.lead.create({
    data: {
      leadCode: makeLeadCode(4),
      customerName: 'Vijay Singhal',
      mobile: '9812345674',
      connectionType: 'industrial',
      sanctionedLoadKw: 50.0,
      address: 'Singhal Steel, Industrial Phase 2',
      pinCode: '302012',
      city: 'Jaipur',
      state: 'Rajasthan',
      leadSource: 'cold_call',
      status: 13,
      createdById: deepakPandey.id,
      assignedTeamId: opsTeamA.id,
    }
  });
  await seedMandatoryTasks(lead4.id);
  await prisma.leadTask.updateMany({
    where: { leadId: lead4.id },
    data: { isCompleted: true }
  });
  await prisma.employeeAssignment.create({
    data: { leadId: lead4.id, employeeId: rohitRai.id, assignedById: sachinPandey.id, priority: 'high' }
  });
  await prisma.order.create({
    data: {
      leadId: lead4.id,
      orderCode: `ORD-${String(lead4.id).padStart(5, '0')}`,
      connectionNumber: 'CON-88776655',
      systemSizeKw: 50.0,
      totalValue: 1800000.0,
      downPayment: 500000.0,
      paymentMethod: 'bank_transfer',
      transactionRef: 'TXN-OPS-7722',
      remainingMethod: 'finance',
      financeProvider: 'SBI Solar',
      clientType: 'on_grid',
      subsidyApplicable: false,
      submittedById: amitSingh.id,
      financeProcessedById: sachinPandey.id,
      status: 'finance_verified',
      opsStage: 2,
      installationDate: new Date().toISOString().split('T')[0],
      installationTime: '10:00 AM',
    }
  });

  console.log('Database successfully seeded with specific company team roster!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
