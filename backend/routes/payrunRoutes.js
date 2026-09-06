const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
	createPayrun, listPayruns, getPayrunWarnings, getPayslipPdf, previewPayroll, computePayrun, validatePayrun, markPayrunPaid, sendPayrunPayslips,
} = require('../controllers/payrunController');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('HR Payroll User', 'HR Payroll Manager', 'Admin'));
router.get('/preview', previewPayroll);
router.get('/:id/warnings', getPayrunWarnings);
router.get('/:payrunId/payslips/:payslipId/pdf', getPayslipPdf);
router.post('/:id/compute', computePayrun);
router.post('/:id/validate', roleMiddleware('HR Payroll Manager', 'Admin'), validatePayrun);
router.post('/:id/mark-paid', roleMiddleware('HR Payroll Manager', 'Admin'), markPayrunPaid);
router.post('/:id/send-payslips', roleMiddleware('HR Payroll Manager', 'Admin'), sendPayrunPayslips);
router.route('/').get(listPayruns).post(createPayrun);

module.exports = router;
