const Contract = require('../models/Contract');
const Employee = require('../models/Employee');
const { getApplicableContract: findApplicableContract } = require('../services/payrollService');

const contractFields = ['employeeId', 'startDate', 'endDate', 'department', 'position', 'wage', 'salaryStructureId', 'status'];

const getContractData = (body) => contractFields.reduce((data, field) => {
	if (body[field] !== undefined) data[field] = body[field];
	return data;
}, {});

const dateValue = (value) => (value ? new Date(value) : null);

const validateContract = (data) => {
	const requiredFields = ['employeeId', 'startDate', 'department', 'position', 'wage'];
	const missingField = requiredFields.find((field) => data[field] === undefined || data[field] === '');
	if (missingField) return `${missingField} is required`;

	const startDate = dateValue(data.startDate);
	const endDate = dateValue(data.endDate);
	if (Number.isNaN(startDate?.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) return 'Contract dates are invalid';
	if (endDate && endDate < startDate) return 'End date must be on or after start date';
	if (Number(data.wage) < 0) return 'Wage cannot be negative';
	return null;
};

const listContracts = async (req, res) => {
	const filter = req.query.employeeId ? { employeeId: req.query.employeeId } : {};
	const contracts = await Contract.find(filter).sort({ employeeId: 1, startDate: -1 });
	return res.json({ contracts });
};

const getContract = async (req, res) => {
	const contract = await Contract.findById(req.params.id);
	if (!contract) return res.status(404).json({ message: 'Contract not found' });
	return res.json({ contract });
};

const createContract = async (req, res) => {
	const data = getContractData(req.body);
	const validationError = validateContract(data);
	if (validationError) return res.status(400).json({ message: validationError });
	const employee = await Employee.findOne({ employeeId: data.employeeId });
	if (!employee) return res.status(404).json({ message: 'Employee not found' });

	try {
		const contract = await Contract.create({ ...data, employeeRef: employee._id });
		return res.status(201).json({ contract });
	} catch (error) {
		throw error;
	}
};

const updateContract = async (req, res) => {
	const current = await Contract.findById(req.params.id);
	if (!current) return res.status(404).json({ message: 'Contract not found' });
	const editReason = (req.body.editReason || '').trim();
	if (req.user.role === 'Admin' && editReason.length < 10) {
		return res.status(400).json({ message: 'A valid reason of at least 10 characters is required to edit a contract' });
	}

	const data = { ...current.toObject(), ...getContractData(req.body) };
	const validationError = validateContract(data);
	if (validationError) return res.status(400).json({ message: validationError });

	const employee = await Employee.findOne({ employeeId: data.employeeId });
	try {
		const contract = await Contract.findByIdAndUpdate(
			req.params.id,
			{
				$set: {
					...getContractData(req.body),
					employeeRef: employee?._id || current.employeeRef,
				},
				...(req.user.role === 'Admin' ? { $push: { editHistory: { reason: editReason, editedBy: req.user?.name || req.user?.email || '', editedAt: new Date() } } } : {}),
			},
			{ new: true, runValidators: true }
		);
		return res.json({ contract });
	} catch (error) {
		throw error;
	}
};

const deleteContract = async (req, res) => {
	const contract = await Contract.findByIdAndDelete(req.params.id);
	if (!contract) return res.status(404).json({ message: 'Contract not found' });
	return res.json({ message: 'Contract deleted' });
};

const getApplicableContract = async (req, res) => {
	const date = dateValue(req.query.date) || new Date();
	if (Number.isNaN(date.getTime())) return res.status(400).json({ message: 'Payroll date is invalid' });
	const contract = await findApplicableContract(req.params.employeeId, date);
	if (!contract) return res.status(404).json({ message: 'No contract applies to this payroll date' });
	return res.json({ contract });
};

module.exports = { listContracts, getContract, createContract, updateContract, deleteContract, getApplicableContract };