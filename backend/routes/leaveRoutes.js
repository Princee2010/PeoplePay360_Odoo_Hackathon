const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
	listTypes, createType, listAllocations, createAllocation, listRequests, createRequest, updateRequestStatus, getOptions,
} = require('../controllers/leaveController');

const router = express.Router();
router.use(authMiddleware);
router.get('/options', getOptions);
router.get('/types', listTypes);
router.post('/types', roleMiddleware('HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'), createType);
router.get('/allocations', roleMiddleware('HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'), listAllocations);
router.post('/allocations', roleMiddleware('HR Payroll User', 'HR Payroll Manager', 'Admin'), createAllocation);
router.get('/requests', roleMiddleware('Employee', 'HR Manager'), listRequests);
router.post('/requests', roleMiddleware('Employee'), createRequest);
router.patch('/requests/:id/status', roleMiddleware('HR Manager', 'HR Payroll Manager', 'Admin'), updateRequestStatus);

module.exports = router;