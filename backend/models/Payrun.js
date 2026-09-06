const mongoose = require('mongoose');

const payrunSchema = new mongoose.Schema(
	{
		period: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
		status: { type: String, enum: ['Draft', 'Computed', 'Validated', 'Paid', 'Sent'], default: 'Draft' },
		payslips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payslip' }],
		employeeRefs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
		computedAt: { type: Date, default: null },
		validatedAt: { type: Date, default: null },
		paidAt: { type: Date, default: null },
		sentAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

payrunSchema.index({ period: 1 }, { unique: true });

module.exports = mongoose.model('Payrun', payrunSchema);
