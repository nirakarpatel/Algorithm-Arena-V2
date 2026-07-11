const { getAllBadgesForUser, clearBadgeCache } = require('./badge.service');
const Badge = require('./Badge.model');
const User = require('../users/User.model');

// @desc    Get all badges for the logged-in user
// @route   GET /api/badges
// @access  Private
exports.getBadges = async (req, res, next) => {
  try {
    const data = await getAllBadgesForUser(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all badges for another user (for profile view)
// @route   GET /api/badges/user/:userId
// @access  Private
exports.getBadgesForUser = async (req, res, next) => {
  try {
    const data = await getAllBadgesForUser(req.params.userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all badges for a user by username (for public profile view)
// @route   GET /api/badges/username/:username
// @access  Public / Private
exports.getBadgesForUsername = async (req, res, next) => {
  try {
    const escapedUsername = req.params.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') }
    }).select('_id username');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const data = await getAllBadgesForUser(user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// @desc    Award a chief badge to a clan member
// @route   POST /api/badges/award/:userId
// @access  Private (clan-chief or admin)
exports.awardBadge = async (req, res, next) => {
  try {
    const { badgeId } = req.body;
    const { userId } = req.params;

    if (!badgeId) return res.status(400).json({ success: false, message: 'badgeId is required.' });

    const badge = await Badge.findById(badgeId);
    if (!badge || !badge.isChiefBadge) {
      return res.status(400).json({ success: false, message: 'Invalid badge or not a Chief badge.' });
    }

    // Verify the chief is awarding within their own clan
    const chief = await User.findById(req.user.id).select('clan role');
    const member = await User.findById(userId).select('clan');
    if (!member) return res.status(404).json({ success: false, message: 'User not found.' });

    if (chief.role !== 'admin' && chief.role !== 'superAdmin') {
      if (userId.toString() === chief._id.toString()) {
        return res.status(403).json({ success: false, message: 'You cannot award a badge to yourself.' });
      }
      if (!chief.clan || !member.clan || chief.clan.toString() !== member.clan.toString()) {
        return res.status(403).json({ success: false, message: 'You can only award badges to members of your own clan.' });
      }
    }

    await User.findByIdAndUpdate(userId, { $addToSet: { awardedBadgeIds: badgeId } });
    clearBadgeCache(userId);
    res.status(200).json({ success: true, message: `Badge "${badge.name}" awarded successfully.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke a chief badge from a clan member
// @route   DELETE /api/badges/revoke/:userId/:badgeId
// @access  Private (clan-chief or admin)
exports.revokeBadge = async (req, res, next) => {
  try {
    const { userId, badgeId } = req.params;

    const badge = await Badge.findById(badgeId);
    if (!badge || !badge.isChiefBadge) {
      return res.status(400).json({ success: false, message: 'Invalid badge or not a Chief badge.' });
    }

    const chief = await User.findById(req.user.id).select('clan role');
    const member = await User.findById(userId).select('clan');
    if (!member) return res.status(404).json({ success: false, message: 'User not found.' });

    if (chief.role !== 'admin' && chief.role !== 'superAdmin') {
      if (!chief.clan || !member.clan || chief.clan.toString() !== member.clan.toString()) {
        return res.status(403).json({ success: false, message: 'You can only manage badges for members of your own clan.' });
      }
    }

    await User.findByIdAndUpdate(userId, { $pull: { awardedBadgeIds: badgeId } });
    clearBadgeCache(userId);
    res.status(200).json({ success: true, message: `Badge "${badge.name}" revoked.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all chief badges (for picker UI)
// @route   GET /api/badges/chief
// @access  Private
exports.getChiefBadges = async (req, res, next) => {
  try {
    const badges = await Badge.find({ isChiefBadge: true }).sort({ rarity: -1 });
    res.status(200).json({ success: true, data: badges });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all badges for multiple users in batch
// @route   POST /api/badges/batch
// @access  Private
exports.getBadgesForUsersBatch = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ success: false, message: 'userIds array is required.' });
    }

    const badgeDataMap = {};
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const data = await getAllBadgesForUser(userId);
          badgeDataMap[userId] = data;
        } catch {
          badgeDataMap[userId] = [];
        }
      })
    );

    res.status(200).json({ success: true, data: badgeDataMap });
  } catch (error) {
    next(error);
  }
};
