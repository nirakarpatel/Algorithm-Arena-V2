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

    const notice = await GlobalNotice.create({
      content,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: notice });
    
    // Notify clients of update
    const { emitEvent } = require('../config/socket');
    emitEvent('global_notice_update', notice);
  } catch (err) {
    logger.error('Error creating global notice:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAllNotices = async (req, res) => {
  try {
    const { search, range, from, to } = req.query;
    const filter = {};

    if (search) {
      filter.content = { $regex: search, $options: 'i' };
    }

    if (range && range !== 'all') {
      const now = new Date();
      if (range === 'weekly') {
        filter.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (range === 'monthly') {
        filter.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    if (from || to) {
      filter.createdAt = filter.createdAt || {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const notices = await GlobalNotice.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username');
    res.json({ success: true, data: notices });
  } catch (err) {
    logger.error('Error fetching notice history:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteGlobalNotice = async (req, res) => {
  try {
    const { id } = req.params;
    if (id) {
      await GlobalNotice.findByIdAndDelete(id);
    } else {
      // Fallback for clearing all (if needed)
      await GlobalNotice.deleteMany({});
    }
    res.json({ success: true, message: 'Global notice deleted' });

    // Notify clients of update
    const { emitEvent } = require('../config/socket');
    emitEvent('global_notice_update', null);
  } catch (err) {
    logger.error('Error deleting global notice:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
