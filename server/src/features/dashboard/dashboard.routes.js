const express = require('express');
const { protect, admin } = require('../../../middleware/auth');
const { getDashboardSummary, getAdminDashboardSummary, getPendingTasks, getPublicStats } = require('./dashboard.controller');

const router = express.Router();

router.get('/public-stats', getPublicStats);
router.get('/summary', protect, getDashboardSummary);
router.get('/admin-summary', protect, admin, getAdminDashboardSummary);
router.get('/pending-tasks', protect, getPendingTasks);

module.exports = router;

