const express = require('express');
const { protect, admin } = require('../../../middleware/auth');
const { getDashboardSummary, getAdminDashboardSummary } = require('./dashboard.controller');

const router = express.Router();

router.get('/summary', protect, getDashboardSummary);
router.get('/admin-summary', protect, admin, getAdminDashboardSummary);

module.exports = router;

