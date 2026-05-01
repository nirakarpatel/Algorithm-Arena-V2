const User = require('../models/User');
const { sendSuccess } = require('../utils/response');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, { data: users });
  } catch (err) {
    return next(err);
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    
    // Ensure role is valid
    if (!['user', 'moderator', 'admin', 'super-admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;
    await user.save();

    return sendSuccess(res, { data: user, message: 'User role updated successfully' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getUsers,
  updateUserRole,
};
