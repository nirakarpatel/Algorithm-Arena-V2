const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  clanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clan', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
