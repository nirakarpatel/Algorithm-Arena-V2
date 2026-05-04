const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { env } = require('../config/env');

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

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Guard: Admin only access
exports.admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super-admin')) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Not authorized as an admin' });
};

// Guard: Admin or Clan Chief access
exports.chiefOrAdmin = (req, res, next) => {
  if (req.user && (
    req.user.role === 'admin' || 
    req.user.role === 'super-admin' || 
    req.user.role === 'clan-chief'
  )) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Not authorized as an admin or clan chief' });
};
