const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { protect, admin } = require('../middleware/auth');

router.get('/', noticeController.getGlobalNotice);
router.post('/', protect, admin, noticeController.createGlobalNotice);
router.delete('/', protect, admin, noticeController.deleteGlobalNotice);

module.exports = router;
