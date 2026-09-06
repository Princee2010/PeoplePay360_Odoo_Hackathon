const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Schedule = require('../models/Schedule');
const Contract = require('../models/Contract');
const Attendance = require('../models/Attendance');
const LeaveType = require('../models/LeaveType');
const LeaveAllocation = require('../models/LeaveAllocation');
const LeaveRequest = require('../models/LeaveRequest');
const Payrun = require('../models/Payrun');
const Payslip = require('../models/Payslip');
const SalaryRule = require('../models/SalaryRule');
const SalaryStructure = require('../models/SalaryStructure');
const { calculateSalary } = require('../services/payrollService');

const TOTAL_EMPLOYEES = 150;
const PASSWORD = 'Demo@123456';
const departments = ['Engineering', 'People', 'Finance', 'Operations', 'Sales', 'Product', 'Customer Success'];
const positions = ['Developer', 'Analyst', 'Specialist', 'Designer', 'Coordinator', 'Manager', 'Executive'];
const firstNames = ['Aarav', 'Ananya', 'Kabir', 'Meera', 'Rohan', 'Isha', 'Vikram', 'Priya', 'Karan', 'Neha'];
const lastNames = ['Patel', 'Shah', 'Mehta', 'Singh', 'Nair', 'Joshi', 'Rao', 'Kapoor', 'Desai', 'Malhotra'];
const analyticsCode = (index) => `ANL-${String(index + 1).padStart(3, '0')}`;
const dateKey = (date) => date.toISOString().slice(0, 10);
const periodKey = (date) => date.toISOString().slice(0, 7);
const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

const dateRange = (start, end) => {
  const dates = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) dates.push(new Date(date));
  return dates;
};

async function upsertRule(rule) {
  return SalaryRule.findOneAndUpdate({ code: rule.code }, rule, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function run() {
  await connectDB();
  const schedule = await Schedule.findOneAndUpdate(
    { name: 'Analytics 40 Hour Week' },
    { name: 'Analytics 40 Hour Week', timezone: 'Asia/Kolkata', weeklyHours: 40, workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const rules = await Promise.all([
    upsertRule({ code: 'ANL_BASIC', name: 'Analytics Basic Salary', category: 'Basic', sequence: 10, calculationType: 'Percentage', value: 70, formula: '' }),
    upsertRule({ code: 'ANL_HRA', name: 'Analytics HRA', category: 'Allowance', sequence: 20, calculationType: 'Percentage', value: 20, formula: '' }),
    upsertRule({ code: 'ANL_ALLOWANCE', name: 'Analytics Allowance', category: 'Allowance', sequence: 30, calculationType: 'Fixed amount', value: 3000, formula: '' }),
    upsertRule({ code: 'ANL_PF', name: 'Analytics PF', category: 'Deduction', sequence: 40, calculationType: 'Percentage', value: 12, formula: '' }),
    upsertRule({ code: 'ANL_TAX', name: 'Analytics Tax', category: 'Tax', sequence: 50, calculationType: 'Fixed amount', value: 2500, formula: '' }),
  ]);
  const structure = await SalaryStructure.findOneAndUpdate(
    { name: 'Analytics Variable Salary' },
    { name: 'Analytics Variable Salary', description: 'Variable salary data for dashboard analysis', ruleIds: rules.map((rule) => rule._id), isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const leaveTypes = await Promise.all(['Home', 'Sick', 'Other'].map((name) => LeaveType.findOneAndUpdate(
    { name },
    { name, description: `${name} leave for analytics data`, isPaid: true, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )));

  const employees = [];
  for (let index = 0; index < TOTAL_EMPLOYEES; index += 1) {
    const code = analyticsCode(index);
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[(index * 3) % lastNames.length];
    const email = `${code.toLowerCase()}@analytics.peoplepay360.com`;
    let user = await User.findOne({ email }).select('+password');
    if (!user) user = new User({ email });
    user.name = `${firstName} ${lastName}`;
    user.email = email;
    user.role = 'Employee';
    user.password = PASSWORD;
    await user.save();
    const employee = await Employee.findOneAndUpdate(
      { employeeId: code },
      {
        employeeId: code, userId: user._id, firstName, lastName, email,
        phone: `+91 97${String(10000000 + index).slice(-8)}`,
        bankName: 'Analytics Bank', bankAccountNumber: `ANL${String(1000000000 + index)}`,
        department: departments[index % departments.length], jobPosition: positions[index % positions.length],
        manager: index % 7 === 0 ? '' : analyticsCode(Math.floor(index / 7) * 7),
        schedule: 'Analytics 40 Hour Week', scheduleId: schedule._id, employeeType: index % 11 === 0 ? 'Part-time' : 'Full-time',
        joiningDate: new Date(Date.UTC(2021 + (index % 5), index % 12, 1)), status: index % 37 === 0 ? 'On Leave' : 'Active',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    user.employeeId = employee._id;
    await user.save();
    employees.push(employee);
  }

  const contractOperations = [];
  for (const [index, employee] of employees.entries()) {
    const baseWage = 30000 + (index % 15) * 5000;
    for (let year = 2021; year <= 2026; year += 1) {
      const startDate = new Date(Date.UTC(year, 0, 1));
      const endDate = year === 2026 ? null : new Date(Date.UTC(year, 11, 31));
      contractOperations.push({
        updateOne: {
          filter: { employeeId: employee.employeeId, startDate },
          update: { $set: { employeeRef: employee._id, endDate, department: employee.department, position: employee.jobPosition, wage: baseWage + (year - 2021) * 4000, salaryStructureId: structure._id.toString(), salaryStructureRef: structure._id, status: year === 2026 ? 'Active' : 'Expired' } },
          upsert: true,
        },
      });
    }
  }
  for (const operations of chunk(contractOperations, 500)) await Contract.bulkWrite(operations, { ordered: false });

  const start = new Date(Date.UTC(2021, 9, 1));
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const attendanceOperations = [];
  for (const [index, employee] of employees.entries()) {
    for (const date of dateRange(start, end)) {
      const weekday = date.getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      const cycle = (index + date.getUTCDate() + date.getUTCMonth()) % 20;
      const status = cycle === 0 ? 'Absent' : cycle === 1 ? 'Late' : cycle === 2 ? 'Overtime' : cycle === 3 ? 'Missing Checkout' : 'Present';
      const checkOut = status === 'Absent' || status === 'Missing Checkout' ? null : status === 'Overtime' ? '20:00' : '18:00';
      attendanceOperations.push({
        updateOne: {
          filter: { employeeId: employee.employeeId, date },
          update: { $set: { employeeRef: employee._id, checkIn: status === 'Absent' ? null : status === 'Late' ? '09:24' : '09:00', checkOut, workedHours: status === 'Absent' ? 0 : status === 'Overtime' ? 10 : status === 'Missing Checkout' ? 8 : status === 'Late' ? 7.6 : 8, status, remarks: status === 'Late' ? 'Traffic delay' : status === 'Overtime' ? 'Project deadline' : '' } },
          upsert: true,
        },
      });
    }
  }
  for (const operations of chunk(attendanceOperations, 1000)) await Attendance.bulkWrite(operations, { ordered: false });

  const allocationOperations = [];
  for (const employee of employees) {
    for (let year = 2021; year <= 2026; year += 1) {
      for (const leaveType of leaveTypes) allocationOperations.push({ updateOne: { filter: { employeeId: employee._id, leaveTypeId: leaveType._id, year }, update: { $set: { allocatedDays: leaveType.name === 'Sick' ? 365 : 25, takenDays: (employee._id.toString().charCodeAt(0) + year) % 6 } }, upsert: true } });
    }
  }
  for (const operations of chunk(allocationOperations, 500)) await LeaveAllocation.bulkWrite(operations, { ordered: false });

  const requestOperations = employees.slice(0, 60).map((employee, index) => ({
    updateOne: {
      filter: { employeeId: employee._id, leaveTypeId: leaveTypes[index % leaveTypes.length]._id, fromDate: new Date(Date.UTC(2026, (index % 9), (index % 20) + 1)) },
      update: { $set: { toDate: new Date(Date.UTC(2026, (index % 9), (index % 20) + 2)), days: 2, reason: 'Analytics sample leave', status: index % 3 === 0 ? 'Pending' : index % 3 === 1 ? 'Approved' : 'Rejected', decisionNote: index % 3 === 2 ? 'Sample rejected request' : '', decidedAt: index % 3 === 0 ? null : new Date() } },
      upsert: true,
    },
  }));
  await LeaveRequest.bulkWrite(requestOperations, { ordered: false });

  const payrollPeriods = [];
  for (const date of dateRange(start, end)) if (date.getUTCDate() === 1) payrollPeriods.push(periodKey(date));
  for (const period of payrollPeriods) {
    const payrun = await Payrun.findOneAndUpdate({ period }, { $set: { status: period === payrollPeriods[payrollPeriods.length - 1] ? 'Computed' : 'Paid', employeeRefs: employees.map((employee) => employee._id) } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const payrollDate = new Date(`${period}-01T00:00:00.000Z`);
    const year = payrollDate.getUTCFullYear();
    const payslipOperations = [];
    for (const [index, employee] of employees.entries()) {
      const contract = await Contract.findOne({ employeeId: employee.employeeId, startDate: { $lte: payrollDate }, $or: [{ endDate: null }, { endDate: { $gte: payrollDate } }] }).sort({ startDate: -1 });
      const calculation = await calculateSalary(contract, structure._id);
      payslipOperations.push({ updateOne: { filter: { payrunId: payrun._id, employeeId: employee.employeeId }, update: { $set: { employeeRef: employee._id, contractId: contract._id, salaryStructureId: structure._id, salaryStructureRef: structure._id, salaryRuleRefs: rules.map((rule) => rule._id), wage: contract.wage, lines: calculation.lines, grossSalary: calculation.grossSalary, totalDeductions: calculation.totalDeductions, netSalary: calculation.netSalary, period } }, upsert: true } });
    }
    await Payslip.bulkWrite(payslipOperations, { ordered: false });
    const payslips = await Payslip.find({ payrunId: payrun._id }).select('_id');
    payrun.payslips = payslips.map((payslip) => payslip._id);
    await payrun.save();
  }

  console.log(JSON.stringify({ users: TOTAL_EMPLOYEES, employees: TOTAL_EMPLOYEES, attendanceRecords: attendanceOperations.length, contracts: contractOperations.length, allocations: allocationOperations.length, leaveRequests: requestOperations.length, payrollPeriods: payrollPeriods.length, password: PASSWORD }, null, 2));
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await mongoose.connection.close(); });
