const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const { sendSuccess } = require('../utils/response');

const getDashboardSummary = async (req, res, next) => {
  try {
    const [totalChallenges, pending, solvedDistinct] = await Promise.all([
      Challenge.countDocuments(),
      Submission.countDocuments({ userId: req.user.id, status: 'Pending' }),
      Submission.distinct('challengeId', { userId: req.user.id, status: 'Accepted' }),
    ]);

    const leaderboard = await Submission.aggregate([
      { $match: { status: 'Accepted' } },
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
    ]);

    const rank = leaderboard.findIndex((entry) => entry._id.toString() === req.user.id.toString());
    const recentActivity = await Submission.find({ userId: req.user.id })
      .populate('challengeId', 'title difficulty points')
      .sort({ submittedAt: -1 })
      .limit(5);

    return sendSuccess(res, {
      data: {
        totalChallenges,
        solved: solvedDistinct.length,
        pending,
        rank: rank === -1 ? null : rank + 1,
        recentActivity,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getProfileStats = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [stats] = await Submission.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'challenges',
          localField: 'challengeId',
          foreignField: '_id',
          as: 'challenge',
        },
      },
      {
        $addFields: {
          challenge: { $arrayElemAt: ['$challenge', 0] },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalSubmissions: { $sum: 1 },
          acceptedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
          },
          totalPoints: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Accepted'] }, '$challenge.points', 0],
            },
          },
        },
      },
    ]);

    // Calculate Rank
    const leaderboard = await Submission.aggregate([
      { $match: { status: 'Accepted' } },
      { $lookup: { from: 'challenges', localField: 'challengeId', foreignField: '_id', as: 'challenge' } },
      { $unwind: '$challenge' },
      { $group: { _id: '$userId', totalPoints: { $sum: '$challenge.points' } } },
      { $sort: { totalPoints: -1 } },
    ]);
    const rankIndex = leaderboard.findIndex((entry) => entry._id.toString() === req.user.id.toString());
    const rank = rankIndex !== -1 ? rankIndex + 1 : null;

    // Calculate Heatmap Data
    const heatmapAggregation = await Submission.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    const heatmapMap = {};
    heatmapAggregation.forEach(item => {
      heatmapMap[item._id] = item.count;
    });

    const heatmapData = [];
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      heatmapData.push({
        date: dateStr,
        count: heatmapMap[dateStr] || 0
      });
    }
    heatmapData.reverse();

    // Calculate streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    heatmapData.forEach(day => {
       if (day.count > 0) {
           tempStreak++;
           if (tempStreak > maxStreak) maxStreak = tempStreak;
       } else {
           tempStreak = 0;
       }
    });

    for (let i = heatmapData.length - 1; i >= 0; i--) {
        if (heatmapData[i].count > 0) {
            currentStreak++;
        } else {
            if (i === heatmapData.length - 1) {
                continue; // if today is 0, streak might still be alive if yesterday was >0
            } else {
                break;
            }
        }
    }

    const recentSubmissions = await Submission.find({ userId: req.user.id })
      .populate('challengeId', 'title difficulty points')
      .sort({ submittedAt: -1 })
      .limit(10);

    return sendSuccess(res, {
      data: {
        totalSubmissions: stats?.totalSubmissions || 0,
        acceptedCount: stats?.acceptedCount || 0,
        rejectedCount: stats?.rejectedCount || 0,
        pendingCount: stats?.pendingCount || 0,
        totalPoints: stats?.totalPoints || 0,
        recentSubmissions,
        heatmapData,
        rank,
        streak: currentStreak,
        maxStreak
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getDashboardSummary,
  getProfileStats,
};

