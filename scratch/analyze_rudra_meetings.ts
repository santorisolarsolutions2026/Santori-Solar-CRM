import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('--- SEARCHING FOR USER "RUDRA" ---');
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Rudra', mode: 'insensitive' } },
        { name: { contains: 'Sahani', mode: 'insensitive' } },
        { email: { contains: 'rudra', mode: 'insensitive' } }
      ]
    },
    include: {
      department: true,
      designation: true,
    }
  });

  console.log(`Found ${users.length} matching user(s):`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Dept: ${u.department?.name}, Designation: ${u.designation?.name}`);
  });

  if (users.length === 0) {
    console.log('No user found matching Rudra. Listing recent 20 users:');
    const allUsers = await prisma.user.findMany({ take: 20, select: { id: true, name: true, role: true } });
    console.log(allUsers);
    return;
  }

  for (const user of users) {
    console.log(`\n========================================`);
    console.log(`MEETINGS FOR USER: ${user.name} (ID: ${user.id})`);
    console.log(`========================================`);

    // 1. Meetings where user is assigned executive or bookedBy
    const meetings = await prisma.meetingBooking.findMany({
      where: {
        OR: [
          { assignedExecutiveId: user.id },
          { bookedById: user.id },
          { lead: { assignedConsultantId: user.id } },
          { lead: { assignedTlId: user.id } },
          { lead: { assignedManagerId: user.id } },
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            leadCode: true,
            customerName: true,
            mobile: true,
            status: true,
            assignedConsultantId: true,
            assignedTlId: true,
            assignedManagerId: true,
          }
        },
        executive: {
          select: { id: true, name: true }
        },
        bookedBy: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`Total meetings found: ${meetings.length}`);

    meetings.forEach((m, idx) => {
      console.log(`\n--- [Meeting #${idx + 1}] ID: ${m.id} ---`);
      console.log(`Lead: #${m.lead?.leadCode || m.leadId} - ${m.lead?.customerName} (Status Stage: ${m.lead?.status})`);
      console.log(`Meeting Date & Time: ${m.meetingDate} ${m.meetingTime}`);
      console.log(`Booked By: ${m.bookedBy?.name} (ID: ${m.bookedById}) | Executive: ${m.executive?.name} (ID: ${m.assignedExecutiveId})`);
      console.log(`Started At: ${m.meetingStartedAt?.toISOString() || 'NOT STARTED'}`);
      console.log(`Ended At: ${m.meetingEndedAt?.toISOString() || 'NOT ENDED'}`);
      console.log(`Duration (sec): ${m.meetingDurationSec}`);
      console.log(`GPS Coordinates: Lat=${m.meetingLatitude}, Lng=${m.meetingLongitude}`);
      console.log(`Location Decoded: City=${m.meetingCity}, Locality=${m.meetingLocality}, Pin=${m.meetingPinCode}`);
      console.log(`Address in Booking: ${m.address}, PinCode: ${m.pinCode}`);
      console.log(`Audio Recording Path: ${m.audioRecordingPath || 'NULL / NO AUDIO'}`);
      console.log(`Notes / Remark: ${m.notes}`);
    });

    // Also check Activity logs created by this user
    console.log(`\n--- RECENT ACTIVITY LOGS FOR ${user.name} ---`);
    const logs = await prisma.leadActivityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        lead: { select: { id: true, leadCode: true, customerName: true } }
      }
    });
    logs.forEach(l => {
      console.log(`- [${l.createdAt.toISOString()}] Lead #${l.lead?.leadCode} (${l.lead?.customerName}): From ${l.fromStatus} -> To ${l.toStatus} | Remark: ${l.remark}`);
    });
  }

  // Also query the last 10 global meetings in the CRM
  console.log(`\n========================================`);
  console.log(`LAST 10 GLOBAL MEETINGS IN CRM`);
  console.log(`========================================`);
  const globalMeetings = await prisma.meetingBooking.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      lead: { select: { id: true, leadCode: true, customerName: true, status: true } },
      executive: { select: { id: true, name: true } },
      bookedBy: { select: { id: true, name: true } }
    }
  });

  globalMeetings.forEach((m, idx) => {
    console.log(`[Global #${idx + 1}] ID: ${m.id} | Lead: #${m.lead?.leadCode} (${m.lead?.customerName}) | Exec: ${m.executive?.name} | Date: ${m.meetingDate} ${m.meetingTime} | Started: ${m.meetingStartedAt ? 'YES' : 'NO'} | Ended: ${m.meetingEndedAt ? 'YES' : 'NO'} | Audio: ${m.audioRecordingPath ? 'YES' : 'NO'} (${m.audioRecordingPath}) | GPS: ${m.meetingLatitude},${m.meetingLongitude} (${m.meetingCity || m.meetingLocality || 'No City'})`);
  });
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
