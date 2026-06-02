const express = require('express');
const router = express.Router();
const authController = require('../Controller/authController');
const authenticate = require('../Middleware/auth');
const authorize = require('../Middleware/roleAuth');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);
router.post('/register', authenticate, authorize('admin'), authController.register);
router.put('/change-password', authenticate, authController.changePassword);
router.get('/security-questions', authController.getSecurityQuestions);
router.post('/verify-security', authController.verifySecurityAnswer);
router.post('/set-security-questions', authenticate, authController.setSecurityQuestions);

module.exports = router;
