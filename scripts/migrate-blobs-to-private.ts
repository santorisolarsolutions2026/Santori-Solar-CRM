import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { uploadPrivateBlob } from '../src/lib/blob';
import path from 'node:path';

async function downloadFileBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ HTTP ${res.status} when downloading ${url}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  } catch (err: any) {
    console.error(`❌ Download failed for ${url}:`, err.message);
    return null;
  }
}

async function migrate() {
  console.log('🚀 Starting Zero-Data-Loss Blob Migration to Private Store...');
  console.log('🔒 Mode: COPY-ONLY (Old public store files will NEVER be deleted)');
  console.log('------------------------------------------------------------');

  let totalMigrated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // 1. OrderDocument Migration
  console.log('\n📦 [1/6] Checking OrderDocument records...');
  const orderDocs = await prisma.orderDocument.findMany();
  console.log(`Found ${orderDocs.length} total OrderDocument records in DB.`);
  for (const doc of orderDocs) {
    if (doc.filePath && (doc.filePath.startsWith('http://') || doc.filePath.startsWith('https://'))) {
      const fileData = await downloadFileBuffer(doc.filePath);
      if (fileData) {
        const fileExt = doc.fileName ? path.extname(doc.fileName).replace('.', '') || 'dat' : 'dat';
        const newPath = `orders/order_${doc.orderId}_${doc.docType}_migrated_${Date.now()}.${fileExt}`;
        try {
          const newBlob = await uploadPrivateBlob(newPath, fileData.buffer, {
            contentType: doc.mimeType || fileData.contentType,
          });
          await prisma.orderDocument.update({
            where: { id: doc.id },
            data: { filePath: newBlob.url },
          });
          console.log(`  ✅ [OrderDoc #${doc.id}] Migrated "${doc.fileName}" -> ${newBlob.url}`);
          totalMigrated++;
        } catch (uploadErr: any) {
          console.error(`  ❌ [OrderDoc #${doc.id}] Upload error:`, uploadErr.message);
          totalFailed++;
        }
      } else {
        totalFailed++;
      }
    } else {
      totalSkipped++;
    }
  }

  // 2. LeadDocument Migration
  console.log('\n📄 [2/6] Checking LeadDocument records...');
  const leadDocs = await prisma.leadDocument.findMany();
  console.log(`Found ${leadDocs.length} total LeadDocument records in DB.`);
  for (const doc of leadDocs) {
    if (doc.filePath && (doc.filePath.startsWith('http://') || doc.filePath.startsWith('https://'))) {
      const fileData = await downloadFileBuffer(doc.filePath);
      if (fileData) {
        const fileExt = doc.fileName ? path.extname(doc.fileName).replace('.', '') || 'dat' : 'dat';
        const newPath = `leads/lead_${doc.leadId}_${doc.docType}_v${doc.version}_migrated_${Date.now()}.${fileExt}`;
        try {
          const newBlob = await uploadPrivateBlob(newPath, fileData.buffer, {
            contentType: fileData.contentType,
          });
          await prisma.leadDocument.update({
            where: { id: doc.id },
            data: { filePath: newBlob.url },
          });
          console.log(`  ✅ [LeadDoc #${doc.id}] Migrated "${doc.fileName}" -> ${newBlob.url}`);
          totalMigrated++;
        } catch (uploadErr: any) {
          console.error(`  ❌ [LeadDoc #${doc.id}] Upload error:`, uploadErr.message);
          totalFailed++;
        }
      } else {
        totalFailed++;
      }
    } else {
      totalSkipped++;
    }
  }

  // 3. InstallationImage Migration
  console.log('\n🖼️  [3/6] Checking InstallationImage records...');
  const installImages = await prisma.installationImage.findMany();
  console.log(`Found ${installImages.length} total InstallationImage records in DB.`);
  for (const img of installImages) {
    if (img.filePath && (img.filePath.startsWith('http://') || img.filePath.startsWith('https://'))) {
      const fileData = await downloadFileBuffer(img.filePath);
      if (fileData) {
        const fileExt = img.fileName ? path.extname(img.fileName).replace('.', '') || 'png' : 'png';
        const newPath = `installations/install_${img.orderId}_${img.status}_migrated_${Date.now()}.${fileExt}`;
        try {
          const newBlob = await uploadPrivateBlob(newPath, fileData.buffer, {
            contentType: fileData.contentType,
          });
          await prisma.installationImage.update({
            where: { id: img.id },
            data: { filePath: newBlob.url },
          });
          console.log(`  ✅ [InstallImage #${img.id}] Migrated "${img.fileName}" -> ${newBlob.url}`);
          totalMigrated++;
        } catch (uploadErr: any) {
          console.error(`  ❌ [InstallImage #${img.id}] Upload error:`, uploadErr.message);
          totalFailed++;
        }
      } else {
        totalFailed++;
      }
    } else {
      totalSkipped++;
    }
  }

  // 4. Payment Receipt Migration
  console.log('\n💳 [4/6] Checking Payment receipt records...');
  const payments = await prisma.payment.findMany({
    where: { receiptUrl: { not: null } },
  });
  console.log(`Found ${payments.length} total Payment records with receiptUrl in DB.`);
  for (const pmt of payments) {
    if (pmt.receiptUrl && (pmt.receiptUrl.startsWith('http://') || pmt.receiptUrl.startsWith('https://'))) {
      const fileData = await downloadFileBuffer(pmt.receiptUrl);
      if (fileData) {
        const newPath = `receipts/receipt_payment_${pmt.id}_migrated_${Date.now()}.png`;
        try {
          const newBlob = await uploadPrivateBlob(newPath, fileData.buffer, {
            contentType: fileData.contentType,
          });
          await prisma.payment.update({
            where: { id: pmt.id },
            data: { receiptUrl: newBlob.url },
          });
          console.log(`  ✅ [Payment #${pmt.id}] Migrated receipt -> ${newBlob.url}`);
          totalMigrated++;
        } catch (uploadErr: any) {
          console.error(`  ❌ [Payment #${pmt.id}] Upload error:`, uploadErr.message);
          totalFailed++;
        }
      } else {
        totalFailed++;
      }
    } else {
      totalSkipped++;
    }
  }

  // 5. Meeting Audio Migration
  console.log('\n🎙️  [5/6] Checking MeetingBooking audio recordings...');
  const meetings = await prisma.meetingBooking.findMany({
    where: { audioRecordingPath: { not: null } },
  });
  console.log(`Found ${meetings.length} total MeetingBooking records with audio in DB.`);
  for (const m of meetings) {
    if (!m.audioRecordingPath) continue;

    let recordingsList: Array<{ index?: number; path: string; durationSec?: number | null; createdAt?: string }> = [];
    try {
      const parsed = JSON.parse(m.audioRecordingPath);
      if (Array.isArray(parsed)) {
        recordingsList = parsed;
      } else if (typeof parsed === 'string') {
        recordingsList = [{ path: parsed }];
      }
    } catch {
      recordingsList = [{ path: m.audioRecordingPath }];
    }

    let modified = false;
    const updatedRecordings: typeof recordingsList = [];

    for (let idx = 0; idx < recordingsList.length; idx++) {
      const item = recordingsList[idx];
      const audioUrl = typeof item === 'string' ? item : item.path;
      if (audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))) {
        const fileData = await downloadFileBuffer(audioUrl);
        if (fileData) {
          const newPath = `meetings/meeting_${m.id}_rec${idx}_migrated_${Date.now()}.webm`;
          try {
            const newBlob = await uploadPrivateBlob(newPath, fileData.buffer, {
              contentType: fileData.contentType,
            });
            if (typeof item === 'string') {
              updatedRecordings.push({ path: newBlob.url });
            } else {
              updatedRecordings.push({ ...item, path: newBlob.url });
            }
            modified = true;
            console.log(`  ✅ [Meeting #${m.id}] Migrated audio recording #${idx + 1} -> ${newBlob.url}`);
            totalMigrated++;
          } catch (uploadErr: any) {
            console.error(`  ❌ [Meeting #${m.id}] Audio upload error:`, uploadErr.message);
            updatedRecordings.push(item);
            totalFailed++;
          }
        } else {
          updatedRecordings.push(item);
          totalFailed++;
        }
      } else {
        updatedRecordings.push(item);
      }
    }

    if (modified) {
      await prisma.meetingBooking.update({
        where: { id: m.id },
        data: {
          audioRecordingPath: JSON.stringify(updatedRecordings),
        },
      });
    }
  }

  // 6. User Photograph Migration
  console.log('\n👤 [6/6] Checking User photograph records...');
  const users = await prisma.user.findMany({
    where: { photograph: { not: null } },
  });
  console.log(`Found ${users.length} total User records with photograph in DB.`);
  for (const u of users) {
    if (u.photograph && (u.photograph.startsWith('http://') || u.photograph.startsWith('https://'))) {
      const fileData = await downloadFileBuffer(u.photograph);
      if (fileData) {
        const newPath = `photographs/avatar_user_${u.id}_migrated_${Date.now()}.png`;
        try {
          const newBlob = await uploadPrivateBlob(newPath, fileData.buffer, {
            contentType: fileData.contentType,
          });
          await prisma.user.update({
            where: { id: u.id },
            data: { photograph: newBlob.url },
          });
          console.log(`  ✅ [User #${u.id} - ${u.name}] Migrated photograph -> ${newBlob.url}`);
          totalMigrated++;
        } catch (uploadErr: any) {
          console.error(`  ❌ [User #${u.id}] Photograph upload error:`, uploadErr.message);
          totalFailed++;
        }
      } else {
        totalFailed++;
      }
    } else {
      totalSkipped++;
    }
  }

  console.log('\n============================================================');
  console.log('🎉 Migration Completed Summary:');
  console.log(`   - Successfully Migrated: ${totalMigrated}`);
  console.log(`   - Failed: ${totalFailed}`);
  console.log(`   - Skipped (Local / Empty): ${totalSkipped}`);
  console.log('============================================================');
}

migrate()
  .catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
