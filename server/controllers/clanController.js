const Clan = require('../models/Clan');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { sendSuccess } = require('../utils/response');

// GET /api/clans — list all active clans
const getClans = async (req, res, next) => {
  try {
    const clans = await Clan.find({ status: 'active' })
      .populate('chief', 'username email')
      .populate('members', 'username email')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { data: clans });
  } catch (err) {
    return next(err);
  }
};

// GET /api/clans/:id — single clan detail
const getClan = async (req, res, next) => {
  try {
    const clan = await Clan.findById(req.params.id)
      .populate('chief', 'username email')
      .populate('members', 'username email');

    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    return sendSuccess(res, { data: clan });
  } catch (err) {
    return next(err);
  }
};

// GET /api/clans/leaderboard — clan rankings
const getClanLeaderboard = async (req, res, next) => {
  try {
    const clans = await Clan.find({ status: 'active' })
      .populate('chief', 'username')
      .lean();

    // For each clan, aggregate member stats
    const enriched = await Promise.all(
      clans.map(async (clan) => {
        const memberIds = clan.members || [];
        if (memberIds.length === 0) {
          return {
            ...clan,
            memberCount: 0,
            solvedCount: 0,
            totalPoints: 0,
          };
        }

        const [stats] = await Submission.aggregate([
          { $match: { userId: { $in: memberIds }, status: 'Accepted' } },
          {
            $lookup: {
              from: 'challenges',
              localField: 'challengeId',
              foreignField: '_id',
              as: 'challenge',
            },
          },
          { $unwind: '$challenge' },
          {
            $group: {
              _id: null,
              solvedCount: { $sum: 1 },
              totalPoints: { $sum: '$challenge.points' },
            },
          },
        ]);

        return {
          ...clan,
          memberCount: memberIds.length,
          solvedCount: stats?.solvedCount || 0,
          totalPoints: stats?.totalPoints || 0,
        };
      })
    );

    // Sort by totalPoints descending, assign ranks
    enriched.sort((a, b) => b.totalPoints - a.totalPoints || b.solvedCount - a.solvedCount);
    enriched.forEach((c, i) => { c.rank = i + 1; });

    return sendSuccess(res, { data: enriched });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans — admin creates a clan
const createClan = async (req, res, next) => {
  try {
    const { name, tag, description } = req.body;
    const clan = await Clan.create({ name, tag, description });
    return sendSuccess(res, { statusCode: 201, data: clan, message: 'Clan created' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Clan name or tag already exists' });
    }
    return next(err);
  }
};

// PUT /api/clans/:id — admin updates a clan
const updateClan = async (req, res, next) => {
  try {
    const { name, tag, description, status } = req.body;
    const clan = await Clan.findByIdAndUpdate(
      req.params.id,
      { name, tag, description, status },
      { new: true, runValidators: true }
    )
      .populate('chief', 'username email')
      .populate('members', 'username email');

    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    return sendSuccess(res, { data: clan, message: 'Clan updated' });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/clans/:id — admin deletes a clan
const deleteClan = async (req, res, next) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    // Remove clan reference from all members
    await User.updateMany(
      { _id: { $in: clan.members } },
      { $unset: { clan: '' } }
    );

    await Clan.findByIdAndDelete(req.params.id);
    return sendSuccess(res, { message: 'Clan deleted' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/join — user joins a clan
const joinClan = async (req, res, next) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    if (clan.members.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already a member of this clan' });
    }

    // Remove user from any other clan first
    await Clan.updateMany(
      { members: req.user._id },
      { $pull: { members: req.user._id } }
    );

    clan.members.push(req.user._id);
    await clan.save();

    // Update user's clan reference
    await User.findByIdAndUpdate(req.user._id, { clan: clan._id });

    const populated = await Clan.findById(clan._id)
      .populate('chief', 'username email')
      .populate('members', 'username email');

    return sendSuccess(res, { data: populated, message: `Joined clan ${clan.name}` });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/leave — user leaves a clan
const leaveClan = async (req, res, next) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    if (!clan.members.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Not a member of this clan' });
    }

    clan.members.pull(req.user._id);

    // If user was chief, unset chief
    if (clan.chief && clan.chief.toString() === req.user._id.toString()) {
      clan.chief = null;
    }

    await clan.save();
    await User.findByIdAndUpdate(req.user._id, { $unset: { clan: '' } });

    return sendSuccess(res, { message: `Left clan ${clan.name}` });
  } catch (err) {
    return next(err);
  }
};

// PUT /api/clans/:id/chief — admin assigns a clan chief
const assignChief = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const clan = await Clan.findById(req.params.id);

    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    if (!clan.members.map(m => m.toString()).includes(userId)) {
      return res.status(400).json({ success: false, message: 'User must be a clan member to become chief' });
    }

    clan.chief = userId;
    await clan.save();

    const populated = await Clan.findById(clan._id)
      .populate('chief', 'username email')
      .populate('members', 'username email');

    return sendSuccess(res, { data: populated, message: 'Clan chief assigned' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/members — admin adds a member
const addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const clan = await Clan.findById(req.params.id);

    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    if (clan.members.map(m => m.toString()).includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    // Remove from other clans
    await Clan.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    clan.members.push(userId);
    await clan.save();
    await User.findByIdAndUpdate(userId, { clan: clan._id });

    const populated = await Clan.findById(clan._id)
      .populate('chief', 'username email')
      .populate('members', 'username email');

    return sendSuccess(res, { data: populated, message: 'Member added' });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/clans/:id/members/:userId — admin removes a member
const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const clan = await Clan.findById(req.params.id);

    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    clan.members.pull(userId);
    if (clan.chief && clan.chief.toString() === userId) {
      clan.chief = null;
    }
    await clan.save();
    await User.findByIdAndUpdate(userId, { $unset: { clan: '' } });

    const populated = await Clan.findById(clan._id)
      .populate('chief', 'username email')
      .populate('members', 'username email');

    return sendSuccess(res, { data: populated, message: 'Member removed' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getClans,
  getClan,
  getClanLeaderboard,
  createClan,
  updateClan,
  deleteClan,
  joinClan,
  leaveClan,
  assignChief,
  addMember,
  removeMember,
};
