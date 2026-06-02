const express = require('express');
const router = express.Router();
const parentController = require('../Controller/parentController');
const authenticate = require('../Middleware/auth');
const authorize = require('../Middleware/roleAuth');

router.get('/', authenticate, parentController.getParents);
router.get('/:phone', authenticate, parentController.getParentById);
router.post('/', authenticate, authorize('admin', 'teacher'), parentController.createParent);
router.put('/:phone', authenticate, authorize('admin', 'teacher'), parentController.updateParent);
router.delete('/:phone', authenticate, authorize('admin'), parentController.deleteParent);

module.exports = router;
