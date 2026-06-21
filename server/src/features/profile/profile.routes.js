const express = require('express');
const { protect } = require('../../../middleware/auth');
const { getProfileStats, getUserProfile } = require('../dashboard/dashboard.controller');

const router = express.Router();

router.get('/stats', protect, getProfileStats);

// Public — username only; sensitive fields are omitted in the controller
router.get('/user/:userId', protect, getUserProfile);
router.get('/username/:username', getUserProfile);

module.exports = router;

