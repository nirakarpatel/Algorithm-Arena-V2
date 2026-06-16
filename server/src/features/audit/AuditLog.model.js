const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  previousValue: {
    type: String,
    required: true,
  },
  newValue: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ip: {
    type: String,
    default: '',
  },
});

// Immutability: Block update and delete operations on Audit Logs
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable and cannot be updated.'));
  }
  next();
});

auditLogSchema.pre('remove', function (next) {
  return next(new Error('Audit logs are immutable and cannot be deleted.'));
});

const blockUpdatesAndDeletes = function (next) {
  return next(new Error('Audit logs are immutable and cannot be modified or deleted.'));
};

auditLogSchema.pre('updateOne', blockUpdatesAndDeletes);
auditLogSchema.pre('updateMany', blockUpdatesAndDeletes);
auditLogSchema.pre('findOneAndUpdate', blockUpdatesAndDeletes);
auditLogSchema.pre('findOneAndDelete', blockUpdatesAndDeletes);
auditLogSchema.pre('deleteOne', blockUpdatesAndDeletes);
auditLogSchema.pre('deleteMany', blockUpdatesAndDeletes);

module.exports = mongoose.model('AuditLog', auditLogSchema);
