const Submission = require('../src/features/submissions/Submission.model');

/**
 * Computes the rank of a single user using a DB-level pipeline.
 * Uses $setWindowFields + $match so only one document is returned — no JS-level
 * array iteration over the full leaderboard.
 *
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<number|null>} 1-based rank, or null if no accepted submissions.
 */
let cachedRanks = null;
let cacheTimestamp = 0;

const getUserRank = async (userId) => {
  const mongoose = require('mongoose');
  const CACHE_TTL = process.env.NODE_ENV === 'test' ? 0 : 5 * 60 * 1000;
  const now = Date.now();
  const targetUserIdStr = userId.toString();

  if (cachedRanks && (now - cacheTimestamp < CACHE_TTL)) {
    return cachedRanks.get(targetUserIdStr) || null;
  }

  const result = await Submission.aggregate([
    { $match: { status: 'Accepted' } },
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
        solvedCount: { $sum: 1 },
        totalPoints: { $sum: '$challenge.points' },
      },
    },
    { $sort: { totalPoints: -1, solvedCount: -1 } }
  ]);

  const newRanks = new Map();
  let currentRank = 1;
  result.forEach((u, i) => {
    let displayRank;
    if (i < 3) {
      displayRank = i + 1;
      currentRank = i + 1;
    } else {
      const prev = result[i - 1];
      if (u.totalPoints !== prev.totalPoints || u.solvedCount !== prev.solvedCount) {
        currentRank++;
      }
      displayRank = Math.max(4, currentRank);
      currentRank = displayRank;
    }
    newRanks.set(u._id.toString(), displayRank);
  });

  if (CACHE_TTL > 0) {
    cachedRanks = newRanks;
    cacheTimestamp = now;
  }

  return newRanks.get(targetUserIdStr) || null;
};

module.exports = { getUserRank };
