const express = require('express');
const router = express.Router();
const { scrapeLeetCode } = require('../controllers/scrapeController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, admin, scrapeLeetCode);

module.exports = router;
