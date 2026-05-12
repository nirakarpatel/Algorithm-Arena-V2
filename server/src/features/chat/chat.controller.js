const ChatMessage = require('./ChatMessage.model');
const { emitToRoom } = require('../../../config/socket');

// @desc    Get chat history for a clan
// @route   GET /api/chat/:clanId
// @access  Private
exports.getChatHistory = async (req, res, next) => {
  try {
    const messages = await ChatMessage.find({ clanId: req.params.clanId })
      .populate('sender', 'username role profilePicture')
      .sort('-createdAt')
      .limit(50);
    
    // Reverse to send oldest to newest for UI
    res.status(200).json({ success: true, data: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message to a clan
// @route   POST /api/chat/:clanId
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { clanId } = req.params;
    const { content, isDoubt } = req.body;
    
    // Create the message
    const message = await ChatMessage.create({
      clanId,
      sender: req.user._id,
      content,
      isDoubt: isDoubt || false
    });

    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('sender', 'username role profilePicture');

    // Emit to room
    emitToRoom(`clan_${clanId}`, 'new_message', populatedMessage);

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    next(error);
  }
};
