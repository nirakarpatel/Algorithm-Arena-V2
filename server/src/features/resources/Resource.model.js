const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  folder: { 
    type: String, 
    enum: ['Arrays', 'Linked Lists', 'DP', 'Graphs', 'Trees', 'Stacks & Queues', 'Strings', 'Sorting', 'Solutions'],
    required: true 
  },
  type: { type: String, enum: ['PDF', 'JSON', 'LINK'], required: true },
  // External link (LINK type) or, for uploaded files, the relative file endpoint.
  url: { type: String, default: '' },
  // Base64-encoded bytes for uploaded files (PDFs). Excluded from queries by
  // default so list endpoints stay lightweight; served via GET /:id/file.
  fileData: { type: String, select: false },
  mimeType: { type: String },
  sizeBytes: { type: Number },
  isSolution: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
