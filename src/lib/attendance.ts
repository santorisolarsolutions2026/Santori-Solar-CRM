/**
 * Validates whether current time is within the allowed attendance window (9:00 AM to 9:00 PM IST).
 * Client and Server safe utility (zero Node.js dependencies).
 */
export function isWithinAttendanceHours(): { allowed: boolean; message: string } {
  try {
    const now = new Date();
    // Calculate current time in IST (Asia/Kolkata)
    const istDateString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istDateString);
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();

    // Allowed between 9:00 AM (09:00) and 9:00 PM (21:00)
    const isBefore9AM = hours < 9;
    const isAfter9PM = hours > 21 || (hours === 21 && minutes > 0);

    if (isBefore9AM || isAfter9PM) {
      return {
        allowed: false,
        message: 'Check-in and Check-out are permitted between 9:00 AM and 9:00 PM only.',
      };
    }

    return { allowed: true, message: '' };
  } catch {
    // Fallback using local device time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isBefore9AM = hours < 9;
    const isAfter9PM = hours > 21 || (hours === 21 && minutes > 0);

    if (isBefore9AM || isAfter9PM) {
      return {
        allowed: false,
        message: 'Check-in and Check-out are permitted between 9:00 AM and 9:00 PM only.',
      };
    }

    return { allowed: true, message: '' };
  }
}

/**
 * Calculates effective working minutes strictly within the 10:00 AM to 7:00 PM IST window.
 * Excludes time before 10:00 AM and after 7:00 PM.
 *
 * Example:
 * - 09:15 AM - 08:30 PM -> 10:00 AM - 07:00 PM = 9h 0m (540 min)
 * - 10:07 AM - 07:04 PM -> 10:07 AM - 07:00 PM = 8h 53m (533 min)
 * - 09:58 AM - 07:00 PM -> 10:00 AM - 07:00 PM = 9h 0m (540 min)
 */
export function calculateEffectiveWorkDurationMin(checkInDate: Date | string, checkOutDate: Date | string): number {
  try {
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || outDate <= inDate) {
      return 0;
    }

    // Determine the IST date components of check-in
    const istDateString = inDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istDateString);
    const y = istDate.getFullYear();
    const m = String(istDate.getMonth() + 1).padStart(2, '0');
    const d = String(istDate.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    // 10:00 AM IST is 04:30:00.000Z UTC
    const shiftStart = new Date(`${dateKey}T04:30:00.000Z`).getTime();
    // 07:00 PM (19:00) IST is 13:30:00.000Z UTC
    const shiftEnd = new Date(`${dateKey}T13:30:00.000Z`).getTime();

    const actualStart = inDate.getTime();
    const actualEnd = outDate.getTime();

    // Clamp between shiftStart and shiftEnd
    const effectiveStart = Math.max(actualStart, shiftStart);
    const effectiveEnd = Math.min(actualEnd, shiftEnd);

    if (effectiveEnd <= effectiveStart) {
      return 0;
    }

    return Math.max(1, Math.round((effectiveEnd - effectiveStart) / (1000 * 60)));
  } catch {
    const inDate = new Date(checkInDate).getTime();
    const outDate = new Date(checkOutDate).getTime();
    return Math.max(0, Math.round((outDate - inDate) / (1000 * 60)));
  }
}
