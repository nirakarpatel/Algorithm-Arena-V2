const express = require('express');
const router = express.Router();
const { protect, admin, chiefOrAdmin } = require('../../../middleware/auth');
const { getUsers, updateUserRole, updateUserLevel, warnUser, banUser, addAdminByEmail } = require('./user.controller');

router.use(protect);

router.get('/', admin, getUsers);
router.put('/:id/role', admin, updateUserRole);
router.patch('/:id/role', admin, updateUserRole);
router.put('/:id/ban', admin, banUser);
router.post('/add-admin', admin, addAdminByEmail);

router.put('/:id/level', chiefOrAdmin, updateUserLevel);
router.post('/:id/warn', chiefOrAdmin, warnUser);

module.exports = router;
