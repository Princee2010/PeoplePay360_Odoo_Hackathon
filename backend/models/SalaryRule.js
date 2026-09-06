const mongoose = require('mongoose');

const salaryRuleSchema = new mongoose.Schema(
	{
		code: { type: String, required: true, trim: true, uppercase: true },
		name: { type: String, required: true, trim: true },
		category: { type: String, enum: ['Basic', 'Allowance', 'Deduction', 'Employer Contribution', 'Tax'], required: true },
		sequence: { type: Number, required: true, min: 1 },
		calculationType: { type: String, enum: ['Fixed amount', 'Percentage', 'Formula'], default: 'Fixed amount' },
		value: { type: Number, min: 0, default: 0 },
		formula: { type: String, trim: true, default: '' },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

salaryRuleSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('SalaryRule', salaryRuleSchema);
