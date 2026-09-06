const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { reportController, personalReportPdf, managementReportPdf } = require('../controllers/reportController');

const router = express.Router();
router.get('/', authMiddleware, roleMiddleware('Employee', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'), reportController);
router.get('/personal/:type/pdf', authMiddleware, roleMiddleware('Employee'), personalReportPdf);
router.get('/:type/pdf', authMiddleware, roleMiddleware('HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'), managementReportPdf);

module.exports = router;
