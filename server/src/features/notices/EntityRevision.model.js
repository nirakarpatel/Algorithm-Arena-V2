const mongoose = require('mongoose');
const crypto = require('crypto');
const { stableStringify } = require('../../../utils/stableStringify');

const entityRevisionSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['challenge', 'submission'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    revisionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    requestId: {
      type: String,
      default: null,
      index: true,
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    snapshotHash: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

entityRevisionSchema.index(
  { entityType: 1, entityId: 1, revisionNumber: 1 },
  { unique: true, name: 'entity_revision_unique' }
);
entityRevisionSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
entityRevisionSchema.index({ action: 1, createdAt: -1 });

entityRevisionSchema.pre('validate', function addSnapshotHash(next) {
  if (this.snapshotHash) {
    return next();
  }

  const payload = {
    revisionId: this._id ? String(this._id) : crypto.randomUUID(),
    entityType: this.entityType,
    entityId: this.entityId ? String(this.entityId) : null,
    revisionNumber: this.revisionNumber,
    action: this.action,
    actorId: this.actorId ? String(this.actorId) : null,
    requestId: this.requestId,
    snapshot: this.snapshot,
    metadata: this.metadata,
    createdAt: this.createdAt ? this.createdAt.toISOString() : null,
  };

  this.snapshotHash = crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
  return next();
});

module.exports = mongoose.model('EntityRevision', entityRevisionSchema);
