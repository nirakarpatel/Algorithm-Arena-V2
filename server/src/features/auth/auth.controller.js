const User = require('../users/User.model');
const XpLog = require('../users/XpLog.model');
const RefreshToken = require('./RefreshToken.model');
const { sendSuccess } = require('../../../utils/response');
const { verifyGoogleToken } = require('./googleAuth');
const crypto = require('crypto');
const {
  REFRESH_COOKIE_NAME,
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../../../utils/tokens');
const { firebaseAuth } = require('../../../config/firebaseAdmin');

const toAuthPayload = (user, accessToken, { isChief = false, dailyXpAwarded = false, isNewUser = false } = {}) => ({
  token: accessToken,
  user: {
    id: user._id,
    _id: user._id,
    username: user.username || null,
    email: user.email,
    role: user.role,
    customTitle: user.customTitle || null,
    status: user.status,
    warningMessage: user.warningMessage || null,
    points: user.points,
    profilePicture: user.profilePicture,
    usernameSet: user.usernameSet,
    // Profile fields — must be returned so the client populates Settings/profile
    // immediately after login (otherwise they appear blank until a full reload).
    name: user.name || '',
    regNo: user.regNo || null,
    branch: user.branch || '',
    year: user.year || '',
    section: user.section || '',
    bio: user.bio || '',
    location: user.location || '',
    github: user.github || '',
    twitter: user.twitter || '',
    linkedin: user.linkedin || '',
    website: user.website || '',
    preferredLanguage: user.preferredLanguage || 'javascript',
    createdAt: user.createdAt,
    isChief,
    dailyXpAwarded,
    clan: user.clan || null,
    clanId: user.clan?._id || user.clan || null,
  },
  isNewUser,
  dailyXpAwarded,
});


const issueSession = async (req, res, user, { statusCode = 200, message = 'Success', isChief = false, dailyXpAwarded = false, isNewUser = false } = {}) => {
  if (user.clan && !user.clan.name && typeof user.populate === 'function') {
    await user.populate('clan', 'name');
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    expiresAt: getRefreshTokenExpiry(),
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  });

  setRefreshTokenCookie(res, refreshToken);

  return sendSuccess(res, {
    statusCode,
    data: toAuthPayload(user, accessToken, { isChief, dailyXpAwarded, isNewUser }),
    message,
  });
};


// @desc    Authenticate with Google (Firebase ID token)
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!firebaseAuth) {
      return res.status(503).json({ success: false, message: 'Firebase Auth is not configured' });
    }

    // 1. Verify Firebase ID token locally (without making an extra network request to check revocation to prevent timeouts)
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { uid, email, picture, email_verified } = decodedToken;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account must have an email address' });
    }

    if (!email_verified) {
      return res.status(400).json({ success: false, message: 'Google email address is not verified' });
    }

    // 2. Find user by Firebase UID
    let user = await User.findOne({ firebaseUid: uid });
    let isNewUser = false;

    const { env } = require('../../../config/env');
    const isSuperAdminEmail = email.toLowerCase() === env.SUPER_ADMIN_EMAIL.toLowerCase();

    const AdminEmail = require('../users/AdminEmail.model');
    const isPreauthorizedAdmin = await AdminEmail.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Check if email exists (migration from local auth)
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // If the user's Firebase UID changed (e.g. account deleted from Firebase console and recreated),
        // we trust the verified email from Firebase and update the UID to prevent them from being locked out.
        if (user.firebaseUid && user.firebaseUid !== uid) {
          console.warn(`Updating firebaseUid for user ${email} from ${user.firebaseUid} to ${uid}`);
        }
        // Link existing account to Firebase
        user.firebaseUid = uid;
        user.authProvider = 'google';
        if (picture) {
          const isCurrentPicGoogle = !user.profilePicture || user.profilePicture.includes('googleusercontent.com');
          if (isCurrentPicGoogle) {
            user.profilePicture = picture;
          }
        }
        // Existing users already have a username
        if (user.username) {
          user.usernameSet = true;
        }
        if (isPreauthorizedAdmin && user.role !== 'admin' && user.role !== 'superAdmin') {
          user.role = 'admin';
        }
        if (isSuperAdminEmail) {
          user.role = 'superAdmin';
        }
        await user.save({ validateBeforeSave: false });
      } else {
        // Brand new user — no username yet
        user = await User.create({
          firebaseUid: uid,
          authProvider: 'google',
          email: email.toLowerCase(),
          profilePicture: picture || null,
          usernameSet: false,
          role: isSuperAdminEmail ? 'superAdmin' : (isPreauthorizedAdmin ? 'admin' : 'user'),
        });
        isNewUser = true;
      }
    } else {
      let shouldSave = false;
      if (picture && user.profilePicture !== picture) {
        const isCurrentPicGoogle = !user.profilePicture || user.profilePicture.includes('googleusercontent.com');
        if (isCurrentPicGoogle) {
          user.profilePicture = picture;
          shouldSave = true;
        }
      }
      // Check if they are pre-authorized
      if (isPreauthorizedAdmin && user.role !== 'admin' && user.role !== 'superAdmin') {
        user.role = 'admin';
        shouldSave = true;
      }
      // If user exists but is super admin email, enforce role
      if (isSuperAdminEmail && user.role !== 'superAdmin') {
        user.role = 'superAdmin';
        shouldSave = true;
      }
      if (shouldSave) {
        await user.save({ validateBeforeSave: false });
      }
    }

    if (isPreauthorizedAdmin) {
      await AdminEmail.deleteOne({ _id: isPreauthorizedAdmin._id });
    }

    // Check if user is banned
    if (user.status === 'Banned') {
      return res.status(403).json({ success: false, message: 'Your account has been banned' });
    }

    // Daily Login XP: award 50 XP if first login of the day
    let dailyXpAwarded = false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
    const isFirstLoginToday = !lastLogin || lastLogin < today;

    const XpLog = require('../users/XpLog.model');
    const existingDailyLog = await XpLog.exists({
      userId: user._id,
      reason: 'Daily Login',
      createdAt: { $gte: today }
    });

    if (isFirstLoginToday && !existingDailyLog) {
      user.points = (user.points || 0) + 50;
      dailyXpAwarded = true;
      await XpLog.create({
        userId: user._id,
        amount: 50,
        reason: 'Daily Login',
      });
    }

    user.lastLoginDate = now;
    user.lastConfirmedAt = now;
    await user.save({ validateBeforeSave: false });

    const Clan = require('../clans/Clan.model');
    const clanWhereChief = await Clan.findOne({ chief: user._id });

    return issueSession(req, res, user, {
      statusCode: isNewUser ? 201 : 200,
      message: isNewUser ? 'Account created — please choose a username' : 'Login successful',
      isChief: !!clanWhereChief,
      dailyXpAwarded,
      isNewUser,
    });
  } catch (err) {
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
      console.error("FIREBASE VERIFY ERROR:", err);
      return res.status(401).json({ success: false, message: 'Invalid or expired Google token' });
    }
    return next(err);
  }
};


// @desc    Claim a unique username (after first Google sign-in)
// @route   POST /api/auth/claim-username
// @access  Private
const claimUsername = async (req, res, next) => {
  try {
    const { username, name, regNo, branch, year, section } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Short-circuit: if username is already set, reject the claim
    if (user.usernameSet) {
      return res.status(403).json({ success: false, error: 'Onboarding already completed', message: 'Onboarding already completed' });
    }

    if (!name || !regNo || !branch || !year || !section) {
      return res.status(400).json({ success: false, message: 'All fields (name, regNo, branch, year, section) are required' });
    }

    // Check uniqueness (case-insensitive)
    const existing = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      _id: { $ne: req.user.id },
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Username is already taken' });
    }

    // Check regNo uniqueness
    const existingRegNo = await User.findOne({
      regNo: { $regex: new RegExp(`^${regNo}$`, 'i') },
      _id: { $ne: req.user.id },
    });

    if (existingRegNo) {
      return res.status(409).json({ success: false, message: 'Registration number is already registered' });
    }

    user.username = username;
    user.name = name;
    user.regNo = regNo;
    user.branch = branch;
    user.year = year;
    user.section = section;
    user.usernameSet = true;

    try {
      await user.save();
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0];
        if (field === 'regNo') {
          return res.status(409).json({ success: false, message: 'Registration number is already registered' });
        }
        return res.status(409).json({ success: false, message: 'Username is already taken' });
      }
      throw err;
    }

    return sendSuccess(res, { data: user, message: 'Onboarding completed successfully' });
  } catch (err) {
    return next(err);
  }
};


// @desc    Check username availability
// @route   GET /api/auth/check-username/:username
// @access  Public
const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.status(400).json({ success: false, available: false, message: 'Username must be at least 3 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, available: false, message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Try to decode JWT from headers to identify current user
    let currentUserId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const { env } = require('../../../config/env');
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        currentUserId = decoded.id;
      } catch (err) {
        // Ignore token verification errors for availability check
      }
    }

    const query = {
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    };

    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }

    const existing = await User.findOne(query);

    return res.json({
      success: true,
      available: !existing,
      message: existing ? 'Username is taken' : 'Username is available',
    });
  } catch (err) {
    return next(err);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { credential, accessToken } = req.body;
    if (!credential && !accessToken) {
      res.status(400);
      throw new Error('Google credentials are required');
    }

    const { email, name, picture } = await verifyGoogleToken({ credential, accessToken });

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Derive a unique username
      let baseUsername = (name || email.split('@')[0])
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 15);
      if (baseUsername.length < 3) baseUsername = 'user_' + baseUsername;

      let username = baseUsername;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      // Generate a secure random password
      const randomPassword = crypto.randomBytes(16).toString('hex');

      user = await User.create({
        username,
        email,
        password: randomPassword,
        profilePicture: picture || null,
      });
    }

    // Daily Login XP: award 50 XP if first login of the day
    let dailyXpAwarded = false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
    const isFirstLoginToday = !lastLogin || lastLogin < today;

    if (isFirstLoginToday) {
      user.points = (user.points || 0) + 50;
      dailyXpAwarded = true;
    }

    user.lastLoginDate = now;
    await user.save({ validateBeforeSave: false });

    const Clan = require('../clans/Clan.model');
    const clanWhereChief = await Clan.findOne({ chief: user._id });

    return issueSession(req, res, user, {
      statusCode: isNewUser ? 201 : 200,
      message: isNewUser ? 'Registration successful via Google' : 'Login successful via Google',
      isChief: !!clanWhereChief,
      dailyXpAwarded,
    });
  } catch (err) {
    return next(err);
  }
};


const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    const refreshTokenHash = hashToken(refreshToken);
    const existingToken = await RefreshToken.findOne({
      tokenHash: refreshTokenHash,
      revokedAt: null,
    });

    if (!existingToken || existingToken.expiresAt <= new Date()) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ success: false, message: 'Refresh token is invalid or expired' });
    }

    const user = await User.findById(existingToken.userId).populate('clan', 'name');
    if (!user) {
      existingToken.revokedAt = new Date();
      await existingToken.save();
      clearRefreshTokenCookie(res);
      return res.status(401).json({ success: false, message: 'User not found for refresh token' });
    }

    const nextRefreshToken = generateRefreshToken();
    const nextRefreshTokenHash = hashToken(nextRefreshToken);

    existingToken.revokedAt = new Date();
    existingToken.replacedByTokenHash = nextRefreshTokenHash;
    await existingToken.save();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: nextRefreshTokenHash,
      expiresAt: getRefreshTokenExpiry(),
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });

    const accessToken = signAccessToken(user._id);
    setRefreshTokenCookie(res, nextRefreshToken);

    const Clan = require('../clans/Clan.model');
    const clanWhereChief = await Clan.findOne({ chief: user._id });

    return sendSuccess(res, {
      data: toAuthPayload(user, accessToken, { isChief: !!clanWhereChief }),
      message: 'Session refreshed',
    });
  } catch (err) {
    return next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      const refreshTokenHash = hashToken(refreshToken);
      await RefreshToken.updateMany(
        {
          tokenHash: refreshTokenHash,
          revokedAt: null,
        },
        {
          revokedAt: new Date(),
        }
      );
    }

    clearRefreshTokenCookie(res);

    return sendSuccess(res, {
      data: null,
      message: 'Logged out successfully',
    });
  } catch (err) {
    return next(err);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    await RefreshToken.updateMany(
      {
        userId: req.user.id,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      }
    );

    clearRefreshTokenCookie(res);

    return sendSuccess(res, {
      data: null,
      message: 'Logged out from all sessions',
    });
  } catch (err) {
    return next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('clan', 'name').lean();
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Daily Login XP check
    let dailyXpAwarded = false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;

    if (!lastLogin || lastLogin < today) {
      user.points = (user.points || 0) + 50;
      user.lastLoginDate = now;
      await User.findByIdAndUpdate(user._id, {
        points: user.points,
        lastLoginDate: user.lastLoginDate,
        lastConfirmedAt: now
      });
      dailyXpAwarded = true;
    }

    // Check if user is a chief of any clan
    const Clan = require('../clans/Clan.model');
    const clanWhereChief = await Clan.findOne({ chief: req.user.id });
    
    return sendSuccess(res, {
      data: {
        ...user,
        isChief: !!clanWhereChief,
        dailyXpAwarded
      },
    });
  } catch (err) {
    return next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { bio, branch, year, section, location, github, twitter, linkedin, website, profilePicture, preferredLanguage } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          bio,
          branch,
          year,
          section,
          location,
          github,
          twitter,
          linkedin,
          website,
          profilePicture,
          preferredLanguage
        }
      },
      { new: true, runValidators: true }
    ).populate('clan', 'name tag profilePicture');

    return sendSuccess(res, {
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Re-verify session (Google token) to extend lastConfirmedAt
// @route   POST /api/auth/confirm-session
// @access  Private
const confirmSession = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!firebaseAuth) {
      return res.status(503).json({ success: false, message: 'Firebase Auth is not configured' });
    }

    // Verify Google token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken, true);
    const { email } = decodedToken;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Invalid token payload' });
    }

    if (email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Re-authentication token does not match current user' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.lastConfirmedAt = new Date();
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Session confirmed successfully',
      lastConfirmedAt: user.lastConfirmedAt,
    });
  } catch (err) {
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
      return res.status(401).json({ success: false, message: 'Invalid or expired Google token' });
    }
    return next(err);
  }
};

const testRegister = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        username,
        email: email.toLowerCase(),
        authProvider: 'google',
        usernameSet: true,
      });
    }
    const accessToken = signAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: refreshTokenHash,
      expiresAt: getRefreshTokenExpiry(),
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });

    setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, {
      statusCode: 201,
      data: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: accessToken,
      },
      message: 'Registration successful',
    });
  } catch (err) {
    return next(err);
  }
};

const testLogin = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const accessToken = signAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: refreshTokenHash,
      expiresAt: getRefreshTokenExpiry(),
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });

    setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, {
      statusCode: 200,
      data: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: accessToken,
      },
      message: 'Login successful',
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  googleAuth,
  claimUsername,
  checkUsername,
  refresh,
  logout,
  logoutAll,
  getMe,
  updateMe,
  confirmSession,
  testRegister,
  testLogin,
};
