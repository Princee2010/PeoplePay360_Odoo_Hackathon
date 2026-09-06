// One-off migration: fixes any Sick leave allocations that still hold the old
// placeholder value (e.g. 999999) instead of the correct 365/366-day yearly limit.
//
// Run with:  node scripts/fixSickAllocations.js
// (run this from inside the backend/ folder, same place you'd run seedSampleData.js)

require('dotenv').config();
const mongoose = require('mongoose');
const LeaveAllocation = require('../models/LeaveAllocation');
const LeaveType = require('../models/LeaveType');

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const sickDaysForYear = (year) => (isLeapYear(year) ? 366 : 365);

async function run() {
	const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
	if (!mongoUri) {
		console.error('No MONGO_URI / MONGODB_URI found in environment. Check your .env file.');
		process.exit(1);
	}

	await mongoose.connect(mongoUri);
	console.log('Connected to MongoDB');

	const sickType = await LeaveType.findOne({ name: 'Sick' });
	if (!sickType) {
		console.log('No "Sick" leave type found — nothing to fix.');
		await mongoose.disconnect();
		return;
	}

	const sickAllocations = await LeaveAllocation.find({ leaveTypeId: sickType._id });
	console.log(`Found ${sickAllocations.length} Sick allocation record(s).`);

	let updated = 0;
	for (const allocation of sickAllocations) {
		const correctDays = sickDaysForYear(allocation.year);
		if (allocation.allocatedDays !== correctDays) {
			console.log(`Fixing allocation ${allocation._id} (year ${allocation.year}): ${allocation.allocatedDays} -> ${correctDays}`);
			allocation.allocatedDays = correctDays;
			await allocation.save();
			updated += 1;
		}
	}

	console.log(`Done. Updated ${updated} of ${sickAllocations.length} Sick allocation record(s).`);
	await mongoose.disconnect();
}

run().catch((error) => {
	console.error('Migration failed:', error);
	process.exit(1);
});