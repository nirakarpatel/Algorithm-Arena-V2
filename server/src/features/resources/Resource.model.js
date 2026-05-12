const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  folder: { 
    type: String, 
    enum: ['Arrays', 'Linked Lists', 'DP', 'Graphs', 'Trees', 'Stacks & Queues', 'Strings', 'Sorting'],
    required: true 
  },
  type: { type: String, enum: ['PDF', 'JSON', 'LINK'], required: true },
  url: { type: String, required: true },
  sizeBytes: { type: Number },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
