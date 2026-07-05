import * as fs from 'fs';
import * as path from 'path';

// Manually parse .env file to ensure variables are populated synchronously before Prisma client loads
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) return;
    const key = trimmed.slice(0, firstEq).trim();
    let val = trimmed.slice(firstEq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

// Helper to escape values for Excel-compatible CSVs
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Replace newlines/carriage returns with space to keep records single-line
  str = str.replace(/[\r\n]+/g, ' ');
  // Double quotes inside must be escaped with another double quote
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

// Convert headers and row arrays into a formatted CSV string
function toCSV(headers: string[], rows: any[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(','));
  return [headerRow, ...dataRows].join('\n');
}

async function main() {
  const { prisma } = await import('../src/lib/db');
  
  const backupDir = path.join(process.cwd(), 'backups', 'crm_snapshots');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`[CRM SNAPSHOT] Starting snapshot export at ${timestamp}...`);

  try {
    // 1. Export Active Leads Pool
    const leads = await prisma.lead.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    
    const leadHeaders = [
      'ID', 'Lead Code', 'Customer Name', 'Mobile Phone', 'Alt Phone', 'Address', 
      'Status Code', 'Priority (SubStatus)', 'Assigned Consultant ID', 
      'Assigned TL ID', 'Assigned Manager ID', 'Created At'
    ];
    const leadRows = leads.map(l => [
      l.id,
      l.leadCode,
      l.customerName,
      l.mobile,
      l.mobileAlt || '',
      l.address || '',
      l.status,
      l.statusSub || '',
      l.assignedConsultantId || '',
      l.assignedTlId || '',
      l.assignedManagerId || '',
      l.createdAt.toISOString()
    ]);
    
    const leadsCsv = toCSV(leadHeaders, leadRows);
    fs.writeFileSync(path.join(backupDir, `leads_active_${timestamp}.csv`), leadsCsv);
    fs.writeFileSync(path.join(backupDir, `leads_active_latest.csv`), leadsCsv);
    console.log(`✔ Exported ${leads.length} active leads.`);

    // 2. Export Scheduled Meetings
    const meetings = await prisma.meetingBooking.findMany({
      orderBy: { meetingDate: 'asc' },
      include: {
        lead: { select: { customerName: true, leadCode: true } },
        executive: { select: { name: true } }
      }
    });

    const meetingHeaders = ['ID', 'Lead Code', 'Customer Name', 'Meeting Date', 'Meeting Time', 'Executive Name', 'Notes'];
    const meetingRows = meetings.map(m => [
      m.id,
      m.lead?.leadCode || '',
      m.lead?.customerName || '',
      m.meetingDate,
      m.meetingTime,
      m.executive?.name || '',
      m.notes || ''
    ]);

    const meetingsCsv = toCSV(meetingHeaders, meetingRows);
    fs.writeFileSync(path.join(backupDir, `meetings_all_${timestamp}.csv`), meetingsCsv);
    fs.writeFileSync(path.join(backupDir, `meetings_all_latest.csv`), meetingsCsv);
    console.log(`✔ Exported ${meetings.length} scheduled meetings.`);

    // 3. Export Finance Ledger (Payments) Records
    const payments = await prisma.payment.findMany({
      orderBy: { id: 'desc' },
      include: {
        order: {
          select: {
            orderCode: true,
            lead: { select: { customerName: true, leadCode: true } }
          }
        },
        recordedBy: { select: { name: true } }
      }
    });

    const financeHeaders = ['ID', 'Order Code', 'Lead Code', 'Customer Name', 'Amount', 'Payment Method', 'Transaction Ref', 'Recorded By', 'Payment Date'];
    const financeRows = payments.map(p => [
      p.id,
      p.order?.orderCode || '',
      p.order?.lead?.leadCode || '',
      p.order?.lead?.customerName || '',
      p.amount,
      p.paymentMethod,
      p.transactionRef || '',
      p.recordedBy?.name || '',
      p.paymentDate.toISOString()
    ]);

    const financeCsv = toCSV(financeHeaders, financeRows);
    fs.writeFileSync(path.join(backupDir, `finance_ledger_${timestamp}.csv`), financeCsv);
    fs.writeFileSync(path.join(backupDir, `finance_ledger_latest.csv`), financeCsv);
    console.log(`✔ Exported ${payments.length} financial transactions.`);

    // 4. Export Team Contacts
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const userHeaders = ['ID', 'Employee ID', 'Name', 'Email', 'Contact Phone', 'System Role'];
    const userRows = users.map(u => [
      u.id,
      u.employeeId || '',
      u.name,
      u.email,
      u.phone || '',
      u.role
    ]);

    const usersCsv = toCSV(userHeaders, userRows);
    fs.writeFileSync(path.join(backupDir, `team_contacts_${timestamp}.csv`), usersCsv);
    fs.writeFileSync(path.join(backupDir, `team_contacts_latest.csv`), usersCsv);
    console.log(`✔ Exported ${users.length} active team members.`);

    console.log(`\n🎉 [CRM SNAPSHOT SUCCESS] CSV files saved to backups/crm_snapshots/`);
  } catch (err) {
    console.error('❌ [CRM SNAPSHOT ERROR] Export failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
