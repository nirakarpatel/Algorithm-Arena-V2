const express = require('express');
const router = express.Router();
const { getChatHistory, sendMessage } = require('./chat.controller');
const { protect } = require('../../../middleware/auth');

router.route('/:clanId')
  .get(protect, getChatHistory)
  .post(protect, sendMessage);

module.exports = router;
