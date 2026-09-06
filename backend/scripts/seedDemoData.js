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

const firstNames = ['Rahul', 'Priya', 'Jay', 'Neha', 'Aarav', 'Isha', 'Rohan', 'Ananya', 'Vikram', 'Meera', 'Karan', 'Tara', 'Aditya', 'Sneha', 'Arjun', 'Divya', 'Kabir', 'Riya', 'Nikhil', 'Pooja', 'Sanjay', 'Kavya', 'Aryan', 'Ritu'];
const lastNames = ['Shah', 'Patel', 'Mehta', 'Kapoor', 'Singh', 'Nair', 'Joshi', 'Desai', 'Malhotra', 'Rao', 'Iyer', 'Gupta', 'Reddy', 'Chopra', 'Bose'];
const departments = ['Engineering', 'People', 'Finance', 'Operations', 'Sales', 'Product'];
const positions = ['Developer', 'Manager', 'Accountant', 'Analyst', 'Designer', 'Specialist'];
const statuses = ['Present', 'Present', 'Present', 'Late', 'Overtime', 'Absent'];
const EMPLOYEE_COUNT = 200;
const roleAccounts = [
	{ email: 'hr.manager@demo.peoplepay360.com', name: 'Demo HR Manager', role: 'HR Manager' },
	{ email: 'hr.payroll.user@demo.peoplepay360.com', name: 'Demo HR Payroll User', role: 'HR Payroll User' },
	{ email: 'hr.payroll.manager@demo.peoplepay360.com', name: 'Demo HR Payroll Manager', role: 'HR Payroll Manager' },
	{ email: 'admin@demo.peoplepay360.com', name: 'Demo Admin', role: 'Admin' },
];
const demoPassword = 'Demo@123456';

const employeeCode = (index) => `DEMO-${String(index + 1).padStart(3, '0')}`;
const dateAt = (daysAgo) => new Date(Date.now() - daysAgo * 86400000);

async function upsertRule(rule) {
	return SalaryRule.findOneAndUpdate({ code: rule.code }, rule, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function run() {
	await connectDB();

	const rules = await Promise.all([
		upsertRule({ code: 'BASIC', name: 'Basic Salary', category: 'Basic', sequence: 10, calculationType: 'Fixed amount', value: 50000, formula: '' }),
		upsertRule({ code: 'HRA', name: 'HRA', category: 'Allowance', sequence: 20, calculationType: 'Percentage', value: 20, formula: '' }),
		upsertRule({ code: 'TA', name: 'Transport Allowance', category: 'Allowance', sequence: 30, calculationType: 'Fixed amount', value: 3000, formula: '' }),
		upsertRule({ code: 'PF', name: 'PF', category: 'Deduction', sequence: 40, calculationType: 'Percentage', value: 12, formula: '' }),
		upsertRule({ code: 'TAX', name: 'Tax', category: 'Tax', sequence: 50, calculationType: 'Fixed amount', value: 2000, formula: '' }),
	]);
	const structure = await SalaryStructure.findOneAndUpdate(
		{ name: 'Regular Salary' },
		{ name: 'Regular Salary', description: 'Demo monthly salary structure', ruleIds: rules.map((rule) => rule._id), isActive: true },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	);

	const schedule = await Schedule.findOneAndUpdate(
		{ name: 'Standard 40 Hour Week' },
		{ name: 'Standard 40 Hour Week', timezone: 'Asia/Kolkata', weeklyHours: 40, workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	);

	for (const account of roleAccounts) {
		let user = await User.findOne({ email: account.email }).select('+password');
		if (!user) user = new User({ email: account.email });
		user.name = account.name;
		user.role = account.role;
		user.employeeId = null;
		user.password = demoPassword;
		await user.save();
	}

	const leaveTypes = await Promise.all([
		LeaveType.findOneAndUpdate({ name: 'Annual Leave' }, { name: 'Annual Leave', isPaid: true, isActive: true }, { upsert: true, new: true, setDefaultsOnInsert: true }),
		LeaveType.findOneAndUpdate({ name: 'Sick Leave' }, { name: 'Sick Leave', isPaid: true, isActive: true }, { upsert: true, new: true, setDefaultsOnInsert: true }),
		LeaveType.findOneAndUpdate({ name: 'Personal Leave' }, { name: 'Personal Leave', isPaid: false, isActive: true }, { upsert: true, new: true, setDefaultsOnInsert: true }),
	]);

	const employees = [];
	for (let index = 0; index < EMPLOYEE_COUNT; index += 1) {
		const code = employeeCode(index);
		const firstName = firstNames[index % firstNames.length];
		const lastName = lastNames[(index * 3) % lastNames.length];
		const email = `${code.toLowerCase()}@demo.peoplepay360.com`;
		let user = await User.findOne({ email });
		if (!user) user = await User.create({ name: `${firstName} ${lastName}`, email, password: demoPassword, role: 'Employee' });
		const employee = await Employee.findOneAndUpdate(
			{ employeeId: code },
			{
				employeeId: code, userId: user._id, firstName, lastName, email,
				phone: `+91 98${String(10000000 + index).slice(-8)}`,
				bankName: 'Demo Bank', bankAccountNumber: `DEMO${String(1000000000 + index)}`,
				department: departments[index % departments.length], jobPosition: positions[index % positions.length],
				manager: index % 6 === 0 ? '' : `DEMO-${String(Math.floor(index / 6) * 6 + 1).padStart(3, '0')}`,
				schedule: 'Standard 40 Hour Week', scheduleId: schedule._id, employeeType: index % 9 === 0 ? 'Part-time' : 'Full-time',
				joiningDate: new Date(2022 + (index % 4), index % 12, 1), status: index === 8 ? 'On Leave' : 'Active',
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
		user.employeeId = employee._id;
		await user.save();
		employees.push(employee);
	}

	for (const [index, employee] of employees.entries()) {
		const wage = 40000 + (index % 6) * 5000;
		await Contract.findOneAndUpdate(
			{ employeeId: employee.employeeId, startDate: new Date('2025-01-01') },
			{ employeeId: employee.employeeId, employeeRef: employee._id, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), department: employee.department, position: employee.jobPosition, wage, salaryStructureId: structure._id.toString(), salaryStructureRef: structure._id, status: 'Expired' },
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
		await Contract.findOneAndUpdate(
			{ employeeId: employee.employeeId, startDate: new Date('2026-01-01') },
			{ employeeId: employee.employeeId, employeeRef: employee._id, startDate: new Date('2026-01-01'), endDate: null, department: employee.department, position: employee.jobPosition, wage: wage + 5000, salaryStructureId: structure._id.toString(), salaryStructureRef: structure._id, status: 'Active' },
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
		for (let day = 0; day < 5; day += 1) {
			const date = dateAt(day + (index % 3));
			await Attendance.findOneAndUpdate(
				{ employeeId: employee.employeeId, date },
				{ employeeId: employee.employeeId, employeeRef: employee._id, date, checkIn: '09:00', checkOut: day === 4 && index % 4 === 0 ? null : '18:00', workedHours: day === 2 ? 9.5 : 8, status: statuses[(index + day) % statuses.length], remarks: '' },
				{ upsert: true, new: true, setDefaultsOnInsert: true },
			);
		}
		for (const leaveType of leaveTypes) {
			await LeaveAllocation.findOneAndUpdate(
				{ employeeId: employee._id, leaveTypeId: leaveType._id, year: 2026 },
				{ employeeId: employee._id, leaveTypeId: leaveType._id, year: 2026, allocatedDays: leaveType.name === 'Annual Leave' ? 24 : 12, takenDays: index % 5 },
				{ upsert: true, new: true, setDefaultsOnInsert: true },
			);
		}
	}

	const annualLeave = leaveTypes[0];
	const leaveRequestCount = Math.min(40, employees.length);
	for (let index = 0; index < leaveRequestCount; index += 1) {
		const employee = employees[(index * Math.floor(employees.length / leaveRequestCount)) % employees.length];
		const month = index % 12;
		const day = (index % 27) + 1;
		await LeaveRequest.findOneAndUpdate(
			{ employeeId: employee._id, leaveTypeId: annualLeave._id, fromDate: new Date(2026, month, day) },
			{ employeeId: employee._id, leaveTypeId: annualLeave._id, fromDate: new Date(2026, month, day), toDate: new Date(2026, month, day + 1), days: 2, reason: 'Demo planned leave', status: index % 3 === 0 ? 'Pending' : index % 3 === 1 ? 'Approved' : 'Rejected', decisionNote: index % 3 === 2 ? 'Demo rejected request' : '', decidedAt: index % 3 === 0 ? null : new Date() },
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
	}

	const period = '2026-09';
	let payrun = await Payrun.findOne({ period });
	if (!payrun) {
		const payslips = [];
		for (const employee of employees) {
			const contract = await Contract.findOne({ employeeId: employee.employeeId, status: 'Active' });
			const calculation = await calculateSalary(contract, structure._id);
			payslips.push({ employeeId: employee.employeeId, employeeRef: employee._id, contractId: contract._id, salaryStructureId: structure._id, salaryStructureRef: structure._id, salaryRuleRefs: rules.map((rule) => rule._id), wage: contract.wage, lines: calculation.lines, grossSalary: calculation.grossSalary, totalDeductions: calculation.totalDeductions, netSalary: calculation.netSalary, period });
		}
		payrun = await Payrun.create({ period, status: 'Computed', employeeRefs: employees.map((employee) => employee._id) });
		const createdPayslips = await Payslip.insertMany(payslips.map((payslip) => ({ ...payslip, payrunId: payrun._id })));
		payrun.payslips = createdPayslips.map((payslip) => payslip._id);
		await payrun.save();
	}

	console.log(JSON.stringify({ employees: employees.length, contracts: employees.length * 2, attendance: employees.length * 5, allocations: employees.length * leaveTypes.length, leaveRequests: leaveRequestCount, payrun: period, demoLogin: 'DEMO-001@demo.peoplepay360.com / Demo@123456' }, null, 2));
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await mongoose.connection.close(); });
