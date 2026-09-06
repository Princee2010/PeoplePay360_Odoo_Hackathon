const Employee = require('../models/Employee');
const mongoose = require('mongoose');
const LeaveType = require('../models/LeaveType');
const LeaveAllocation = require('../models/LeaveAllocation');
const LeaveRequest = require('../models/LeaveRequest');

const allowedLeaveTypes = ['Home', 'Sick', 'Other'];
const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
// Home/Other: fixed 25 days per year. Sick: 365 days per year, 366 on a leap year.
const leaveLimit = (name, year) => name === 'Sick' ? (isLeapYear(year) ? 366 : 365) : 25;

// Auto-provision an allocation for an employee/leave type/year the first time it's needed,
// so allocations no longer need to be created manually.
const ensureAllocation = async (employeeId, leaveTypeId, year, leaveTypeName) => {
	const correctDays = leaveLimit(leaveTypeName, year);
	let allocation = await LeaveAllocation.findOne({ employeeId, leaveTypeId, year });
	if (!allocation) {
		allocation = await LeaveAllocation.create({ employeeId, leaveTypeId, year, allocatedDays: correctDays });
	} else if (leaveTypeName === 'Sick' && allocation.allocatedDays !== correctDays) {
		allocation.allocatedDays = correctDays;
		await allocation.save();
	}
	return allocation;
};

const listTypes = async (req, res) => res.json({ leaveTypes: await LeaveType.find({ isActive: true, name: { $in: allowedLeaveTypes } }).sort({ name: 1 }) });

const createType = async (req, res) => {
	const name = req.body.name?.trim();
	if (!allowedLeaveTypes.includes(name)) return res.status(400).json({ message: 'Leave type must be Home, Sick, or Other' });
	const leaveType = await LeaveType.create({ ...req.body, name });
	return res.status(201).json({ leaveType });
};

const listAllocations = async (req, res) => {
	const filter = req.user.role === 'Employee' ? { employeeId: req.user.employeeId } : {};
	const allAllocations = await LeaveAllocation.find(filter)
		.populate('employeeId', 'employeeId firstName lastName')
		.populate('leaveTypeId', 'name isPaid')
		.sort({ year: -1, createdAt: -1 });

	// Only show allocations for the leave types this module manages (Home/Sick/Other).
	// Older/unrelated leave types (e.g. legacy demo data) are excluded so the numbers
	// on screen always match the Home/Other = 25/year, Sick = 365/366-day policy.
	const allocations = allAllocations.filter((allocation) => allowedLeaveTypes.includes(allocation.leaveTypeId?.name));

	// Self-heal any legacy Sick allocations (e.g. old placeholder values like 999999)
	// so they always reflect the correct 365/366-day yearly limit.
	for (const allocation of allocations) {
		if (allocation.leaveTypeId?.name === 'Sick') {
			const correctDays = leaveLimit('Sick', allocation.year);
			if (allocation.allocatedDays !== correctDays) {
				allocation.allocatedDays = correctDays;
				await allocation.save();
			}
		}
	}

	return res.json({ allocations });
};

const createAllocation = async (req, res) => {
	const { employeeId, leaveTypeId, year, allocatedDays } = req.body;
	if (!employeeId || !leaveTypeId || !year || allocatedDays === undefined) {
		return res.status(400).json({ message: 'Employee, leave type, year, and allocated days are required' });
	}

	const leaveType = await LeaveType.findOne({ _id: leaveTypeId, name: { $in: allowedLeaveTypes }, isActive: true });
	if (!leaveType) return res.status(400).json({ message: 'Select a valid active leave type' });

	const allocation = await LeaveAllocation.findOneAndUpdate(
		{ employeeId, leaveTypeId, year },
		{ allocatedDays: Number(allocatedDays) },
		{ new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
	);
	await allocation.populate([
		{ path: 'employeeId', select: 'employeeId firstName lastName' },
		{ path: 'leaveTypeId', select: 'name isPaid' },
	]);
	return res.status(201).json({ allocation });
};

const listRequests = async (req, res) => {
	const filter = req.user.role === 'Employee' ? { employeeId: req.user.employeeId } : {};
	const requests = await LeaveRequest.find(filter)
		.populate('employeeId', 'employeeId firstName lastName')
		.populate('leaveTypeId', 'name isPaid')
		.sort({ createdAt: -1 });
	return res.json({ requests });
};

const createRequest = async (req, res) => {
	const employeeId = req.user.role === 'Employee' ? req.user.employeeId : req.body.employeeId;
	const { leaveTypeId, fromDate, toDate, reason } = req.body;
	if (req.user.role === 'Employee' && !employeeId) return res.status(400).json({ message: 'Your account is not linked to an employee profile' });
	if (!employeeId || !leaveTypeId || !fromDate || !toDate) return res.status(400).json({ message: 'Employee, leave type, and dates are required' });
	const leaveType = await LeaveType.findById(leaveTypeId);
	if (!leaveType || !allowedLeaveTypes.includes(leaveType.name)) return res.status(400).json({ message: 'Select Home, Sick, or Other leave' });
	const start = new Date(fromDate);
	const end = new Date(toDate);
	if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) return res.status(400).json({ message: 'To date must be on or after from date' });
	const days = Math.floor((end - start) / 86400000) + 1;
	const year = start.getFullYear();
	const limit = leaveLimit(leaveType.name, year);
	await ensureAllocation(employeeId, leaveType._id, year, leaveType.name);
	const used = await LeaveRequest.aggregate([
		{ $match: { employeeId: new mongoose.Types.ObjectId(employeeId), leaveTypeId: leaveType._id, fromDate: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) }, status: { $ne: 'Rejected' } } },
		{ $group: { _id: null, days: { $sum: '$days' } } },
	]);
	const usedDays = used[0]?.days || 0;
	if (usedDays + days > limit) return res.status(400).json({ message: `You are out of ${leaveType.name} leave. Maximum allowed is ${limit} days per year.` });
	const request = await LeaveRequest.create({ employeeId, leaveTypeId, fromDate: start, toDate: end, days, reason });
	await request.populate([{ path: 'employeeId', select: 'employeeId firstName lastName' }, { path: 'leaveTypeId', select: 'name isPaid' }]);
	return res.status(201).json({ request });
};

const updateRequestStatus = async (req, res) => {
	const { status, decisionNote } = req.body;
	if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Status must be Approved or Rejected' });
	const request = await LeaveRequest.findOne({ _id: req.params.id, status: 'Pending' });
	if (!request) return res.status(404).json({ message: 'Pending leave request not found' });
	if (status === 'Approved') {
		const leaveType = await LeaveType.findById(request.leaveTypeId);
		const year = request.fromDate.getFullYear();
		await ensureAllocation(request.employeeId, request.leaveTypeId, year, leaveType?.name);
		const allocation = await LeaveAllocation.findOneAndUpdate(
			{ employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year, $expr: { $gte: [{ $subtract: ['$allocatedDays', '$takenDays'] }, request.days] } },
			{ $inc: { takenDays: request.days } },
			{ new: true }
		);
		if (!allocation) return res.status(400).json({ message: `Insufficient ${leaveType?.name || ''} leave allocation` });
	}
	request.status = status;
	request.decisionNote = decisionNote || '';
	request.decidedAt = new Date();
	await request.save();
	await request.populate([{ path: 'employeeId', select: 'employeeId firstName lastName' }, { path: 'leaveTypeId', select: 'name isPaid' }]);
	return res.json({ request });
};

const getOptions = async (req, res) => {
	const [employees, leaveTypes] = await Promise.all([
		req.user.role === 'Employee' ? Employee.find({ _id: req.user.employeeId }).select('employeeId firstName lastName') : Employee.find({ status: { $ne: 'Inactive' } }).select('employeeId firstName lastName').sort({ firstName: 1 }),
		LeaveType.find({ isActive: true, name: { $in: allowedLeaveTypes } }).select('name isPaid').sort({ name: 1 }),
	]);
	return res.json({ employees, leaveTypes });
};

module.exports = { listTypes, createType, listAllocations, createAllocation, listRequests, createRequest, updateRequestStatus, getOptions };