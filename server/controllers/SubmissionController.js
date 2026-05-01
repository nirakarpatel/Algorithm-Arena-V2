const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Challenge = require('../models/Challenge');
const { sendSuccess } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const VALID_STATUSES = ['Pending', 'Accepted', 'Rejected'];

const submitCode = async (req, res, next) => {
  try {
    const { challengeId, repositoryUrl, code, language } = req.body;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const pendingDuplicate = await Submission.findOne({
      userId: req.user.id,
      challengeId,
      status: 'Pending',
      submittedAt: { $gte: oneHourAgo },
    });

    if (pendingDuplicate) {
      res.status(429);
      throw new Error('You already have a pending submission for this challenge. Please wait for review.');
    }

    const submission = await Submission.create({
      userId: req.user.id,
      challengeId,
      repositoryUrl: repositoryUrl || undefined,
      code: code || undefined,
      language: language || 'javascript',
    });

    return sendSuccess(res, {
      statusCode: 201,
      data: submission,
      message: 'Submission created successfully',
    });
  } catch (err) {
    return next(err);
  }
};

const getSubmissions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      challengeId,
      userId,
      from,
      to,
      sortBy = 'submittedAt',
      sortDir = 'desc',
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (challengeId) filter.challengeId = challengeId;
    if (userId) filter.userId = userId;

    if (from || to) {
      filter.submittedAt = {};
      if (from) filter.submittedAt.$gte = new Date(from);
      if (to) filter.submittedAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

    const [total, submissions] = await Promise.all([
      Submission.countDocuments(filter),
      Submission.find(filter)
        .populate('userId', 'username email role')
        .populate('challengeId', 'title difficulty points')
        .sort(sort)
        .skip(skip)
        .limit(limit),
    ]);

    return sendSuccess(res, {
      data: submissions,
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

const getMySubmissions = async (req, res, next) => {
  try {
    const filter = { userId: req.user.id };
    if (req.query.challengeId) filter.challengeId = req.query.challengeId;
    if (req.query.status) filter.status = req.query.status;

    let query = Submission.find(filter)
      .populate('challengeId', 'title difficulty points')
      .sort({ submittedAt: -1 });

    if (req.query.limit) {
      query = query.limit(Number(req.query.limit));
    }

    const submissions = await query;

    return sendSuccess(res, {
      data: submissions,
      meta: {
        count: submissions.length,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const { window = 'all', page = 1, limit = 20 } = req.query;

    const match = { status: 'Accepted' };
    if (window !== 'all') {
      const days = window === '7d' ? 7 : 30;
      const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      match.submittedAt = { $gte: fromDate };
    }

    const pipeline = [
      { $match: match },
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
      { $sort: { totalPoints: -1, solvedCount: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          username: '$user.username',
          solvedCount: 1,
          totalPoints: 1,
        },
      },
    ];

    const full = await Submission.aggregate(pipeline);
    const ranked = [];
    let prevRank = 0;
    let prevPoints = null;
    let prevSolved = null;

    full.forEach((entry, idx) => {
      const isTie = prevPoints === entry.totalPoints && prevSolved === entry.solvedCount;
      const rank = isTie ? prevRank : idx + 1;

      prevRank = rank;
      prevPoints = entry.totalPoints;
      prevSolved = entry.solvedCount;

      ranked.push({
        ...entry,
        rank,
      });
    });

    const total = ranked.length;
    const start = (page - 1) * limit;
    const data = ranked.slice(start, start + limit);

    return sendSuccess(res, {
      data,
      meta: {
        window,
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

const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('userId', 'username email role')
      .populate('challengeId', 'title difficulty points');

    if (!submission) {
      res.status(404);
      throw new Error('Submission not found');
    }

    const isOwner = submission.userId && submission.userId._id.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403);
      throw new Error('Not authorized to view this submission');
    }

    return sendSuccess(res, { data: submission });
  } catch (err) {
    return next(err);
  }
};

const updateSubmissionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('userId', 'username email role')
      .populate('challengeId', 'title difficulty points');

    if (!submission) {
      res.status(404);
      throw new Error('Submission not found');
    }

    await logAudit({
      action: 'submission.grade',
      actorId: req.user.id,
      targetType: 'submission',
      targetId: submission._id,
      metadata: {
        status,
        challengeId: submission.challengeId?._id,
        userId: submission.userId?._id,
      },
    });

    const { emitEvent } = require('../config/socket');
    emitEvent('leaderboard_update', {
      submissionId: submission._id,
      userId: submission.userId?._id,
      status: submission.status,
    });

    return sendSuccess(res, {
      data: submission,
      message: 'Submission status updated successfully',
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  submitCode,
  getSubmissions,
  getMySubmissions,
  getLeaderboard,
  getSubmissionById,
  updateSubmissionStatus,
};

