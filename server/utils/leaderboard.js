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
  result.forEach((u, i) => {
    const strictRank = i + 1;
    let displayRank = strictRank;
    
    if (strictRank > 3) {
      const firstPersonIndex = result.findIndex(x => x.totalPoints === u.totalPoints);
      displayRank = Math.max(4, firstPersonIndex + 1);
    }
    
    if (u._id.equals(targetUserId)) {
      userRank = displayRank;
    }
  });

  return userRank;
};

module.exports = { getUserRank };
