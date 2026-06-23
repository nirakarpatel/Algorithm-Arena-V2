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
    // Group by userId and challengeId to count each challenge only once per user
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
    // Group by userId to sum up total distinct points and solved count
    {
      $group: {
        _id: '$_id.userId',
        solvedCount: { $sum: 1 },
        totalPoints: { $sum: '$challenge.points' },
      },
    },
    { $sort: { totalPoints: -1, solvedCount: -1 } },
    {
      $setWindowFields: {
        sortBy: { totalPoints: -1 },
        output: { rank: { $denseRank: {} } },
      },
    },
    // Finally, filter to get the rank of the requested user
    {
      $match: {
        _id: targetUserId
      }
    }
  ]);

  return result.length ? result[0].rank : null;
};

module.exports = { getUserRank };
