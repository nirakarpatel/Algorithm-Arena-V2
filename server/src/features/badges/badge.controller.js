const Badge = require('./Badge.model');

// @desc    Get all badges
// @route   GET /api/badges
// @access  Private
exports.getBadges = async (req, res, next) => {
  try {
    const badges = await Badge.find().sort('rarity');
    // Note: In a real system, you'd also fetch which badges the req.user has unlocked.
    // For this mock integration, we'll just return all badges and let the frontend determine state.
    res.status(200).json({ success: true, data: badges });
  } catch (error) {
    next(error);
  }
};
