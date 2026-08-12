import { prisma } from '@/lib/db';
import { calculateEffectiveWorkDurationMin } from '@/lib/attendance';

/**
 * Automatically checks out any attendance records that were left checked in after 9:00 PM IST.
 * Marks checkout location as 'System Check-out', workDurationMin as null, and status as 'system_completed'.
 * Also self-corrects any records falsely tagged due to UTC vs IST conversions.
 */
export async function processSystemAutoCheckouts() {
  try {
    const attendanceModel = (prisma as any).attendance;
    if (!attendanceModel) return;

    const now = new Date();
    const istDateString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istDateString);
    const istHours = istDate.getHours();

    // Current IST date formatted
    const y = istDate.getFullYear();
    const m = String(istDate.getMonth() + 1).padStart(2, '0');
    const d = String(istDate.getDate()).padStart(2, '0');
    const todayFormatted = `${y}-${m}-${d}`;
    const todayDate = new Date(`${todayFormatted}T00:00:00.000Z`);

    // 1. Process past days records (date < todayDate) that were never checked out
    const pastUncheckedRecords = await attendanceModel.findMany({
      where: {
        date: { lt: todayDate },
        checkOut: null,
      },
    });

    for (const record of pastUncheckedRecords) {
      const recDate = new Date(record.date);
      const recY = recDate.getUTCFullYear();
      const recM = String(recDate.getUTCMonth() + 1).padStart(2, '0');
      const recD = String(recDate.getUTCDate()).padStart(2, '0');
      // 9:00 PM IST is 15:30 UTC
      const autoCheckOutTime = new Date(`${recY}-${recM}-${recD}T15:30:00.000Z`);
      const finalStatus = (record.status === 'absent' || record.status === 'half_day') ? record.status : 'system_completed';

      await attendanceModel.update({
        where: { id: record.id },
        data: {
          checkOut: autoCheckOutTime,
          checkOutLocation: 'System Check-out',
          workDurationMin: null,
          status: finalStatus,
          notes: record.notes
            ? `${record.notes} | System Auto Check-out at 9:00 PM`
            : 'System Auto Check-out at 9:00 PM',
        },
      });
    }

    // 2. Process today's records if current time in IST is >= 9:00 PM (21:00)
    const isPast9PMToday = istHours >= 21;
    if (isPast9PMToday) {
      const todayUncheckedRecords = await attendanceModel.findMany({
        where: {
          date: todayDate,
          checkOut: null,
        },
      });

      for (const record of todayUncheckedRecords) {
        const autoCheckOutTime = new Date(`${todayFormatted}T15:30:00.000Z`);
        const finalStatus = (record.status === 'absent' || record.status === 'half_day') ? record.status : 'system_completed';

        await attendanceModel.update({
          where: { id: record.id },
          data: {
            checkOut: autoCheckOutTime,
            checkOutLocation: 'System Check-out',
            workDurationMin: null,
            status: finalStatus,
            notes: record.notes
              ? `${record.notes} | System Auto Check-out at 9:00 PM`
              : 'System Auto Check-out at 9:00 PM',
          },
        });
      }
    }

    // 3. Self-correct records and ensure workDurationMin excludes time before 10:00 AM and after 7:00 PM
    const checkedOutRecords = await attendanceModel.findMany({
      where: {
        checkOut: { not: null },
        checkOutLocation: { not: 'System Check-out' },
      },
    });

    for (const record of checkedOutRecords) {
      const inIST = new Date(new Date(record.checkIn).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const outIST = new Date(new Date(record.checkOut).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

      const inMins = inIST.getHours() * 60 + inIST.getMinutes();
      const outHours = outIST.getHours();

      // Recalculate effective work duration strictly within 10:00 AM to 7:00 PM
      const effectiveWorkDuration = calculateEffectiveWorkDurationMin(record.checkIn, record.checkOut);

      // Check-in on time (<= 10:15 AM = 615 min) AND Checked-out after shift (>= 7:00 PM = 19:00)
      if (inMins <= 615 && outHours >= 19) {
        const cleanedNotes = record.notes
          ? record.notes.replace(/Early check-out \(before 7:00 PM\)\. (Automatically )?marked as Half Day\./gi, '').trim().replace(/^\|\s*|\s*\|$/g, '')
          : null;

        await attendanceModel.update({
          where: { id: record.id },
          data: {
            status: 'completed',
            workDurationMin: effectiveWorkDuration,
            notes: cleanedNotes || null,
          },
        });
      } else {
        // Ensure workDurationMin is accurate even for half-day or other regular checkouts
        if (record.workDurationMin !== effectiveWorkDuration) {
          await attendanceModel.update({
            where: { id: record.id },
            data: {
              workDurationMin: effectiveWorkDuration,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('System attendance processing error:', err);
  }
}
