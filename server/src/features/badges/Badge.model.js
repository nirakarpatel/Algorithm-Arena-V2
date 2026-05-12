const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, enum: ['blue', 'gold', 'green', 'red', 'purple'], default: 'blue' },
  rarity: { type: String, enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'], default: 'COMMON' },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Badge', badgeSchema);
