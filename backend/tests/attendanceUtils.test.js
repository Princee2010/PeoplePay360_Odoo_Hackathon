const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateWorkedHours, resolveAttendanceStatus } = require('../utils/attendanceUtils');

test('calculateWorkedHours converts time range to decimal hours', () => {
  assert.equal(calculateWorkedHours('09:00', '18:10'), 9.17);
  assert.equal(calculateWorkedHours('09:05', '18:00'), 8.92);
});

test('resolveAttendanceStatus marks late and missing checkout correctly', () => {
  assert.equal(resolveAttendanceStatus({ checkIn: '09:30', checkOut: '18:00' }), 'Late');
  assert.equal(resolveAttendanceStatus({ checkIn: '09:00', checkOut: null }), 'Missing Checkout');
  assert.equal(resolveAttendanceStatus({ checkIn: null, checkOut: null }), 'Absent');
});
