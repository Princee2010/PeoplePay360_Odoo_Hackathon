const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
	listContracts, getContract, createContract, updateContract, deleteContract, getApplicableContract,
} = require('../controllers/contractController');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'));
router.get('/employee/:employeeId/applicable', getApplicableContract);
router.get('/', listContracts);
router.post('/', roleMiddleware('HR Manager', 'HR Payroll Manager', 'Admin'), createContract);
router.get('/:id', getContract);
router.put('/:id', roleMiddleware('HR Manager', 'HR Payroll Manager', 'Admin'), updateContract);
router.delete('/:id', roleMiddleware('HR Manager', 'HR Payroll Manager', 'Admin'), deleteContract);

module.exports = router;
