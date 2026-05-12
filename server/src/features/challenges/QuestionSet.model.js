const mongoose = require('mongoose');

const questionSetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Set title is required'],
    trim: true
  },
  weekNumber: {
    type: Number,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  targetLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Both'],
    default: 'Both'
  },
  questions: [{
    title: String,
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
    points: Number,
    category: String,
    description: String,
    hints: [String]
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Published'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuestionSet', questionSetSchema);
