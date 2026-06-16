const express = require('express');
const { googleAuth, claimUsername, checkUsername, refresh, logout, logoutAll, getMe, updateMe, confirmSession } = require('./auth.controller');
const { protect } = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const { googleAuthSchema, claimUsernameSchema, refreshSchema, updateMeSchema, confirmSessionSchema } = require('../../../validators/authSchemas');

const router = express.Router();

router.post('/google', validate(googleAuthSchema), googleAuth);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);
router.put('/update-me', protect, validate(updateMeSchema), updateMe);
router.post('/claim-username', protect, validate(claimUsernameSchema), claimUsername);
router.get('/check-username/:username', checkUsername);
router.post('/confirm-session', protect, validate(confirmSessionSchema), confirmSession);

module.exports = router;
