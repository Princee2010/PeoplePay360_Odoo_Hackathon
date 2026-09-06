const Contract = require('../models/Contract');
const SalaryStructure = require('../models/SalaryStructure');

const getPayrollDate = (period) => {
	if (!period) return null;
	const date = new Date(`${period}-01T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) ? null : date;
};

const getApplicableContract = async (employeeId, payrollDate) => {
	if (!employeeId || !(payrollDate instanceof Date) || Number.isNaN(payrollDate.getTime())) {
		return null;
	}

	return Contract.findOne({
		employeeId,
		status: { $ne: 'Cancelled' },
		startDate: { $lte: payrollDate },
		$or: [{ endDate: null }, { endDate: { $gte: payrollDate } }],
	}).sort({ startDate: -1 });
};

const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

const tokenizeFormula = (formula) => formula.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/g) || [];

const evaluateFormula = (formula, values) => {
	const tokens = tokenizeFormula(formula);
	let position = 0;
	const parseExpression = () => {
		let value = parseTerm();
		while (tokens[position] === '+' || tokens[position] === '-') {
			const operator = tokens[position++];
			const right = parseTerm();
			value = operator === '+' ? value + right : value - right;
		}
		return value;
	};
	const parseTerm = () => {
		let value = parseFactor();
		while (tokens[position] === '*' || tokens[position] === '/') {
			const operator = tokens[position++];
			const right = parseFactor();
			if (operator === '/' && right === 0) throw new Error('Formula cannot divide by zero');
			value = operator === '*' ? value * right : value / right;
		}
		return value;
	};
	const parseFactor = () => {
		const token = tokens[position++];
		if (token === '(') {
			const value = parseExpression();
			if (tokens[position++] !== ')') throw new Error('Formula has unbalanced parentheses');
			return value;
		}
		if (token === '-') return -parseFactor();
		if (/^\d/.test(token)) return Number(token);
		if (token && values[token] !== undefined) return values[token];
		throw new Error(`Formula references unknown value: ${token || 'empty expression'}`);
	};
	const result = parseExpression();
	if (position !== tokens.length || !Number.isFinite(result)) throw new Error('Formula is invalid');
	return result;
};

const calculateSalary = async (contract, selectedStructureId = null) => {
	const structureId = selectedStructureId || contract?.salaryStructureId;
	if (!structureId) throw new Error('The applicable contract has no salary structure');
	const structure = await SalaryStructure.findOne({ _id: structureId, isActive: true }).populate({ path: 'ruleIds', match: { isActive: true }, options: { sort: { sequence: 1 } } });
	if (!structure) throw new Error('Salary structure not found for the applicable contract');
	if (!structure.ruleIds.length) throw new Error('Salary structure has no active salary rules');

	const values = { CONTRACT_WAGE: Number(contract.wage) };
	const lines = [];
	let grossSalary = 0;
	let totalDeductions = 0;
	for (const rule of structure.ruleIds.sort((left, right) => left.sequence - right.sequence)) {
		let amount;
		if (rule.calculationType === 'Fixed amount') amount = Number(rule.value || 0);
		else if (rule.calculationType === 'Percentage') amount = (Number(rule.value || 0) / 100) * (values.BASIC || values.GROSS || values.CONTRACT_WAGE);
		else amount = evaluateFormula(rule.formula, { ...values, GROSS: grossSalary });
		amount = roundCurrency(Math.max(0, amount));
		values[rule.code] = amount;
		lines.push({ code: rule.code, name: rule.name, category: rule.category, sequence: rule.sequence, amount });
		if (['Basic', 'Allowance'].includes(rule.category)) grossSalary += amount;
		if (['Deduction', 'Tax'].includes(rule.category)) totalDeductions += amount;
	}
	grossSalary = roundCurrency(grossSalary);
	totalDeductions = roundCurrency(totalDeductions);
	return { structure, lines, grossSalary, totalDeductions, netSalary: roundCurrency(Math.max(0, grossSalary - totalDeductions)) };
};

module.exports = { getApplicableContract, getPayrollDate, calculateSalary, evaluateFormula };
