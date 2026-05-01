const GlobalNotice = require('../models/GlobalNotice');
const { logger } = require('../utils/logger');

exports.getGlobalNotice = async (req, res) => {
  try {
    // Get the latest notice
    const notice = await GlobalNotice.findOne().sort({ createdAt: -1 }).populate('createdBy', 'username');
    res.json({ success: true, data: notice });
  } catch (err) {
    logger.error('Error fetching global notice:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createGlobalNotice = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    // Optional: Delete old notices if we only want one active at a time
    await GlobalNotice.deleteMany({});

    const notice = await GlobalNotice.create({
      content,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: notice });
  } catch (err) {
    logger.error('Error creating global notice:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteGlobalNotice = async (req, res) => {
  try {
    await GlobalNotice.deleteMany({});
    res.json({ success: true, message: 'Global notice deleted' });
  } catch (err) {
    logger.error('Error deleting global notice:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
