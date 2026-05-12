const express = require('express');
const router = express.Router();
const { getBadges } = require('./badge.controller');
const { protect } = require('../../../middleware/auth');

router.route('/').get(protect, getBadges);

module.exports = router;
