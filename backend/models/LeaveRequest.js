const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
	{
		employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
		leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
		fromDate: { type: Date, required: true },
		toDate: { type: Date, required: true },
		days: { type: Number, required: true, min: 0.5 },
		reason: { type: String, trim: true, default: '' },
		status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
		decisionNote: { type: String, trim: true, default: '' },
		decidedAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

leaveRequestSchema.index({ employeeId: 1, fromDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
