const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get(
	'/',
	authMiddleware,
	roleMiddleware('Employee', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'),
	getDashboard
);

module.exports = router;
