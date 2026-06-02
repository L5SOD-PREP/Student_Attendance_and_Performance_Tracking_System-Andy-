const express = require('express');
const router = express.Router();
const reportController = require('../Controller/reportController');
const authenticate = require('../Middleware/auth');

router.get('/student/:studentId', authenticate, reportController.getStudentReport);
router.get('/student/:studentId/export', authenticate, reportController.exportStudentReportCSV);
router.get('/class/:className', authenticate, reportController.getClassPerformance);
router.get('/overall', authenticate, reportController.getOverallSummary);
router.get('/parent-notification', authenticate, reportController.getParentNotificationSummary);

module.exports = router;
