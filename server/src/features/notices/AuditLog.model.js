const mongoose = require('mongoose');
const crypto = require('crypto');
const { stableStringify } = require('../../../utils/stableStringify');

const auditLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      default: () => crypto.randomUUID(),
      unique: true,
      index: true,
    },
    action: { type: String, required: true, index: true },
    outcome: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
      index: true,
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorSnapshot: {
      username: { type: String, default: null },
      role: { type: String, default: null },
    },
    targetType: {
      type: String,
      enum: ['challenge', 'submission', 'user', 'auth', 'system'],
      required: true,
      index: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    requestId: { type: String, default: null, index: true },
    method: { type: String, default: null },
    route: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
      changedFields: [{ type: String }],
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    checksum: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    versionKey: false,
  }
);

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ requestId: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });

auditLogSchema.pre('validate', function addChecksum(next) {
  if (this.checksum) {
    return next();
  }

  const checksumPayload = {
    eventId: this.eventId,
    action: this.action,
    outcome: this.outcome,
    actorId: this.actorId ? String(this.actorId) : null,
    targetType: this.targetType,
    targetId: this.targetId ? String(this.targetId) : null,
    requestId: this.requestId,
    method: this.method,
    route: this.route,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    changes: this.changes,
    metadata: this.metadata,
    createdAt: this.createdAt ? this.createdAt.toISOString() : null,
  };

  this.checksum = crypto.createHash('sha256').update(stableStringify(checksumPayload)).digest('hex');
  return next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
