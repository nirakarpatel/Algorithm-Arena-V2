const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  authProvider: {
    type: String,
    enum: ['google', 'local'],
    default: 'google',
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username must be at most 30 characters'],
  },
  usernameSet: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    default: '',
    trim: true,
    maxlength: 60,
    validate: {
      validator: (v) => !v || /^[a-zA-Z\s'\-\.]+$/.test(v),
      message: 'Name contains invalid characters',
    },
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'clan-chief', 'superAdmin'],
    default: 'user',
  },
  clan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    default: null,
  },
  profilePicture: {
    type: String,
    default: null,
  },
  regNo: {
    type: String,
    unique: true,
    sparse: true,
    validate: {
      validator: (v) => !v || /^[a-zA-Z0-9]{6,20}$/.test(v),
      message: 'Invalid registration number format',
    },
  },
  codingLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner',
  },
  points: {
    type: Number,
    default: 0,
  },
  streak: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Warned', 'Banned'],
    default: 'Active',
  },
  solvedProblems: {
    type: Number,
    default: 0,
  },
  lastLoginDate: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  bio: { type: String, default: '' },
  branch: { type: String, default: '', enum: ['B.Tech CSE', 'B.Tech ECE', 'B.Tech EEE', 'MCA', ''] },
  year: { type: String, default: '', enum: ['First Year', 'Second Year', 'Third Year', 'Fourth Year', ''] },
  section: { type: String, default: '' },
  lastConfirmedAt: {
    type: Date,
    default: null,
  },
  location: { type: String, default: '' },
  github: { type: String, default: '' },
  twitter: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  website: { type: String, default: '' },
});

module.exports = mongoose.model('User', userSchema);
