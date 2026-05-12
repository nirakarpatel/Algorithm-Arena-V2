const GlobalNotice = require('./GlobalNotice.model');
const { logger } = require('../../../utils/logger');

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

const User = require('../users/User.model');
const { sendEmail } = require('../../../utils/emailService');

exports.createGlobalNotice = async (req, res) => {
  try {
    const { content, priority = 'General', isPinned = false } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const notice = await GlobalNotice.create({
      content,
      priority,
      isPinned,
      createdBy: req.user.id,
    });

    // Send email to all members
    const users = await User.find({ role: 'user' }).select('email');
    if (users.length > 0) {
      const emailList = users.map(u => u.email).join(',');
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: ${priority === 'Urgent' ? '#ef4444' : priority === 'Info' ? '#3b82f6' : '#8b5cf6'}">
            [${priority.toUpperCase()}] New Announcement
          </h2>
          <p style="font-size: 16px;">${content}</p>
          <hr />
          <p style="font-size: 12px; color: #666;">Algorithm Arena Command Center</p>
        </div>
      `;
      sendEmail(emailList, `[Algorithm Arena] ${priority} Notice`, htmlContent);
    }

    res.status(201).json({ success: true, data: notice });
  } catch (err) {
    logger.error('Error creating global notice:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAllNotices = async (req, res) => {
  try {
    const notices = await GlobalNotice.find()
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
  } catch (err) {
    logger.error('Error deleting global notice:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
