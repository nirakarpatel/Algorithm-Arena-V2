const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { getUsers, updateUserRole } = require('../controllers/userController');

// All user management routes require admin privileges
router.use(protect);
router.use(admin);

router.get('/', getUsers);
router.put('/:id/role', updateUserRole);

module.exports = router;
