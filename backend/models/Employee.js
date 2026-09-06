const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
	{
		employeeId: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
		scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', default: null },
		firstName: { type: String, required: true, trim: true },
		lastName: { type: String, required: true, trim: true },
		email: { type: String, required: true, lowercase: true, trim: true },
		phone: { type: String, trim: true, default: '' },
		bankName: { type: String, trim: true, default: '' },
		bankAccountNumber: { type: String, trim: true, default: '' },
		department: { type: String, required: true, trim: true },
		jobPosition: { type: String, required: true, trim: true },
		manager: { type: String, trim: true, default: '' },
		schedule: { type: String, trim: true, default: '' },
		employeeType: {
			type: String,
			enum: ['Full-time', 'Part-time', 'Contractor', 'Intern'],
			default: 'Full-time',
		},
		joiningDate: { type: Date, required: true },
		status: {
			type: String,
			enum: ['Active', 'Inactive', 'On Leave'],
			default: 'Active',
		},
	},
	{ timestamps: true }
);

employeeSchema.index({ email: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
