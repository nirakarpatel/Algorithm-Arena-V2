const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getClans,
  getClan,
  getClanLeaderboard,
  createClan,
  updateClan,
  deleteClan,
  joinClan,
  leaveClan,
  assignChief,
  addMember,
  removeMember,
} = require('../controllers/clanController');

// Public / authenticated routes
router.get('/', protect, getClans);
router.get('/leaderboard', protect, getClanLeaderboard);
router.get('/:id', protect, getClan);

// User actions
router.post('/:id/join', protect, joinClan);
router.post('/:id/leave', protect, leaveClan);
router.post('/:id/approve/:userId', protect, approveJoinRequest);
router.post('/:id/reject/:userId', protect, rejectJoinRequest);
router.post('/:id/notices', protect, addClanNotice);
router.delete('/:id/notices/:index', protect, removeClanNotice);

// Admin-only routes
router.post('/', protect, admin, createClan);
router.put('/:id', protect, admin, updateClan);
router.delete('/:id', protect, admin, deleteClan);
router.put('/:id/chief', protect, admin, assignChief);
router.post('/:id/members', protect, admin, addMember);
router.delete('/:id/members/:userId', protect, removeMember);

module.exports = router;
