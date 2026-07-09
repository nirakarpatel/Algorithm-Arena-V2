// src/models/Challenge.js
const mongoose = require('mongoose');

// A plain `{ name: String, type: String }` object literal is misread by Mongoose:
// the `type` key is its own type-shorthand syntax, so the whole object collapses
// to a bare String schema instead of a subdocument. An explicit Schema avoids that.
const paramSchema = new mongoose.Schema({ name: String, type: String }, { _id: false });

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'], 
    default: 'Easy' 
  },
  points: { type: Number, default: 100 },
  category: { type: String, default: 'Logic' },
  link: { type: String, default: '' }, 
  tags: [{ type: String }], 
  codeSnippets: [{ 
    lang: { type: String },
    langSlug: { type: String },
    code: { type: String },
    _id: false, 
  }],
  solutions: [{ 
    lang: { type: String },
    langSlug: { type: String },
    code: { type: String },
    _id: false, 
  }],
  functionName: { type: String, default: '' },
  params: [paramSchema],
  returnType: { type: String, default: '' },
  testCases: [{
    label: { type: String },
    args: { type: mongoose.Schema.Types.Mixed },
    expected: { type: String },
    _id: false,
  }],
  questionSetId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionSet' },
  createdAt: { type: Date, default: Date.now }
});


challengeSchema.index({ createdAt: -1 });
challengeSchema.index({ difficulty: 1, category: 1 });
challengeSchema.index({ tags: 1 });
challengeSchema.index({ questionSetId: 1 });
challengeSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Challenge', challengeSchema);
