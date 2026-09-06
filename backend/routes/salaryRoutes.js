const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
	listStructures, getStructure, createStructure, updateStructure, deleteStructure,
	listRules, createRule, updateRule, deleteRule,
} = require('../controllers/salaryController');

const router = express.Router();
router.use(authMiddleware);
router.get('/structures', roleMiddleware('HR Payroll User', 'HR Payroll Manager', 'Admin'), listStructures);
router.get('/structures/:id', roleMiddleware('HR Payroll User', 'HR Payroll Manager', 'Admin'), getStructure);
router.post('/structures', roleMiddleware('HR Payroll Manager', 'Admin'), createStructure);
router.put('/structures/:id', roleMiddleware('HR Payroll Manager', 'Admin'), updateStructure);
router.delete('/structures/:id', roleMiddleware('HR Payroll Manager', 'Admin'), deleteStructure);
router.get('/rules', roleMiddleware('HR Payroll User', 'HR Payroll Manager', 'Admin'), listRules);
router.post('/rules', roleMiddleware('HR Payroll Manager', 'Admin'), createRule);
router.put('/rules/:id', roleMiddleware('HR Payroll Manager', 'Admin'), updateRule);
router.delete('/rules/:id', roleMiddleware('HR Payroll Manager', 'Admin'), deleteRule);

module.exports = router;
