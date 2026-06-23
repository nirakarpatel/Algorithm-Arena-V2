const Submission = require('./Submission.model');
const Challenge = require('../challenges/Challenge.model');
const { sendSuccess } = require('../../../utils/response');
const { logAudit } = require('../../../utils/audit');
const { escapeHtml } = require('../../../utils/escapeHtml');
const {
  canActorManageUser,
  getActorMemberIdsInScope,
} = require('../clans/clanScope.service');

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

    const { emitEvent } = require('../../../config/socket');
    emitEvent('new_submission', {
      submissionId: submission._id,
      username: req.user.username,
      challengeTitle: challenge.title,
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

    const scopeAccess = await getActorMemberIdsInScope(req.user);
    if (!scopeAccess.allowed) {
      return res.status(403).json({ success: false, message: scopeAccess.reason || 'Not authorized' });
    }

    const filter = {};
    if (status) filter.status = status;
    if (challengeId) filter.challengeId = challengeId;

    if (scopeAccess.scope.kind === 'clan') {
      const memberIds = scopeAccess.memberIds || [];
      if (memberIds.length === 0) {
        return sendSuccess(res, {
          data: [],
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 1,
          },
        });
      }

      if (userId) {
        if (!memberIds.includes(userId)) {
          return res.status(403).json({
            success: false,
            message: 'Clan chiefs can only view submissions from members of their own clan',
          });
        }
        filter.userId = userId;
      } else {
        filter.userId = { $in: memberIds };
      }
    } else if (userId) {
      filter.userId = userId;
    }

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
        .populate('userId', 'username email role clan')
        .populate('challengeId', 'title difficulty points')
        .populate('reviewedBy', 'username role')
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
    const skip = (Number(page) - 1) * Number(limit);

    const match = { status: 'Accepted' };
    if (window !== 'all') {
      const days = window === '7d' ? 7 : 30;
      match.submittedAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    // All pagination and ranking happen inside MongoDB — nothing is loaded into Node RAM.
    // $setWindowFields computes dense rank at the DB level (requires MongoDB 5.0+).
    // $facet returns total count + the current page in a single round-trip.
    const [result] = await Submission.aggregate([
      { $match: match },
      // 1. Group by userId and challengeId to count each challenge only once per user
      {
        $group: {
          _id: { userId: '$userId', challengeId: '$challengeId' }
        }
      },
      // 2. Lookup the challenge details
      {
        $lookup: {
          from: 'challenges',
          localField: '_id.challengeId',
          foreignField: '_id',
          as: 'challenge',
        },
      },
      { $unwind: '$challenge' },
      // 3. Group by userId to sum up total distinct points and solved count
      {
        $group: {
          _id: '$_id.userId',
          solvedCount: { $sum: 1 },
          challengePoints: { $sum: '$challenge.points' },
        },
      },
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
        $addFields: {
          totalPoints: '$challengePoints',
        },
      },
      { $sort: { totalPoints: -1, solvedCount: -1 } },
      {
        $project: {
          _id: 1,
          username: '$user.username',
          profilePicture: '$user.profilePicture',
          solvedCount: 1,
          totalPoints: 1,
        },
      },
      {
        $setWindowFields: {
          sortBy: { totalPoints: -1 },
          output: { rank: { $denseRank: {} } },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: Number(limit) }],
        },
      },
    ]);

    const total = result?.metadata[0]?.total ?? 0;
    const data = result?.data ?? [];

    return sendSuccess(res, {
      data,
      meta: {
        window,
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('userId', 'username email role clan')
      .populate('challengeId', 'title difficulty points')
      .populate('reviewedBy', 'username role');

    if (!submission) {
      res.status(404);
      throw new Error('Submission not found');
    }

    const isOwner = submission.userId && submission.userId._id.toString() === req.user.id.toString();
    
    if (!isOwner) {
      if (!submission.userId) {
        res.status(403);
        throw new Error('Not authorized to view this submission');
      }

      const scopeCheck = await canActorManageUser(req.user, submission.userId);
      if (!scopeCheck.allowed) {
        const myAccepted = await Submission.findOne({
            userId: req.user.id,
            challengeId: submission.challengeId._id,
            status: 'Accepted'
        });

        if (!myAccepted) {
            return res.status(403).json({
                success: false,
                message: 'Limited to Clan Chief',
                challengeId: submission.challengeId._id
            });
        }
      }
    }

    return sendSuccess(res, { data: submission });
  } catch (err) {
    return next(err);
  }
};

const updateSubmissionStatus = async (req, res, next) => {
  try {
    const { status, feedback } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const updateData = {
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    };
    if (feedback !== undefined) {
      updateData.feedback = feedback;
    }

    const existingSubmission = await Submission.findById(req.params.id)
      .populate('userId', 'clan');

    if (!existingSubmission) {
      res.status(404);
      throw new Error('Submission not found');
    }

    const scopeCheck = await canActorManageUser(req.user, existingSubmission.userId);
    if (!scopeCheck.allowed) {
      res.status(403);
      throw new Error(scopeCheck.reason || 'Not authorized to review this submission');
    }

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('userId', 'username email role points solvedProblems')
      .populate('challengeId', 'title difficulty points')
      .populate('reviewedBy', 'username role');

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

    let xpAwarded = false;

    // Handle XP allocation/revocation to prevent XP farming
    const wasAlreadyAccepted = existingSubmission.status === 'Accepted';
    const isNowAccepted = status === 'Accepted';

    if (submission.userId?._id && wasAlreadyAccepted !== isNowAccepted) {
      const User = require('../users/User.model');
      const challengePoints = submission.challengeId?.points || 0;
      
      // Check if they have ANY OTHER accepted submissions for this challenge
      const hasOtherAccepted = await Submission.exists({
        userId: submission.userId._id,
        challengeId: submission.challengeId._id,
        status: 'Accepted',
        _id: { $ne: submission._id }
      });

      if (!hasOtherAccepted) {
        if (isNowAccepted) xpAwarded = true;

        const pointsDiff = isNowAccepted ? challengePoints : -challengePoints;
        const solvedDiff = isNowAccepted ? 1 : -1;

        const userToUpdate = await User.findById(submission.userId._id);
        if (userToUpdate) {
          userToUpdate.points = Math.max(0, (userToUpdate.points || 0) + pointsDiff);
          userToUpdate.solvedProblems = Math.max(0, (userToUpdate.solvedProblems || 0) + solvedDiff);
          
          if (userToUpdate.solvedProblems >= 30) {
            userToUpdate.codingLevel = 'Advanced';
          } else if (userToUpdate.solvedProblems >= 10) {
            userToUpdate.codingLevel = 'Intermediate';
          } else {
            userToUpdate.codingLevel = 'Beginner';
          }
          await userToUpdate.save();
        }
      }
    }

    const { emitEvent } = require('../../../config/socket');
    emitEvent('leaderboard_update', {
      submissionId: submission._id,
      userId: submission.userId?._id,
      status: submission.status,
    });
    emitEvent('points_update', {
      userId: submission.userId?._id,
      status: submission.status,
    });

    if (submission.userId?.email) {
      const { sendEmail } = require('../../../utils/emailService');
      const { logger } = require('../../../utils/logger');
      const color = status === 'Accepted' ? '#22c55e' : '#ef4444';
      // Escape all user-supplied values before embedding in HTML
      const safeUsername = escapeHtml(submission.userId.username);
      const safeTitle = escapeHtml(submission.challengeId?.title || 'Unknown Challenge');
      const safeFeedback = feedback ? escapeHtml(feedback) : null;
      const safeStatus = escapeHtml(status);

      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f1115; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #1f2937;">
          <h2 style="color: ${color}; text-transform: uppercase; letter-spacing: 2px;">Submission ${safeStatus}</h2>
          <p style="color: #9ca3af; font-size: 16px;">Hello <strong>${safeUsername}</strong>,</p>
          <p style="color: #9ca3af; font-size: 16px; line-height: 1.6;">
            Your Clan Chief has reviewed your code submission for the challenge:
            <br/><strong style="color: #ffffff;">${safeTitle}</strong>
          </p>
          <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #d1d5db;"><strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${safeStatus}</span></p>
            ${xpAwarded ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #d1d5db;"><strong>+${submission.challengeId?.points || 0} XP</strong> has been awarded to your account!</p>` : ''}
            ${safeFeedback ? `<hr style="border-color: #374151;"/><p style="margin: 10px 0 0 0; font-size: 14px; color: #d1d5db;"><strong>Chief's Feedback:</strong><br/><br/><em>&ldquo;${safeFeedback}&rdquo;</em></p>` : ''}
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; text-align: center;">Keep coding and progressing!<br/>- The Algorithm Arena Team</p>
        </div>
      `;

      sendEmail(
        submission.userId.email,
        `Code Submission ${safeStatus}: ${safeTitle}`,
        emailHTML
      ).catch(err => logger.error('Failed to send review email', { error: err }));
    }

    return sendSuccess(res, {
      data: submission,
      message: 'Submission status updated successfully',
    });
  } catch (err) {
    return next(err);
  }
};


const getSubmissionsByUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    const User = require('../users/User.model');
    const targetUser = await User.findOne({ username });
    if (!targetUser) {
      res.status(404);
      throw new Error('User not found');
    }

    const filter = { userId: targetUser._id };
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

module.exports = {
  submitCode,
  getSubmissions,
  getMySubmissions,
  getLeaderboard,
  getSubmissionById,
  updateSubmissionStatus,
  getSubmissionsByUsername,
};

