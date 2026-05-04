const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { sendSuccess } = require('../utils/response');
const {
  REFRESH_COOKIE_NAME,
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../utils/tokens');

const toAuthPayload = (user, accessToken) => ({
  _id: user._id,
  username: user.username,
  role: user.role,
  token: accessToken,
  accessToken,
});

const issueSession = async (req, res, user, { statusCode = 200, message = 'Success' } = {}) => {
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
    data: toAuthPayload(user, accessToken),
    message,
  });
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const user = await User.create({
      username,
      email,
      password,
    });

    return issueSession(req, res, user, {
      statusCode: 201,
      message: 'Registration successful',
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      err.message = 'User already exists';
    }
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    return issueSession(req, res, user, {
      message: 'Login successful',
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

    const user = await User.findById(existingToken.userId);
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

    return sendSuccess(res, {
      data: toAuthPayload(user, accessToken),
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
    const user = await User.findById(req.user.id);

    return sendSuccess(res, {
      data: user,
    });
  } catch (err) {
    return next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { bio, branch, year, section, location, github, twitter, website, profilePicture } = req.body;
    
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
          website,
          profilePicture
        }
      },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, {
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  updateMe,
};
