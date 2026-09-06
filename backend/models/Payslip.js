const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
	{
		payrunId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payrun', required: true },
		employeeId: { type: String, required: true, trim: true },
		employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
		contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
		salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
		salaryStructureRef: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },
		salaryRuleRefs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRule' }],
		wage: { type: Number, required: true, min: 0 },
		lines: [{
			code: { type: String, required: true },
			name: { type: String, required: true },
			category: { type: String, required: true },
			sequence: { type: Number, required: true },
			amount: { type: Number, required: true },
		}],
		grossSalary: { type: Number, required: true, min: 0 },
		totalDeductions: { type: Number, required: true, min: 0 },
		netSalary: { type: Number, required: true, min: 0 },
		period: { type: String, required: true },
	},
	{ timestamps: true }
);

payslipSchema.index({ payrunId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
