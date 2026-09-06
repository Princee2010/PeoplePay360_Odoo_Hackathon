const Employee = require('../models/Employee');
const Contract = require('../models/Contract');
const User = require('../models/User');

const employeeFields = [
	'employeeId', 'firstName', 'lastName', 'email', 'phone', 'bankName', 'bankAccountNumber', 'department',
	'jobPosition', 'manager', 'schedule', 'employeeType', 'joiningDate', 'status',
];

const getEmployeeData = (body) => employeeFields.reduce((data, field) => {
		if (body[field] !== undefined) {
			data[field] = body[field];
		}
		return data;
	}, {});

const listEmployees = async (req, res) => {
	if (req.user.role === 'Employee') {
		const employee = req.user.employeeId ? await Employee.findById(req.user.employeeId) : null;
		return res.json({ employees: employee ? [employee] : [] });
	}
	const search = req.query.search?.trim();
	const filter = search
		? {
			$or: [
				{ employeeId: { $regex: search, $options: 'i' } },
				{ firstName: { $regex: search, $options: 'i' } },
				{ lastName: { $regex: search, $options: 'i' } },
				{ department: { $regex: search, $options: 'i' } },
			],
		}
		: {};

	const employees = await Employee.find(filter).sort({ createdAt: -1 });
	return res.json({ employees });
};

const getEmployee = async (req, res) => {
	if (req.user.role === 'Employee' && String(req.user.employeeId) !== req.params.id) {
		return res.status(403).json({ message: 'You can only view your own profile' });
	}
	const employee = await Employee.findById(req.params.id);

	if (!employee) {
		return res.status(404).json({ message: 'Employee not found' });
	}

	const contractCount = await Contract.countDocuments({ employeeId: employee.employeeId });
	return res.json({
		employee,
		relatedCounts: {
			contracts: contractCount,
			attendance: 0,
			timeOff: 0,
			allocations: 0,
		},
	});
};

const createEmployee = async (req, res) => {
	const data = getEmployeeData(req.body);
	const requiredFields = ['employeeId', 'firstName', 'lastName', 'email', 'department', 'jobPosition', 'joiningDate'];
	const missingField = requiredFields.find((field) => !data[field]);

	if (missingField) {
		return res.status(400).json({ message: `${missingField} is required` });
	}

	const user = await User.findOne({ email: data.email });
	const employee = await Employee.create({ ...data, userId: user?._id || null });
	if (user) {
		user.employeeId = employee._id;
		await user.save();
	}
	return res.status(201).json({ employee });
};
// Fields an Employee is allowed to update on their own profile.
const selfEditableFields = ['phone', 'bankName', 'bankAccountNumber'];

const getSelfEditableData = (body) => selfEditableFields.reduce((data, field) => {
		if (body[field] !== undefined) {
			data[field] = body[field];
		}
		return data;
	}, {});
	
const updateEmployee = async (req, res) => {
	// Employees may only update a limited set of fields on their own profile.
	if (req.user.role === 'Employee') {
	if (!req.user.employeeId) {
		return res.status(404).json({ message: 'No employee profile is linked to your account yet' });
	}
	if (req.user.employeeId.toString() !== req.params.id) {
		return res.status(403).json({ message: 'You can only update your own profile' });
	}
		const employee = await Employee.findByIdAndUpdate(
			req.params.id,
			getSelfEditableData(req.body),
			{ new: true, runValidators: true },
		);
		if (!employee) {
			return res.status(404).json({ message: 'Employee not found' });
		}
		return res.json({ employee });
	}

	const employee = await Employee.findByIdAndUpdate(
		req.params.id,
		getEmployeeData(req.body),
		{ new: true, runValidators: true },
	);

	if (!employee) {
		return res.status(404).json({ message: 'Employee not found' });
	}

	return res.json({ employee });
};

const deleteEmployee = async (req, res) => {
	const employee = await Employee.findByIdAndDelete(req.params.id);

	if (!employee) {
		return res.status(404).json({ message: 'Employee not found' });
	}

	return res.json({ message: 'Employee deleted' });
};

module.exports = { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };
