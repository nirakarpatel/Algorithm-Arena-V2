const express = require('express');
const router = express.Router();
const { getBadges, getBadgesForUser, awardBadge, revokeBadge, getChiefBadges } = require('./badge.controller');
const { protect } = require('../../../middleware/auth');

// Get own badges
router.get('/', protect, getBadges);

// Get chief badge pool
router.get('/chief', protect, getChiefBadges);

// Get badges for another user (profile)
router.get('/user/:userId', protect, getBadgesForUser);

// Award a chief badge to a member
router.post('/award/:userId', protect, awardBadge);

// Revoke a chief badge from a member
router.delete('/revoke/:userId/:badgeId', protect, revokeBadge);

module.exports = router;
// Trigger nodemon restart
