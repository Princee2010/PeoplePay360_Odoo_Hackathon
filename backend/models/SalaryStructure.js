const mongoose = require('mongoose');

const salaryStructureSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, unique: true },
		description: { type: String, trim: true, default: '' },
		ruleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRule' }],
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
