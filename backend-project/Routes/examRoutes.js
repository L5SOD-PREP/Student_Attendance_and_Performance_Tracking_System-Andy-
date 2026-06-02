const express = require('express');
const router = express.Router();
const examController = require('../Controller/examController');
const authenticate = require('../Middleware/auth');
const authorize = require('../Middleware/roleAuth');

router.get('/', authenticate, examController.getExams);
router.get('/student/:studentId', authenticate, examController.getExamsByStudent);
router.post('/', authenticate, authorize('admin', 'teacher'), examController.createExam);
router.put('/:id', authenticate, authorize('admin', 'teacher'), examController.updateExam);
router.delete('/:id', authenticate, authorize('admin'), examController.deleteExam);

module.exports = router;
