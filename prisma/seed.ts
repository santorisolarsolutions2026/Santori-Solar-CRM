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
  const psaDept = await prisma.department.create({ data: { name: 'PSA' } });
  const salesDept = await prisma.department.create({ data: { name: 'Sales' } });
  const financeDept = await prisma.department.create({ data: { name: 'Finance' } });
  const opsDept = await prisma.department.create({ data: { name: 'Operations' } });
  const itDept = await prisma.department.create({ data: { name: 'IT' } });
  const hrDept = await prisma.department.create({ data: { name: 'HR' } });
  const adminDept = await prisma.department.create({ data: { name: 'Admin' } });

  console.log('Seeding teams...');
  const psaTeamA = await prisma.team.create({ data: { name: 'PSA Team A', departmentId: psaDept.id } });
  const psaTeamB = await prisma.team.create({ data: { name: 'PSA Team B', departmentId: psaDept.id } });
  const salesTeamA = await prisma.team.create({ data: { name: 'Sales Team A', departmentId: salesDept.id } });
  const salesTeamB = await prisma.team.create({ data: { name: 'Sales Team B', departmentId: salesDept.id } });
  const financeTeamA = await prisma.team.create({ data: { name: 'Finance Team A', departmentId: financeDept.id } });
  const opsTeamA = await prisma.team.create({ data: { name: 'Operations Team A', departmentId: opsDept.id } });

  console.log('Seeding designations...');
  const adminDes = await prisma.designation.create({ data: { name: 'Admin', level: 1 } });
  const headDes = await prisma.designation.create({ data: { name: 'Head', level: 2 } });
  const srManagerDes = await prisma.designation.create({ data: { name: 'Senior Manager', level: 3 } });
  const managerDes = await prisma.designation.create({ data: { name: 'Manager', level: 4 } });
  const tlDes = await prisma.designation.create({ data: { name: 'Team Leader', level: 5 } });
  const consultantDes = await prisma.designation.create({ data: { name: 'Consultant', level: 6 } });
  const financeOfficerDes = await prisma.designation.create({ data: { name: 'Finance Officer', level: 6, departmentId: financeDept.id } });
  const opsEngineerDes = await prisma.designation.create({ data: { name: 'Operations Engineer', level: 6, departmentId: opsDept.id } });
  const psaExecDes = await prisma.designation.create({ data: { name: 'PSA Executive', level: 6, departmentId: psaDept.id } });
  const itDes = await prisma.designation.create({ data: { name: 'IT Specialist', level: 6, departmentId: itDept.id } });

  console.log('Seeding users with hierarchy...');
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
      departmentId: adminDept.id,
      designationId: adminDes.id,
    },
  });

  // 2. Heads
  const salesHead = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'saleshead@solarcrm.com',
      phone: '9876543211',
      passwordHash,
      role: 'sales_head',
      reportsTo: admin.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: headDes.id,
      teamId: salesTeamA.id,
    },
  });

  const psaHead = await prisma.user.create({
    data: {
      name: 'Neha Gupta',
      email: 'psahead@solarcrm.com',
      phone: '9876543215',
      passwordHash,
      role: 'psa_tl', // Head role mapped to TL
      reportsTo: admin.id,
      isActive: true,
      departmentId: psaDept.id,
      designationId: headDes.id,
      teamId: psaTeamA.id,
    },
  });

  // 3. Manager
  const salesManager = await prisma.user.create({
    data: {
      name: 'Amit Sharma',
      email: 'manager1@solarcrm.com',
      phone: '9876543212',
      passwordHash,
      role: 'manager',
      reportsTo: salesHead.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: managerDes.id,
      teamId: salesTeamA.id,
    },
  });

  // 4. Team Leaders
  const salesTL = await prisma.user.create({
    data: {
      name: 'Vikram Singh',
      email: 'tl1@solarcrm.com',
      phone: '9876543214',
      passwordHash,
      role: 'tl',
      reportsTo: salesManager.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: tlDes.id,
      teamId: salesTeamA.id,
    },
  });

  const psaTL = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'tl2@solarcrm.com',
      phone: '9876543213',
      passwordHash,
      role: 'psa_tl',
      reportsTo: psaHead.id,
      isActive: true,
      departmentId: psaDept.id,
      designationId: tlDes.id,
      teamId: psaTeamA.id,
    },
  });

  // 5. Consultants & Executives
  const salesConsultant1 = await prisma.user.create({
    data: {
      name: 'Siddharth Verma',
      email: 'consultant1@solarcrm.com',
      phone: '9876543216',
      passwordHash,
      role: 'consultant',
      reportsTo: salesTL.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: consultantDes.id,
      teamId: salesTeamA.id,
    },
  });

  const salesConsultant2 = await prisma.user.create({
    data: {
      name: 'Rohan Mehta',
      email: 'consultant2@solarcrm.com',
      phone: '9876543217',
      passwordHash,
      role: 'consultant',
      reportsTo: salesTL.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: consultantDes.id,
      teamId: salesTeamA.id,
    },
  });

  const psaExecutive1 = await prisma.user.create({
    data: {
      name: 'Anjali Desai',
      email: 'consultant3@solarcrm.com',
      phone: '9876543218',
      passwordHash,
      role: 'psa',
      reportsTo: psaTL.id,
      isActive: true,
      departmentId: psaDept.id,
      designationId: psaExecDes.id,
      teamId: psaTeamA.id,
    },
  });

  const psaExecutive2 = await prisma.user.create({
    data: {
      name: 'Karan Malhotra',
      email: 'consultant4@solarcrm.com',
      phone: '9876543219',
      passwordHash,
      role: 'psa',
      reportsTo: psaTL.id,
      isActive: true,
      departmentId: psaDept.id,
      designationId: psaExecDes.id,
      teamId: psaTeamA.id,
    },
  });

  // 6. Finance
  const financeUser = await prisma.user.create({
    data: {
      name: 'Sanjay Shah',
      email: 'finance@solarcrm.com',
      phone: '9876543222',
      passwordHash,
      role: 'finance',
      reportsTo: admin.id,
      isActive: true,
      departmentId: financeDept.id,
      designationId: financeOfficerDes.id,
      teamId: financeTeamA.id,
    },
  });

  // 7. Operations
  const opsUser = await prisma.user.create({
    data: {
      name: 'Vijay Yadav',
      email: 'ops@solarcrm.com',
      phone: '9876543223',
      passwordHash,
      role: 'operations',
      reportsTo: admin.id,
      isActive: true,
      departmentId: opsDept.id,
      designationId: opsEngineerDes.id,
      teamId: opsTeamA.id,
    },
  });

  console.log('Seeding mock leads and workflow logs...');
  const makeLeadCode = (num: number) => `SL-${String(num).padStart(5, '0')}`;

  // Helper to create mandatory stage tasks for a lead
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

  // Lead 1: Fresh PSA Lead (PSA assigned)
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
      status: 1, // Fresh Lead
      createdById: admin.id,
      assignedTeamId: psaTeamA.id,
    }
  });
  await seedMandatoryTasks(lead1.id);
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead1.id, teamId: psaTeamA.id, assignedById: admin.id }
  });
  await prisma.employeeAssignment.create({
    data: { leadId: lead1.id, employeeId: psaExecutive1.id, assignedById: psaTL.id, priority: 'medium' }
  });
  await prisma.activity.create({
    data: {
      employeeId: admin.id,
      leadId: lead1.id,
      activityType: 'LEAD_CREATED',
      metadata: JSON.stringify({ remark: 'Lead created under PSA Team A.' })
    }
  });

  // Lead 2: Sales Department Lead (Meeting Booked)
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
      status: 8, // Meeting Booked
      createdById: admin.id,
      assignedTeamId: salesTeamA.id,
    }
  });
  await seedMandatoryTasks(lead2.id);
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead2.id, teamId: salesTeamA.id, assignedById: admin.id }
  });
  await prisma.employeeAssignment.create({
    data: { leadId: lead2.id, employeeId: salesConsultant1.id, assignedById: salesTL.id, priority: 'high' }
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
      assignedExecutiveId: salesConsultant1.id,
      notes: 'Customer wants a premium on-grid proposal.',
    }
  });
  await prisma.activity.create({
    data: {
      employeeId: salesConsultant1.id,
      leadId: lead2.id,
      activityType: 'MEETING_BOOKED',
    }
  });

  // Lead 3: Finance Verification (Sale Closed)
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
      status: 13, // Sale Done
      createdById: admin.id,
      assignedTeamId: financeTeamA.id,
    }
  });
  await seedMandatoryTasks(lead3.id);
  // Complete the mandatory tasks for lead 3 to allow progression to Finance
  await prisma.leadTask.updateMany({
    where: { leadId: lead3.id },
    data: { isCompleted: true }
  });
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead3.id, teamId: salesTeamA.id, assignedById: admin.id }
  });
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead3.id, teamId: financeTeamA.id, assignedById: admin.id }
  });
  await prisma.employeeAssignment.create({
    data: { leadId: lead3.id, employeeId: financeUser.id, assignedById: admin.id, priority: 'high' }
  });
  // Create submitted order
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
      submittedById: salesConsultant1.id,
      status: 'submitted',
    }
  });
  await prisma.activity.create({
    data: {
      employeeId: salesConsultant1.id,
      leadId: lead3.id,
      activityType: 'SALE_DONE',
    }
  });

  // Lead 4: Operations Department (Installation in progress)
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
      createdById: admin.id,
      assignedTeamId: opsTeamA.id,
    }
  });
  await seedMandatoryTasks(lead4.id);
  await prisma.leadTask.updateMany({
    where: { leadId: lead4.id },
    data: { isCompleted: true }
  });
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead4.id, teamId: salesTeamA.id, assignedById: admin.id }
  });
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead4.id, teamId: financeTeamA.id, assignedById: admin.id }
  });
  await prisma.leadTeamAssignment.create({
    data: { leadId: lead4.id, teamId: opsTeamA.id, assignedById: admin.id }
  });
  await prisma.employeeAssignment.create({
    data: { leadId: lead4.id, employeeId: opsUser.id, assignedById: admin.id, priority: 'high' }
  });
  // Create verified order
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
      submittedById: salesConsultant2.id,
      financeProcessedById: financeUser.id,
      status: 'finance_verified',
      opsStage: 2, // Installation in progress
      installationDate: new Date().toISOString().split('T')[0],
      installationTime: '10:00 AM',
    }
  });
  await prisma.activity.create({
    data: {
      employeeId: opsUser.id,
      leadId: lead4.id,
      activityType: 'INSTALLATION_IN_PROGRESS',
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
