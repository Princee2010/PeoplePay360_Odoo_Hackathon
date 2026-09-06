const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  listAttendance,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} = require('../controllers/attendanceController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listAttendance);
router.get('/:id', getAttendance);
router.post('/', roleMiddleware('Employee', 'HR Manager'), createAttendance);
router.put('/:id', roleMiddleware('Employee', 'HR Manager'), updateAttendance);
router.delete('/:id', roleMiddleware('HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'), deleteAttendance);

module.exports = router;
