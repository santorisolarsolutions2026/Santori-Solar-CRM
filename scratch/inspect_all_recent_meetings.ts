import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('=== ALL RECENT MEETINGS IN CRM (LAST 25) ===');
  const meetings = await prisma.meetingBooking.findMany({
    take: 25,
    orderBy: { id: 'desc' },
    include: {
      lead: {
        select: {
          id: true,
          leadCode: true,
          customerName: true,
          status: true,
          assignedConsultantId: true,
          assignedTlId: true,
          assignedManagerId: true,
        }
      },
      executive: { select: { id: true, name: true, email: true, role: true } },
      bookedBy: { select: { id: true, name: true, email: true, role: true } },
    }
  });

  for (const m of meetings) {
    console.log(`\n--- Meeting ID: ${m.id} | Lead #${m.lead?.leadCode} (${m.lead?.customerName}) ---`);
    console.log(`Created: ${m.createdAt?.toISOString()} | Meeting Date: ${m.meetingDate} ${m.meetingTime}`);
    console.log(`Executive: ${m.executive?.name} (ID: ${m.assignedExecutiveId}, Role: ${m.executive?.role}) | BookedBy: ${m.bookedBy?.name}`);
    console.log(`Lead Assignee IDs -> Consultant: ${m.lead?.assignedConsultantId}, TL: ${m.lead?.assignedTlId}, Mgr: ${m.lead?.assignedManagerId}`);
    console.log(`StartedAt: ${m.meetingStartedAt?.toISOString() || 'NULL'} | EndedAt: ${m.meetingEndedAt?.toISOString() || 'NULL'}`);
    console.log(`Duration: ${m.meetingDurationSec} sec`);
    console.log(`AudioPath: ${m.audioRecordingPath || 'NULL'}`);
    console.log(`GPS: ${m.meetingLatitude}, ${m.meetingLongitude} (${m.meetingCity || 'No city'})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
