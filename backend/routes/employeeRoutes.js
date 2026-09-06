const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
	listEmployees,
	getEmployee,
	createEmployee,
	updateEmployee,
	deleteEmployee,
} = require('../controllers/employeeController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', roleMiddleware('HR Manager', 'Admin'), createEmployee);
router.put('/:id', roleMiddleware('HR Manager', 'Admin', 'Employee'), updateEmployee);
router.delete('/:id', roleMiddleware('HR Manager', 'Admin'), deleteEmployee);

module.exports = router;
