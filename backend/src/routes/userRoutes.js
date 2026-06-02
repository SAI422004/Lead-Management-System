const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Admin-only: list all users
router.get('/', authorize('admin'), userController.listUsers);

// Admin-only: get single user
router.get('/:id', authorize('admin'), userController.getUser);

// Admin-only: update user
router.put('/:id', authorize('admin'), userController.updateUser);

module.exports = router;
