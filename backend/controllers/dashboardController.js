const Employee = require('../models/Employee');
const Payslip = require('../models/Payslip');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveAllocation = require('../models/LeaveAllocation');
const Contract = require('../models/Contract');
const Payrun = require('../models/Payrun');
const User = require('../models/User');
const SalaryStructure = require('../models/SalaryStructure');
const SalaryRule = require('../models/SalaryRule');
require('../models/Schedule');

const getAttendanceAnalytics = async () => {
	const now = new Date();
	const startOfWeek = new Date(now);
	startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay());
	startOfWeek.setUTCHours(0, 0, 0, 0);
	const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
	const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const [weeklyAttendance, monthlyAttendance, yearlyAttendance] = await Promise.all([
		Attendance.aggregate([{ $match: { date: { $gte: startOfWeek } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
		Attendance.aggregate([{ $match: { date: { $gte: startOfMonth } } }, { $group: { _id: { day: { $dayOfMonth: '$date' }, status: '$status' }, count: { $sum: 1 } } }, { $sort: { '_id.day': 1 } }]),
		Attendance.aggregate([{ $match: { date: { $gte: startOfYear } } }, { $group: { _id: { month: { $month: '$date' }, status: '$status' }, count: { $sum: 1 } } }, { $sort: { '_id.month': 1 } }]),
	]);
	const weekly = weeklyAttendance.reduce((result, item) => ({ ...result, [item._id]: item.count }), {});
	const monthlyMap = {};
	monthlyAttendance.forEach(({ _id, count }) => { if (!monthlyMap[_id.day]) monthlyMap[_id.day] = { day: _id.day }; monthlyMap[_id.day][_id.status] = count; });
	const yearlyMap = {};
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	yearlyAttendance.forEach(({ _id, count }) => { const month = monthNames[_id.month - 1]; if (!yearlyMap[month]) yearlyMap[month] = { month }; yearlyMap[month][_id.status] = count; });
	return { weekly, monthly: Object.values(monthlyMap).sort((a, b) => a.day - b.day), yearly: Object.values(yearlyMap) };
};

const getDashboard = async (req, res) => {
	const role = req.user.role;
	if (role === 'Employee') {
		const employee = req.user.employeeId ? await Employee.findById(req.user.employeeId).populate('scheduleId') : null;
		if (!employee) return res.json({ user: req.user, role, employee: null, attendance: {}, leaveBalance: [], leaveRequests: [], latestPayslip: null, salaryHistory: [] });
		const [attendance, leaveBalance, leaveRequests, latestPayslip, salaryHistory] = await Promise.all([
			Attendance.aggregate([{ $match: { employeeRef: employee._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
			LeaveAllocation.find({ employeeId: employee._id }).populate('leaveTypeId', 'name').sort({ year: -1 }),
			LeaveRequest.find({ employeeId: employee._id }).populate('leaveTypeId', 'name').sort({ createdAt: -1 }).limit(5),
			Payslip.findOne({ employeeRef: employee._id }).sort({ period: -1 }),
			Payslip.find({ employeeRef: employee._id }).select('period wage grossSalary netSalary').sort({ period: 1 }),
		]);
		return res.json({ user: req.user, role, employee, attendance, leaveBalance, leaveRequests, latestPayslip, salaryHistory });
	}

	const [employees, salarySummary, departmentSummary, monthlySummary, attendanceSummary, leaveSummary] = await Promise.all([
		Employee.countDocuments({ status: { $ne: 'Inactive' } }),
		Payslip.aggregate([
			{ $group: { _id: null, netSalary: { $sum: '$netSalary' }, payslips: { $sum: 1 }, averageSalary: { $avg: '$netSalary' } } },
		]),
		Payslip.aggregate([
			{ $lookup: { from: 'employees', localField: 'employeeId', foreignField: 'employeeId', as: 'employee' } },
			{ $unwind: { path: '$employee', preserveNullAndEmptyArrays: false } },
			{ $group: { _id: '$employee.department', amount: { $sum: '$netSalary' } } },
			{ $project: { _id: 0, department: '$_id', amount: 1 } },
			{ $sort: { amount: -1 } },
		]),
		Payslip.aggregate([
			{ $group: { _id: '$period', amount: { $sum: '$netSalary' } } },
			{ $sort: { _id: 1 } },
			{ $limit: 12 },
			{ $project: { _id: 0, period: '$_id', amount: 1 } },
		]),
		Attendance.aggregate([
			{ $group: { _id: '$status', count: { $sum: 1 } } },
		]),
		LeaveRequest.aggregate([
			{ $match: { status: 'Pending' } },
			{ $group: { _id: null, count: { $sum: 1 }, days: { $sum: '$days' } } },
		]),
	]);

	const summary = salarySummary[0] || { netSalary: 0, payslips: 0, averageSalary: 0 };
	const attendance = { Present: 0, Late: 0, Absent: 0, Overtime: 0 };
	attendanceSummary.forEach((item) => { if (attendance[item._id] !== undefined) attendance[item._id] = item.count; });
	const pendingLeave = leaveSummary[0] || { count: 0, days: 0 };
	const common = {
		user: req.user,
		role,
		kpis: { netSalary: summary.netSalary, payslips: summary.payslips, averageSalary: Math.round(summary.averageSalary || 0), employees },
		departmentSalary: departmentSummary,
		monthlySalary: monthlySummary,
		attendance,
		leave: { pendingRequests: pendingLeave.count, pendingDays: pendingLeave.days },
		warnings: [
			...(pendingLeave.count ? [`${pendingLeave.count} leave request${pendingLeave.count === 1 ? '' : 's'} awaiting approval`] : []),
			...(employees === 0 ? ['No active employees are configured'] : []),
		],
	};

	if (role === 'HR Manager') {
		const [newJoiners, contractStatus, departmentOverview, attendanceAnalytics] = await Promise.all([
			Employee.find({ joiningDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) } }).select('firstName lastName department joiningDate').sort({ joiningDate: -1 }).limit(6),
			Contract.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
			Employee.aggregate([{ $match: { status: { $ne: 'Inactive' } } }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $project: { _id: 0, department: '$_id', count: 1 } }, { $sort: { count: -1 } }]),
			getAttendanceAnalytics(),
		]);
		return res.json({ ...common, newJoiners, contractStatus, departmentOverview, attendanceAnalytics });
	}

	const [currentPayrun, pendingValidation, payrollWarnings] = await Promise.all([
		Payrun.findOne().sort({ period: -1 }).populate('payslips', 'employeeId netSalary'),
		Payrun.countDocuments({ status: { $in: ['Draft', 'Computed'] } }),
		Payrun.countDocuments({ status: 'Computed' }),
	]);
	if (role === 'HR Payroll User') return res.json({ ...common, currentPayrun, pendingValidation, payrollWarnings });
	if (role === 'HR Payroll Manager') {
		const [salaryStructures, salaryRules] = await Promise.all([SalaryStructure.countDocuments({ isActive: true }), SalaryRule.countDocuments({ isActive: true })]);
		return res.json({ ...common, currentPayrun, pendingValidation, payrollWarnings, salaryStructures, salaryRules, payrollConfiguration: { activeRules: salaryRules, activeStructures: salaryStructures } });
	}
	if (role === 'Admin') {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay());
		startOfWeek.setUTCHours(0, 0, 0, 0);

		const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
		const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

		const [users, userRoles, contracts, weeklyAttendance, monthlyAttendance, yearlyAttendance] = await Promise.all([
			User.countDocuments(),
			User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
			Contract.countDocuments(),
			// Weekly: group by employee + status for this week
			Attendance.aggregate([
				{ $match: { date: { $gte: startOfWeek } } },
				{ $group: { _id: '$status', count: { $sum: 1 } } },
			]),
			// Monthly: group by day-of-month with status breakdown
			Attendance.aggregate([
				{ $match: { date: { $gte: startOfMonth } } },
				{
					$group: {
						_id: { day: { $dayOfMonth: '$date' }, status: '$status' },
						count: { $sum: 1 },
					},
				},
				{ $sort: { '_id.day': 1 } },
			]),
			// Yearly: group by month with status breakdown
			Attendance.aggregate([
				{ $match: { date: { $gte: startOfYear } } },
				{
					$group: {
						_id: { month: { $month: '$date' }, status: '$status' },
						count: { $sum: 1 },
					},
				},
				{ $sort: { '_id.month': 1 } },
			]),
		]);

		// Shape weekly: { Present: N, Absent: N, Late: N, Overtime: N }
		const weeklyShape = weeklyAttendance.reduce((acc, item) => {
			acc[item._id] = item.count;
			return acc;
		}, {});

		// Shape monthly: array of { day, Present, Absent, Late, Overtime }
		const monthlyMap = {};
		for (const entry of monthlyAttendance) {
			const { day, status } = entry._id;
			if (!monthlyMap[day]) monthlyMap[day] = { day };
			monthlyMap[day][status] = entry.count;
		}
		const monthlyShape = Object.values(monthlyMap).sort((a, b) => a.day - b.day);

		// Shape yearly: array of { month (name), Present, Absent, Late, Overtime }
		const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		const yearlyMap = {};
		for (const entry of yearlyAttendance) {
			const { month, status } = entry._id;
			const name = monthNames[month - 1];
			if (!yearlyMap[name]) yearlyMap[name] = { month: name };
			yearlyMap[name][status] = entry.count;
		}
		const yearlyShape = Object.values(yearlyMap);

		return res.json({
			...common,
			currentPayrun,
			pendingValidation,
			payrollWarnings,
			users,
			userRoles,
			contracts,
			systemStats: { users, employees, contracts, payslips: summary.payslips, pendingLeave: pendingLeave.count },
			attendanceAnalytics: {
				weekly: weeklyShape,
				monthly: monthlyShape,
				yearly: yearlyShape,
			},
		});
	}

	return res.json({
		...common,
	});
};

module.exports = { getDashboard };
