const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cors = require('cors');
const express = require('express');
const connectDB = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/payruns', require('./routes/payrunRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/contracts', require('./routes/contractRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/salary', require('./routes/salaryRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.use((error, req, res, next) => {
	console.error(error);
	if (error.code === 11000) {
		return res.status(409).json({ message: 'A record with these details already exists' });
	}
	res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Internal server error' });
});

const port = process.env.PORT || 5000;

if (require.main === module) {
	connectDB()
		.then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
		.catch((error) => {
			console.error('Database connection failed:', error.message);
			process.exitCode = 1;
		});
}

module.exports = app;
