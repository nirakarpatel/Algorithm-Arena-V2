const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Clan name is required'],
    trim: true,
    minlength: [2, 'Clan name must be at least 2 characters'],
    maxlength: [32, 'Clan name cannot exceed 32 characters'],
  },
  tag: {
    type: String,
    required: [true, 'Clan tag is required'],
    trim: true,
    uppercase: true,
    minlength: [2, 'Tag must be at least 2 characters'],
    maxlength: [15, 'Tag cannot exceed 15 characters'],
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  restoredAt: {
    type: Date,
    default: null,
  },
  restoredBy: {
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

clanSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
clanSchema.index({ tag: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

// Clear chief-to-clan cache on any updates to Clan documents
const clearCacheHook = function() {
  try {
    const { clearChiefClanCache } = require('./clanScope.service');
    clearChiefClanCache();
  } catch (err) {
    // Ignore require cycle during initial bootstrap or errors
  }
};

clanSchema.post('save', clearCacheHook);
clanSchema.post('insertMany', clearCacheHook);
clanSchema.post('updateOne', clearCacheHook);
clanSchema.post('updateMany', clearCacheHook);
clanSchema.post('deleteOne', clearCacheHook);
clanSchema.post('deleteMany', clearCacheHook);
clanSchema.post('findOneAndDelete', clearCacheHook);
clanSchema.post('findOneAndUpdate', clearCacheHook);

module.exports = mongoose.model('Clan', clanSchema);
