import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function checkMeetings() {
  const totalMeetings = await prisma.meetingBooking.count();
  const meetingsWithAudio = await prisma.meetingBooking.findMany({
    select: {
      id: true,
      leadId: true,
      meetingDate: true,
      audioRecordingPath: true,
      meetingDurationSec: true,
    },
  });

  console.log(`\n📊 Total MeetingBooking records in DB: ${totalMeetings}`);
  console.log(`------------------------------------------------------`);
  
  let withAudioCount = 0;
  let withoutAudioCount = 0;
  let privateBlobCount = 0;
  let publicBlobCount = 0;
  let localPathCount = 0;

  meetingsWithAudio.forEach((m) => {
    if (!m.audioRecordingPath || m.audioRecordingPath === '[]' || m.audioRecordingPath === '""') {
      withoutAudioCount++;
    } else {
      withAudioCount++;
      const pathStr = m.audioRecordingPath;
      if (pathStr.includes('private.blob.vercel-storage.com')) {
        privateBlobCount++;
        console.log(`[Meeting #${m.id}] (Lead #${m.leadId}) -> 🔒 PRIVATE BLOB: ${pathStr}`);
      } else if (pathStr.includes('blob.vercel-storage.com') || pathStr.startsWith('http')) {
        publicBlobCount++;
        console.log(`[Meeting #${m.id}] (Lead #${m.leadId}) -> 🌐 PUBLIC BLOB (Unmigrated): ${pathStr}`);
      } else {
        localPathCount++;
        console.log(`[Meeting #${m.id}] (Lead #${m.leadId}) -> 💾 LOCAL PATH: ${pathStr}`);
      }
    }
  });

  console.log(`\n------------------------------------------------------`);
  console.log(`Summary:`);
  console.log(`  - Total Meetings: ${totalMeetings}`);
  console.log(`  - Meetings WITHOUT audio recording: ${withoutAudioCount}`);
  console.log(`  - Meetings WITH audio recording: ${withAudioCount}`);
  console.log(`      * In Private Blob: ${privateBlobCount}`);
  console.log(`      * In Public Blob: ${publicBlobCount}`);
  console.log(`      * Local Disk Paths: ${localPathCount}`);
}

checkMeetings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
