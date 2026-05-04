const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { protect, admin } = require('../middleware/auth');

router.get('/', noticeController.getGlobalNotice);
router.get('/history', protect, admin, noticeController.getAllNotices);
router.post('/', protect, admin, noticeController.createGlobalNotice);
router.delete('/:id', protect, admin, noticeController.deleteGlobalNotice);
router.delete('/', protect, admin, noticeController.deleteGlobalNotice); // Keep for bulk clear if needed

module.exports = router;
