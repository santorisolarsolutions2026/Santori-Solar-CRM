const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateManual() {
  const doc = new PDFDocument({ bufferPages: true, margin: 50 });
  const outputDir = path.join(__dirname, '..', 'uploads');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'SolarCRM_User_Manual.pdf');
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Helper styles
  const colors = {
    primary: '#1A365D',     // Deep Navy
    secondary: '#2B6CB0',   // Slate Blue
    accent: '#D69E2E',      // Gold/Amber
    text: '#2D3748',        // Charcoal/Slate
    lightBg: '#F7FAFC',     // Very Light Grey
    border: '#E2E8F0',      // Border Grey
    white: '#FFFFFF'
  };

  // Helper functions for page layouts
  function addHeader(title, pageNumText) {
    doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(14).text(title, 50, 40);
    doc.moveTo(50, 58).lineTo(562, 58).strokeColor(colors.border).lineWidth(1).stroke();
    doc.y = 75; // reset y below header
  }

  function addSectionHeader(title) {
    doc.moveDown(1);
    doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(15).text(title);
    doc.moveTo(doc.x, doc.y + 2).lineTo(562, doc.y + 2).strokeColor(colors.border).lineWidth(0.5).stroke();
    doc.moveDown(0.8);
  }

  function addSubsectionHeader(title) {
    doc.moveDown(0.8);
    doc.fillColor(colors.secondary).font('Helvetica-Bold').fontSize(11).text(title);
    doc.moveDown(0.4);
  }

  function addParagraph(text) {
    doc.fillColor(colors.text).font('Helvetica').fontSize(9.5).text(text, { align: 'justify', lineGap: 3.5 });
    doc.moveDown(0.6);
  }

  function addBullet(boldPrefix, text) {
    doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(9.5).text('•  ' + boldPrefix + ': ', { continued: true });
    doc.font('Helvetica').text(text, { lineGap: 2 });
    doc.moveDown(0.4);
  }

  function addAlertBox(title, text) {
    doc.moveDown(0.4);
    const startY = doc.y;
    doc.rect(50, startY, 512, 55).fill(colors.lightBg);
    doc.rect(50, startY, 4, 55).fill(colors.accent);
    doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(9.5).text(title, 65, startY + 8);
    doc.fillColor(colors.text).font('Helvetica').fontSize(9).text(text, 65, startY + 22, { width: 480, lineGap: 2 });
    doc.y = startY + 65; // move cursor past alert box
  }

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  // Top decorative band
  doc.rect(0, 0, 612, 250).fill(colors.primary);
  
  // Gold accent bar
  doc.rect(0, 250, 612, 10).fill(colors.accent);

  // Cover Page Title
  doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(28).text('SolarCRM', 80, 100);
  doc.fillColor(colors.white).font('Helvetica').fontSize(16).text('Unified Operations & Lead Lifecycle Management System', 80, 140);
  doc.fillColor(colors.accent).font('Helvetica-Bold').fontSize(14).text('Santori Solar Solutions', 80, 175);

  // Lower Section Details
  doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(18).text('SYSTEM USER MANUAL', 80, 320);
  doc.fillColor(colors.text).font('Helvetica').fontSize(11).text('A comprehensive operational guide detailing user roles, access control permissions, lead stages, punching orders, analytics, and recovery operations.', 80, 350, { width: 450, lineGap: 4 });

  // Metadata Box
  doc.rect(80, 470, 452, 120).strokeColor(colors.border).lineWidth(1).stroke();
  doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(10).text('DOCUMENT CONTROLS', 95, 485);
  
  const col1 = 95;
  const col2 = 300;
  doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(9);
  doc.text('Version:', col1, 510).font('Helvetica').text('1.0.0 (Production Release)', col1 + 60, 510);
  doc.font('Helvetica-Bold').text('Date:', col1, 525).font('Helvetica').text('June 16, 2026', col1 + 60, 525);
  doc.font('Helvetica-Bold').text('Status:', col1, 540).font('Helvetica').text('Approved & Active', col1 + 60, 540);
  
  doc.font('Helvetica-Bold').text('Prepared For:', col2, 510).font('Helvetica').text('Santori Management Team', col2 + 85, 510);
  doc.font('Helvetica-Bold').text('Prepared By:', col2, 525).font('Helvetica').text('Advanced Coding Systems', col2 + 85, 525);
  doc.font('Helvetica-Bold').text('Scope:', col2, 540).font('Helvetica').text('All Operational Designations', col2 + 85, 540);

  // Footer on cover page
  doc.fillColor(colors.text).font('Helvetica-Oblique').fontSize(8.5).text('CONFIDENTIAL - FOR INTERNAL SANTORI SOLAR SOLUTIONS USE ONLY', 50, 720, { align: 'center' });

  // ==========================================
  // PAGE 2: TABLE OF CONTENTS
  // ==========================================
  doc.addPage();
  addHeader('SolarCRM User Manual');
  addSectionHeader('Table of Contents');

  const tocItems = [
    { num: '1.', name: 'System Introduction & Core Concepts', page: 3 },
    { num: '2.', name: 'User Roles, Designations & Hierarchy Structures', page: 3 },
    { num: '3.', name: 'Fine-Grained Permissions Override System', page: 4 },
    { num: '4.', name: 'Lead Lifecycle Management & 13 Pipeline Stages', page: 5 },
    { num: '5.', name: 'Order Punching Details & Document Checklist', page: 6 },
    { num: '6.', name: 'KPI Analytics & Performance Dashboard', page: 7 },
    { num: '7.', name: 'System Security, Git Isolation & Admin Account Recovery', page: 8 },
  ];

  doc.moveDown(0.5);
  tocItems.forEach((item) => {
    const startY = doc.y;
    doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(10).text(item.num, 50, startY);
    doc.font('Helvetica').text(item.name, 70, startY);
    
    // Draw dots
    const dotsStart = 80 + doc.widthOfString(item.name);
    let dots = '';
    for (let dotPos = dotsStart; dotPos < 500; dotPos += 5) {
      dots += '.';
    }
    doc.fillColor(colors.border).fontSize(9).text(dots, dotsStart, startY, { width: 512 - dotsStart });

    doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(10).text(String(item.page), 530, startY, { align: 'right' });
    doc.moveDown(1.2);
  });

  addSectionHeader('Document Purpose');
  addParagraph('This user manual serves as the definitive reference document for the SolarCRM system. It is designed to assist administrators, directors, sales leaders, finance managers, operations teams, and consultants in navigating the web platform and understanding its underlying business logic, authorization rules, and data structures.');
  addParagraph('By standardizing workflows—from initial lead intake, duplication prevention, and status transition, to order punching, document checklist uploads, finance audits, and ops scheduling—this system ensures complete data integrity and coordinates team tasks efficiently.');

  // ==========================================
  // PAGE 3: SECTIONS 1 & 2
  // ==========================================
  doc.addPage();
  addHeader('SolarCRM User Manual');
  
  addSectionHeader('1. System Introduction & Core Concepts');
  addParagraph('SolarCRM is a tailored, web-based Customer Relationship Management (CRM) application built specifically to facilitate Santori Solar Solutions\' operations. It orchestrates the entire solar client lifecycle, connecting marketing, sales agents, field technical surveyors, finance auditors, and installation supervisors into a unified workspace.');
  addParagraph('The core architectural philosophy is based on complete accountability. Every action taken on a lead (remarks logged, calls made, status changes, supervisor reassignments) is automatically recorded in audit logs and triggers real-time desktop notifications for affected personnel.');

  addSectionHeader('2. User Roles, Designations & Hierarchy');
  addParagraph('The system defines nine default roles, each mapping to baseline authorization scopes. However, designations are kept separate from functional permissions to support custom titles and unique override sets:');
  
  addBullet('Admin & Director', 'Full management access. Can create custom user roles, override any permission checklists, view company-wide analytics, and delete records.');
  addBullet('Sales Head', 'Supervises all sales activities. Accesses all leads, schedules meetings, and tracks organizational pipeline performance.');
  addBullet('Manager', 'Manages a specific team branch. Views leads and logs belonging to the Team Leaders and consultants reporting directly to them.');
  addBullet('Team Leader (TL)', 'Supervises a pool of Sales/PSA Consultants. Assigns leads and monitors individual caller performance.');
  addBullet('Finance Manager', 'Responsible for verifying order transaction payments, subsidy details, and approving punched sheets.');
  addBullet('Operations Manager', 'Controls scheduling and assigns installers for verified orders, uploading final photos upon completion.');
  addBullet('Consultant / PSA', 'Front-line callers. Allocate leads, book meetings, and punch customer order sheets.');

  addSubsectionHeader('Designation Hierarchy Mapping');
  addParagraph('Designations dictate supervisor reports. Consultants report to TLs, TLs report to Managers, and Managers report to the Sales Head / Directors. This structure governs automatic lead reassignment: when a consultant is deactivated, their active leads immediately migrate up the hierarchy to their TL to prevent operational gaps.');

  // ==========================================
  // PAGE 4: SECTION 3
  // ==========================================
  doc.addPage();
  addHeader('SolarCRM User Manual');

  addSectionHeader('3. Fine-Grained Permissions Override System');
  addParagraph('Unlike legacy CRMs that lock access strictly to a user\'s role/designation, SolarCRM features a user-specific permissions override checklist. Located in the Team Directory edit modal, this option allows administrators to dynamically check or uncheck individual feature permissions for any employee.');

  addSubsectionHeader('Available System Permission Keys');
  addBullet('leads:view', 'Grants visibility to the Leads Pipeline page and sidebar navigation links.');
  addBullet('leads:view_all', 'Allows the user to bypass reporting hierarchy and view all leads in the system.');
  addBullet('leads:create', 'Permits adding new leads manually or importing batch leads from CSV files.');
  addBullet('leads:edit', 'Permits editing core customer details, assigning supervisors, and deactivating leads.');
  addBullet('leads:change_status', 'Enables moving leads through pipeline stages in the details tab.');
  addBullet('orders:view', 'Grants access to the Orders Queue list and document download portals.');
  addBullet('orders:view_all', 'Bypasses hierarchy scoping for order details, allowing company-wide audits.');
  addBullet('orders:create', 'Permits punching order details and uploading Aadhaar/PAN verify documents.');
  addBullet('orders:verify', 'Enables Finance verification controls and Operations scheduler options.');
  addBullet('orders:submit_installation', 'Enables completing orders and uploading installation photos.');
  addBullet('reports:view', 'Enables viewing KPI charts, trends, and consultant performance standing tables.');
  addBullet('team:view', 'Permits accessing the Santori Team directory and viewing member profiles.');
  addBullet('team:manage', 'Enables adding team members, editing roles, and custom permissions overrides.');

  addSubsectionHeader('Backward Compatibility & Absolute-Zero ("none") Access');
  addParagraph('To preserve backward compatibility, when a user\'s custom permissions list is left empty (indicated by an empty string "" in the database), the system automatically defaults to the baseline permission set for their designation.');
  addParagraph('To allow admins to strip all permissions from a user, deselecting all checkboxes explicitly saves the keyword "none" to the database. The system detects "none", blocks default role fallbacks, and restricts the user to viewing only the basic Dashboard shell and their own profile, rendering all other tabs and API endpoints completely inaccessible.');

  addAlertBox('Security Override Principle', 'Permissions override designations. If a Sales Consultant is checked for "team:manage", they will gain team management panels. If a Team Leader is unchecked for "leads:change_status", they can no longer transition leads, overriding their baseline designation rights.');

  // ==========================================
  // PAGE 5: SECTION 4
  // ==========================================
  doc.addPage();
  addHeader('SolarCRM User Manual');

  addSectionHeader('4. Lead Lifecycle Management & Pipeline Stages');
  addParagraph('Leads represent prospective customers. They are created manually or imported in bulk from CSV sheets. To protect data quality, the system features a 10-digit mobile duplicate prevention check. If a duplicate mobile number is detected on entry, the system blocks registration and displays the existing Lead ID and its assignee. Administrators or users with edit privileges can choose to bypass this warning and allow the duplicate using the "Override Duplicate" checkbox.');

  addSubsectionHeader('The 13 Sales Pipeline Status Stages');
  addParagraph('Leads flow through the following stages, regulated by role-based transitions:');

  const stages = [
    { id: 1, name: 'Fresh Lead', desc: 'Newly registered lead in the pool, awaiting caller action.' },
    { id: 2, name: 'DNP (No Answer)', desc: 'Call attempted but no response. Kept active for follow-up.' },
    { id: 3, name: 'Follow Up', desc: 'Client requested a call back. Requires date/time and priority notes.' },
    { id: 4, name: 'Not Interested', desc: 'Client declined services. Lead is moved to inactive archive.' },
    { id: 5, name: 'Call Later', desc: 'Temporary snooze stage for busy clients.' },
    { id: 6, name: 'Already Installed', desc: 'Terminal stage. Client already has solar. Inactive.' },
    { id: 7, name: 'Decision Pending', desc: 'Proposal sent; client is reviewing terms and financials.' },
    { id: 8, name: 'Meeting Booked', desc: 'Site survey meeting scheduled. Requires meeting date and executive.' },
    { id: 9, name: 'Meeting Done', desc: 'Site measurements and structure analysis completed by surveyor.' },
    { id: 10, name: 'Disconnected', desc: 'Invalid number or constant network failure.' },
    { id: 11, name: 'Switch Off', desc: 'Phone switched off or unreachable.' },
    { id: 12, name: 'Can\'t Fit Solar', desc: 'Terminal stage. Roof structure is unsuitable or shadow-blocked. Inactive.' },
    { id: 13, name: 'Sale Done', desc: 'Contract signed and advance payment received. Unlocks the Order tab.' }
  ];

  stages.slice(0, 7).forEach(s => {
    doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(8.5).text(`Stage ${s.id}: ${s.name} - `, 60, doc.y, { continued: true });
    doc.fillColor(colors.text).font('Helvetica').text(s.desc);
    doc.moveDown(0.2);
  });
  
  stages.slice(7).forEach(s => {
    doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(8.5).text(`Stage ${s.id}: ${s.name} - `, 60, doc.y, { continued: true });
    doc.fillColor(colors.text).font('Helvetica').text(s.desc);
    doc.moveDown(0.2);
  });

  addAlertBox('Terminal Stages', 'Stages 4 (Not Interested), 6 (Already Installed), 12 (Can\'t Fit Solar), and 13 (Sale Done) mark the end of the active calling lifecycle. Leads in these stages are excluded from active follow-up counters.');

  // ==========================================
  // PAGE 6: SECTION 5
  // ==========================================
  doc.addPage();
  addHeader('SolarCRM User Manual');

  addSectionHeader('5. Order Punching Details & Document Checklist');
  addParagraph('Once a lead moves to Stage 13 (Sale Done), the "Order Punching & Documents" tab unlocks in their profile page. This tab is used to capture final contractual parameters and upload required verification documents.');

  addSubsectionHeader('Punched Order Details');
  addParagraph('The consultant must fill out the order forms, specifying details including:');
  addBullet('System Size (kW)', 'The capacity of the solar plant in kilowatts.');
  addBullet('Total Contract Value', 'The gross price agreed upon in the sales contract.');
  addBullet('Payment Terms', 'Down payment amount and transaction reference number.');
  addBullet('Remaining Method', 'How the balance will be cleared: Finance/Loan, Cash instalments, or EMI.');
  addBullet('Subsidy Applicable', 'Whether a government subsidy is being claimed, and the calculated amount.');

  addSubsectionHeader('Required Document Uploads Checklist');
  addParagraph('To process the order, the caller must upload four mandatory files. The system accepts PDF, JPG, and PNG formats (Max size 5MB):');
  addBullet('Aadhaar Card', 'Identity and address proof of the property owner.');
  addBullet('PAN Card', 'Income tax registration verification.');
  addBullet('Electricity Bill', 'Property electricity service provider connection details.');
  addBullet('Bank Passbook', 'First-page copy for subsidy account verification.');

  addSubsectionHeader('Verification & Installation Workflow');
  addParagraph('Once all documents are uploaded, the order status changes to "Submitted".');
  addBullet('Finance Audit', 'A user with "orders:verify" permission reviews the files and down-payment. Upon approval, they change the order status to "Finance Verified".');
  addBullet('Operations Schedule', 'Operations schedules the site installation, moving the status to "Ops Assigned".');
  addBullet('Completion & Photos', 'Upon installation completion, the installer uploads up to 7 completion photos. The status is updated to "Completed", locking the order records.');

  // ==========================================
  // PAGE 7: SECTION 6
  // ==========================================
  doc.addPage();
  addHeader('SolarCRM User Manual');

  addSectionHeader('6. KPI Analytics & Performance Dashboard');
  addParagraph('SolarCRM includes an analytics module that transforms database logs into actionable charts and leaderboard tables. Access to reports is governed by the "reports:view" permission override.');

  addSubsectionHeader('Dashboard KPI Cards');
  addParagraph('The main dashboard displays operational metrics, including:');
  addBullet('Total Leads Pool', 'Total number of active and inactive leads within the user\'s access scope.');
  addBullet('Active Leads', 'Leads currently undergoing active calling (excluding terminal statuses).');
  addBullet('Meetings Booked', 'Total site surveys scheduled for the current calendar month.');
  addBullet('Sales Closed', 'Number of signed deals (Stage 13) recorded this month.');
  addBullet('Conversion Rate', 'The percentage of allocated leads successfully closed as sales.');

  addSubsectionHeader('Trend Analysis Charts');
  addParagraph('Interactive charts plot lead generation vs closure rates over the last 15 days, helping managers identify sales bottlenecks.');

  addSubsectionHeader('Consultant Performance Leaderboards');
  doc.rect(50, doc.y, 512, 100).strokeColor(colors.border).lineWidth(1).stroke();
  const tableY = doc.y + 10;
  doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(9);
  doc.text('Consultant Standings Table Headers', 65, tableY);
  
  const tY = tableY + 20;
  doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(8.5);
  doc.text('Column Header', 65, tY);
  doc.text('Description / Metric Tracked', 200, tY);
  
  doc.moveTo(65, tY + 12).lineTo(530, tY + 12).strokeColor(colors.border).lineWidth(0.5).stroke();
  
  const r1 = tY + 18;
  doc.font('Helvetica').fontSize(8);
  doc.text('Leads Allocated', 65, r1).text('Total leads assigned to the consultant in their history.', 200, r1);
  doc.text('Nurture Actions', 65, r1 + 12).text('Number of follow-up remarks and status updates logged.', 200, r1 + 12);
  doc.text('Site Meetings', 65, r1 + 24).text('Total site survey meetings scheduled or completed.', 200, r1 + 24);
  doc.text('Sales Closed', 65, r1 + 36).text('Total leads successfully moved to Stage 13 (Sale Done).', 200, r1 + 36);
  
  doc.y = tableY + 115; // reset cursor below table block

  addSubsectionHeader('CSV Spreadsheet Exporter');
  addParagraph('Users with export permissions can download the entire lead database as a CSV spreadsheet directly from the interface, facilitating external audits and marketing operations.');

  // ==========================================
  // PAGE 8: SECTION 7
  // ==========================================
  doc.addPage();
  addHeader('SolarCRM User Manual');

  addSectionHeader('7. Security, Git Isolation & Admin Recovery');
  addParagraph('System security is managed through database configuration, file-system isolation, and terminal utilities.');

  addSubsectionHeader('Git Uploads Isolation');
  addParagraph('Because users upload sensitive customer documentation (PAN/Aadhaar) and call audio recordings, the entire `/uploads` folder is added to `.gitignore`. This prevents files from being pushed to Git repositories, ensuring private customer records are kept secure on local server storage.');

  addSubsectionHeader('Admin User Password Resets');
  addParagraph('Admins can reset any user\'s password directly from the team edit modal. The new password is encrypted using `bcryptjs` (salt rounds: 10) before being saved to the database. This reset action requires `team:manage` permissions.');

  addSubsectionHeader('Emergency Password Recovery (Admin Forgot Password)');
  addParagraph('If the system administrator forgets their password, they cannot use the UI (since password reset is gated inside the authenticated dashboard). To resolve this, a secure terminal utility script is provided:');

  doc.rect(50, doc.y + 5, 512, 55).fill(colors.primary);
  doc.fillColor(colors.white).font('Courier-Bold').fontSize(9);
  doc.text('// Reset any user password directly from the server hosting terminal', 65, doc.y + 15);
  doc.text('npx tsx scripts/reset-password.ts <admin_email> <new_password>', 65, doc.y + 30);
  doc.y = doc.y + 50; // reset cursor

  addSubsectionHeader('How the Recovery Script Works');
  addBullet('Prisma Integration', 'The script instantiates a direct Prisma client to connect to the PostgreSQL instance.');
  addBullet('Credential Hashing', 'It hashes the new password with bcrypt (salt rounds: 10) to match CRM encryption.');
  addBullet('User Update', 'It updates the target user\'s password hash in the database and terminates the session, forcing re-authentication on the next login attempt.');

  addAlertBox('Terminal Execution Safety', 'The recovery script can only be run by users who have SSH/terminal access to the hosting server, keeping database operations secure.');

  // ==========================================
  // PROCESS PAGES & WRITE PAGE NUMBERS
  // ==========================================
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    
    // Draw footer
    doc.moveTo(50, 740).lineTo(562, 740).strokeColor(colors.border).lineWidth(0.5).stroke();
    doc.fillColor('#718096').font('Helvetica').fontSize(8);
    doc.text('SolarCRM User Manual v1.0.0  •  Santori Solar Solutions', 50, 748);
    doc.text(`Page ${i + 1} of ${range.count}`, 500, 748, { align: 'right' });
  }

  doc.end();
}

try {
  generateManual();
  console.log('User Manual PDF successfully generated!');
} catch (err) {
  console.error('Error generating PDF manual:', err);
}
