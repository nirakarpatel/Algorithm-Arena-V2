const User = require('./User.model');
const { sendSuccess } = require('../../../utils/response');

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
    let { role } = req.body;
    
    // Map member to user
    if (role === 'member') role = 'user';
    
    // Ensure role is valid
    if (!['user', 'moderator', 'admin', 'clan-chief'].includes(role)) {
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

// @desc    Update user coding level
// @route   PUT /api/users/:id/level
// @access  Private/Chief/Admin
const updateUserLevel = async (req, res, next) => {
  try {
    const { level } = req.body;
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.codingLevel = level;
    await user.save();

    return sendSuccess(res, { data: user, message: 'User level updated' });
  } catch (err) {
    return next(err);
  }
};

// @desc    Warn user
// @route   POST /api/users/:id/warn
// @access  Private/Chief/Admin
const warnUser = async (req, res, next) => {
  try {
    const { message } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.status = 'Warned';
    await user.save();

    const { sendEmail } = require('../../../utils/emailService');
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
        <h2 style="color: #ef4444;">Official Warning</h2>
        <p>Dear ${user.username},</p>
        <p>You have received a warning from your Clan Chief/Admin:</p>
        <blockquote style="border-left: 4px solid #ef4444; padding-left: 10px; color: #555;">
          ${message || 'Please improve your activity and adherence to clan rules.'}
        </blockquote>
        <p>Please log in to the Algorithm Arena and address this immediately.</p>
      </div>
    `;
    await sendEmail(user.email, 'Algorithm Arena - Official Warning', htmlContent);

    return sendSuccess(res, { message: 'User warned and email sent' });
  } catch (err) {
    return next(err);
  }
};

// @desc    Ban user
// @route   PUT /api/users/:id/ban
// @access  Private/Admin
const banUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot ban an admin' });

    user.status = 'Banned';
    await user.save();

    return sendSuccess(res, { data: user, message: 'User has been banned' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  updateUserLevel,
  warnUser,
  banUser
};
