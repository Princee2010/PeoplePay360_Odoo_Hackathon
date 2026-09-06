const Employee = require('../models/Employee');
const Payrun = require('../models/Payrun');
const Payslip = require('../models/Payslip');
const Contract = require('../models/Contract');
const Attendance = require('../models/Attendance');
const { sendPayslips } = require('../services/emailService');
const { calculateSalary, getApplicableContract, getPayrollDate } = require('../services/payrollService');
const { createPayslipPdf } = require('../services/pdfService');

const calculateEmployeePayroll = async (employeeId, period, salaryStructureId = null) => {
	const payrollDate = getPayrollDate(period);
	const contract = await getApplicableContract(employeeId, payrollDate);
	if (!contract) throw new Error(`No contract applies to ${employeeId} for ${period}`);
	const calculation = await calculateSalary(contract, salaryStructureId);
	return { contract, calculation };
};

const previewPayroll = async (req, res) => {
	const { employeeId, period } = req.query;
	const payrollDate = getPayrollDate(period);
	if (!employeeId || !payrollDate) return res.status(400).json({ message: 'Employee and period YYYY-MM are required' });
	try {
		const { contract, calculation } = await calculateEmployeePayroll(employeeId, period);
		return res.json({ employeeId, period, contract, ...calculation });
	} catch (error) {
		return res.status(422).json({ message: error.message });
	}
};

const previewPayrun = async (req, res) => {
	const { period } = req.query;
	const payrollDate = getPayrollDate(period);
	if (!payrollDate) return res.status(400).json({ message: 'Period must use YYYY-MM format' });

	const employees = await Employee.find({ status: { $ne: 'Inactive' } })
		.select('employeeId firstName lastName department jobPosition status')
		.sort({ firstName: 1, lastName: 1 });
	const payroll = await Promise.all(employees.map(async (employee) => {
		const contract = await getApplicableContract(employee.employeeId, payrollDate);
		return {
			employee,
			contract,
			status: contract ? 'Ready' : 'Missing contract',
		};
	}));

	return res.json({ period, payroll });
};

const createPayrun = async (req, res) => {
	const { period, salaryStructureId, employeeIds } = req.body;
	const payrollDate = getPayrollDate(period);
	if (!payrollDate) return res.status(400).json({ message: 'Period must use YYYY-MM format' });
	if (!salaryStructureId) return res.status(400).json({ message: 'Salary structure is required' });
	if (!Array.isArray(employeeIds) || employeeIds.length === 0) return res.status(400).json({ message: 'Select at least one eligible employee' });

	const existingPayrun = await Payrun.findOne({ period });
	if (existingPayrun) return res.status(409).json({ message: 'A payrun already exists for this period' });

	const employees = await Employee.find({ employeeId: { $in: employeeIds }, status: { $ne: 'Inactive' } }).select('employeeId');
	if (employees.length !== employeeIds.length) return res.status(400).json({ message: 'One or more selected employees are inactive or unavailable' });
	const payslips = [];
	const missingContracts = [];
	const calculationErrors = [];

	for (const employee of employees) {
		try {
			const { contract, calculation } = await calculateEmployeePayroll(employee.employeeId, period, salaryStructureId);
			payslips.push({
				employeeId: employee.employeeId,
				employeeRef: employee._id,
				contractId: contract._id,
				salaryStructureId: calculation.structure._id,
				salaryStructureRef: calculation.structure._id,
				wage: contract.wage,
				lines: calculation.lines,
				grossSalary: calculation.grossSalary,
				totalDeductions: calculation.totalDeductions,
				netSalary: calculation.netSalary,
				period,
			});
		} catch (error) {
			if (error.message.startsWith('No contract applies')) missingContracts.push(employee.employeeId);
			else calculationErrors.push({ employeeId: employee.employeeId, message: error.message });
		}
	}

	if (missingContracts.length) {
		return res.status(422).json({
			message: 'Every active employee needs a contract covering the payroll period',
			missingContracts,
			calculationErrors,
		});
	}
	if (calculationErrors.length) return res.status(422).json({ message: 'Payroll calculation failed for one or more employees', calculationErrors });

	const payrun = await Payrun.create({ period, employeeRefs: employees.map((employee) => employee._id) });
	const createdPayslips = await Payslip.insertMany(
		payslips.map((payslip) => ({ ...payslip, payrunId: payrun._id }))
	);
	payrun.payslips = createdPayslips.map((payslip) => payslip._id);
	await payrun.save();

	return res.status(201).json({ payrun, payslips: createdPayslips });
};

const listPayruns = async (req, res) => {
	const payruns = await Payrun.find().populate('payslips', 'employeeId grossSalary totalDeductions netSalary lines period').sort({ period: -1 });
	return res.json({ payruns });
};

const getPayrunWarnings = async (req, res) => {
	const payrun = await Payrun.findById(req.params.id).populate('payslips');
	if (!payrun) return res.status(404).json({ message: 'Payrun not found' });
	const employeeIds = payrun.payslips.map((payslip) => payslip.employeeId);
	const [employees, duplicateGroups, contracts, missingCheckout] = await Promise.all([
		Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId firstName lastName bankName bankAccountNumber'),
		Payslip.aggregate([{ $match: { payrunId: payrun._id } }, { $group: { _id: '$employeeId', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]),
		Contract.find({ employeeId: { $in: employeeIds }, startDate: { $lte: getPayrollDate(payrun.period) }, $or: [{ endDate: null }, { endDate: { $gte: getPayrollDate(payrun.period) } }] }).select('employeeId'),
		Attendance.countDocuments({ employeeId: { $in: employeeIds }, date: { $gte: getPayrollDate(payrun.period), $lt: new Date(new Date(`${payrun.period}-01T00:00:00.000Z`).setUTCMonth(new Date(`${payrun.period}-01T00:00:00.000Z`).getUTCMonth() + 1)) }, checkIn: { $ne: null }, checkOut: null }),
	]);
	const warnings = [];
	const missingBank = employees.filter((employee) => !employee.bankName || !employee.bankAccountNumber).length;
	if (missingBank) warnings.push({ type: 'bank-details', count: missingBank, message: `${missingBank} employee${missingBank === 1 ? '' : 's'} missing bank details` });
	if (duplicateGroups.length) warnings.push({ type: 'duplicate-payslip', count: duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0), message: `${duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0)} employee${duplicateGroups.length === 1 ? '' : 's'} have duplicate payslips` });
	const contractIssues = employeeIds.filter((employeeId) => !contracts.some((contract) => contract.employeeId === employeeId)).length;
	if (contractIssues) warnings.push({ type: 'contract', count: contractIssues, message: `${contractIssues} employee${contractIssues === 1 ? '' : 's'} have contract issues` });
	if (missingCheckout) warnings.push({ type: 'attendance', count: missingCheckout, message: `${missingCheckout} attendance record${missingCheckout === 1 ? '' : 's'} missing checkout` });
	return res.json({ warnings });
};

const getPayslipPdf = async (req, res) => {
	const payslip = await Payslip.findOne({ _id: req.params.payslipId, payrunId: req.params.payrunId });
	if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
	const employee = await Employee.findOne({ employeeId: payslip.employeeId }).select('employeeId firstName lastName email');
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.employeeId}-${payslip.period}.pdf"`);
	return createPayslipPdf({ payslip, employee }).pipe(res);
};

const computePayrun = async (req, res) => {
	const payrun = await Payrun.findById(req.params.id).populate('payslips');
	if (!payrun) return res.status(404).json({ message: 'Payrun not found' });
	if (payrun.status !== 'Draft') return res.status(400).json({ message: 'Only draft payruns can be computed' });
	if (!payrun.payslips.length) return res.status(400).json({ message: 'Payrun has no payslips to compute' });
	for (const payslip of payrun.payslips) {
		const { contract, calculation } = await calculateEmployeePayroll(payslip.employeeId, payrun.period, payslip.salaryStructureId);
		Object.assign(payslip, {
			contractId: contract._id,
			wage: contract.wage,
			lines: calculation.lines,
			grossSalary: calculation.grossSalary,
			totalDeductions: calculation.totalDeductions,
			netSalary: calculation.netSalary,
		});
		await payslip.save();
	}
	payrun.status = 'Computed';
	payrun.computedAt = new Date();
	await payrun.save();
	return res.json({ payrun });
};

const validatePayrun = async (req, res) => {
	const payrun = await Payrun.findById(req.params.id).populate('payslips');
	if (!payrun) return res.status(404).json({ message: 'Payrun not found' });
	if (payrun.status !== 'Computed') return res.status(400).json({ message: 'Compute the payrun before validating it' });
	const invalidPayslip = payrun.payslips.find((payslip) => !payslip.lines?.length || payslip.netSalary < 0 || payslip.grossSalary < payslip.totalDeductions);
	if (invalidPayslip) return res.status(422).json({ message: `Payslip calculation is invalid for ${invalidPayslip.employeeId}` });
	payrun.status = 'Validated';
	payrun.validatedAt = new Date();
	await payrun.save();
	return res.json({ payrun });
};

const markPayrunPaid = async (req, res) => {
	const payrun = await Payrun.findById(req.params.id);
	if (!payrun) return res.status(404).json({ message: 'Payrun not found' });
	if (payrun.status !== 'Validated') return res.status(400).json({ message: 'Validate the payrun before marking it paid' });
	payrun.status = 'Paid';
	payrun.paidAt = new Date();
	await payrun.save();
	return res.json({ payrun });
};

const sendPayrunPayslips = async (req, res) => {
	const payrun = await Payrun.findById(req.params.id).populate('payslips');
	if (!payrun) return res.status(404).json({ message: 'Payrun not found' });
	if (payrun.status !== 'Paid') return res.status(400).json({ message: 'Mark the payrun paid before sending payslips' });
	const employees = await Employee.find({ employeeId: { $in: payrun.payslips.map((payslip) => payslip.employeeId) } }).select('employeeId firstName lastName email');
	const delivery = await sendPayslips(payrun, payrun.payslips, employees);
	payrun.status = 'Sent';
	payrun.sentAt = new Date();
	await payrun.save();
	return res.json({ payrun, delivery });
};

module.exports = { createPayrun, listPayruns, getPayrunWarnings, getPayslipPdf, previewPayroll, computePayrun, validatePayrun, markPayrunPaid, sendPayrunPayslips };
