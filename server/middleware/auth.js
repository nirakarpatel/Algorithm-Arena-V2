const jwt = require('jsonwebtoken');
const User = require('../src/features/users/User.model');
const { env } = require('../config/env');
const {
  canAccessAdminOnlyAction,
  canAccessChiefScopedAction,
} = require('../src/features/auth/authorization.policy');

const userCache = new Map();
const CACHE_TTL = process.env.NODE_ENV === 'test' ? 0 : 30 * 1000;

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
    const cacheKey = decoded.id;
    const now = Date.now();

    const cached = userCache.get(cacheKey);
    let user;

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      user = cached.user;
    } else {
      user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }
      if (CACHE_TTL > 0) {
        userCache.set(cacheKey, { user, timestamp: now });
      }
    }

    req.user = user;

    // Track active presence: Update lastLoginDate if older than 5 minutes
    if (!user.lastLoginDate || Date.now() - user.lastLoginDate.getTime() > 5 * 60 * 1000) {
      user.lastLoginDate = new Date();
      User.updateOne({ _id: user._id }, { lastLoginDate: user.lastLoginDate }).catch(() => {});
      
      // Update cache entry timestamp if present to avoid DB query triggers on active user
      if (CACHE_TTL > 0 && userCache.has(cacheKey)) {
        userCache.set(cacheKey, { user, timestamp: Date.now() });
      }
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
