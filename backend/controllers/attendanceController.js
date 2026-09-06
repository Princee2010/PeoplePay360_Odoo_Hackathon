const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { calculateWorkedHours, resolveAttendanceRemarks, resolveAttendanceStatus } = require('../utils/attendanceUtils');

const normalizeAttendancePayload = (body) => {
  const checkIn = body.checkIn || null;
  const checkOut = body.checkOut || null;
  const workedHours = body.workedHours !== undefined && body.workedHours !== null
    ? Number(body.workedHours)
    : calculateWorkedHours(checkIn, checkOut);

  return {
    employeeId: body.employeeId,
    date: body.date,
    checkIn,
    checkOut,
    workedHours,
    status: resolveAttendanceStatus({ checkIn, checkOut, workedHours }),
    remarks: resolveAttendanceRemarks({ checkIn, checkOut, workedHours }),
  };
};

const listAttendance = async (req, res) => {
  const { employeeId, fromDate, toDate } = req.query;
  const filter = {};

  if (req.user.role === 'Employee') {
    const employee = await Employee.findOne({ _id: req.user.employeeId }).select('employeeId');
    filter.employeeId = employee?.employeeId || '__no_employee__';
  }

  if (employeeId && req.user.role !== 'Employee') filter.employeeId = employeeId;

  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = new Date(fromDate);
    if (toDate) filter.date.$lte = new Date(toDate);
  }

  const attendance = await Attendance.find(filter).sort({ date: -1, employeeId: 1 });
  return res.json({ attendance });
};

const getAttendance = async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ message: 'Attendance record not found' });
  }
  if (req.user.role === 'Employee' && String(record.employeeRef || '') !== String(req.user.employeeId) && record.employeeId !== req.user.employeeCode) return res.status(403).json({ message: 'You can only view your own attendance' });

  return res.json({ attendance: record });
};

const createAttendance = async (req, res) => {
  const payload = normalizeAttendancePayload(req.body);

  if (!payload.employeeId || !payload.date) {
    return res.status(400).json({ message: 'Employee ID and date are required' });
  }

  const employee = await Employee.findOne({ employeeId: payload.employeeId });
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  if (req.user.role === 'Employee' && String(employee._id) !== String(req.user.employeeId)) {
    return res.status(403).json({ message: 'You can only record your own attendance' });
  }

  const attendanceDate = new Date(payload.date);
  const dayStart = new Date(attendanceDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const existing = await Attendance.findOne({
    employeeId: payload.employeeId,
    date: { $gte: dayStart, $lt: dayEnd },
  });
  if (existing) {
    return res.status(409).json({ message: 'Attendance already exists for this employee and date' });
  }

  const attendance = await Attendance.create({
    ...payload,
    employeeRef: employee._id,
    status: payload.status || resolveAttendanceStatus(payload),
    workedHours: payload.workedHours || calculateWorkedHours(payload.checkIn, payload.checkOut),
  });

  return res.status(201).json({ attendance });
};

const updateAttendance = async (req, res) => {
  const payload = normalizeAttendancePayload(req.body);
  const existing = await Attendance.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Attendance record not found' });
  if (req.user.role === 'Employee' && existing.employeeId !== payload.employeeId) {
    return res.status(403).json({ message: 'You can only update your own attendance' });
  }

  const attendance = await Attendance.findByIdAndUpdate(
    req.params.id,
    {
      ...payload,
      status: payload.status || resolveAttendanceStatus(payload),
      workedHours: payload.workedHours || calculateWorkedHours(payload.checkIn, payload.checkOut),
    },
    { new: true, runValidators: true }
  );

  return res.json({ attendance });
};

const deleteAttendance = async (req, res) => {
  const attendance = await Attendance.findByIdAndDelete(req.params.id);
  if (!attendance) {
    return res.status(404).json({ message: 'Attendance record not found' });
  }

  return res.json({ message: 'Attendance deleted' });
};

module.exports = {
  listAttendance,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
};
