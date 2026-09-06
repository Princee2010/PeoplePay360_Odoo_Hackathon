const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Contract = require('../models/Contract');
const Employee = require('../models/Employee');
const LeaveAllocation = require('../models/LeaveAllocation');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const SalaryRule = require('../models/SalaryRule');
const SalaryStructure = require('../models/SalaryStructure');
const User = require('../models/User');

const employees = [
  {
    employeeId: 'EMP001', firstName: 'Aarav', lastName: 'Patel', email: 'aarav.patel@example.com',
    phone: '+91 98765 43210', department: 'Information Technology', jobPosition: 'Software Developer',
    manager: 'Rohan Shah', schedule: 'Monday-Friday, 9:00 AM-6:00 PM', joiningDate: '2024-04-15', status: 'Active',
  },
  {
    employeeId: 'EMP002', firstName: 'Meera', lastName: 'Sharma', email: 'meera.sharma@example.com',
    phone: '+91 98765 43211', department: 'Human Resources', jobPosition: 'HR Manager',
    manager: 'Priya Kapoor', schedule: 'Monday-Friday, 9:00 AM-6:00 PM', joiningDate: '2023-08-01', status: 'Active',
  },
  {
    employeeId: 'EMP003', firstName: 'Kabir', lastName: 'Singh', email: 'kabir.singh@example.com',
    phone: '+91 98765 43212', department: 'Finance', jobPosition: 'Payroll Specialist',
    manager: 'Meera Sharma', schedule: 'Monday-Friday, 9:00 AM-6:00 PM', joiningDate: '2025-01-06', status: 'Active',
  },
];

for (let index = 4; index <= 53; index += 1) {
  const departments = ['Information Technology', 'Human Resources', 'Finance', 'Operations', 'Sales'];
  const positions = ['Associate', 'Specialist', 'Coordinator', 'Analyst', 'Executive'];
  const departmentIndex = index % departments.length;
  employees.push({
    employeeId: `EMP${String(index).padStart(3, '0')}`,
    firstName: `Demo${index}`,
    lastName: 'Employee',
    email: `employee${index}@demo.peoplepay360.com`,
    phone: `+91 90000 ${String(10000 + index)}`,
    department: departments[departmentIndex],
    jobPosition: positions[index % positions.length],
    manager: 'Aarav Patel',
    schedule: 'Monday-Friday, 9:00 AM-6:00 PM',
    joiningDate: '2026-01-05',
    status: 'Active',
  });
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const savedEmployees = {};
  for (const employeeData of employees) {
    const employee = await Employee.findOneAndUpdate(
      { employeeId: employeeData.employeeId },
      employeeData,
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    savedEmployees[employee.employeeId] = employee;
  }

  const demoUsers = [
    { name: 'Demo HR Manager', email: 'hr.manager@demo.peoplepay360.com', role: 'HR Manager' },
    { name: 'Demo Payroll User', email: 'hr.payroll.user@demo.peoplepay360.com', role: 'HR Payroll User' },
    { name: 'Demo Payroll Manager', email: 'hr.payroll.manager@demo.peoplepay360.com', role: 'HR Payroll Manager' },
    { name: 'Demo Admin', email: 'admin@demo.peoplepay360.com', role: 'Admin' },
  ];
  for (const demoUser of demoUsers) {
    let user = await User.findOne({ email: demoUser.email }).select('+password');
    if (!user) user = new User(demoUser);
    user.name = demoUser.name;
    user.role = demoUser.role;
    user.password = 'Demo@123456';
    await user.save();
  }

  for (const employee of Object.values(savedEmployees)) {
    let user = await User.findOne({ email: employee.email }).select('+password');
    if (!user) user = new User({ email: employee.email });
    user.name = `${employee.firstName} ${employee.lastName}`;
    user.role = 'Employee';
    user.employeeId = employee._id;
    user.password = 'Demo@123456';
    await user.save();
    if (String(employee.userId || '') !== String(user._id)) {
      employee.userId = user._id;
      await employee.save();
    }
  }

  const contractData = [
    { employeeId: 'EMP001', startDate: '2025-01-01', endDate: '2025-12-31', department: 'Information Technology', position: 'Software Developer', wage: 40000, status: 'Expired' },
    { employeeId: 'EMP001', startDate: '2026-01-01', endDate: null, department: 'Information Technology', position: 'Senior Software Developer', wage: 55000, status: 'Active' },
    { employeeId: 'EMP002', startDate: '2024-01-01', endDate: null, department: 'Human Resources', position: 'HR Manager', wage: 70000, status: 'Active' },
    { employeeId: 'EMP003', startDate: '2025-01-06', endDate: null, department: 'Finance', position: 'Payroll Specialist', wage: 48000, status: 'Active' },
  ];
  for (const contract of contractData) {
    await Contract.findOneAndUpdate(
      { employeeId: contract.employeeId, startDate: contract.startDate },
      contract,
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }

  const attendanceData = [
    { employeeId: 'EMP001', date: '2026-09-01', checkIn: '09:02', checkOut: '18:04', workedHours: 8.03, status: 'Present', remarks: 'On time' },
    { employeeId: 'EMP002', date: '2026-09-01', checkIn: '09:24', checkOut: '18:00', workedHours: 7.60, status: 'Late', remarks: 'Traffic delay' },
    { employeeId: 'EMP003', date: '2026-09-01', checkIn: '08:55', checkOut: '18:10', workedHours: 8.25, status: 'Overtime', remarks: 'Payroll closing' },
  ];
  for (const attendance of attendanceData) {
    await Attendance.findOneAndUpdate(
      { employeeId: attendance.employeeId, date: attendance.date },
      attendance,
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }

  const leaveTypes = {};
  for (const leaveTypeData of [
      { name: 'Home', description: 'Personal and home leave', isPaid: true },
      { name: 'Sick', description: 'Unlimited medical and wellness leave', isPaid: true },
      { name: 'Other', description: 'Other planned leave, up to 25 days per year', isPaid: true },
  ]) {
    leaveTypes[leaveTypeData.name] = await LeaveType.findOneAndUpdate(
      { name: leaveTypeData.name }, leaveTypeData, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }

  const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const sickDaysForYear = (year) => (isLeapYear(year) ? 366 : 365);

  for (const employeeId of ['EMP001', 'EMP002', 'EMP003']) {
    for (const leaveType of Object.values(leaveTypes)) {
      await LeaveAllocation.findOneAndUpdate(
        { employeeId: savedEmployees[employeeId]._id, leaveTypeId: leaveType._id, year: 2026 },
          { employeeId: savedEmployees[employeeId]._id, leaveTypeId: leaveType._id, year: 2026, allocatedDays: leaveType.name === 'Sick' ? sickDaysForYear(2026) : 25, takenDays: employeeId === 'EMP001' && leaveType.name === 'Home' ? 3 : 0 },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
    }
  }

  await LeaveRequest.findOneAndUpdate(
     { employeeId: savedEmployees.EMP001._id, leaveTypeId: leaveTypes.Home._id, fromDate: '2026-10-12', toDate: '2026-10-14', days: 3, reason: 'Family vacation', status: 'Pending' },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  const ruleData = [
    { code: 'BASIC', name: 'Basic Salary', category: 'Basic', sequence: 1, calculationType: 'Percentage', value: 50, formula: '' },
    { code: 'HRA', name: 'House Rent Allowance', category: 'Allowance', sequence: 2, calculationType: 'Percentage', value: 20, formula: '' },
    { code: 'PF', name: 'Provident Fund', category: 'Deduction', sequence: 3, calculationType: 'Percentage', value: 12, formula: '' },
  ];
  const rules = [];
  for (const rule of ruleData) {
    rules.push(await SalaryRule.findOneAndUpdate(
      { code: rule.code }, rule, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ));
  }

  await SalaryStructure.findOneAndUpdate(
    { name: 'Regular Monthly Salary' },
    { name: 'Regular Monthly Salary', description: 'Standard monthly employee salary', ruleIds: rules.map((rule) => rule._id), isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  console.log('Sample data seeded: employees, contracts, attendance, time off, salary rules, and salary structure.');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});