import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const meetingsWithAudio = await prisma.meetingBooking.findMany({
    where: {
      audioRecordingPath: { not: null }
    },
    include: {
      lead: { select: { id: true, leadCode: true, customerName: true } },
      executive: { select: { id: true, name: true } },
      bookedBy: { select: { id: true, name: true } }
    }
  });

  console.log(`=== TOTAL MEETINGS WITH AUDIO IN DB: ${meetingsWithAudio.length} ===`);
  meetingsWithAudio.forEach(m => {
    console.log(`- Meeting ID: ${m.id} | Lead: #${m.lead?.leadCode} (${m.lead?.customerName}) | Executive: ${m.executive?.name} | Path: ${m.audioRecordingPath}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
