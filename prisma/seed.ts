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
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.department.deleteMany();

  console.log('Seeding departments...');
  const salesDept = await prisma.department.create({ data: { name: 'Sales' } });
  const financeDept = await prisma.department.create({ data: { name: 'Finance' } });
  const opsDept = await prisma.department.create({ data: { name: 'Operations' } });
  const itDept = await prisma.department.create({ data: { name: 'IT' } });

  console.log('Seeding designations...');
  const adminDes = await prisma.designation.create({ data: { name: 'Admin', level: 1 } });
  const headDes = await prisma.designation.create({ data: { name: 'Head', level: 2 } });
  const srManagerDes = await prisma.designation.create({ data: { name: 'Senior Manager', level: 3 } });
  const psaSrManagerDes = await prisma.designation.create({ data: { name: 'PSA Senior Manager', level: 3, departmentId: salesDept.id } });
  const managerDes = await prisma.designation.create({ data: { name: 'Manager', level: 4 } });
  const psaManagerDes = await prisma.designation.create({ data: { name: 'PSA Manager', level: 4, departmentId: salesDept.id } });
  const tlDes = await prisma.designation.create({ data: { name: 'TL', level: 5 } });
  const psaTlDes = await prisma.designation.create({ data: { name: 'PSA TL', level: 5, departmentId: salesDept.id } });
  const consultantDes = await prisma.designation.create({ data: { name: 'Consultant', level: 6 } });
  const psaConsultantDes = await prisma.designation.create({ data: { name: 'PSA Consultant', level: 6, departmentId: salesDept.id } });

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
      departmentId: itDept.id,
      designationId: adminDes.id,
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
      departmentId: salesDept.id,
      designationId: headDes.id,
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
      departmentId: salesDept.id,
      designationId: managerDes.id,
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
      departmentId: salesDept.id,
      designationId: managerDes.id,
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
      departmentId: salesDept.id,
      designationId: tlDes.id,
    },
  });

  const tl2 = await prisma.user.create({
    data: {
      name: 'Neha Gupta',
      email: 'tl2@solarcrm.com',
      phone: '9876543215',
      passwordHash,
      role: 'psa_tl',
      reportsTo: manager2.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: psaTlDes.id,
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
      departmentId: salesDept.id,
      designationId: consultantDes.id,
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
      departmentId: salesDept.id,
      designationId: consultantDes.id,
    },
  });

  const consultant3 = await prisma.user.create({
    data: {
      name: 'Anjali Desai',
      email: 'consultant3@solarcrm.com',
      phone: '9876543218',
      passwordHash,
      role: 'psa',
      reportsTo: tl2.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: psaConsultantDes.id,
    },
  });

  const consultant4 = await prisma.user.create({
    data: {
      name: 'Karan Malhotra',
      email: 'consultant4@solarcrm.com',
      phone: '9876543219',
      passwordHash,
      role: 'consultant',
      reportsTo: tl1.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: consultantDes.id,
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
      reportsTo: tl2.id,
      isActive: true,
      departmentId: salesDept.id,
      designationId: psaConsultantDes.id,
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
      departmentId: salesDept.id,
      designationId: psaConsultantDes.id,
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
      departmentId: financeDept.id,
      designationId: headDes.id,
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
      departmentId: opsDept.id,
      designationId: headDes.id,
    },
  });

  console.log('Users seeded.');

  console.log('Seeding mock leads...');

  // Helper for generating lead codes
  const makeLeadCode = (num: number) => `SL-${String(num).padStart(5, '0')}`;

  // Lead 1: Fresh Lead (PSA assigned)
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
      assignedManagerId: manager1.id,
      assignedTlId: tl1.id,
      assignedConsultantId: consultant1.id,
      createdById: admin.id,
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: admin.id,
      leadId: lead1.id,
      activityType: 'LEAD_CREATED',
      metadata: JSON.stringify({ remark: 'Lead imported as Fresh Lead.' })
    }
  });

  // Lead 2: DNP
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
      status: 2, // DNP
      assignedManagerId: manager1.id,
      assignedTlId: tl1.id,
      assignedConsultantId: consultant1.id,
      createdById: manager1.id,
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead2.id,
      userId: consultant1.id,
      fromStatus: 1,
      toStatus: 2,
      remark: 'Called at 11:30 AM, phone rang but no answer.',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: manager1.id,
      leadId: lead2.id,
      activityType: 'LEAD_CREATED',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant1.id,
      leadId: lead2.id,
      activityType: 'CALL_MADE',
      metadata: JSON.stringify({ remark: 'Called at 11:30 AM, phone rang but no answer.' })
    }
  });

  // Lead 3: Follow Up - Hot
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
      status: 3, // Follow Up
      statusSub: 'hot',
      followupAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      assignedManagerId: manager1.id,
      assignedTlId: tl1.id,
      assignedConsultantId: consultant2.id,
      createdById: tl1.id,
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead3.id,
      userId: consultant2.id,
      fromStatus: 1,
      toStatus: 3,
      remark: 'Spoke with the owner. Highly interested in commercial solar transition for their clinic.',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: tl1.id,
      leadId: lead3.id,
      activityType: 'LEAD_CREATED',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant2.id,
      leadId: lead3.id,
      activityType: 'FOLLOW_UP',
      metadata: JSON.stringify({ remark: 'Spoke with the owner. Highly interested in commercial solar transition.' })
    }
  });

  // Lead 4: Meeting Booked
  const lead4 = await prisma.lead.create({
    data: {
      leadCode: makeLeadCode(4),
      customerName: 'Rajesh Nair',
      mobile: '9812345673',
      connectionType: 'residential',
      sanctionedLoadKw: 7.0,
      address: 'Villa 104, Palm Meadows, Whitefield',
      pinCode: '560066',
      city: 'Bengaluru',
      state: 'Karnataka',
      leadSource: 'google_ad',
      status: 8, // Meeting Booked
      assignedManagerId: manager2.id,
      assignedTlId: tl2.id,
      assignedConsultantId: consultant3.id,
      createdById: manager2.id,
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead4.id,
      userId: consultant3.id,
      fromStatus: 1,
      toStatus: 3,
      remark: 'Discussed monthly electricity bill (approx 8000). Wants site feasibility survey.',
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead4.id,
      userId: consultant3.id,
      fromStatus: 3,
      toStatus: 8,
      remark: 'Meeting confirmed for site inspection.',
    }
  });

  await prisma.meetingBooking.create({
    data: {
      leadId: lead4.id,
      address: 'Villa 104, Palm Meadows, Whitefield',
      pinCode: '560066',
      mobile: '9812345673',
      meetingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
      meetingTime: '11:00 AM',
      avgMonthlyBill: 8200.0,
      connectionType: 'residential',
      assignedExecutiveId: consultant3.id,
      notes: 'Customer wants to understand net metering policy and payback period.',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: manager2.id,
      leadId: lead4.id,
      activityType: 'LEAD_CREATED',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant3.id, // Booked by PSA consultant3 (Anjali)
      leadId: lead4.id,
      activityType: 'MEETING_BOOKED',
      metadata: JSON.stringify({ meetingDate: 'Tomorrow', assignedExecutiveId: consultant3.id })
    }
  });

  // Lead 5: Sale Done
  const lead5 = await prisma.lead.create({
    data: {
      leadCode: makeLeadCode(5),
      customerName: 'Vijay Singhal',
      mobile: '9812345674',
      connectionType: 'industrial',
      sanctionedLoadKw: 50.0,
      address: 'Singhal Steel Works, Phase 2, Industrial Area',
      pinCode: '302012',
      city: 'Jaipur',
      state: 'Rajasthan',
      leadSource: 'cold_call',
      status: 13, // Sale Done
      assignedManagerId: manager2.id,
      assignedTlId: tl2.id,
      assignedConsultantId: consultant4.id,
      createdById: admin.id,
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead5.id,
      userId: consultant4.id,
      fromStatus: 1,
      toStatus: 8,
      remark: 'Meeting booked for commercial pitch.',
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead5.id,
      userId: consultant4.id,
      fromStatus: 8,
      toStatus: 9,
      remark: 'Meeting done. Proposal submitted for 40 kW system size.',
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead5.id,
      userId: consultant4.id,
      fromStatus: 9,
      toStatus: 13,
      remark: 'Sale Closed! Advance payment collected, documents punched.',
    }
  });

  // Create order for Sale Done
  const orderCode = `ORD-${String(lead5.id).padStart(5, '0')}`;
  await prisma.order.create({
    data: {
      leadId: lead5.id,
      orderCode,
      connectionNumber: 'CON-98745231',
      systemSizeKw: 40.0,
      totalValue: 1450000.0,
      downPayment: 300000.0,
      paymentMethod: 'bank_transfer',
      transactionRef: 'TXN-84729103',
      remainingMethod: 'finance',
      financeProvider: 'SBI Solar Loan',
      clientType: 'on_grid',
      subsidyApplicable: false,
      submittedById: consultant4.id,
      status: 'submitted',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: admin.id,
      leadId: lead5.id,
      activityType: 'LEAD_CREATED',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant4.id,
      leadId: lead5.id,
      activityType: 'MEETING_BOOKED',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant4.id,
      leadId: lead5.id,
      activityType: 'MEETING_DONE',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant4.id,
      leadId: lead5.id,
      activityType: 'SALE_DONE',
      metadata: JSON.stringify({ orderValue: 1450000, systemSizeKw: 40 })
    }
  });

  // Lead 6: Call Later
  const lead6 = await prisma.lead.create({
    data: {
      leadCode: makeLeadCode(6),
      customerName: 'Pooja Bhatia',
      mobile: '9812345675',
      connectionType: 'residential',
      sanctionedLoadKw: 4.0,
      address: 'Flat 12B, Ocean View, Marine Drive',
      pinCode: '400021',
      city: 'Mumbai',
      state: 'Maharashtra',
      leadSource: 'referral',
      status: 5, // Call Later
      followupAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      assignedManagerId: manager1.id,
      assignedTlId: tl1.id,
      assignedConsultantId: consultant1.id,
      createdById: consultant1.id,
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead6.id,
      userId: consultant1.id,
      fromStatus: 1,
      toStatus: 5,
      remark: 'Customer busy, travelling. Asked to call back next week.',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant1.id,
      leadId: lead6.id,
      activityType: 'LEAD_CREATED',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant1.id,
      leadId: lead6.id,
      activityType: 'CALL_MADE',
      metadata: JSON.stringify({ remark: 'Customer busy, travelling. Callback requested.' })
    }
  });

  // Lead 7: Not Interested
  const lead7 = await prisma.lead.create({
    data: {
      leadCode: makeLeadCode(7),
      customerName: 'Anil Deshmukh',
      mobile: '9812345676',
      connectionType: 'residential',
      sanctionedLoadKw: 2.0,
      address: 'Row House 4, Green Fields Colony',
      pinCode: '411001',
      city: 'Pune',
      state: 'Maharashtra',
      leadSource: 'cold_call',
      status: 4, // Not Interested
      assignedManagerId: manager1.id,
      assignedTlId: tl1.id,
      assignedConsultantId: consultant2.id,
      createdById: manager1.id,
    }
  });

  await prisma.leadActivityLog.create({
    data: {
      leadId: lead7.id,
      userId: consultant2.id,
      fromStatus: 1,
      toStatus: 4,
      remark: 'Says the budget is too low right now. Will consider solar next year.',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: manager1.id,
      leadId: lead7.id,
      activityType: 'LEAD_CREATED',
    }
  });

  await prisma.activity.create({
    data: {
      employeeId: consultant2.id,
      leadId: lead7.id,
      activityType: 'CALL_MADE',
      metadata: JSON.stringify({ remark: 'Says the budget is too low right now. Not interested.' })
    }
  });

  console.log('Mock leads, meeting bookings, orders, and activities seeded successfully!');
  console.log('System user accounts and sales pipeline mock data seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
