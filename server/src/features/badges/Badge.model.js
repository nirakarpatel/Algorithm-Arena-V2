const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String, required: true },
  color: { type: String, enum: ['blue', 'gold', 'green', 'red', 'purple', 'orange', 'cyan', 'pink'], default: 'blue' },
  rarity: { type: String, enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'], default: 'COMMON' },
  description: { type: String },
  earnDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', 'Elite'], default: 'Medium' },
  isChiefBadge: { type: Boolean, default: false }, // manually awarded by clan chief only
}, { timestamps: true });

module.exports = mongoose.model('Badge', badgeSchema);
