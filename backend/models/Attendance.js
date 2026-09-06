const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    checkIn: {
      type: String,
      trim: true,
      default: null,
    },
    checkOut: {
      type: String,
      trim: true,
      default: null,
    },
    workedHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'Overtime', 'Missing Checkout'],
      default: 'Absent',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
