const { getAllBadgesForUser } = require('./badge.service');

// @desc    Get all badges
// @route   GET /api/badges
// @access  Private
exports.getBadges = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await getAllBadgesForUser(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
