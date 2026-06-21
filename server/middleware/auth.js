const jwt = require('jsonwebtoken');
const User = require('../src/features/users/User.model');
const { env } = require('../config/env');
const {
  canAccessAdminOnlyAction,
  canAccessChiefScopedAction,
} = require('../src/features/auth/authorization.policy');

// Guard: Protect routes for logged-in users
exports.protect = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    if (user.status === 'Banned') {
      return res.status(403).json({ success: false, message: 'Your account has been banned' });
    }

    req.user = user;

    // Track active presence: Update lastLoginDate if older than 5 minutes
    if (!user.lastLoginDate || Date.now() - user.lastLoginDate.getTime() > 5 * 60 * 1000) {
      user.lastLoginDate = new Date();
      User.updateOne({ _id: user._id }, { lastLoginDate: user.lastLoginDate }).catch(() => {});
    }

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Guard: Admin only access
exports.admin = (req, res, next) => {
  if (canAccessAdminOnlyAction(req.user)) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Not authorized as an admin' });
};

// Guard: Admin or Clan Chief access
exports.chiefOrAdmin = (req, res, next) => {
  if (canAccessChiefScopedAction(req.user) || canAccessAdminOnlyAction(req.user) || req.user?.role === 'moderator') {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Not authorized as an admin, moderator, or clan chief' });
};
