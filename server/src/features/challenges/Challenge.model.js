// src/models/Challenge.js
const mongoose = require('mongoose');

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
  createdAt: { type: Date, default: Date.now }
});

challengeSchema.index({ createdAt: -1 });
challengeSchema.index({ difficulty: 1, category: 1 });
challengeSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Challenge', challengeSchema);

