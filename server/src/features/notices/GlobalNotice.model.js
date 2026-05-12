const mongoose = require('mongoose');

const globalNoticeSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  priority: {
    type: String,
    enum: ['Urgent', 'Info', 'General'],
    default: 'General'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('GlobalNotice', globalNoticeSchema);
