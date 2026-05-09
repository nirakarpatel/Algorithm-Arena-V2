const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  challengeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Challenge', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  repositoryUrl: { type: String }, // Optional: Github Link
  code: { type: String },          // Optional: Direct Code Paste
  language: { type: String, default: 'javascript' },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Rejected'], 
    default: 'Pending' 
  },
  reviewComment: { type: String },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewedAt: { type: Date },
  submittedAt: { type: Date, default: Date.now }
});

submissionSchema.index({ userId: 1, submittedAt: -1 });
submissionSchema.index({ challengeId: 1, submittedAt: -1 });
submissionSchema.index({ status: 1, submittedAt: -1 });
submissionSchema.index({ userId: 1, challengeId: 1, status: 1, submittedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);

