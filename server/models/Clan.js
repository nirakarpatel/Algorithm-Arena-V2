const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Clan name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Clan name must be at least 2 characters'],
    maxlength: [32, 'Clan name cannot exceed 32 characters'],
  },
  tag: {
    type: String,
    required: [true, 'Clan tag is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [2, 'Tag must be at least 2 characters'],
    maxlength: [5, 'Tag cannot exceed 5 characters'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [256, 'Description cannot exceed 256 characters'],
  },
  chief: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  requests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  notices: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

clanSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length : 0;
});

module.exports = mongoose.model('Clan', clanSchema);
