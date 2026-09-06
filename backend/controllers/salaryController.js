const SalaryRule = require('../models/SalaryRule');
const SalaryStructure = require('../models/SalaryStructure');

const listStructures = async (req, res) => {
	const structures = await SalaryStructure.find().populate({ path: 'ruleIds', options: { sort: { sequence: 1 } } }).sort({ name: 1 });
	return res.json({ structures });
};

const getStructure = async (req, res) => {
	const structure = await SalaryStructure.findById(req.params.id).populate({ path: 'ruleIds', options: { sort: { sequence: 1 } } });
	if (!structure) return res.status(404).json({ message: 'Salary structure not found' });
	return res.json({ structure });
};

const createStructure = async (req, res) => {
	const { name, description, ruleIds = [] } = req.body;
	if (!name?.trim()) return res.status(400).json({ message: 'Salary structure name is required' });
	const structure = await SalaryStructure.create({ name: name.trim(), description, ruleIds });
	await structure.populate({ path: 'ruleIds', options: { sort: { sequence: 1 } } });
	return res.status(201).json({ structure });
};

const updateStructure = async (req, res) => {
	const structure = await SalaryStructure.findByIdAndUpdate(req.params.id, {
		name: req.body.name,
		description: req.body.description,
		ruleIds: req.body.ruleIds,
		isActive: req.body.isActive,
	}, { new: true, runValidators: true }).populate({ path: 'ruleIds', options: { sort: { sequence: 1 } } });
	if (!structure) return res.status(404).json({ message: 'Salary structure not found' });
	return res.json({ structure });
};

const deleteStructure = async (req, res) => {
	const structure = await SalaryStructure.findByIdAndDelete(req.params.id);
	if (!structure) return res.status(404).json({ message: 'Salary structure not found' });
	return res.json({ message: 'Salary structure deleted' });
};

const listRules = async (req, res) => res.json({ rules: await SalaryRule.find().sort({ sequence: 1, name: 1 }) });

const createRule = async (req, res) => {
	const { code, name, category, sequence, calculationType, value, formula } = req.body;
	if (!code?.trim() || !name?.trim() || !category || !sequence) return res.status(400).json({ message: 'Code, name, category, and sequence are required' });
	const rule = await SalaryRule.create({ code, name, category, sequence, calculationType, value, formula });
	return res.status(201).json({ rule });
};

const updateRule = async (req, res) => {
	const rule = await SalaryRule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
	if (!rule) return res.status(404).json({ message: 'Salary rule not found' });
	return res.json({ rule });
};

const deleteRule = async (req, res) => {
	const rule = await SalaryRule.findByIdAndDelete(req.params.id);
	if (!rule) return res.status(404).json({ message: 'Salary rule not found' });
	await SalaryStructure.updateMany({ ruleIds: rule._id }, { $pull: { ruleIds: rule._id } });
	return res.json({ message: 'Salary rule deleted' });
};

module.exports = { listStructures, getStructure, createStructure, updateStructure, deleteStructure, listRules, createRule, updateRule, deleteRule };
