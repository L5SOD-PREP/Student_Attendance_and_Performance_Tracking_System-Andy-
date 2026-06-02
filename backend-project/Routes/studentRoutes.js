const express = require('express');
const router = express.Router();
const studentController = require('../Controller/studentController');
const authenticate = require('../Middleware/auth');
const authorize = require('../Middleware/roleAuth');

router.get('/', authenticate, studentController.getStudents);
router.get('/:id', authenticate, studentController.getStudentById);
router.post('/', authenticate, authorize('admin', 'teacher'), studentController.createStudent);
router.put('/:id', authenticate, authorize('admin', 'teacher'), studentController.updateStudent);
router.delete('/:id', authenticate, authorize('admin'), studentController.deleteStudent);

module.exports = router;
