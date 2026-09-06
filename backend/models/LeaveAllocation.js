const mongoose = require('mongoose');

const leaveAllocationSchema = new mongoose.Schema(
	{
		employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
		leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
		year: { type: Number, required: true, min: 2000 },
		allocatedDays: { type: Number, required: true, min: 0 },
		takenDays: { type: Number, default: 0, min: 0 },
	},
	{ timestamps: true, toJSON: { virtuals: true } }
);

leaveAllocationSchema.virtual('remainingDays').get(function remainingDays() {
	return Math.max(0, this.allocatedDays - this.takenDays);
});
leaveAllocationSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveAllocation', leaveAllocationSchema);
