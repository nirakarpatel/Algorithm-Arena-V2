const mongoose = require('mongoose');
const Clan = require('./Clan.model');
const User = require('../users/User.model');
const Submission = require('../submissions/Submission.model');
const ChatMessage = require('../chat/ChatMessage.model');
const { sendSuccess } = require('../../../utils/response');
const { escapeHtml } = require('../../../utils/escapeHtml');
const {
  canActorManageClan,
  reconcileChiefRoleForUser,
  toIdString,
} = require('./clanScope.service');

const withSession = (query, session) => {
  if (!session) return query;
  return query.session(session);
};

const getClanStatusFilter = (status) => {
  if (status === 'all') {
    return {};
  }

  if (status === 'archived') {
    return { status: 'archived' };
  }

  return { status: 'active' };
};

const isClanArchived = (clan) => clan?.status === 'archived';

const rejectArchivedClanMutation = (res, clan) => {
  if (!isClanArchived(clan)) {
    return false;
  }

  res.status(400).json({
    success: false,
    message: 'Archived clans are read-only. Restore the clan before making changes.',
  });
  return true;
};

const isTransactionUnsupported = (error) => {
  const message = (error && error.message) || '';
  return message.includes('Transaction') && 
         (message.includes('replica set') || message.includes('mongos') || message.includes('supported'));
};

const runWithOptionalTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      if (!isTransactionUnsupported(error)) {
        throw error;
      }
      return work(null);
    }
  } finally {
    await session.endSession();
  }
};

const removeUserFromOtherClans = async (userId, { keepClanId = null, session = null } = {}) => {
  const criteria = { members: userId };
  if (keepClanId) {
    criteria._id = { $ne: keepClanId };
  }

  const clans = await withSession(
    Clan.find(criteria).select('_id chief members'),
    session
  );

  for (const sourceClan of clans) {
    sourceClan.members.pull(userId);
    if (sourceClan.chief && sourceClan.chief.toString() === toIdString(userId)) {
      sourceClan.chief = null;
    }
    await sourceClan.save({ session });
  }

  const requestCriteria = { requests: userId };
  if (keepClanId) {
    requestCriteria._id = { $ne: keepClanId };
  }

  await withSession(
    Clan.updateMany(requestCriteria, { $pull: { requests: userId } }),
    session
  );

  await reconcileChiefRoleForUser(userId, { session });
};

// GET /api/clans/mine — returns the clan for the authenticated user (member or chief)
const getMyClan = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find clan where user is chief or a member
    const clanDoc = await Clan.findOne({
      $or: [{ chief: userId }, { members: userId }]
    })
      .populate('chief', 'username email')
      .populate('members', 'name username email status codingLevel points solvedProblems regNo clan profilePicture streak')
      .populate('requests', 'username email regNo')
      .populate('createdBy', 'username email')
      .populate('archivedBy', 'username email')
      .populate('restoredBy', 'username email');

    if (!clanDoc) {
      return res.status(404).json({ success: false, message: 'You are not assigned to any clan' });
    }

    const clan = clanDoc.toObject();
    
    // Dynamically calculate totalPoints based on members' accepted submissions
    const memberIds = clan.members.map(m => m._id);
    if (memberIds.length > 0) {
      const stats = await Submission.aggregate([
        { $match: { userId: { $in: memberIds }, status: 'Accepted' } },
        {
          $group: {
            _id: { userId: '$userId', challengeId: '$challengeId' }
          }
        },
        {
          $lookup: {
            from: 'challenges',
            localField: '_id.challengeId',
            foreignField: '_id',
            as: 'challenge',
          },
        },
        { $unwind: '$challenge' },
        {
          $group: {
            _id: '$_id.userId',
            totalPoints: { $sum: '$challenge.points' },
          },
        },
      ]);
      const pointsByUser = {};
      let totalClanPoints = 0;
      stats.forEach(s => {
        pointsByUser[s._id.toString()] = s.totalPoints;
        totalClanPoints += s.totalPoints;
      });
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyStats = await Submission.aggregate([
        { $match: { userId: { $in: memberIds }, status: 'Accepted', submittedAt: { $gte: oneWeekAgo } } },
        {
          $group: {
            _id: { userId: '$userId', challengeId: '$challengeId' }
          }
        },
        {
          $group: {
            _id: '$_id.userId',
            weeklySolved: { $sum: 1 }
          }
        }
      ]);
      const weeklyByUser = {};
      weeklyStats.forEach(s => {
        weeklyByUser[s._id.toString()] = s.weeklySolved;
      });

      clan.members = clan.members.map(m => ({
        ...m,
        points: pointsByUser[m._id.toString()] || 0,
        weeklySolved: weeklyByUser[m._id.toString()] || 0
      }));
      clan.totalPoints = totalClanPoints;
    } else {
      clan.totalPoints = 0;
    }

    return sendSuccess(res, { data: clan });
  } catch (err) {
    return next(err);
  }
};


const getClans = async (req, res, next) => {
  try {
    const clansDocs = await Clan.find(getClanStatusFilter(req.query.status))
      .populate('chief', 'username email')
      .populate('members', 'name username email status codingLevel points profilePicture streak')
      .populate('requests', 'username email')
      .populate('createdBy', 'username email')
      .populate('archivedBy', 'username email')
      .populate('restoredBy', 'username email')
      .sort({ createdAt: -1 });

    // Collect all member IDs across all clans in one pass, then run a single
    // aggregation to get per-clan points totals — eliminates N+1 queries.
    const allMemberIds = clansDocs.flatMap((c) => c.members.map((m) => m._id));

    const pointsRows = allMemberIds.length > 0
      ? await Submission.aggregate([
          { $match: { userId: { $in: allMemberIds }, status: 'Accepted' } },
          {
            $group: {
              _id: { userId: '$userId', challengeId: '$challengeId' }
            }
          },
          {
            $lookup: {
              from: 'challenges',
              localField: '_id.challengeId',
              foreignField: '_id',
              as: 'challenge',
            },
          },
          { $unwind: '$challenge' },
          {
            $group: {
              _id: '$_id.userId',
              totalPoints: { $sum: '$challenge.points' },
            },
          },
        ])
      : [];

    // Build a userId -> points lookup map
    const pointsByUser = {};
    pointsRows.forEach((r) => { pointsByUser[r._id.toString()] = r.totalPoints; });

    const clans = clansDocs.map((clanDoc) => {
      const clan = clanDoc.toObject();
      let totalClanPoints = 0;
      clan.members = clan.members.map(m => {
        const p = pointsByUser[m._id.toString()] || 0;
        totalClanPoints += p;
        return { ...m, points: p };
      });
      clan.totalPoints = totalClanPoints;
      return clan;
    });

    return sendSuccess(res, { data: clans });
  } catch (err) {
    return next(err);
  }
};

// GET /api/clans/:id — single clan detail
const getClan = async (req, res, next) => {
  try {
    const clanDoc = await Clan.findById(req.params.id)
      .populate('chief', 'username email')
      .populate('members', 'name username email status codingLevel points profilePicture streak')
      .populate('requests', 'username email')
      .populate('createdBy', 'username email')
      .populate('archivedBy', 'username email')
      .populate('restoredBy', 'username email');

    if (!clanDoc) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    const clan = clanDoc.toObject();

    const memberIds = clan.members.map(m => m._id);
    if (memberIds.length > 0) {
      const stats = await Submission.aggregate([
        { $match: { userId: { $in: memberIds }, status: 'Accepted' } },
        {
          $group: {
            _id: { userId: '$userId', challengeId: '$challengeId' }
          }
        },
        {
          $lookup: {
            from: 'challenges',
            localField: '_id.challengeId',
            foreignField: '_id',
            as: 'challenge',
          },
        },
        { $unwind: '$challenge' },
        {
          $group: {
            _id: '$_id.userId',
            totalPoints: { $sum: '$challenge.points' },
          },
        },
      ]);
      const pointsByUser = {};
      let totalClanPoints = 0;
      stats.forEach(s => {
        pointsByUser[s._id.toString()] = s.totalPoints;
        totalClanPoints += s.totalPoints;
      });
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyStats = await Submission.aggregate([
        { $match: { userId: { $in: memberIds }, status: 'Accepted', submittedAt: { $gte: oneWeekAgo } } },
        {
          $group: {
            _id: { userId: '$userId', challengeId: '$challengeId' }
          }
        },
        {
          $group: {
            _id: '$_id.userId',
            weeklySolved: { $sum: 1 }
          }
        }
      ]);
      const weeklyByUser = {};
      weeklyStats.forEach(s => {
        weeklyByUser[s._id.toString()] = s.weeklySolved;
      });

      clan.members = clan.members.map(m => ({
        ...m,
        points: pointsByUser[m._id.toString()] || 0,
        weeklySolved: weeklyByUser[m._id.toString()] || 0
      }));
      clan.totalPoints = totalClanPoints;
    } else {
      clan.totalPoints = 0;
    }

    return sendSuccess(res, { data: clan });
  } catch (err) {
    return next(err);
  }
};

// GET /api/clans/leaderboard — clan rankings
const getClanLeaderboard = async (req, res, next) => {
  try {
    const { window = 'all' } = req.query;
    const clanFilter = getClanStatusFilter(req.query.status);

    let dateMatch = {};
    if (window === '7d') {
      dateMatch = { submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (window === '30d') {
      dateMatch = { submittedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    // Fetch clans (lightweight — only ids, members array, chief ref, name, tag, status)
    const clans = await Clan.find(clanFilter)
      .populate('chief', 'username')
      .lean();

    if (clans.length === 0) {
      return sendSuccess(res, { data: [] });
    }

    // Build a map: clanId -> memberIds so we can resolve per-clan totals from one aggregation
    const clanMemberMap = {};
    const allMemberIds = [];
    clans.forEach((c) => {
      clanMemberMap[c._id.toString()] = c.members || [];
      allMemberIds.push(...(c.members || []));
    });

    // Single aggregation across all members — group by userId
    const userStats = allMemberIds.length > 0
      ? await Submission.aggregate([
          { $match: { userId: { $in: allMemberIds }, status: 'Accepted', ...dateMatch } },
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
              _id: '$userId',
              solvedCount: { $sum: 1 },
              totalPoints: { $sum: '$challenge.points' },
            },
          },
        ])
      : [];

    // Build userId -> stats map
    const statsByUser = {};
    userStats.forEach((r) => { statsByUser[r._id.toString()] = r; });

    // Aggregate per clan from the user-level map
    const enriched = clans.map((clan) => {
      const memberIds = clanMemberMap[clan._id.toString()] || [];
      let solvedCount = 0;
      let totalPoints = 0;
      memberIds.forEach((uid) => {
        const s = statsByUser[uid.toString()];
        if (s) {
          solvedCount += s.solvedCount;
          totalPoints += s.totalPoints;
        }
      });
      return {
        ...clan,
        memberCount: memberIds.length,
        solvedCount,
        totalPoints,
      };
    });

    enriched.sort((a, b) => b.totalPoints - a.totalPoints || b.solvedCount - a.solvedCount || String(a._id).localeCompare(String(b._id)));
    enriched.forEach((c, i) => { c.rank = i + 1; });

    return sendSuccess(res, { data: enriched });
  } catch (err) {
    return next(err);
  }
};

// GET /api/clans/:id/admin-stats — clan detail with aggregated member stats for admins
const getClanAdminStats = async (req, res, next) => {
  try {
    const clan = await Clan.findById(req.params.id)
      .populate('chief', 'username email')
      .populate('members', 'name username email status codingLevel points regNo branch year profilePicture streak')
      .populate('requests', 'username email regNo branch year')
      .populate('createdBy', 'username email')
      .populate('archivedBy', 'username email')
      .populate('restoredBy', 'username email');

    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    const memberIds = clan.members.map(m => m._id);

    // Aggregate submissions for the members of this clan
    const submissionsStats = await Submission.aggregate([
      { $match: { userId: { $in: memberIds }, status: 'Accepted' } },
      { $group: { _id: '$userId', solvedCount: { $sum: 1 } } }
    ]);

    const statsMap = submissionsStats.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.solvedCount;
      return acc;
    }, {});

    const enrichedMembers = clan.members.map(member => ({
      ...member.toObject(),
      solvedCount: statsMap[member._id.toString()] || 0
    }));

    const data = {
      ...clan.toObject(),
      members: enrichedMembers
    };

    return sendSuccess(res, { data });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans — admin creates a clan
const createClan = async (req, res, next) => {
  try {
    const { name, tag, description } = req.body;

    // First, check if name/tag conflicts with ACTIVE clans only
    const existingActiveClan = await Clan.findOne({
      $or: [
        { name: name.trim(), status: 'active' },
        { tag: tag.toUpperCase().trim(), status: 'active' }
      ]
    });

    if (existingActiveClan) {
      const conflictField = existingActiveClan.name === name.trim() ? 'name' : 'tag';
      return res.status(400).json({
        success: false,
        message: `Clan with this ${conflictField} already exists (active clan)`,
        field: conflictField
      });
    }

    const clan = await Clan.create({
      name: name.trim(),
      tag: tag.toUpperCase().trim(),
      description,
      createdBy: req.user?._id || req.user?.id || null,
    });
    return sendSuccess(res, { statusCode: 201, data: clan, message: 'Clan created' });
  } catch (err) {
    if (err.code === 11000) {
      // Extract which field caused the duplicate
      const field = err.message.includes('name') ? 'name' : 'tag';
      return res.status(400).json({
        success: false,
        message: `Clan with this ${field} already exists`,
        field: field,
        duplicateValue: err.keyValue?.[field],
        debug: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    return next(err);
  }
};

// PUT /api/clans/:id — admin updates a clan
const updateClan = async (req, res, next) => {
  try {
    const { name, tag, description } = req.body;
    const clan = await Clan.findById(req.params.id);

    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    if (rejectArchivedClanMutation(res, clan)) {
      return null;
    }

    clan.name = name ?? clan.name;
    clan.tag = tag ?? clan.tag;
    clan.description = description ?? clan.description;

    await clan.save();

    const populated = await Clan.findById(clan._id)
      .populate('chief', 'username email')
      .populate('members', 'name username email profilePicture points streak')
      .populate('createdBy', 'username email')
      .populate('archivedBy', 'username email')
      .populate('restoredBy', 'username email');

    return sendSuccess(res, { data: populated, message: 'Clan updated' });
  } catch (err) {
    if (err.code === 11000) {
      const field = err.message.includes('name') ? 'name' : 'tag';
      return res.status(400).json({
        success: false,
        message: `Clan with this ${field} already exists (active clan)`,
        field: field,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    return next(err);
  }
};

// PATCH /api/clans/:id/archive — clan chief or admin archives a clan
const archiveClan = async (req, res, next) => {
  try {
    await runWithOptionalTransaction(async (session) => {
      const clan = await withSession(Clan.findById(req.params.id), session);
      if (!clan) {
        return res.status(404).json({ success: false, message: 'Clan not found' });
      }

      if (req.user.role !== 'admin') {
        if (req.user.role !== 'clan-chief') {
          return res.status(403).json({ success: false, message: 'Only the clan chief or an admin can archive a clan' });
        }

        const scopeCheck = await canActorManageClan(req.user, clan, { session });
        if (!scopeCheck.allowed) {
          return res.status(403).json({ success: false, message: scopeCheck.reason || 'Not authorized' });
        }
      }

      if (isClanArchived(clan)) {
        return res.status(400).json({ success: false, message: 'Clan is already archived' });
      }

      clan.status = 'archived';
      clan.archivedAt = new Date();
      clan.archivedBy = req.user._id;
      clan.restoredAt = null;
      clan.restoredBy = null;
      await clan.save({ session });
      return null;
    });

    if (res.headersSent) return null;

    const clan = await Clan.findById(req.params.id)
      .populate('chief', 'username email')
      .populate('members', 'name username email profilePicture points streak')
      .populate('createdBy', 'username email')
      .populate('archivedBy', 'username email')
      .populate('restoredBy', 'username email');

    return sendSuccess(res, { data: clan, message: 'Clan archived' });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/clans/:id/restore — admin restores an archived clan
const restoreClan = async (req, res, next) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    if (!isClanArchived(clan)) {
      return res.status(400).json({ success: false, message: 'Clan is already active' });
    }

    clan.status = 'active';
    clan.archivedAt = null;
    clan.archivedBy = null;
    clan.restoredAt = new Date();
    clan.restoredBy = req.user._id;
    await clan.save();

    const populated = await Clan.findById(clan._id)
      .populate('chief', 'username email')
      .populate('members', 'name username email profilePicture points streak')
      .populate('createdBy', 'username email')
      .populate('archivedBy', 'username email')
      .populate('restoredBy', 'username email');

    return sendSuccess(res, { data: populated, message: 'Clan restored' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Clan name or tag already exists in an active clan' });
    }
    return next(err);
  }
};

// DELETE /api/clans/:id — admin deletes a clan
const deleteClan = async (req, res, next) => {
  try {
    await runWithOptionalTransaction(async (session) => {
      const clan = await withSession(Clan.findById(req.params.id), session);
      if (!clan) {
        return res.status(404).json({ success: false, message: 'Clan not found' });
      }

      if (!isClanArchived(clan)) {
        return res.status(400).json({ success: false, message: 'Archive the clan before permanently deleting it' });
      }

      await withSession(
        User.updateMany(
          { _id: { $in: [...new Set([...(clan.members || []), clan.chief].filter(Boolean).map((id) => id.toString()))] } },
          { $unset: { clan: '' } }
        ),
        session
      );

      await withSession(ChatMessage.deleteMany({ clanId: clan._id }), session);

      const oldChiefId = clan.chief ? clan.chief.toString() : null;
      await withSession(Clan.deleteOne({ _id: clan._id }), session);

      if (oldChiefId) {
        await reconcileChiefRoleForUser(oldChiefId, { session });
      }
      return null;
    });

    if (res.headersSent) return null;

    return sendSuccess(res, { message: 'Clan deleted' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/join — user joins a clan
const joinClan = async (req, res, next) => {
  try {
    const requester = await User.findById(req.user._id).select('clan');
    if (!requester) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (requester.clan) {
      return res.status(400).json({
        success: false,
        message: 'You are already assigned to a clan. Leave your current clan before requesting a new one.',
      });
    }

    const clan = await Clan.findById(req.params.id);
    if (!clan) {
      return res.status(404).json({ success: false, message: 'Clan not found' });
    }

    if (isClanArchived(clan)) {
      return res.status(400).json({ success: false, message: 'Archived clans cannot receive join requests' });
    }

    if (clan.members.map((id) => id.toString()).includes(req.user._id.toString())) {
      return res.status(400).json({ success: false, message: 'Already a member of this clan' });
    }

    if (clan.requests.map((id) => id.toString()).includes(req.user._id.toString())) {
      return res.status(400).json({ success: false, message: 'Already requested to join this clan' });
    }

    // Push to requests instead of members
    clan.requests.push(req.user._id);
    await clan.save();

    return sendSuccess(res, { message: `Request sent to join clan ${clan.name}` });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/leave — user leaves a clan
const leaveClan = async (req, res, next) => {
  try {
    let clanName = 'the clan';
    await runWithOptionalTransaction(async (session) => {
      const clan = await withSession(Clan.findById(req.params.id), session);
      if (!clan) {
        return res.status(404).json({ success: false, message: 'Clan not found' });
      }

      if (isClanArchived(clan)) {
        return res.status(400).json({ success: false, message: 'Archived clans cannot be modified until restored' });
      }
      clanName = clan.name;

      if (!clan.members.map((id) => id.toString()).includes(req.user._id.toString())) {
        return res.status(400).json({ success: false, message: 'Not a member of this clan' });
      }

      clan.members.pull(req.user._id);

      const wasChief = clan.chief && clan.chief.toString() === req.user._id.toString();
      if (wasChief) {
        clan.chief = null;
      }

      await clan.save({ session });
      await withSession(
        User.findByIdAndUpdate(req.user._id, { $unset: { clan: '' } }),
        session
      );

      if (wasChief) {
        await reconcileChiefRoleForUser(req.user._id, { session });
      }
      return null;
    });

    if (res.headersSent) return null;

    return sendSuccess(res, { message: `Left clan ${clanName}` });
  } catch (err) {
    return next(err);
  }
};

// PUT /api/clans/:id/chief — admin assigns a clan chief
const assignChief = async (req, res, next) => {
  try {
    const { userId } = req.body;
    let promotedChief = null;
    let clanName = '';
    let clanId = '';

    await runWithOptionalTransaction(async (session) => {
      const clan = await withSession(Clan.findById(req.params.id), session);

      if (!clan) {
        return res.status(404).json({ success: false, message: 'Clan not found' });
      }

      if (rejectArchivedClanMutation(res, clan)) {
        return null;
      }

      clanName = clan.name;
      clanId = clan._id.toString();

      const newChief = await withSession(User.findById(userId), session);
      if (!newChief) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!clan.members.map((m) => m.toString()).includes(userId)) {
        // Auto-add member if not already in clan
        await removeUserFromOtherClans(userId, { keepClanId: clan._id, session });
        clan.members.addToSet(userId);
        clan.requests.pull(userId);
      }
      if (!newChief) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const previousChiefId = clan.chief ? clan.chief.toString() : null;
      clan.chief = userId;
      await clan.save({ session });

      newChief.role = 'clan-chief';
      newChief.clan = clan._id;
      await newChief.save({ session });

      if (previousChiefId && previousChiefId !== userId) {
        await reconcileChiefRoleForUser(previousChiefId, { session });
      }

      promotedChief = {
        email: newChief.email,
        username: newChief.username,
      };
      return null;
    });

    if (res.headersSent) return null;

    const populated = await Clan.findById(clanId)
      .populate('chief', 'username email')
      .populate('members', 'name username email profilePicture points streak');

    sendSuccess(res, { data: populated, message: 'Clan chief assigned' });

    // Fire-and-forget the notification email so the request doesn't block on SMTP.
    if (promotedChief) {
      const { sendEmail } = require('../../../utils/emailService');
      const safeName = escapeHtml(promotedChief.username);
      const safeClan = escapeHtml(clanName);
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eab308; border-radius: 8px;">
          <h2 style="color: #eab308;">Promotion to Clan Chief</h2>
          <p>Dear ${safeName},</p>
          <p>You have been assigned as the Chief of Clan <strong>${safeClan}</strong>.</p>
          <p>Log in to access your Chief Dashboard and lead your clan to victory.</p>
        </div>
      `;
      sendEmail(promotedChief.email, 'Algorithm Arena - Promoted to Clan Chief', htmlContent)
        .catch((err) => console.error('Failed to send chief promotion email:', err?.message || err));
    }

    return null;
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/clans/:id/chief — admin removes a clan chief (demotes to member)
const removeChief = async (req, res, next) => {
  try {
    let clanId = '';

    await runWithOptionalTransaction(async (session) => {
      const clan = await withSession(Clan.findById(req.params.id), session);

      if (!clan) {
        return res.status(404).json({ success: false, message: 'Clan not found' });
      }

      if (rejectArchivedClanMutation(res, clan)) {
        return null;
      }

      clanId = clan._id.toString();

      if (!clan.chief) {
        return res.status(400).json({ success: false, message: 'Clan has no chief' });
      }

      const previousChiefId = clan.chief.toString();
      clan.chief = null;
      await clan.save({ session });

      const oldChief = await withSession(User.findById(previousChiefId), session);
      if (oldChief) {
        oldChief.role = 'user'; // Or 'member', wait user role is usually 'user'
        await oldChief.save({ session });
      }

      await reconcileChiefRoleForUser(previousChiefId, { session });
      
      return null;
    });

    if (res.headersSent) return null;

    const populated = await Clan.findById(clanId)
      .populate('chief', 'username email')
      .populate('members', 'name username email');

    return sendSuccess(res, { data: populated, message: 'Clan chief removed' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/members — admin adds a member
const addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    let clanId = '';
    let clanName = '';
    let chiefName = 'Admin';
    let newMember = null;

    await runWithOptionalTransaction(async (session) => {
      const clan = await withSession(Clan.findById(req.params.id), session);

      if (!clan) {
        return res.status(404).json({ success: false, message: 'Clan not found' });
      }

      if (rejectArchivedClanMutation(res, clan)) {
        return null;
      }

      clanId = clan._id.toString();
      clanName = clan.name;

      if (clan.members.map((m) => m.toString()).includes(userId)) {
        return res.status(400).json({ success: false, message: 'User is already a member' });
      }

      const memberUser = await withSession(User.findById(userId), session);
      if (!memberUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await removeUserFromOtherClans(userId, { keepClanId: clan._id, session });

      clan.members.addToSet(userId);
      clan.requests.pull(userId);
      await clan.save({ session });

      memberUser.clan = clan._id;
      if (clan.chief && clan.chief.toString() === userId) {
        memberUser.role = 'clan-chief';
      }
      await memberUser.save({ session });

      if (clan.chief) {
        const chiefUser = await withSession(User.findById(clan.chief).select('username'), session);
        if (chiefUser) chiefName = chiefUser.username;
      }

      newMember = {
        email: memberUser.email,
        username: memberUser.username,
      };
      return null;
    });

    if (res.headersSent) return null;

    const populated = await Clan.findById(clanId)
      .populate('chief', 'username email')
      .populate('members', 'name username email profilePicture points streak');

    sendSuccess(res, { data: populated, message: 'Member added' });

    // Fire-and-forget the welcome email so the request doesn't block on SMTP.
    if (newMember) {
      const { sendEmail } = require('../../../utils/emailService');
      const safeMember = escapeHtml(newMember.username);
      const safeClan = escapeHtml(clanName);
      const safeChief = escapeHtml(chiefName);
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
          <h2 style="color: #10b981;">Welcome to ${safeClan}</h2>
          <p>Dear ${safeMember},</p>
          <p>You have been successfully added to Clan <strong>${safeClan}</strong>.</p>
          <p>Your Clan Chief is: ${safeChief}</p>
          <p>Prepare for battle in the Algorithm Arena.</p>
        </div>
      `;
      sendEmail(newMember.email, `Algorithm Arena - Added to Clan ${safeClan}`, htmlContent)
        .catch((err) => console.error('Failed to send clan welcome email:', err?.message || err));
    }

    return null;
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/clans/:id/members/:userId — remove a member
const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let clanId = '';

    await runWithOptionalTransaction(async (session) => {
      const clan = await withSession(Clan.findById(req.params.id), session);

      if (!clan) {
        return res.status(404).json({ success: false, message: 'Clan not found' });
      }

      if (rejectArchivedClanMutation(res, clan)) {
        return null;
      }

      const scopeCheck = await canActorManageClan(req.user, clan, { session });
      if (!scopeCheck.allowed) {
        return res.status(403).json({ success: false, message: scopeCheck.reason || 'Not authorized' });
      }

      clanId = clan._id.toString();
      if (!clan.members.map((m) => m.toString()).includes(userId)) {
        return res.status(400).json({ success: false, message: 'User is not a member of this clan' });
      }

      clan.members.pull(userId);
      clan.requests.pull(userId);
      const wasChief = clan.chief && clan.chief.toString() === userId;
      if (wasChief) {
        clan.chief = null;
      }

      await clan.save({ session });

      const user = await withSession(User.findById(userId), session);
      if (user && user.clan && user.clan.toString() === clan._id.toString()) {
        user.clan = null;
        await user.save({ session });
      }

      if (wasChief) {
        await reconcileChiefRoleForUser(userId, { session });
      }
      return null;
    });

    if (res.headersSent) return null;

    const populated = await Clan.findById(clanId)
      .populate('chief', 'username email')
      .populate('members', 'name username email profilePicture points streak');

    return sendSuccess(res, { data: populated, message: 'Member removed' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/approve/:userId — chief approves request
const approveJoinRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await runWithOptionalTransaction(async (session) => {
      const clan = await withSession(Clan.findById(req.params.id), session);
      if (!clan) return res.status(404).json({ success: false, message: 'Clan not found' });

      if (rejectArchivedClanMutation(res, clan)) {
        return null;
      }

      const scopeCheck = await canActorManageClan(req.user, clan, { session });
      if (!scopeCheck.allowed) {
        return res.status(403).json({ success: false, message: scopeCheck.reason || 'Only the chief or an admin can approve requests' });
      }

      if (!clan.requests.map((id) => id.toString()).includes(userId)) {
        return res.status(400).json({ success: false, message: 'No such request found' });
      }

      const user = await withSession(User.findById(userId), session);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await removeUserFromOtherClans(userId, { keepClanId: clan._id, session });

      clan.requests.pull(userId);
      clan.members.addToSet(userId);
      await clan.save({ session });

      user.clan = clan._id;
      await user.save({ session });
      return null;
    });

    if (res.headersSent) return null;

    return sendSuccess(res, { message: 'Request approved' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/reject/:userId — chief rejects request
const rejectJoinRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const clan = await Clan.findById(req.params.id);
    if (!clan) return res.status(404).json({ success: false, message: 'Clan not found' });

    if (rejectArchivedClanMutation(res, clan)) {
      return null;
    }

    const scopeCheck = await canActorManageClan(req.user, clan);
    if (!scopeCheck.allowed) {
      return res.status(403).json({ success: false, message: scopeCheck.reason || 'Only the chief or an admin can reject requests' });
    }

    if (!clan.requests.map((id) => id.toString()).includes(userId)) {
      return res.status(400).json({ success: false, message: 'No such join request found' });
    }

    clan.requests.pull(userId);
    await clan.save();

    return sendSuccess(res, { message: 'Request rejected' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/clans/:id/notices — chief adds a notice
const addClanNotice = async (req, res, next) => {
  try {
    const { notice } = req.body;
    const clan = await Clan.findById(req.params.id);
    if (!clan) return res.status(404).json({ success: false, message: 'Clan not found' });

    if (rejectArchivedClanMutation(res, clan)) {
      return null;
    }

    if (isClanArchived(clan)) {
      return res.status(400).json({ success: false, message: 'Archived clans cannot be modified until restored' });
    }

    const scopeCheck = await canActorManageClan(req.user, clan);
    if (!scopeCheck.allowed) {
      return res.status(403).json({ success: false, message: scopeCheck.reason || 'Only the chief or an admin can post notices' });
    }

    clan.notices.push(notice);
    await clan.save();

    return sendSuccess(res, { data: clan.notices, message: 'Notice posted' });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/clans/:id/notices/:index — chief removes a notice
const removeClanNotice = async (req, res, next) => {
  try {
    const idx = Number(req.params.index);
    const clan = await Clan.findById(req.params.id);
    if (!clan) return res.status(404).json({ success: false, message: 'Clan not found' });

    if (rejectArchivedClanMutation(res, clan)) {
      return null;
    }

    const scopeCheck = await canActorManageClan(req.user, clan);
    if (!scopeCheck.allowed) {
      return res.status(403).json({ success: false, message: scopeCheck.reason || 'Only the chief or an admin can remove notices' });
    }

    // Guard: reject non-numeric, negative, or out-of-bounds indices
    if (!Number.isInteger(idx) || idx < 0 || idx >= clan.notices.length) {
      return res.status(400).json({ success: false, message: 'Invalid notice index' });
    }

    clan.notices.splice(idx, 1);
    await clan.save();

    return sendSuccess(res, { data: clan.notices, message: 'Notice removed' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getClans,
  getClan,
  getMyClan,
  getClanLeaderboard,
  createClan,
  updateClan,
  archiveClan,
  restoreClan,
  deleteClan,
  joinClan,
  leaveClan,
  assignChief,
  removeChief,
  addMember,
  removeMember,
  approveJoinRequest,
  rejectJoinRequest,
  addClanNotice,
  removeClanNotice,
  getClanAdminStats,
};
