const express = require('express');
const { protect } = require('../../../middleware/auth');
const { getProfileStats, getUserProfile } = require('../dashboard/dashboard.controller');

const router = express.Router();

router.get('/stats', protect, getProfileStats);

// New public profile endpoints
router.get('/user/:userId', getUserProfile);
router.get('/username/:username', getUserProfile);

module.exports = router;

