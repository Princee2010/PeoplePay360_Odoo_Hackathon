const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  LATE: 'Late',
  ABSENT: 'Absent',
  OVERTIME: 'Overtime',
  MISSING_CHECKOUT: 'Missing Checkout',
};

const DEFAULT_SHIFT_START = '09:00';
const STANDARD_SHIFT_HOURS = 8.5;

const toMinutes = (time) => {
  if (!time) return null;

  const [hours, minutes] = String(time).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
};

const calculateWorkedHours = (checkIn, checkOut) => {
  const checkInMinutes = toMinutes(checkIn);
  const checkOutMinutes = toMinutes(checkOut);

  if (checkInMinutes === null || checkOutMinutes === null) {
    return 0;
  }

  const diffMinutes = checkOutMinutes - checkInMinutes;
  if (diffMinutes <= 0) return 0;

  return Number((diffMinutes / 60).toFixed(2));
};

const resolveAttendanceStatus = ({ checkIn, checkOut, workedHours }) => {
  if (!checkIn && !checkOut) return ATTENDANCE_STATUS.ABSENT;

  if (!checkOut) return ATTENDANCE_STATUS.MISSING_CHECKOUT;

  const normalizedWorkedHours = typeof workedHours === 'number'
    ? workedHours
    : calculateWorkedHours(checkIn, checkOut);

  const checkInMinutes = toMinutes(checkIn);
  const lateThreshold = toMinutes(DEFAULT_SHIFT_START) + 15;

  if (checkInMinutes !== null && checkInMinutes > lateThreshold) {
    return ATTENDANCE_STATUS.LATE;
  }

  if (normalizedWorkedHours > STANDARD_SHIFT_HOURS) {
    return ATTENDANCE_STATUS.OVERTIME;
  }

  return ATTENDANCE_STATUS.PRESENT;
};

const resolveAttendanceRemarks = ({ checkIn, checkOut, workedHours, status }) => {
  const resolvedStatus = status || resolveAttendanceStatus({ checkIn, checkOut, workedHours });
  if (resolvedStatus === ATTENDANCE_STATUS.ABSENT) return 'No check-in or check-out recorded';
  if (resolvedStatus === ATTENDANCE_STATUS.MISSING_CHECKOUT) return 'Check-out is missing';
  if (resolvedStatus === ATTENDANCE_STATUS.LATE) return 'Late check-in';
  if (resolvedStatus === ATTENDANCE_STATUS.OVERTIME) return 'Worked beyond standard hours';
  return 'On schedule';
};

module.exports = {
  ATTENDANCE_STATUS,
  calculateWorkedHours,
  resolveAttendanceStatus,
  resolveAttendanceRemarks,
};
