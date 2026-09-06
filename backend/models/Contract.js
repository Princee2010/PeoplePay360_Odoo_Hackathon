const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
	{
		employeeId: { type: String, required: true, trim: true, index: true },
		employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
		startDate: { type: Date, required: true },
		endDate: { type: Date, default: null },
		department: { type: String, required: true, trim: true },
		position: { type: String, required: true, trim: true },
		wage: { type: Number, required: true, min: 0 },
		salaryStructureId: { type: String, trim: true, default: '' },
		salaryStructureRef: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },
		status: {
			type: String,
			enum: ['Draft', 'Active', 'Expired', 'Cancelled'],
			default: 'Active',
		},
		editHistory: [
			{
				reason: { type: String, required: true, trim: true },
				editedBy: { type: String, trim: true, default: '' },
				editedAt: { type: Date, default: Date.now },
			},
		],
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Contract', contractSchema);