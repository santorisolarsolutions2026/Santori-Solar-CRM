/**
 * Auto-closes an unclosed attendance record using the 3-warnings-per-month rule:
 * - 1st, 2nd, 3rd missed check-out in the month: Warning (1/3, 2/3, 3/3) without Half Day penalty.
 * - 4th+ missed check-out in the month: Half Day penalty applied.
 */
export async function autoCloseAttendanceRecord(
  attendanceModel: any,
  rec: {
    id: number;
    userId: number;
    date: Date | string;
    checkIn: Date | string;
    checkInLocation?: string | null;
    status: string;
    notes?: string | null;
  },
  dateStr: string,
  isPastDay: boolean
) {
  const windowStart = new Date(`${dateStr}T10:00:00+05:30`).getTime();
  const windowEnd = new Date(`${dateStr}T19:30:00+05:30`).getTime();
  const autoCheckOutTime = new Date(`${dateStr}T19:30:00+05:30`);

  const checkInTime = new Date(rec.checkIn).getTime();
  const effectiveStart = Math.max(checkInTime, windowStart);
  const effectiveEnd = Math.min(autoCheckOutTime.getTime(), windowEnd);
  const workDurationMin = effectiveEnd > effectiveStart
    ? Math.round((effectiveEnd - effectiveStart) / (1000 * 60))
    : 1;

  // Arrival > 10:15 AM check
  const checkInIstFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(new Date(rec.checkIn));
  const [ciHoursStr, ciMinsStr] = checkInIstFormatted.split(':');
  const checkInMinutesOfDay = parseInt(ciHoursStr, 10) * 60 + parseInt(ciMinsStr, 10);
  const isLateHalfDayArrival = checkInMinutesOfDay > 615 || rec.status === 'half_day';

  // Count missed check-outs in the same month prior to this record's date
  const [recYearStr, recMonthStr] = dateStr.split('-');
  const startOfMonth = new Date(`${recYearStr}-${recMonthStr}-01T00:00:00+05:30`);

  const prevMissedCount = await attendanceModel.count({
    where: {
      userId: rec.userId,
      date: { gte: startOfMonth, lt: new Date(rec.date) },
      notes: { contains: 'Auto-closed' },
    },
  }).catch(() => 0);

  let finalAutoStatus = 'absent';
  let autoNote = '';
  const reasonPrefix = isPastDay
    ? 'Auto-closed: Missed check-out on previous day'
    : 'Auto-closed: Missed 08:30 PM check-out deadline';

  if (prevMissedCount < 3) {
    const warnNum = prevMissedCount + 1;
    if (isLateHalfDayArrival) {
      finalAutoStatus = workDurationMin >= 270 ? 'half_day' : 'absent';
    } else if (workDurationMin >= 540) {
      finalAutoStatus = 'completed';
    } else if (workDurationMin >= 270) {
      finalAutoStatus = 'half_day';
    } else {
      finalAutoStatus = 'absent';
    }
    autoNote = `${reasonPrefix} (Warning ${warnNum}/3).`;
  } else {
    finalAutoStatus = workDurationMin >= 270 ? 'half_day' : 'absent';
    autoNote = `${reasonPrefix} (4th+ time: Half Day penalty applied).`;
  }

  const newNotes = rec.notes ? `${rec.notes} | ${autoNote}` : autoNote;

  return attendanceModel.update({
    where: { id: rec.id },
    data: {
      checkOut: autoCheckOutTime,
      checkOutLocation: rec.checkInLocation || 'Office / Web Portal',
      workDurationMin,
      status: finalAutoStatus,
      notes: newNotes,
    },
  });
}
