// Diagnostic script — prints the raw LeaveType and LeaveAllocation documents so we can see
// exactly what's stored and why the Sick allocation self-heal might not be matching.
//
// Run with:  node scripts/inspectAllocations.js
// (run this from inside the backend/ folder)

require('dotenv').config();
const mongoose = require('mongoose');
const LeaveType = require('../models/LeaveType');
const LeaveAllocation = require('../models/LeaveAllocation');

async function run() {
	const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
	if (!mongoUri) {
		console.error('No MONGO_URI / MONGODB_URI found in environment.');
		process.exit(1);
	}

	await mongoose.connect(mongoUri);
	console.log('Connected to MongoDB\n');

	const leaveTypes = await LeaveType.find({});
	console.log(`--- LeaveType documents (${leaveTypes.length}) ---`);
	for (const type of leaveTypes) {
		console.log({ _id: type._id.toString(), name: JSON.stringify(type.name), isPaid: type.isPaid, isActive: type.isActive });
	}

	const allocations = await LeaveAllocation.find({}).populate('leaveTypeId', 'name');
	console.log(`\n--- LeaveAllocation documents (${allocations.length}) ---`);
	for (const allocation of allocations) {
		console.log({
			_id: allocation._id.toString(),
			leaveTypeId: allocation.leaveTypeId?._id?.toString(),
			leaveTypeName: JSON.stringify(allocation.leaveTypeId?.name),
			year: allocation.year,
			allocatedDays: allocation.allocatedDays,
			allocatedDaysType: typeof allocation.allocatedDays,
			takenDays: allocation.takenDays,
		});
	}

	await mongoose.disconnect();
}

run().catch((error) => {
	console.error('Inspection failed:', error);
	process.exit(1);
});