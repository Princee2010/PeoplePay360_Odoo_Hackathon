const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		timezone: { type: String, default: 'Asia/Kolkata', trim: true },
		weeklyHours: { type: Number, min: 0, default: 40 },
		workDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Schedule', scheduleSchema);
