const express = require('express');
const router = express.Router();
const userController = require('../Controller/userController');
const authenticate = require('../Middleware/auth');
const authorize = require('../Middleware/roleAuth');

router.get('/', authenticate, authorize('admin'), userController.getUsers);
router.get('/:id', authenticate, authorize('admin'), userController.getUserById);
router.put('/:id', authenticate, authorize('admin'), userController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);
router.patch('/:id/toggle-status', authenticate, authorize('admin'), userController.toggleUserStatus);

module.exports = router;
