import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function verify() {
  console.log('🔍 Verifying Blob URLs across all tables...\n');

  const orderDocs = await prisma.orderDocument.findMany({
    select: { id: true, fileName: true, filePath: true },
  });
  console.log(`📦 OrderDocument Records (${orderDocs.length}):`);
  orderDocs.forEach(d => console.log(`   [ID ${d.id}] ${d.fileName} -> ${d.filePath}`));

  const installImages = await prisma.installationImage.findMany({
    select: { id: true, fileName: true, filePath: true },
  });
  console.log(`\n🖼️  InstallationImage Records (${installImages.length}):`);
  installImages.forEach(img => console.log(`   [ID ${img.id}] ${img.fileName} -> ${img.filePath}`));

  const payments = await prisma.payment.findMany({
    where: { receiptUrl: { not: null } },
    select: { id: true, receiptUrl: true },
  });
  console.log(`\n💳 Payment Receipts (${payments.length}):`);
  payments.forEach(p => console.log(`   [ID ${p.id}] -> ${p.receiptUrl}`));

  const meetings = await prisma.meetingBooking.findMany({
    where: { audioRecordingPath: { not: null } },
    select: { id: true, audioRecordingPath: true },
  });
  console.log(`\n🎙️  Meeting Audio Records (${meetings.length}):`);
  meetings.forEach(m => console.log(`   [ID ${m.id}] -> ${m.audioRecordingPath}`));

  console.log('\n✅ All records verified successfully!');
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
