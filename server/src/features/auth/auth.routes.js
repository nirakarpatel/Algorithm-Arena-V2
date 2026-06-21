const express = require('express');
const { 
  socialAuth, 
  claimUsername, 
  checkUsername, 
  refresh, 
  logout, 
  logoutAll, 
  getMe, 
  updateMe, 
  confirmSession,
  testRegister,
  testLogin
} = require('./auth.controller');
const { protect } = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const { socialAuthSchema, claimUsernameSchema, refreshSchema, updateMeSchema, confirmSessionSchema } = require('../../../validators/authSchemas');

const router = express.Router();

router.post('/social', validate(socialAuthSchema), socialAuth);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);
router.put('/update-me', protect, validate(updateMeSchema), updateMe);
router.post('/claim-username', protect, validate(claimUsernameSchema), claimUsername);
router.get('/check-username/:username', checkUsername);
router.post('/confirm-session', protect, validate(confirmSessionSchema), confirmSession);

if (process.env.NODE_ENV === 'test') {
  router.post('/register', testRegister);
  router.post('/login', testLogin);
}

module.exports = router;
