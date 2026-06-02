const express = require('express');
const router = express.Router();
const attendanceController = require('../Controller/attendanceController');
const authenticate = require('../Middleware/auth');
const authorize = require('../Middleware/roleAuth');

router.get('/', authenticate, attendanceController.getAttendance);
router.get('/summary', authenticate, attendanceController.getAttendanceSummary);
router.get('/student/:studentId', authenticate, attendanceController.getAttendanceByStudent);
router.post('/', authenticate, authorize('admin', 'teacher'), attendanceController.recordAttendance);
router.put('/:id', authenticate, authorize('admin', 'teacher'), attendanceController.updateAttendance);
router.delete('/:id', authenticate, authorize('admin'), attendanceController.deleteAttendance);

module.exports = router;
