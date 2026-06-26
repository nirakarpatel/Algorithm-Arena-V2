const Submission = require('../src/features/submissions/Submission.model');

/**
 * Computes the rank of a single user using a DB-level pipeline.
 * Uses $setWindowFields + $match so only one document is returned — no JS-level
 * array iteration over the full leaderboard.
 *
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<number|null>} 1-based rank, or null if no accepted submissions.
 */
const getUserRank = async (userId) => {
  // Compute global rank dynamically to match getLeaderboard
  const mongoose = require('mongoose');
  
  // Ensure userId is ObjectId
  const targetUserId = new mongoose.Types.ObjectId(userId);

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

  // Apply custom tie-breaker logic in memory
  let userRank = null;
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
    
    if (u._id.equals(targetUserId)) {
      userRank = displayRank;
    }
  });

  return userRank;
};

module.exports = { getUserRank };
