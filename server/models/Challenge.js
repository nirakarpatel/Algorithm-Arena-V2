// src/models/Challenge.js
const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, default: '' },
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'], 
    default: 'Easy' 
  },
  points: { type: Number, default: 100 },
  category: { type: String, default: 'Logic' },
  tags: [{ type: String }],
  codeSnippets: [{
    lang: { type: String },
    langSlug: { type: String },
    code: { type: String },
    _id: false,
  }],
  createdAt: { type: Date, default: Date.now }
});

challengeSchema.index({ createdAt: -1 });
challengeSchema.index({ difficulty: 1, category: 1 });
challengeSchema.index({ title: 'text', description: 'text' });
challengeSchema.index({ tags: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);

