const Challenge = require('../models/Challenge');
const { sendSuccess } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const getChallenges = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      difficulty,
      category,
      range,
      from,
      to,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = req.query;

    const filter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (range && range !== 'all') {
      const now = new Date();
      if (range === 'weekly') {
        filter.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (range === 'monthly') {
        filter.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    if (from || to) {
      filter.createdAt = filter.createdAt || {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const sortOrder = sortDir === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const skip = (page - 1) * limit;

    const [total, challenges] = await Promise.all([
      Challenge.countDocuments(filter),
      Challenge.find(filter).sort(sort).skip(skip).limit(limit),
    ]);

    return sendSuccess(res, {
      data: challenges,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getChallengeById = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    return sendSuccess(res, { data: challenge });
  } catch (err) {
    return next(err);
  }
};

const createChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.create(req.body);

    await logAudit({
      action: 'challenge.create',
      actorId: req.user.id,
      targetType: 'challenge',
      targetId: challenge._id,
      metadata: {
        title: challenge.title,
        difficulty: challenge.difficulty,
        points: challenge.points,
      },
    });

    const { emitEvent } = require('../config/socket');
    emitEvent('new_challenge', {
      challengeId: challenge._id,
      title: challenge.title,
      difficulty: challenge.difficulty,
    });

    emitEvent('challenge_update', challenge);

    return sendSuccess(res, {
      statusCode: 201,
      data: challenge,
      message: 'Challenge created successfully',
    });
  } catch (err) {
    return next(err);
  }
};

const updateChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    await logAudit({
      action: 'challenge.update',
      actorId: req.user.id,
      targetType: 'challenge',
      targetId: challenge._id,
      metadata: { updatedFields: Object.keys(req.body) },
    });

    return sendSuccess(res, {
      data: challenge,
      message: 'Challenge updated successfully',
    });

    const { emitEvent } = require('../config/socket');
    emitEvent('challenge_update', challenge);
  } catch (err) {
    return next(err);
  }
};

const deleteChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    await challenge.deleteOne();

    await logAudit({
      action: 'challenge.delete',
      actorId: req.user.id,
      targetType: 'challenge',
      targetId: challenge._id,
      metadata: {
        title: challenge.title,
      },
    });

    return sendSuccess(res, {
      data: null,
      message: 'Challenge removed successfully',
    });

    const { emitEvent } = require('../config/socket');
    emitEvent('challenge_update', null);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
};

