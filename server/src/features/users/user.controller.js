const User = require('./User.model');
const { sendSuccess } = require('../../../utils/response');
const { escapeHtml } = require('../../../utils/escapeHtml');
const { canActorManageUser } = require('../clans/clanScope.service');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({}).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments({}),
    ]);

    return sendSuccess(res, {
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
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
    if (!['user', 'moderator', 'admin', 'clan-chief', 'superAdmin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // 1. Re-authentication confirmation window check (5 minutes)
    const ROLE_CHANGE_WINDOW_MS = 5 * 60 * 1000;
    const lastConfirmedTime = req.user.lastConfirmedAt ? new Date(req.user.lastConfirmedAt).getTime() : 0;
    if (process.env.NODE_ENV !== 'development' && Date.now() - lastConfirmedTime > ROLE_CHANGE_WINDOW_MS) {
      return res.status(403).json({ success: false, error: 'Re-authentication required for role changes', reauthRequired: true });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Prevent privilege lock-in (cannot modify a superAdmin)
    if (user.role === 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Super admin role cannot be modified' });
    }

    // 3. Prevent elevating others to superAdmin through this endpoint
    if (role === 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Cannot elevate to Super Admin role' });
    }

    const previousValue = user.role || 'user';
    console.log('UPDATING ROLE:', user.username, role, previousValue);
    user.role = role;
    await user.save();

    // 4. Create immutable Audit Log entry
    const AuditLog = require('../audit/AuditLog.model');
    await AuditLog.create({
      action: 'ROLE_CHANGE',
      targetUserId: user._id,
      performedBy: req.user._id,
      previousValue,
      newValue: role,
      ip: req.ip || '',
    });

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
    const { level, clearOverride } = req.body;
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const scopeCheck = await canActorManageUser(req.user, user);
    if (!scopeCheck.allowed) {
      return res.status(403).json({ success: false, message: scopeCheck.reason || 'Not authorized' });
    }

    user.codingLevel = level;
    // Mark as manually overridden unless explicitly clearing the override
    user.codingLevelOverridden = clearOverride ? false : true;
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

    const scopeCheck = await canActorManageUser(req.user, user);
    if (!scopeCheck.allowed) {
      return res.status(403).json({ success: false, message: scopeCheck.reason || 'Not authorized' });
    }

    user.status = 'Warned';
    user.warningMessage = message || 'Please improve your activity and adherence to clan rules.';
    await user.save();

    // Send warning email (non-blocking — don't crash if it fails)
    try {
      const { sendEmail } = require('../../../utils/emailService');
      const safeUsername = escapeHtml(user.username || user.email || 'User');
      const safeMessage = escapeHtml(message || 'Please improve your activity and adherence to clan rules.');
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
          <h2 style="color: #ef4444;">Official Warning</h2>
          <p>Dear ${safeUsername},</p>
          <p>You have received a warning from your Clan Chief/Admin:</p>
          <blockquote style="border-left: 4px solid #ef4444; padding-left: 10px; color: #555;">
            ${safeMessage}
          </blockquote>
          <p>Please log in to the Algorithm Arena and address this immediately.</p>
        </div>
      `;

      const emailOptions = {
        replyTo: req.user.email,
        from: `"${req.user.username} (Clan Chief)" <${process.env.SMTP_USER || 'noreply@algorithm-arena.com'}>`
      };

      await sendEmail(user.email, 'Algorithm Arena - Official Warning', htmlContent, emailOptions);
    } catch (emailErr) {
      console.error('Warning email failed (non-fatal):', emailErr.message);
    }

    return sendSuccess(res, { data: { userId: user._id, status: user.status }, message: 'User warned successfully' });
  } catch (err) {
    return next(err);
  }
};

// @desc    Clear user warning
// @route   DELETE /api/users/:id/warn
// @access  Private/Chief/Admin
const clearWarningUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const scopeCheck = await canActorManageUser(req.user, user);
    if (!scopeCheck.allowed) {
      return res.status(403).json({ success: false, message: scopeCheck.reason || 'Not authorized' });
    }

    user.warningMessage = null;
    const previousStatus = user.status;
    if (user.status === 'Warned') {
      user.status = 'Active';
    }
    await user.save();

    // Create immutable Audit Log entry
    const AuditLog = require('../audit/AuditLog.model');
    await AuditLog.create({
      action: 'CLEAR_WARNING',
      targetUserId: user._id,
      performedBy: req.user._id,
      previousValue: previousStatus,
      newValue: user.status,
      ip: req.ip || '',
    });

    return sendSuccess(res, { data: { userId: user._id, status: user.status }, message: 'Warning cleared successfully' });
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
    if (user.role === 'admin' || user.role === 'superAdmin') return res.status(400).json({ success: false, message: 'Cannot ban an admin' });

    user.status = 'Banned';
    await user.save();

    return sendSuccess(res, { data: user, message: 'User has been banned' });
  } catch (err) {
    return next(err);
  }
};

// @desc    Unban user
// @route   PUT /api/users/:id/unban
// @access  Private/Admin
const unbanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.status = 'Active';
    await user.save();

    return sendSuccess(res, { data: user, message: 'User has been unbanned' });
  } catch (err) {
    return next(err);
  }
};

// @desc    Pre-authorize or promote a Google email address to Admin
// @route   POST /api/users/add-admin
// @access  Private/Admin
const addAdminByEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google email is required' });
    }

    // 1. Re-authentication confirmation window check (5 minutes)
    const ROLE_CHANGE_WINDOW_MS = 5 * 60 * 1000;
    const lastConfirmedTime = req.user.lastConfirmedAt ? new Date(req.user.lastConfirmedAt).getTime() : 0;
    if (process.env.NODE_ENV !== 'development' && Date.now() - lastConfirmedTime > ROLE_CHANGE_WINDOW_MS) {
      return res.status(403).json({ success: false, error: 'Re-authentication required for role changes', reauthRequired: true });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const user = await User.findOne({ email: normalizedEmail });
    const AuditLog = require('../audit/AuditLog.model');

    if (user) {
      if (user.role === 'superAdmin') {
        return res.status(400).json({ success: false, message: 'User is already a Super Admin' });
      }
      if (user.role === 'admin') {
        return res.status(400).json({ success: false, message: 'User is already an Admin' });
      }

      const previousValue = user.role;
      user.role = 'admin';
      await user.save();

      // Log to Audit Log
      await AuditLog.create({
        action: 'ROLE_CHANGE',
        targetUserId: user._id,
        performedBy: req.user._id,
        previousValue,
        newValue: 'admin',
        ip: req.ip || '',
      });

      return sendSuccess(res, { data: user, message: `Registered user ${normalizedEmail} successfully promoted to Admin` });
    }

    // If user does not exist, pre-authorize their email
    const AdminEmail = require('./AdminEmail.model');
    const existingPreauth = await AdminEmail.findOne({ email: normalizedEmail });
    if (existingPreauth) {
      return res.status(400).json({ success: false, message: 'Email is already pre-authorized as Admin' });
    }

    const preauth = await AdminEmail.create({
      email: normalizedEmail,
      addedBy: req.user._id,
    });

    // Log pre-authorization to Audit Log
    await AuditLog.create({
      action: 'PREAUTH_ADMIN',
      targetUserId: req.user._id,
      performedBy: req.user._id,
      previousValue: 'none',
      newValue: normalizedEmail,
      ip: req.ip || '',
    });

    return sendSuccess(res, { data: preauth, message: `Email ${normalizedEmail} pre-authorized. They will be Admin upon first login.` });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  updateUserLevel,
  warnUser,
  clearWarningUser,
  banUser,
  unbanUser,
  addAdminByEmail
};
